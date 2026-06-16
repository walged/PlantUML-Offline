use std::fs;
use std::net::TcpListener;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

pub const DEFAULT_PORT: u16 = 18123;

// Global server process handle
static SERVER_PROCESS: Mutex<Option<Child>> = Mutex::new(None);
static SERVER_PORT: Mutex<u16> = Mutex::new(DEFAULT_PORT);

#[derive(Debug, Clone, serde::Serialize)]
pub struct ServerStatus {
    pub running: bool,
    pub port: u16,
    pub url: String,
    pub error: Option<String>,
}

/// Find an available port starting from the default
fn find_available_port(start_port: u16) -> u16 {
    for port in start_port..start_port + 100 {
        if TcpListener::bind(("127.0.0.1", port)).is_ok() {
            return port;
        }
    }
    start_port // Fallback to default
}

/// Check if a port is in use
fn is_port_in_use(port: u16) -> bool {
    TcpListener::bind(("127.0.0.1", port)).is_err()
}

/// Kill any process listening on the specified port (Windows)
#[cfg(windows)]
fn kill_process_on_port(port: u16) {
    // Use netstat to find PID listening on the port
    let output = Command::new("cmd")
        .args(["/C", &format!("netstat -ano | findstr :{}", port)])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .output();

    if let Ok(output) = output {
        let stdout = String::from_utf8_lossy(&output.stdout);

        // Parse PIDs from netstat output and collect unique ones.
        let mut killed_pids = std::collections::HashSet::new();

        // Only kill a process that is LISTENING on *our local* address+port.
        // Matching on `findstr :PORT` alone is unsafe: it also matches remote
        // addresses ending in :PORT and unrelated lines, so we'd risk killing
        // the wrong process. netstat layout:
        //   TCP  127.0.0.1:18123  0.0.0.0:0  LISTENING  12345
        //   [0]  [1 local]        [2 remote] [3 state]  [4 pid]
        let local_v4 = format!("127.0.0.1:{}", port);
        let local_any = format!("0.0.0.0:{}", port);

        for line in stdout.lines() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() < 5 {
                continue;
            }
            let proto = parts[0];
            let local = parts[1];
            let state = parts[3];
            let pid_str = parts[4];

            let is_tcp = proto.eq_ignore_ascii_case("TCP");
            let is_listening = state.eq_ignore_ascii_case("LISTENING");
            let is_our_local = local == local_v4 || local == local_any;

            if !(is_tcp && is_listening && is_our_local) {
                continue;
            }

            if let Ok(pid) = pid_str.parse::<u32>() {
                if pid > 0 && killed_pids.insert(pid) {
                    println!("Killing process {} listening on {}", pid, local);
                    let _ = Command::new("taskkill")
                        .args(["/F", "/T", "/PID", &pid.to_string()])
                        .creation_flags(0x08000000)
                        .output();
                }
            }
        }
    }
}

#[cfg(not(windows))]
fn kill_process_on_port(port: u16) {
    // Use lsof on Unix to find and kill process
    let output = Command::new("lsof")
        .args(["-t", &format!("-i:{}", port)])
        .output();

    if let Ok(output) = output {
        let stdout = String::from_utf8_lossy(&output.stdout);
        for pid_str in stdout.lines() {
            if let Ok(pid) = pid_str.trim().parse::<i32>() {
                println!("Killing process {} on port {}", pid, port);
                unsafe {
                    libc::kill(pid, libc::SIGKILL);
                }
            }
        }
    }
}

/// Get the path to the PlantUML JAR file
fn get_plantuml_jar_path(app: &AppHandle) -> Option<PathBuf> {
    // In development, look in the resources folder
    // In production, it will be in the app's resource directory

    if let Ok(resource_dir) = app.path().resource_dir() {
        let jar_path = resource_dir.join("resources").join("plantuml.jar");
        if jar_path.exists() {
            return Some(jar_path);
        }
    }

    // Fallback: check in src-tauri/resources during development
    let dev_path = PathBuf::from("resources").join("plantuml.jar");
    if dev_path.exists() {
        return Some(dev_path);
    }

    None
}

/// Result of resolving the Java executable.
struct JavaResolution {
    path: String,
    /// True when we fell back to the system `java` on PATH instead of the
    /// bundled JRE. The bundled JRE is required for reliable ELK layout
    /// (issue #2); system Java may be too old and cause renders to fail.
    is_system_fallback: bool,
}

/// Get the Java executable path, preferring the bundled JRE.
fn resolve_java(app: &AppHandle) -> JavaResolution {
    // First, check for bundled JRE
    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled_java = if cfg!(windows) {
            resource_dir.join("jre").join("bin").join("java.exe")
        } else {
            resource_dir.join("jre").join("bin").join("java")
        };

        if bundled_java.exists() {
            return JavaResolution {
                path: bundled_java.to_string_lossy().to_string(),
                is_system_fallback: false,
            };
        }
    }

    // Fallback to system Java (may be too old for ELK).
    JavaResolution {
        path: "java".to_string(),
        is_system_fallback: true,
    }
}

/// Path to the server log file, where JVM stdout/stderr is captured so render
/// failures (e.g. ELK class-version errors) can be diagnosed instead of being
/// masked behind a generic HTTP error (issue #2).
fn server_log_path(app: &AppHandle) -> Option<PathBuf> {
    let dir = app.path().app_log_dir().ok()?;
    let _ = fs::create_dir_all(&dir);
    Some(dir.join("plantuml-server.log"))
}

/// Start the embedded PlantUML server
pub fn start_server(app: &AppHandle) -> Result<ServerStatus, String> {
    // Check if already running (our tracked process)
    {
        let process = SERVER_PROCESS.lock().map_err(|e| e.to_string())?;
        if process.is_some() {
            let port = *SERVER_PORT.lock().map_err(|e| e.to_string())?;
            return Ok(ServerStatus {
                running: true,
                port,
                url: format!("http://localhost:{}", port),
                error: None,
            });
        }
    }

    // Kill any orphaned server from previous session on our default port
    if is_port_in_use(DEFAULT_PORT) {
        println!("Found orphaned server on port {}, killing it...", DEFAULT_PORT);
        kill_process_on_port(DEFAULT_PORT);
        std::thread::sleep(std::time::Duration::from_millis(1000));
    }

    // Find PlantUML JAR
    let jar_path = get_plantuml_jar_path(app)
        .ok_or_else(|| "PlantUML JAR not found. Please ensure plantuml.jar is in the resources folder.".to_string())?;

    // Normalize JAR path to avoid \\?\ prefix issues on Windows
    let jar_path_str = jar_path.to_string_lossy().to_string();
    let jar_path_normalized = jar_path_str.trim_start_matches(r"\\?\");

    // Find available port
    let port = find_available_port(DEFAULT_PORT);

    // Get Java path (prefer bundled JRE)
    let java = resolve_java(app);
    let java_path = java.path.clone();

    println!("Starting PlantUML server on port {} using Java: {}", port, java_path);
    if java.is_system_fallback {
        println!(
            "WARNING: bundled JRE not found, using system 'java'. If diagram rendering \
             (especially '!pragma layout elk') fails, install a modern JDK (17+)."
        );
    }
    println!("JAR path: {}", jar_path_normalized);

    // Capture JVM stdout/stderr to a log file instead of discarding it. The Java
    // process writes startup banners and, crucially, stack traces for failed
    // renders (e.g. ELK class-version errors) to stderr; capturing them lets us
    // surface the real cause instead of a generic HTTP error (issue #2).
    // A file (not a pipe) is used so the OS — not our process — drains the
    // output, avoiding the buffer-fill deadlock the old Stdio::null() guarded
    // against.
    let (stdout_target, stderr_target) = match server_log_path(app) {
        Some(log) => {
            let out = fs::OpenOptions::new().create(true).append(true).open(&log);
            let err = fs::OpenOptions::new().create(true).append(true).open(&log);
            match (out, err) {
                (Ok(o), Ok(e)) => (Stdio::from(o), Stdio::from(e)),
                _ => (Stdio::null(), Stdio::null()),
            }
        }
        None => (Stdio::null(), Stdio::null()),
    };

    // Start the server process
    // PlantUML picoweb mode: java -jar plantuml.jar -picoweb:PORT
    let mut cmd = Command::new(&java_path);
    cmd.args([
        "-jar",
        jar_path_normalized,
        &format!("-picoweb:{}", port),
    ])
    .stdout(stdout_target)
    .stderr(stderr_target);

    // On Windows, hide the console window
    #[cfg(windows)]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let child = cmd.spawn()
        .map_err(|e| format!("Failed to start PlantUML server: {}. Make sure Java is installed.", e))?;

    // Store the process handle and port
    {
        let mut process = SERVER_PROCESS.lock().map_err(|e| e.to_string())?;
        *process = Some(child);
    }
    {
        let mut stored_port = SERVER_PORT.lock().map_err(|e| e.to_string())?;
        *stored_port = port;
    }

    // Wait for the server to actually start accepting connections
    let max_wait_secs = 15;
    let mut server_ready = false;
    for i in 0..max_wait_secs * 2 {
        std::thread::sleep(std::time::Duration::from_millis(500));
        if is_port_in_use(port) {
            server_ready = true;
            println!("PlantUML server is ready after {}ms", (i + 1) * 500);
            break;
        }
    }

    if !server_ready {
        println!("Warning: PlantUML server may not be ready yet (port {} not responding)", port);
    }

    println!("PlantUML server started successfully on port {}", port);

    Ok(ServerStatus {
        running: true,
        port,
        url: format!("http://localhost:{}", port),
        error: None,
    })
}

/// Stop the embedded PlantUML server
pub fn stop_server() -> Result<(), String> {
    let port = *SERVER_PORT.lock().map_err(|e| e.to_string())?;

    // Clear our stored process handle
    {
        let mut process = SERVER_PROCESS.lock().map_err(|e| e.to_string())?;
        if let Some(mut child) = process.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }

    // Kill any process on our port (this is the reliable way)
    println!("Stopping PlantUML server on port {}...", port);
    kill_process_on_port(port);

    // Give it a moment to die
    std::thread::sleep(std::time::Duration::from_millis(500));

    // Double-check and kill again if still running
    if is_port_in_use(port) {
        println!("Port {} still in use, killing again...", port);
        kill_process_on_port(port);
        std::thread::sleep(std::time::Duration::from_millis(500));
    }

    println!("PlantUML server stopped");
    Ok(())
}

/// Get current server status
pub fn get_server_status() -> ServerStatus {
    let is_running = {
        let process = SERVER_PROCESS.lock().ok();
        process.map(|p| p.is_some()).unwrap_or(false)
    };

    let port = SERVER_PORT.lock().ok().map(|p| *p).unwrap_or(DEFAULT_PORT);

    // Also check if the port is actually responding
    let actually_running = is_running && is_port_in_use(port);

    ServerStatus {
        running: actually_running,
        port,
        url: format!("http://localhost:{}", port),
        error: None,
    }
}

/// Restart the server
pub fn restart_server(app: &AppHandle) -> Result<ServerStatus, String> {
    stop_server()?;
    std::thread::sleep(std::time::Duration::from_millis(500));
    start_server(app)
}

/// Return the tail of the PlantUML server log so the UI can show real JVM
/// diagnostics (issue #2). Returns at most the last ~16 KB.
pub fn read_server_log(app: &AppHandle) -> Result<String, String> {
    let path = server_log_path(app).ok_or_else(|| "Log path unavailable".to_string())?;
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    const MAX: usize = 16 * 1024;
    if content.len() > MAX {
        Ok(content[content.len() - MAX..].to_string())
    } else {
        Ok(content)
    }
}
