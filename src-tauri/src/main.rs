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
        rand_core::OsRng,
        PasswordHash, PasswordHasher, PasswordVerifier, SaltString
    },
    Argon2
};

use rand::{Rng, thread_rng};

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
    salt: String,
    auth: bool,
}

// const master_password_hashC: String = "$2b$12$Rov4tLdIG/9HfBnKaqxR/ORWwGgsEUw0yPE4cMSTBqXMUxuWcAC5.";
// const encryption_key_encryptedC: String = ""

impl AuthState {
    fn new() -> Self {
        let time_of_entry = Utc::now();
        let auth = false;
        let salt = "example salt".to_string();
        AuthState {
            master_password: None,
            master_password_hash: Some("$2b$12$Rov4tLdIG/9HfBnKaqxR/ORWwGgsEUw0yPE4cMSTBqXMUxuWcAC5.".to_string()),
            k2k: None,
            encryption_key:None,
            encryption_key_enc:Some([7, 199, 26, 87, 127, 67, 163, 169, 14, 134, 92, 249, 245, 151, 233, 194, 174, 134, 218, 37, 99, 160, 160, 251, 146, 183, 128, 78, 160, 246, 212, 253]),
            time_of_entry,
            salt,
            auth,
        }
    }

    fn set_auth(&mut self, auth: bool) {
        self.time_of_entry = Utc::now();
        self.auth = auth;
    }

    fn set_encryption_key(&mut self, password: String) -> Result<(), String> {
        let mut rng = thread_rng();

        let mut key = [0x42; 16]; // Can be any desired size
        Argon2::default().hash_password_into(password.as_bytes(), self.salt.as_bytes(), &mut key).map_err(|e| e.to_string())?;
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
        self.encryption_key.take().unwrap_or_else(|| {
            Vec::new()
        })
    }

    fn get_master_password_hash(&mut self)  -> Option<String> {
        return self.master_password_hash.clone();
    }

    fn get_last_updated(&mut self) -> DateTime<Utc> {
        return self.time_of_entry;
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
            let filename = "../passvault.db";
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
    let authorized = authorize().await;
    let mut response = GetEntriesResponse {
        success: false,
        authorized,
        entries: None,
    };

    if authorized {
        let filename = "../passvault.db";
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
    entry: Option<PasswordEntry>,
}

#[tauri::command]
async fn get_password(site: String, username: String) -> Result<GetPasswordResponse, String> {
    let authorized = authorize().await;
    let mut response = GetPasswordResponse {
        success: false,
        authorized,
        entry: None,
    };

    if authorized {
        let filename = "../passvault.db";
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

        let encryption_key = get_key().await;
        let enc_key: &[u8] = encryption_key.as_slice();

        let iv = [0x24; 16];
        // Use the entry variable to get the password bytes
        let hex_bytes = hex::decode(entry.password).unwrap();
        let bytes: &[u8] = hex_bytes.as_slice();
        let pt_len = bytes.len();

        let salt = b"example salt";
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

        let password_entry  = PasswordEntry {
            password: s2,
        };

        // Use the query result directly in the match statement
        response.entry = Some(password_entry);
        response.success = true;
    }

    Ok(response)
}


#[tauri::command]
async fn delete_entry(site: String, username: String) -> Result<SuccessResponse, String> {
    let authorized = authorize().await;

    if authorized {
        let filename = "../passvault.db";
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


fn file_exists(file_path: &str) -> bool {
    if let Ok(metadata) = fs::metadata(file_path) {
        metadata.is_file()
    } else {
        false
    }
}

#[tauri::command]
async fn authorize() -> bool {
    let mut auth_state_ref = AUTH_STATE.lock().unwrap();
    return auth_state_ref.is_authorized();
}

#[tauri::command]
async fn get_key() -> Vec<u8> {
    let mut auth_state_ref = AUTH_STATE.lock().unwrap();
    return auth_state_ref.get_encryption_key();
}

#[tauri::command]
fn authenticate(master_password: String) -> Result<bool, String> {
    // Open the file for reading
    let mut auth_state_ref = AUTH_STATE.lock().unwrap();

    let filepath: &str = "./passvault.bin";
    if file_exists(filepath) {
        let mut file = File::open(filepath).map_err(|e| {
            e.to_string() // Convert the error to a string using to_string
        })?;
        
        // Read the content from the file into a buffer
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer).map_err(|e| {
            e.to_string() // Convert the error to a string using to_string
        })?;
        
        // Convert the buffer to a String
        let content = String::from_utf8_lossy(&buffer);
        
        if verify(master_password.clone(), auth_state_ref.get_master_password_hash().unwrap().as_str()).unwrap() {
            let result = auth_state_ref.set_encryption_key(master_password);
            Ok(true)
        } else {
            Ok(false)
        }
    } else {

        let hashed_password = hash(master_password, DEFAULT_COST).unwrap();

        // Create or open the file for writing
        let mut file = File::create(filepath).map_err(|e| {
            e.to_string() // Convert the error to a string using to_string
        })?;

        let bytes = hashed_password.as_bytes();

        // Write the data to the file
        file.write_all(bytes).map_err(|e| {
            e.to_string() // Convert the error to a string using to_string
        })?;
        Ok(true)
    }
}

use typenum::U16;

#[tauri::command]
async fn write_entry(site: String, username: String, password: String) -> Result<SuccessResponse, String> {
    let authorized = authorize().await;

    if authorized {
        let filename = "../passvault.db";
        let options = SqliteConnectOptions::new().filename(filename);

        let mut conn_value: SqliteConnection = SqliteConnection::connect_with(&options)
            .await
            .map_err(|e| e.to_string())?;

        let conn: &mut SqliteConnection = &mut conn_value;

        let encryption_key = get_key().await;
        let enc_key: &[u8] = encryption_key.as_slice();
        print!("Hello, {:?}", enc_key);

        let iv = [0x24; 16];
        let mut buf = [0u8; 48];
        let bytes: &[u8] = password.as_bytes();
        let pt_len = bytes.len();

        let salt = b"example salt";
        let mut key = [0x42; 16];
        Argon2::default().hash_password_into(enc_key, salt, &mut key).map_err(|e| e.to_string())?;
        
        let ct = Aes128CbcEnc::new(&key.into(), &iv.into())
            .encrypt_padded_b2b_mut::<Pkcs7>(&bytes, &mut buf)
            .unwrap();

        let enc_password = hex::encode(ct);

        // let mut buf = [0u8; 48];
        // let pt = Aes128CbcDec::new(&key.into(), &iv.into())
        //     .decrypt_padded_b2b_mut::<Pkcs7>(&ct, &mut buf)
        //     .unwrap();
        // let s2 = match String::from_utf8(pt.to_vec()) {
        //     Ok(s2) => s2, // If successful, return the string
        //     Err(e) => panic!("Invalid UTF-8: {}", e), // If failed, panic with the error
        // };

        sqlx::query("INSERT INTO PASSWORD_DATABASE VALUES ($1, $2, $3)")
            .bind(site)
            .bind(username)
            .bind(enc_password)
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
        .invoke_handler(tauri::generate_handler![greet, get_entries, write_entry, delete_entry, get_password, authenticate, authorize])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
