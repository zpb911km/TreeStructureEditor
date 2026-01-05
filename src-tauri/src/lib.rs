use std::fs;
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
fn load_ai_config() -> Result<String, String> {
    let home_dir = dirs::home_dir().ok_or("无法获取用户主目录")?;
    let config_dir = home_dir.join(".TreeStructureEditor");
    let config_file = config_dir.join("ai_api.json");

    if !config_file.exists() {
        return Err("配置文件不存在".to_string());
    }

    match fs::read_to_string(&config_file) {
        Ok(content) => Ok(content),
        Err(e) => Err(format!("读取配置文件失败: {}", e)),
    }
}

#[tauri::command]
fn save_ai_config(config: String) -> Result<String, String> {
    let home_dir = dirs::home_dir().ok_or("无法获取用户主目录")?;
    let config_dir = home_dir.join(".TreeStructureEditor");

    // 创建配置目录(如果不存在)
    if !config_dir.exists() {
        match fs::create_dir_all(&config_dir) {
            Ok(_) => (),
            Err(e) => return Err(format!("创建配置目录失败: {}", e)),
        }
    }

    let config_file = config_dir.join("ai_api.json");

    match File::create(&config_file) {
        Ok(mut file) => match file.write_all(config.as_bytes()) {
            Ok(_) => Ok("配置保存成功".to_string()),
            Err(e) => Err(format!("写入配置文件失败: {}", e)),
        },
        Err(e) => Err(format!("创建配置文件失败: {}", e)),
    }
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
        .invoke_handler(tauri::generate_handler![
            greet,
            open_file,
            save_file,
            save_byte_file,
            load_ai_config,
            save_ai_config
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
