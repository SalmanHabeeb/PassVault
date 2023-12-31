// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Deserialize;
use serde::Serialize;
use sqlx::prelude::*;

// Import sqlx::sqlite::SqlitePool and sqlx::types::Json
use sqlx::sqlite::{SqliteConnectOptions, SqliteConnection};

use std::fs;
use std::fs::File;
use std::io::Read;
use std::io::Write;

extern crate bcrypt;

use bcrypt::{hash, verify, DEFAULT_COST};

use aes::cipher::{block_padding::Pkcs7, BlockDecryptMut, BlockEncryptMut, KeyIvInit};

type Aes128CbcEnc = cbc::Encryptor<aes::Aes128>;
type Aes128CbcDec = cbc::Decryptor<aes::Aes128>;

use argon2::Argon2;

extern crate rand;
use rand::{rngs::OsRng, RngCore};

// Define a struct for the entry data
#[derive(sqlx::FromRow, Serialize, Deserialize)]
struct Entry {
    site: String,
    username: String,
    password: String,
}

#[derive(sqlx::FromRow, Serialize, Deserialize)]
struct PasswordLessEntry {
    site: String,
    username: String,
}

#[derive(sqlx::FromRow, Serialize, Deserialize)]
struct PasswordEntry {
    password: String,
    salt: String,
}

// Define a struct to represent the response object
#[derive(Serialize, Deserialize)]
struct SuccessResponse {
    success: bool,
    authorized: bool,
}

use chrono::prelude::*;
use lazy_static::lazy_static;

struct AuthState {
    master_password_hash: Option<String>,
    encryption_key: Option<Vec<u8>>,
    encryption_key_enc: Option<[u8; 32]>,
    time_of_entry: DateTime<Utc>,
    unlock_time: i64,
    salt: Option<String>,
    auth: bool,
}

// const master_password_hashC: String = "$2b$12$Rov4tLdIG/9HfBnKaqxR/ORWwGgsEUw0yPE4cMSTBqXMUxuWcAC5.";
// const encryption_key_encryptedC: String = ""

impl AuthState {
    fn new() -> Self {
        let time_of_entry = Utc::now();
        let auth = false;
        let salt = None;
        AuthState {
            master_password_hash: None,
            encryption_key: None,
            encryption_key_enc: None,
            time_of_entry,
            unlock_time: 60,
            salt,
            auth,
        }
    }

    fn save_to_file(&mut self, file_path: &str) -> Result<(), String> {
        let mut file = File::create(file_path).map_err(|e| {
            e.to_string() // Convert the error to a string using to_string
        })?;

        // Write master_password_hash to the file
        if let Some(ref hash) = self.master_password_hash {
            writeln!(file, "master_password_hash: {}", hash).map_err(|e| {
                e.to_string() // Convert the error to a string using to_string
            })?;
        }

        // Write encryption_key_enc to the file
        if let Some(enc_key) = self.encryption_key_enc {
            let enc_key_hex = hex::encode(enc_key);
            writeln!(file, "encryption_key_enc: {}", enc_key_hex).map_err(|e| {
                e.to_string() // Convert the error to a string using to_string
            })?;
        }

        if let Some(ref salt) = self.salt {
            writeln!(file, "salt: {}", salt).map_err(|e| {
                e.to_string() // Convert the error to a string using to_string
            })?;
        }

        writeln!(file, "unlock_time: {}", self.unlock_time).map_err(|e| {
            e.to_string() // Convert the error to a string using to_string
        })?;

        Ok(())
    }

    fn set_new_key(&mut self, master_password: String) -> Result<(), String> {
        let mut rng = OsRng;

        let mut enckey = [0u8; 16];
        rng.fill_bytes(&mut enckey);

        self.encryption_key = Some(enckey.to_vec());
        let iv = [0x24; 16];
        let mut output_key_material = [0x42; 16]; // Can be any desired size
        let salt: String = std::iter::repeat_with(fastrand::alphanumeric)
            .take(16)
            .collect();
        self.salt = Some(salt);
        Argon2::default()
            .hash_password_into(
                master_password.as_bytes(),
                self.salt.clone().unwrap().as_bytes(),
                &mut output_key_material,
            )
            .map_err(|e| e.to_string())?;
        let key = output_key_material;
        let mut buf = [0u8; 48];
        let ct = Aes128CbcEnc::new(&key.into(), &iv.into())
            .encrypt_padded_b2b_mut::<Pkcs7>(&enckey, &mut buf)
            .unwrap();
        self.encryption_key_enc = Some(ct[0..32].try_into().unwrap());
        Ok(())
    }

    fn set_new_password(
        &mut self,
        current_password: String,
        new_password: String,
    ) -> Result<bool, String> {
        let iv = [0x24; 16];
        let mut key = [0x42; 16]; // Can be any desired size
        let salt: String = std::iter::repeat_with(fastrand::alphanumeric)
            .take(16)
            .collect();
        self.salt = Some(salt);
        Argon2::default()
            .hash_password_into(
                new_password.as_bytes(),
                self.salt.clone().unwrap().as_bytes(),
                &mut key,
            )
            .map_err(|e| e.to_string())?;
        let mut buf = [0u8; 48];
        let ciphertext = Aes128CbcEnc::new(&key.into(), &iv.into())
            .encrypt_padded_b2b_mut::<Pkcs7>(
                &self.encryption_key.clone().unwrap().as_slice(),
                &mut buf,
            )
            .unwrap();
        self.encryption_key_enc = Some(ciphertext[0..32].try_into().unwrap());
        Ok(true)
    }

    fn load_from_file(&mut self, file_path: &str) -> Result<bool, String> {
        let mut file = File::open(file_path).map_err(|e| {
            e.to_string() // Convert the error to a string using to_string
        })?;

        let mut contents = String::new();
        file.read_to_string(&mut contents).map_err(|e| {
            e.to_string() // Convert the error to a string using to_string
        })?;

        // Parse the file contents and update auth_state fields
        // For simplicity, you can split the contents into lines and process each line accordingly.
        let mut counter = 0;
        for line in contents.lines() {
            if line.starts_with("master_password_hash: ") {
                counter += 1;
                self.master_password_hash = Some(
                    line.trim_start_matches("master_password_hash: ")
                        .to_string(),
                );
            } else if line.starts_with("encryption_key_enc: ") {
                let mut key_enc_str = line.trim_start_matches("encryption_key_enc: ").to_string();
                key_enc_str.retain(|c| c != ' '); // Remove spaces
                let mut key_enc = [0; 32];
                hex::decode_to_slice(key_enc_str, &mut key_enc).map_err(|e| {
                    e.to_string() // Convert the error to a string using to_string
                })?;
                self.encryption_key_enc = Some(key_enc);
                counter += 1;
            } else if line.starts_with("salt: ") {
                self.salt = Some(line.trim_start_matches("salt: ").to_string());
                counter += 1;
            } else if line.starts_with("unlock_time: ") {
                // Not necessary to add counter, since not a required field
                self.unlock_time = match line.trim_start_matches("unlock_time: ").parse::<i64>() {
                    Ok(parsed_num) => parsed_num,
                    Err(_) => 60,
                };
            }
            // Add more parsing logic for other fields as needed
        }
        if counter == 3 {
            Ok(true)
        } else {
            Ok(false)
        }
    }

    fn set_auth(&mut self, auth: bool) {
        self.time_of_entry = Utc::now();
        self.auth = auth;
    }

    fn set_password_hash(&mut self, hashed_password: String) {
        self.master_password_hash = Some(hashed_password);
    }

    fn set_encryption_key(&mut self, password: String) -> Result<(), String> {
        let mut key = [0x42; 16]; // Can be any desired size
        Argon2::default()
            .hash_password_into(
                password.as_bytes(),
                self.salt.clone().unwrap().as_bytes(),
                &mut key,
            )
            .map_err(|e| e.to_string())?;
        let iv = [0x24; 16];

        let mut buf = [0u8; 48];
        let pt = Aes128CbcDec::new(&key.into(), &iv.into())
            .decrypt_padded_b2b_mut::<Pkcs7>(&self.encryption_key_enc.unwrap(), &mut buf)
            .unwrap();

        self.encryption_key = Some(pt.to_vec());
        self.set_auth(true);

        Ok(())
    }

    fn set_unlock_time(&mut self, unlock_time: i64) {
        self.unlock_time = unlock_time;
    }

    fn get_encryption_key(&mut self) -> Vec<u8> {
        self.encryption_key.clone().unwrap_or_default()
    }

    fn get_time_left(&mut self) -> i64 {
        if !self.auth {
            return 0;
        }
        let current_time = Utc::now();
        let time_difference = current_time.signed_duration_since(self.time_of_entry);
        let duration = self.unlock_time - time_difference.num_seconds();
        if duration <= 0 {
            self.set_auth(false);
            return 0;
        }
        return duration;
    }

    fn get_unlock_time(&mut self) -> i64 {
        return self.unlock_time;
    }

    fn get_master_password_hash(&mut self) -> Option<String> {
        return self.master_password_hash.clone();
    }

    fn get_last_updated(&mut self) -> DateTime<Utc> {
        return self.time_of_entry;
    }

    fn remove_auth(&mut self) {
        self.set_auth(false);
        self.is_authorized();
    }

    fn is_authorized(&mut self) -> bool {
        if self.auth {
            let current_time = Utc::now();
            let time_difference = current_time.signed_duration_since(self.time_of_entry);
            let duration = time_difference.num_seconds();

            if duration > self.unlock_time {
                self.auth = false;
                return false;
            } else {
                return true;
            }
        } else {
            self.encryption_key = None;
            return false;
        }
    }
}

lazy_static! {
    static ref AUTH_STATE: std::sync::Mutex<AuthState> = std::sync::Mutex::new(AuthState::new());
}

fn pathbuf_to_string(path_buf: std::path::PathBuf) -> String {
    path_buf.into_os_string().into_string().unwrap()
}

fn get_config_dir_path(app_handle: tauri::AppHandle) -> String {
    let config_path = app_handle.path_resolver().app_config_dir().unwrap();
    return pathbuf_to_string(config_path);
}

fn get_config_path(app_handle: tauri::AppHandle) -> String {
    let config_path = app_handle.path_resolver().app_config_dir().unwrap();
    return pathbuf_to_string(config_path.join("passvault.bin"));
}

fn get_data_path(app_handle: tauri::AppHandle) -> String {
    let data_path = app_handle.path_resolver().app_data_dir().unwrap();
    return pathbuf_to_string(data_path.join("passvault.db"));
}

#[derive(Serialize)]
struct GetEntriesResponse {
    success: bool,
    authorized: bool,
    entries: Option<Vec<PasswordLessEntry>>,
}

#[tauri::command]
async fn get_entries(app_handle: tauri::AppHandle) -> Result<GetEntriesResponse, String> {
    let authorized = authorize();
    let mut response = GetEntriesResponse {
        success: false,
        authorized,
        entries: None,
    };

    if authorized {
        let filename_string = get_data_path(app_handle);
        let filename = filename_string.as_str();
        let options = SqliteConnectOptions::new().filename(filename);

        let mut conn_value: SqliteConnection = SqliteConnection::connect_with(&options)
            .await
            .map_err(|e| e.to_string())?;

        let conn: &mut SqliteConnection = &mut conn_value;

        let entries = sqlx::query_as::<_, PasswordLessEntry>("SELECT * FROM password_database")
            .fetch_all(conn)
            .await
            .map_err(|e| e.to_string());

        match entries {
            Ok(password_entries) => {
                response.success = true;
                response.entries = Some(password_entries);
            }
            Err(_) => {
                response.entries = None;
            }
        }
    }

    Ok(response)
}

#[derive(Serialize)]
struct GetPasswordResponse {
    success: bool,
    authorized: bool,
    password: Option<String>,
}

#[tauri::command]
async fn get_password(
    app_handle: tauri::AppHandle,
    site: String,
    username: String,
) -> Result<GetPasswordResponse, String> {
    let authorized = authorize();
    let mut response = GetPasswordResponse {
        success: false,
        authorized,
        password: None,
    };

    if authorized {
        let filename_string = get_data_path(app_handle);
        let filename = filename_string.as_str();
        let options = SqliteConnectOptions::new().filename(filename);

        let mut conn_value: SqliteConnection = SqliteConnection::connect_with(&options)
            .await
            .map_err(|e| e.to_string())?;

        let conn: &mut SqliteConnection = &mut conn_value;

        // Use a different variable name for the query result
        let query_result = sqlx::query_as::<_, PasswordEntry>(
            "SELECT * FROM password_database WHERE site = ? AND username = ?",
        )
        .bind(site) // Bind the site value
        .bind(username) // Bind the username value
        .fetch_one(conn) // Fetch only one entry
        .await
        .map_err(|e| e.to_string());

        // Unwrap the query result only once and assign it to a variable
        let entry = query_result.unwrap();
        let encryption_key = get_key();
        let enc_key: &[u8] = encryption_key.as_slice();

        let iv = [0x24; 16];
        // Use the entry variable to get the password bytes
        let hex_bytes = hex::decode(entry.password).unwrap();
        let bytes: &[u8] = hex_bytes.as_slice();

        let salt = entry.salt.as_str().as_bytes();
        let mut key = [0x42; 16];
        Argon2::default()
            .hash_password_into(enc_key, salt, &mut key)
            .map_err(|e| e.to_string())?;

        let mut buf = [0u8; 48];
        let pt = Aes128CbcDec::new(&key.into(), &iv.into())
            .decrypt_padded_b2b_mut::<Pkcs7>(&bytes, &mut buf)
            .unwrap();

        // Convert the decrypted password to a string
        let s2 = match String::from_utf8(pt.to_vec()) {
            Ok(s2) => s2,                             // If successful, return the string
            Err(e) => panic!("Invalid UTF-8: {}", e), // If failed, panic with the error
        };

        // Use the query result directly in the match statement
        response.password = Some(s2);
        response.success = true;
    }

    Ok(response)
}

#[tauri::command]
async fn delete_entry(
    app_handle: tauri::AppHandle,
    site: String,
    username: String,
) -> Result<SuccessResponse, String> {
    let authorized = authorize();

    if authorized {
        let filename_string = get_data_path(app_handle);
        let filename = filename_string.as_str();
        let options = SqliteConnectOptions::new().filename(filename);

        let mut conn_value: SqliteConnection = SqliteConnection::connect_with(&options)
            .await
            .map_err(|e| e.to_string())?;

        let conn: &mut SqliteConnection = &mut conn_value;

        sqlx::query("DELETE FROM PASSWORD_DATABASE WHERE site = $1 AND username = $2")
            .bind(site)
            .bind(username)
            .execute(conn)
            .await
            .map_err(|e| e.to_string())?;

        // Return the response as a struct
        Ok(SuccessResponse {
            success: true,
            authorized: true,
        })
    } else {
        // Return the response as a struct
        Ok(SuccessResponse {
            success: false,
            authorized: false,
        })
    }
}

#[tauri::command]
async fn edit_entry(
    app_handle: tauri::AppHandle,
    new_site: String,
    new_username: String,
    new_password: String,
    edit_site: String,
    edit_username: String,
) -> Result<SuccessResponse, String> {
    let authorized = authorize();

    if authorized {
        let filename_string = get_data_path(app_handle);
        let filename = filename_string.as_str();
        let options = SqliteConnectOptions::new().filename(filename);

        let mut conn: SqliteConnection = SqliteConnection::connect_with(&options)
            .await
            .map_err(|e| e.to_string())?;

        // let conn: &mut SqliteConnection = &mut conn;

        if new_password != "".to_string() {
            let encryption_key = get_key();
            let enc_key: &[u8] = encryption_key.as_slice();

            let iv = [0x24; 16];
            let mut buf = [0u8; 48];
            let bytes: &[u8] = new_password.as_bytes();

            let salt: String = std::iter::repeat_with(fastrand::alphanumeric)
                .take(16)
                .collect();
            let mut key = [0x42; 16];
            Argon2::default()
                .hash_password_into(enc_key, &salt.as_str().as_bytes(), &mut key)
                .map_err(|e| e.to_string())?;

            let ciphertext = Aes128CbcEnc::new(&key.into(), &iv.into())
                .encrypt_padded_b2b_mut::<Pkcs7>(&bytes, &mut buf)
                .unwrap();

            let enc_password = hex::encode(ciphertext);
            sqlx::query("UPDATE PASSWORD_DATABASE SET 'password' = $1, 'salt' = $2 WHERE site = $3 AND username = $4")
            .bind(enc_password)
            .bind(salt)
            .bind(edit_site.clone())
            .bind(edit_username.clone())
            .execute(&mut conn)
            .await
            .map_err(|e| e.to_string())?;
        }

        sqlx::query("UPDATE PASSWORD_DATABASE SET 'site' = $1, 'username' = $2 WHERE site = $3 AND username = $4")
            .bind(new_site)
            .bind(new_username)
            .bind(edit_site)
            .bind(edit_username)
            .execute(&mut conn)
            .await
            .map_err(|e| e.to_string())?;

        // Return the response as a struct
        Ok(SuccessResponse {
            success: true,
            authorized: true,
        })
    } else {
        // Return the response as a struct
        Ok(SuccessResponse {
            success: false,
            authorized: false,
        })
    }
}

fn file_exists(file_path: &str) -> bool {
    if let Ok(metadata) = fs::metadata(file_path) {
        metadata.is_file()
    } else {
        false
    }
}

#[tauri::command]
fn authorize() -> bool {
    let mut auth_state_ref = AUTH_STATE.lock().unwrap();
    return auth_state_ref.is_authorized();
}

#[derive(Serialize)]
struct TimeResponse {
    time_left: i64,
    unlock_time: i64,
}

#[tauri::command]
fn check_time() -> TimeResponse {
    let mut auth_state_ref = AUTH_STATE.lock().unwrap();
    return TimeResponse {
        time_left: auth_state_ref.get_time_left(),
        unlock_time: auth_state_ref.get_unlock_time(),
    };
}

#[tauri::command]
fn change_unlock_time(app_handle: tauri::AppHandle, new_time: i64) -> SuccessResponse {
    let authorized = authorize();
    let config_path_string = get_config_path(app_handle);
    let config_path: &str = config_path_string.as_str();
    let mut response = SuccessResponse {
        success: true,
        authorized: authorized,
    };
    if authorized {
        let mut auth_state_ref = AUTH_STATE.lock().unwrap();
        auth_state_ref.set_unlock_time(new_time);
        auth_state_ref.save_to_file(config_path);
    } else {
        response.success = false;
    }
    return response;
}

#[derive(Serialize, Deserialize)]
struct Exists {
    exists: String,
}

fn load_auth(filepath: &str) -> bool {
    let mut auth_state_ref = AUTH_STATE.lock().unwrap();
    auth_state_ref.load_from_file(filepath).unwrap()
}

#[derive(Serialize)]
struct StartAppResponse {
    success: bool,
    is_new_user: bool,
    config_good: bool,
}

#[tauri::command]
async fn start_app(app_handle: tauri::AppHandle) -> Result<StartAppResponse, String> {
    let config_path_string = get_config_path(app_handle.clone());
    let config_path: &str = config_path_string.as_str();
    let database_path_string = get_data_path(app_handle.clone());
    let database_path: &str = database_path_string.as_str();
    let mut config_good = true;
    let mut is_new_user = false;
    // println!("{}, {}", config_path, database_path);
    if file_exists(config_path) {
        config_good = load_auth(config_path);
    } else {
        is_new_user = true;
    }

    // Check if the file exists
    if !file_exists(database_path) {
        let _file: File = File::create(database_path).map_err(|e| e.to_string())?;
    }

    let options = SqliteConnectOptions::new().filename(database_path);
    let mut conn_value: SqliteConnection = SqliteConnection::connect_with(&options)
        .await
        .map_err(|e| e.to_string())?;

    let conn: &mut SqliteConnection = &mut conn_value;
    sqlx::query("CREATE TABLE PASSWORD_DATABASE('site' VARCHAR(255), 'username' VARCHAR(255), 'password' VARCHAR(255), 'salt' VARCHAR(255), UNIQUE('site','username'))")
            .execute(conn)
            .await
            .map_err(|e| e.to_string()).unwrap_or_default();
    return Ok(StartAppResponse {
        success: true,
        is_new_user: is_new_user,
        config_good: config_good,
    });
}

#[tauri::command]
fn change_password(
    app_handle: tauri::AppHandle,
    current_password: String,
    new_password: String,
) -> Result<SuccessResponse, String> {
    let mut response = SuccessResponse {
        success: true,
        authorized: true,
    };
    let mut auth_state_ref = AUTH_STATE.lock().unwrap();
    let config_path_string = get_config_path(app_handle);
    let config_path: &str = config_path_string.as_str();

    if verify(
        current_password.clone(),
        auth_state_ref.get_master_password_hash().unwrap().as_str(),
    )
    .unwrap()
    {
        let hashed_new_password = hash(new_password.clone(), DEFAULT_COST).unwrap();
        let mut _result = auth_state_ref.set_encryption_key(current_password.clone());
        auth_state_ref.set_new_password(current_password, new_password);
        auth_state_ref.set_password_hash(hashed_new_password);
        auth_state_ref.save_to_file(config_path);
    } else {
        response.success = false;
        response.authorized = false;
    }
    Ok(response)
}

#[tauri::command]
fn get_key() -> Vec<u8> {
    let mut auth_state_ref = AUTH_STATE.lock().unwrap();
    return auth_state_ref.get_encryption_key();
}

#[tauri::command]
async fn authenticate(
    app_handle: tauri::AppHandle,
    master_password: String,
) -> Result<bool, String> {
    // Open the file for reading
    let mut auth_state_ref = AUTH_STATE.lock().unwrap();

    let filepath_string = get_config_path(app_handle);
    let filepath: &str = filepath_string.as_str();
    if file_exists(filepath) {
        let success_loading = auth_state_ref.load_from_file(filepath);
        if (success_loading.unwrap()) {
            if verify(
                master_password.clone(),
                auth_state_ref.get_master_password_hash().unwrap().as_str(),
            )
            .unwrap()
            {
                let result = auth_state_ref.set_encryption_key(master_password);
                Ok(true)
            } else {
                Ok(false)
            }
        } else {
            Ok(false)
        }
    } else {
        let hashed_password = hash(master_password.clone(), DEFAULT_COST).unwrap();

        // Create or open the file for writing
        let mut file = File::create(filepath).map_err(|e| {
            e.to_string() // Convert the error to a string using to_string
        })?;

        auth_state_ref.set_new_key(master_password);
        auth_state_ref.set_password_hash(hashed_password);
        println!(
            "{}",
            auth_state_ref.get_master_password_hash().unwrap().as_str()
        );
        auth_state_ref.save_to_file(filepath);
        auth_state_ref.load_from_file(filepath);
        auth_state_ref.set_auth(true);

        Ok(true)
    }
}

#[tauri::command]
async fn write_entry(
    app_handle: tauri::AppHandle,
    site: String,
    username: String,
    password: String,
) -> Result<SuccessResponse, String> {
    let authorized = authorize();

    if authorized {
        let filename_string = get_data_path(app_handle);
        let filename: &str = filename_string.as_str();
        let options = SqliteConnectOptions::new().filename(filename.clone());

        let mut conn_value: SqliteConnection = SqliteConnection::connect_with(&options)
            .await
            .map_err(|e| e.to_string())?;

        let conn: &mut SqliteConnection = &mut conn_value;

        let encryption_key = get_key();
        let enc_key: &[u8] = encryption_key.as_slice();

        let iv = [0x24; 16];
        let mut buf = [0u8; 48];
        let bytes: &[u8] = password.as_bytes();

        let salt: String = std::iter::repeat_with(fastrand::alphanumeric)
            .take(16)
            .collect();
        let mut key = [0x42; 16];
        Argon2::default()
            .hash_password_into(enc_key, &salt.as_str().as_bytes(), &mut key)
            .map_err(|e| e.to_string())?;

        let ciphertext = Aes128CbcEnc::new(&key.into(), &iv.into())
            .encrypt_padded_b2b_mut::<Pkcs7>(&bytes, &mut buf)
            .unwrap();

        let enc_password = hex::encode(ciphertext);

        // let mut buf = [0u8; 48];
        // let pt = Aes128CbcDec::new(&key.into(), &iv.into())
        //     .decrypt_padded_b2b_mut::<Pkcs7>(&ct, &mut buf)
        //     .unwrap();
        // let s2 = match String::from_utf8(pt.to_vec()) {
        //     Ok(s2) => s2, // If successful, return the string
        //     Err(e) => panic!("Invalid UTF-8: {}", e), // If failed, panic with the error
        // };

        sqlx::query("INSERT INTO PASSWORD_DATABASE VALUES ($1, $2, $3, $4)")
            .bind(site)
            .bind(username)
            .bind(enc_password)
            .bind(salt)
            .execute(conn)
            .await
            .map_err(|e| e.to_string())?;

        // Since authorization logic is not included in this function,
        // set authorized to true assuming the write operation succeeded
        Ok(SuccessResponse {
            success: true,
            authorized: true,
        })
    } else {
        Ok(SuccessResponse {
            success: false,
            authorized: false,
        })
    }
}

#[tauri::command]
fn lock_app() -> bool {
    let mut auth_state_ref = AUTH_STATE.lock().unwrap();
    auth_state_ref.remove_auth();
    return true;
}

// fn encrypt(plaintext: &[u8], key: &[u8; 16]) -> Vec<u8> {
//     let cipher = aes::Aes128::new(&key);
//     let mut ciphertext = plaintext.to_vec();
//     cipher.encrypt_block(&mut ciphertext);
//     ciphertext
// }

// fn decrypt(ciphertext: &[u8], key: &[u8; 16]) -> Vec<u8> {
//     let cipher = Aes128::new_varkey(key).unwrap();
//     let iv = [0u8; 16]; // Initialization vector (change for CBC mode)
//     let mut decryptor = AesCbc::new(cipher, &iv);

//     let mut plaintext = ciphertext.to_vec();
//     decryptor.decrypt(&mut plaintext);
//     plaintext
// }

#[derive(Serialize)]
struct GreetResponse {
    hash: Vec<u8>,
    encryptionkey: Vec<u8>,
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle();
            let dir_path_string = get_config_dir_path(app_handle);
            let dir_path: &str = dir_path_string.as_str();

            if let Err(e) = fs::create_dir_all(dir_path) {
                eprintln!("Error: {}", e);
            } else {
                println!("Directory '{}' created successfully", dir_path);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_entries,
            write_entry,
            delete_entry,
            edit_entry,
            get_password,
            authenticate,
            authorize,
            check_time,
            change_unlock_time,
            change_password,
            start_app,
            lock_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
