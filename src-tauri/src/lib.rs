// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn force_close_app(app_handle: tauri::AppHandle) -> Result<(), String> {
    app_handle.exit(0);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, force_close_app])
        .setup(|app| {
            let window = app.get_webview_window("main")
                .ok_or("Failed to get main window")?;
            
            // Prevenir cierre con Alt+F4
            window.on_window_event(|event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                }
            });
            
            Ok::<(), Box<dyn std::error::Error>>(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
