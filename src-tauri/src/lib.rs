use std::fs::File;
use std::io::Read;
use std::io::Write;
use std::path::Path;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn open_file(path: String) -> Result<String, String> {
    let file_path = Path::new(&path);
    if file_path.exists() {
        match File::open(file_path) {
            Ok(mut file) => {
                let mut contents = String::new();
                match file.read_to_string(&mut contents) {
                    Ok(_) => Ok(contents),
                    Err(e) => Err(format!("Failed to read file: {}", e)),
                }
            }
            Err(e) => Err(format!("Failed to open file: {}", e)),
        }
    } else {
        Err("File does not exist".to_string())
    }
}

#[tauri::command]
fn save_file(path: String, content: String) -> Result<String, String> {
    let file_path = Path::new(&path);
    match File::create(file_path) {
        Ok(mut file) => match file.write_all(content.as_bytes()) {
            Ok(_) => Ok("File saved successfully".to_string()),
            Err(e) => Err(format!("Failed to write to file: {}", e)),
        },
        Err(e) => Err(format!("Failed to create file: {}", e)),
    }
}

#[tauri::command]
fn save_byte_file(path: String, data: Vec<u8>) -> Result<String, String> {
    let file_path = Path::new(&path);
    match File::create(file_path) {
        Ok(mut file) => match file.write_all(&data) {
            Ok(_) => Ok("File saved successfully".to_string()),
            Err(e) => Err(format!("Failed to write to file: {}", e)),
        },
        Err(e) => Err(format!("Failed to create file: {}", e)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, open_file, save_file, save_byte_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
