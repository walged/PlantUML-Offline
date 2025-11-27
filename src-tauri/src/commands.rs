use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use crate::plantuml_server::{self, ServerStatus};

#[tauri::command]
pub async fn save_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, &content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn open_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn export_svg(path: String, svg_content: String) -> Result<(), String> {
    let path = PathBuf::from(path);
    fs::write(&path, &svg_content).map_err(|e| e.to_string())?;
    Ok(())
}

// PlantUML Server Commands

#[tauri::command]
pub async fn start_plantuml_server(app: AppHandle) -> Result<ServerStatus, String> {
    plantuml_server::start_server(&app)
}

#[tauri::command]
pub async fn stop_plantuml_server() -> Result<(), String> {
    plantuml_server::stop_server()
}

#[tauri::command]
pub async fn get_plantuml_server_status() -> ServerStatus {
    plantuml_server::get_server_status()
}

#[tauri::command]
pub async fn restart_plantuml_server(app: AppHandle) -> Result<ServerStatus, String> {
    plantuml_server::restart_server(&app)
}
