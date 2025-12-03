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

        // Parse PIDs from netstat output and collect unique ones
        let mut killed_pids = std::collections::HashSet::new();

        for line in stdout.lines() {
            // netstat output: TCP 127.0.0.1:18123 ... LISTENING 12345
            let parts: Vec<&str> = line.split_whitespace().collect();
            if let Some(pid_str) = parts.last() {
                if let Ok(pid) = pid_str.parse::<u32>() {
                    if pid > 0 && !killed_pids.contains(&pid) {
                        println!("Killing process {} on port {}", pid, port);
                        let _ = Command::new("taskkill")
                            .args(["/F", "/T", "/PID", &pid.to_string()])
                            .creation_flags(0x08000000)
                            .output();
                        killed_pids.insert(pid);
                    }
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

/// Get the Java executable path
fn get_java_path(app: &AppHandle) -> String {
    // First, check for bundled JRE
    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled_java = if cfg!(windows) {
            resource_dir.join("jre").join("bin").join("java.exe")
        } else {
            resource_dir.join("jre").join("bin").join("java")
        };

        if bundled_java.exists() {
            return bundled_java.to_string_lossy().to_string();
        }
    }

    // Fallback to system Java
    "java".to_string()
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

    // Get Java path
    let java_path = get_java_path(app);

    println!("Starting PlantUML server on port {} using Java: {}", port, java_path);
    println!("JAR path: {}", jar_path_normalized);

    // Start the server process
    // PlantUML picoweb mode: java -jar plantuml.jar -picoweb:PORT
    // Use Stdio::null() to prevent output buffer from filling up and blocking Java
    let mut cmd = Command::new(&java_path);
    cmd.args([
        "-jar",
        jar_path_normalized,
        &format!("-picoweb:{}", port),
    ])
    .stdout(Stdio::null())
    .stderr(Stdio::null());

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
