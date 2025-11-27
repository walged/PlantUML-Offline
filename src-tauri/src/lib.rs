use tauri::{Manager, RunEvent, WindowEvent};

mod commands;
mod plantuml_server;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::save_file,
            commands::open_file,
            commands::export_svg,
            commands::start_plantuml_server,
            commands::stop_plantuml_server,
            commands::get_plantuml_server_status,
            commands::restart_plantuml_server,
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }

            // Try to start the embedded PlantUML server on app startup
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                // Give the app a moment to fully initialize
                std::thread::sleep(std::time::Duration::from_secs(2));

                match plantuml_server::start_server(&app_handle) {
                    Ok(status) => {
                        println!("Embedded PlantUML server started: {}", status.url);
                    }
                    Err(e) => {
                        println!("Failed to start embedded PlantUML server: {}", e);
                        println!("You can still use an external PlantUML server.");
                    }
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|_app_handle, event| {
        match event {
            RunEvent::ExitRequested { .. } => {
                // Stop the PlantUML server when app is closing
                println!("App exit requested, stopping PlantUML server...");
                let _ = plantuml_server::stop_server();
            }
            RunEvent::WindowEvent {
                event: WindowEvent::CloseRequested { .. },
                ..
            } => {
                // Also stop on window close
                println!("Window close requested, stopping PlantUML server...");
                let _ = plantuml_server::stop_server();
            }
            _ => {}
        }
    });
}
