// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json::json;
use serde::Serialize;
use serde::Deserialize;
use sqlx::prelude::*;

// Import sqlx::sqlite::SqlitePool and sqlx::types::Json
use sqlx::types::Json;
use serde_json::from_value;
use sqlx::sqlite::{SqliteConnection, SqliteConnectOptions};

use std::fs;
use std::fs::File;
use std::io::Read;
use std::io::{Write};

extern crate bcrypt;

use bcrypt::{hash, verify, DEFAULT_COST};

use aes::Aes128;
use aes::cipher::{
    BlockCipher, BlockEncrypt, BlockDecrypt, KeyInit,
    generic_array::GenericArray,
};
use aes::cipher::{block_padding::Pkcs7, BlockDecryptMut, BlockEncryptMut, KeyIvInit};
use hex::{encode, decode};
use hex_literal::hex;

type Aes128CbcEnc = cbc::Encryptor<aes::Aes128>;
type Aes128CbcDec = cbc::Decryptor<aes::Aes128>;

// use block_modes::{BlockMode, Cbc};
// use block_modes::block_padding::NoPadding;

use argon2::{
    password_hash::{
        PasswordHash, PasswordHasher, PasswordVerifier, SaltString
    },
    Argon2
};

use rand::{Rng, thread_rng, rngs::OsRng};

// extern crate aes;
// extern crate pbkdf2;
// extern crate rand;

// use aes::Aes128;
// use aes::cipher::generic_array::GenericArray;
// use aes::cipher::BlockCipher;
// use aes::cipher::block_cipher_modes;
// use pbkdf2::{
//     password_hash::{
//         rand_core::OsRng,
//         PasswordHash, PasswordHasher, PasswordVerifier, SaltString
//     },
//     Pbkdf2
// };
// use pbkdf2::pbkdf2;
// use rand::Rng;
// use std::str;
// use sha2::Sha256;

// type AesCbc = block_cipher_modes::Cbc<Aes128>;

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
    master_password: Option<String>,
    master_password_hash: Option<String>,
    k2k: Option<String>,
    encryption_key: Option<Vec<u8>>,
    encryption_key_enc: Option<[u8; 32]>,
    time_of_entry: DateTime<Utc>,
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
            master_password: None,
            master_password_hash: None,
            k2k: None,
            encryption_key:None,
            encryption_key_enc:None,
            time_of_entry,
            salt,
            auth,
        }
    }

    fn save_to_file(&mut self, file_path: &str) -> Result<(), String> {
        let mut file = File::create(file_path).map_err(|e| {
            e.to_string() // Convert the error to a string using to_string
        })?;

        // Write master_password_hash to the file
        println!("136: {:?}", self.master_password_hash);
        if let Some(ref hash) = self.master_password_hash {
            writeln!(file, "master_password_hash: {}", hash).map_err(|e| {
                    e.to_string() // Convert the error to a string using to_string
                }
            )?;
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
                }
            )?;
        }

        Ok(())
    }

    fn set_new_key(&mut self, master_password: String) -> Result<(), String> {
        let mut rng = thread_rng();
        let enckey: [u8; 16] = rng.gen();
        self.encryption_key = Some(enckey.to_vec());
        let iv = [0x24; 16];
        let mut output_key_material = [0x42; 16]; // Can be any desired size
        let salt: String = std::iter::repeat_with(fastrand::alphanumeric).take(16).collect();
        self.salt = Some(salt);
        Argon2::default().hash_password_into(master_password.as_bytes(), self.salt.clone().unwrap().as_bytes(), &mut output_key_material).map_err(|e| e.to_string())?;
        let mut key = output_key_material;
        let mut buf = [0u8; 48];
        let ct = Aes128CbcEnc::new(&key.into(), &iv.into())
                    .encrypt_padded_b2b_mut::<Pkcs7>(&enckey, &mut buf)
                    .unwrap();
        self.encryption_key_enc = Some(ct[0..32].try_into().unwrap());
        Ok(())
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
                self.master_password_hash = Some(line.trim_start_matches("master_password_hash: ").to_string());
            } else if line.starts_with("encryption_key_enc: ") {
                let mut key_enc_str = line.trim_start_matches("encryption_key_enc: ").to_string();
                key_enc_str.retain(|c| c != ' '); // Remove spaces
                let mut key_enc = [0; 32];
                hex::decode_to_slice(key_enc_str, &mut key_enc).map_err(|e| {
                    e.to_string() // Convert the error to a string using to_string
                })?;
                self.encryption_key_enc = Some(key_enc);
                counter+=1;
            } else if line.starts_with("salt: ") {
                self.salt = Some(line.trim_start_matches("salt: ").to_string());
                counter+=1;
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
        let mut rng = thread_rng();
        let mut key = [0x42; 16]; // Can be any desired size
        Argon2::default().hash_password_into(password.as_bytes(), self.salt.clone().unwrap().as_bytes(), &mut key).map_err(|e| e.to_string())?;
        let iv = [0x24; 16];

        let mut buf = [0u8; 48];
        let pt = Aes128CbcDec::new(&key.into(), &iv.into())
            .decrypt_padded_b2b_mut::<Pkcs7>(&self.encryption_key_enc.unwrap(), &mut buf)
            .unwrap();

        self.encryption_key = Some(pt.to_vec());
        self.set_auth(true);

        Ok(())
    }


    fn get_encryption_key(&mut self) -> Vec<u8> {
        self.encryption_key.clone().unwrap_or_default()
    }

    fn get_master_password_hash(&mut self)  -> Option<String> {
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

            if duration > 60 {
                self.auth = false;
                return false;
            } else {
                return true;
            }
        } else {
            self.encryption_key = None;
            self.master_password_hash = None;
            return false;
        }
    }
}

struct DataBase {
    conn: Option<SqliteConnection>,
}

impl DataBase {
    fn new() -> Self {
        DataBase { conn: None }
    }
    async fn connect(&mut self) -> Result<(), String> {
        if self.conn.is_none() {
            let filename = "./passvault.db";
            let mut options = SqliteConnectOptions::new()
                .filename(filename);

            let conn = SqliteConnection::connect_with(&options).await.map_err(|e| e.to_string())?;

            self.conn = Some(conn);
        }

        Ok(())
    }
}

lazy_static! {
    static ref AUTH_STATE: std::sync::Mutex<AuthState> = std::sync::Mutex::new(AuthState::new());
}

#[derive(Serialize)]
struct GetEntriesResponse {
    success: bool,
    authorized: bool,
    entries: Option<Vec<PasswordLessEntry>>,
}

#[tauri::command]
async fn get_entries() -> Result<GetEntriesResponse, String> {
    let authorized = authorize();
    let mut response = GetEntriesResponse {
        success: false,
        authorized,
        entries: None,
    };

    if authorized {
        let filename = "./passvault.db";
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
async fn get_password(site: String, username: String) -> Result<GetPasswordResponse, String> {
    let authorized = authorize();
    let mut response = GetPasswordResponse {
        success: false,
        authorized,
        password: None,
    };

    if authorized {
        let filename = "./passvault.db";
        let options = SqliteConnectOptions::new().filename(filename);

        let mut conn_value: SqliteConnection = SqliteConnection::connect_with(&options)
            .await
            .map_err(|e| e.to_string())?;

        let conn: &mut SqliteConnection = &mut conn_value;

        // Use a different variable name for the query result
        let query_result = sqlx::query_as::<_, PasswordEntry>("SELECT * FROM password_database WHERE site = ? AND username = ?")
            .bind(site) // Bind the site value
            .bind(username) // Bind the username value
            .fetch_one(conn) // Fetch only one entry
            .await.map_err(|e| e.to_string());

        // Unwrap the query result only once and assign it to a variable
        let entry = query_result.unwrap();
        let encryption_key = get_key();
        let enc_key: &[u8] = encryption_key.as_slice();

        let iv = [0x24; 16];
        // Use the entry variable to get the password bytes
        let hex_bytes = hex::decode(entry.password).unwrap();
        let bytes: &[u8] = hex_bytes.as_slice();
        let pt_len = bytes.len();

        let salt = entry.salt.as_str().as_bytes();
        let mut key = [0x42; 16];
        Argon2::default().hash_password_into(enc_key, salt, &mut key).map_err(|e| e.to_string())?;

        let mut buf = [0u8; 48];
        let pt = Aes128CbcDec::new(&key.into(), &iv.into())
            .decrypt_padded_b2b_mut::<Pkcs7>(&bytes, &mut buf)
            .unwrap();
        
        // Convert the decrypted password to a string
        let s2 = match String::from_utf8(pt.to_vec()) {
            Ok(s2) => s2, // If successful, return the string
            Err(e) => panic!("Invalid UTF-8: {}", e), // If failed, panic with the error
        };

        // Use the query result directly in the match statement
        response.password = Some(s2);
        response.success = true;
    }

    Ok(response)
}


#[tauri::command]
async fn delete_entry(site: String, username: String) -> Result<SuccessResponse, String> {
    let authorized = authorize();

    if authorized {
        let filename = "./passvault.db";
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
async fn edit_entry(new_site: String, new_username: String, new_password: String, edit_site: String, edit_username: String) -> Result<SuccessResponse, String> {
    let authorized = authorize();

    if authorized {
        let filename = "./passvault.db";
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
            let pt_len = bytes.len();

            let salt: String = std::iter::repeat_with(fastrand::alphanumeric).take(16).collect();
            let mut key = [0x42; 16];
            Argon2::default().hash_password_into(enc_key, &salt.as_str().as_bytes(), &mut key).map_err(|e| e.to_string())?;
            
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
    let filepath: &str = "./passvault.bin";
    return auth_state_ref.is_authorized();
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
async fn start_app() -> Result<StartAppResponse, String> {
    let filepath: &str = "./passvault.bin";
    let database_path: &str = "./passvault.db";
    let mut config_good = true;
    let mut is_new_user = false;
    if file_exists(filepath) {
        config_good = load_auth(filepath);
    } else {
        is_new_user = true;
    }

    // Check if the file exists
    if !file_exists(database_path) {
        let mut file = File::create(database_path)
                        .map_err(|e| e.to_string())?;
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
    return Ok(StartAppResponse{
        success: true,
        is_new_user: is_new_user,
        config_good: config_good,
    });
}


#[tauri::command]
fn get_key() -> Vec<u8> {
    let mut auth_state_ref = AUTH_STATE.lock().unwrap();
    return auth_state_ref.get_encryption_key();
}

#[tauri::command]
async fn authenticate(master_password: String) -> Result<bool, String> {
    // Open the file for reading
    let mut auth_state_ref = AUTH_STATE.lock().unwrap();

    let filepath: &str = "./passvault.bin";
    if file_exists(filepath) {
        let success_loading = auth_state_ref.load_from_file(filepath);
        if (success_loading.unwrap())  {
            if verify(master_password.clone(), auth_state_ref.get_master_password_hash().unwrap().as_str()).unwrap() {
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
        println!("{}", auth_state_ref.get_master_password_hash().unwrap().as_str());
        auth_state_ref.save_to_file(filepath);
        auth_state_ref.load_from_file(filepath);
        auth_state_ref.set_auth(true);

        // Write the data to the file
        // file.write_all(bytes).map_err(|e| {
        //     e.to_string() // Convert the error to a string using to_string
        // })?;
        Ok(true)
    }
}

use typenum::U16;

#[tauri::command]
async fn write_entry(site: String, username: String, password: String) -> Result<SuccessResponse, String> {
    let authorized = authorize();

    if authorized {
        let filename = "./passvault.db";
        let options = SqliteConnectOptions::new().filename(filename);

        let mut conn_value: SqliteConnection = SqliteConnection::connect_with(&options)
            .await
            .map_err(|e| e.to_string())?;

        let conn: &mut SqliteConnection = &mut conn_value;

        let encryption_key = get_key();
        let enc_key: &[u8] = encryption_key.as_slice();

        let iv = [0x24; 16];
        let mut buf = [0u8; 48];
        let bytes: &[u8] = password.as_bytes();
        let pt_len = bytes.len();

        let salt: String = std::iter::repeat_with(fastrand::alphanumeric).take(16).collect();
        let mut key = [0x42; 16];
        Argon2::default().hash_password_into(enc_key, &salt.as_str().as_bytes(), &mut key).map_err(|e| e.to_string())?;
        
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

use std::env;
#[tauri::command]
async fn greet(name: &str) -> Result<GreetResponse, String> {
    let password = b"google"; // Bad password; don't actually use!
    let salt = b"example salt"; // Salt should be unique per password
    let mut rng = thread_rng();
    let enckey: [u8; 16] = rng.gen();

    let mut output_key_material = [0x42; 16]; // Can be any desired size
    Argon2::default().hash_password_into(password, salt, &mut output_key_material).map_err(|e| e.to_string())?;
    let mut key = output_key_material;
let iv = [0x24; 16];
let plaintext = *b"he";

// encrypt/decrypt in-place
// buffer must be big enough for padded plaintext
let mut buf = [0u8; 48];
let pt_len = 16;
buf[..pt_len].copy_from_slice(&enckey);

// encrypt/decrypt from buffer to buffer
let mut buf = [0u8; 48];
let ct = Aes128CbcEnc::new(&key.into(), &iv.into())
    .encrypt_padded_b2b_mut::<Pkcs7>(&enckey, &mut buf)
    .unwrap();

let mut buf = [0u8; 48];
let pt = Aes128CbcDec::new(&key.into(), &iv.into())
    .decrypt_padded_b2b_mut::<Pkcs7>(&ct, &mut buf)
    .unwrap();
// let s2 = match String::from_utf8(ct.to_vec()) {
//     Ok(s2) => s2, // If successful, return the string
//     Err(e) => panic!("Invalid UTF-8: {}", e), // If failed, panic with the error
// };
// assert_eq!(pt, &enckey);
print!("Yes, {:?}", ct);
    // Convert a string into a byte array
    let mut auth_state_ref = AUTH_STATE.lock().unwrap();

    // let password = b"hunter42"; // Bad password; don't actually use!
    // let salt = b"example salt"; // Salt should be unique per password

    let mut output_key_material = [0u8; 16]; // Can be any desired size
    Argon2::default().hash_password_into(password, salt, &mut output_key_material).map_err(|e| e.to_string())?;
    let s = "This is a sec";
    let mut bytes = s.as_bytes().to_vec();

    // Pad the byte array with zeros if needed
    let padding = 16 - (bytes.len() % 16);
    bytes.extend(vec![0u8; padding]);

    // Wrap the byte array in a GenericArray
    let mut block = GenericArray::clone_from_slice(&bytes);

    // // Convert another string into a byte array for the key
    // let k = "This is a secret"; // A string of 16 characters
    // let key_bytes = k.as_bytes().to_vec();

    // // Wrap the key byte array in a GenericArray
    let key = GenericArray::clone_from_slice(&output_key_material);

    let cipher = Aes128::new(&key);

    // Encrypt and decrypt the block as before
    let block_copy = block.clone();
    cipher.encrypt_block(&mut block);
    cipher.decrypt_block(&mut block);

    // let hashed_password = hash(auth_state_ref.get_master_password().unwrap_or("".to_string()), DEFAULT_COST).unwrap();
    

    // Convert the block into a byte array
    let bytes = block.to_vec();

    // Convert the byte array into a string
    let s1 = match String::from_utf8(bytes) {
        Ok(s1) => s1, // If successful, return the string
        Err(e) => panic!("Invalid UTF-8: {}", e), // If failed, panic with the error
    };

    // Print the string
    // println!("String: {}", s);

    let demo_key = auth_state_ref.get_encryption_key();
    match env::current_dir() {
        Ok(path) => {
            // Convert the PathBuf to a String using the to_string_lossy method.
            Ok(GreetResponse {
                hash: ct.to_vec(),
                encryptionkey: enckey.to_vec(),
            })
        }
        Err(e) => {
            // Return an error message as a String.
            Err(format!("Error: {}", e))
        }
    }
}


fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet, get_entries, write_entry, delete_entry, edit_entry, get_password, authenticate, authorize, start_app, lock_app])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
