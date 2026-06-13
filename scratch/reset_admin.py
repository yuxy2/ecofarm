import os
import json
import hashlib
import secrets
from pymongo import MongoClient

MONGO_URI = "mongodb+srv://yusaufcok:2wsx1qaz@ecofarming.gc63zfg.mongodb.net/?appName=ecofarming"
USERS_FALLBACK_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "api", "users_fallback.json")

def hash_password(password: str, salt: str = None) -> tuple:
    if salt is None:
        salt = secrets.token_hex(16)
    salt_bytes = bytes.fromhex(salt)
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt_bytes, 100000)
    return pwd_hash.hex(), salt

def main():
    target_password = "admin123"
    new_hash, new_salt = hash_password(target_password)
    print(f"Password '{target_password}' hashed to:")
    print(f"Hash: {new_hash}")
    print(f"Salt: {new_salt}")
    
    # 1. Update MongoDB Atlas
    print("\nConnecting to MongoDB Atlas...")
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        db = client["ecofarming"]
        users_col = db["users"]
        client.admin.command('ping')
        print("Connected successfully to MongoDB Atlas!")
        
        # Check if admin exists
        admin_user = users_col.find_one({"username": "admin"})
        if admin_user:
            print("Found existing admin user in MongoDB. Resetting password to 'admin123'...")
            users_col.update_one(
                {"username": "admin"},
                {"$set": {
                    "password_hash": new_hash,
                    "salt": new_salt,
                    "updated_at": hashlib.sha256(secrets.token_bytes(4)).hex() # force update time or field
                }}
            )
            print("Admin password updated in MongoDB Atlas.")
        else:
            print("Admin user not found in MongoDB. Creating new admin user...")
            users_col.insert_one({
                "username": "admin",
                "password_hash": new_hash,
                "salt": new_salt,
                "role": "admin",
                "created_at": "2026-06-11T06:44:06.329507Z"
            })
            print("Admin user created in MongoDB Atlas.")
    except Exception as e:
        print(f"Error connecting to MongoDB Atlas: {e}")

    # 2. Update Local Fallback File
    print("\nUpdating local fallback file...")
    if os.path.exists(USERS_FALLBACK_FILE):
        try:
            with open(USERS_FALLBACK_FILE, "r", encoding="utf-8") as f:
                users = json.load(f)
            
            # Find and update admin
            admin_found = False
            for user in users:
                if user["username"] == "admin":
                    user["password_hash"] = new_hash
                    user["salt"] = new_salt
                    user["role"] = "admin"
                    admin_found = True
                    break
            
            if not admin_found:
                users.append({
                    "username": "admin",
                    "password_hash": new_hash,
                    "salt": new_salt,
                    "role": "admin",
                    "created_at": "2026-06-11T06:44:06.329507Z"
                })
            
            with open(USERS_FALLBACK_FILE, "w", encoding="utf-8") as f:
                json.dump(users, f, indent=2)
            print("Local fallback file updated successfully!")
        except Exception as e:
            print(f"Error updating local fallback file: {e}")
    else:
        print(f"Local fallback file not found at {USERS_FALLBACK_FILE}!")

if __name__ == "__main__":
    main()
