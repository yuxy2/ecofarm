import hashlib

def hash_password(password: str, salt: str) -> str:
    salt_bytes = bytes.fromhex(salt)
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt_bytes, 100000)
    return pwd_hash.hex()

old_salt = "58cc503e74b69f0b3a0c29cb3893359f"
old_hash = "3ec426e5b61d8d57dd4231f7872b0de03766f8dd01743666f96597301ed6d151"

for test_pw in ["admin", "admin123", "admin1234", "password", "123456"]:
    h = hash_password(test_pw, old_salt)
    if h == old_hash:
        print(f"MATCH FOUND! Password is: {test_pw}")
        break
else:
    print("No match found in common passwords.")
