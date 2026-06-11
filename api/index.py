import os
import pickle
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import hashlib
import hmac
import secrets
import json
import math
from pymongo import MongoClient
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Inisialisasi FastAPI
app = FastAPI(
    title="EcoFarming Crop Recommendation API",
    description="API untuk merekomendasikan tanaman menggunakan Naive Bayes",
    version="1.0.0"
)

# Aktifkan CORS agar frontend Next.js dapat memanggil API ini
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Konfigurasi MongoDB
MONGO_URI = "mongodb+srv://yusaufcok:2wsx1qaz@ecofarming.gc63zfg.mongodb.net/?appName=ecofarming"
db = None
history_col = None
users_col = None
sessions_col = None

FALLBACK_FILE = os.path.join(os.path.dirname(__file__), "history_fallback.json")
USERS_FALLBACK_FILE = os.path.join(os.path.dirname(__file__), "users_fallback.json")
SESSIONS_FALLBACK_FILE = os.path.join(os.path.dirname(__file__), "sessions_fallback.json")

def load_fallback_history():
    if os.path.exists(FALLBACK_FILE):
        try:
            with open(FALLBACK_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Peringatan: Gagal memuat riwayat lokal: {e}")
    return []

def save_fallback_history(history_list):
    try:
        with open(FALLBACK_FILE, "w", encoding="utf-8") as f:
            json.dump(history_list, f, indent=2, default=str)
    except Exception as e:
        print(f"Peringatan: Gagal menyimpan riwayat lokal: {e}")

def load_fallback_users():
    if os.path.exists(USERS_FALLBACK_FILE):
        try:
            with open(USERS_FALLBACK_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Peringatan: Gagal memuat user lokal: {e}")
    return []

def save_fallback_users(users_list):
    try:
        with open(USERS_FALLBACK_FILE, "w", encoding="utf-8") as f:
            json.dump(users_list, f, indent=2)
    except Exception as e:
        print(f"Peringatan: Gagal menyimpan user lokal: {e}")

def load_fallback_sessions():
    if os.path.exists(SESSIONS_FALLBACK_FILE):
        try:
            with open(SESSIONS_FALLBACK_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Peringatan: Gagal memuat sesi lokal: {e}")
    return {}

def save_fallback_sessions(sessions_dict):
    try:
        with open(SESSIONS_FALLBACK_FILE, "w", encoding="utf-8") as f:
            json.dump(sessions_dict, f, indent=2)
    except Exception as e:
        print(f"Peringatan: Gagal menyimpan sesi lokal: {e}")

# Password Hashing Helpers
def hash_password(password: str, salt: str = None) -> tuple:
    if salt is None:
        salt = secrets.token_hex(16)
    salt_bytes = bytes.fromhex(salt)
    # Gunakan 100,000 iterasi PBKDF2 dengan SHA-256
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt_bytes, 100000)
    return pwd_hash.hex(), salt

def verify_password(password: str, password_hash: str, salt: str) -> bool:
    new_hash, _ = hash_password(password, salt)
    return hmac.compare_digest(new_hash, password_hash)

# Seeding Default Admin Account
def seed_admin_account():
    # Cek admin di MongoDB
    if users_col is not None:
        try:
            admin_user = users_col.find_one({"username": "admin"})
            if not admin_user:
                h_pass, salt = hash_password("admin123")
                users_col.insert_one({
                    "username": "admin",
                    "password_hash": h_pass,
                    "salt": salt,
                    "role": "admin",
                    "created_at": datetime.utcnow().isoformat() + "Z"
                })
                print("Akun admin default berhasil dibuat di MongoDB Atlas.")
            return
        except Exception as e:
            print(f"Gagal memeriksa/membuat admin di MongoDB: {e}")

    # Cek admin di lokal fallback
    users = load_fallback_users()
    admin_exists = any(u["username"] == "admin" for u in users)
    if not admin_exists:
        h_pass, salt = hash_password("admin123")
        users.append({
            "username": "admin",
            "password_hash": h_pass,
            "salt": salt,
            "role": "admin",
            "created_at": datetime.utcnow().isoformat() + "Z"
        })
        save_fallback_users(users)
        print("Akun admin default berhasil dibuat secara lokal.")

def init_mongodb():
    global db, history_col, users_col, sessions_col
    try:
        # Gunakan serverSelectionTimeoutMS=2000 agar tidak hang terlalu lama jika terjadi kegagalan jaringan/whitelist
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
        db = client["ecofarming"]
        history_col = db["history"]
        users_col = db["users"]
        sessions_col = db["sessions"]
        # Tes koneksi dengan ping admin
        client.admin.command('ping')
        print("Koneksi MongoDB Atlas berhasil!")
    except Exception as e:
        print(f"Peringatan: Gagal terhubung ke MongoDB Atlas ({e}). Menggunakan penyimpanan lokal sebagai fallback.")
        db = None
        history_col = None
        users_col = None
        sessions_col = None
    
    # Jalankan pembenihan admin bawaan
    seed_admin_account()

# Panggil fungsi inisialisasi MongoDB saat startup
init_mongodb()

# Path model
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model_tanaman.pkl")
model_data = None

def load_model():
    global model_data
    if os.path.exists(MODEL_PATH):
        try:
            with open(MODEL_PATH, "rb") as f:
                model_data = pickle.load(f)
            print("Model berhasil dimuat dari model_tanaman.pkl")
        except Exception as e:
            print(f"Error saat memuat model: {e}")
    else:
        print(f"File model tidak ditemukan di {MODEL_PATH}. Pastikan untuk melatih model terlebih dahulu.")

# Panggil fungsi muat model saat startup
load_model()

# Auth Schemas
class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=20)
    password: str = Field(..., min_length=6)

class UserLoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=20)
    password: str = Field(..., min_length=6)

# Sesi memori jika MongoDB offline
local_active_sessions = {}  # token: {username, role, expires_at}

def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Sesi tidak valid atau Anda belum login.")
    token = authorization.split(" ")[1]

    # Cek di MongoDB
    if sessions_col is not None:
        try:
            session = sessions_col.find_one({"token": token})
            if session:
                # Cek kadaluarsa
                expires_at = datetime.fromisoformat(session["expires_at"].replace("Z", ""))
                if expires_at < datetime.utcnow():
                    sessions_col.delete_one({"token": token})
                    raise HTTPException(status_code=401, detail="Sesi telah berakhir. Silakan login kembali.")
                return {"username": session["username"], "role": session["role"]}
        except Exception as e:
            print(f"Gagal menanyakan sesi di MongoDB: {e}")

    # Fallback ke memory sessions
    global local_active_sessions
    if token in local_active_sessions:
        session = local_active_sessions[token]
        expires_at = datetime.fromisoformat(session["expires_at"].replace("Z", ""))
        if expires_at < datetime.utcnow():
            del local_active_sessions[token]
            raise HTTPException(status_code=401, detail="Sesi telah berakhir. Silakan login kembali.")
        return {"username": session["username"], "role": session["role"]}

    raise HTTPException(status_code=401, detail="Sesi tidak ditemukan atau telah kedaluwarsa. Silakan login kembali.")

# Model Skema Request
class CropPredictRequest(BaseModel):
    N: int = Field(..., description="Kategori Nitrogen (1=Rendah, 2=Sedang, 3=Tinggi)", ge=1, le=3)
    P: int = Field(..., description="Kategori Fosfor (1=Rendah, 2=Sedang, 3=Tinggi)", ge=1, le=3)
    K: int = Field(..., description="Kategori Kalium (1=Rendah, 2=Sedang, 3=Tinggi)", ge=1, le=3)
    temperature: int = Field(..., description="Kategori Temperatur (1=Rendah, 2=Sedang, 3=Tinggi)", ge=1, le=3)
    humidity: int = Field(..., description="Kategori Kelembaban (1=Rendah, 2=Sedang, 3=Tinggi)", ge=1, le=3)
    ph: int = Field(..., description="Kategori pH Tanah (1=Masam, 2=Netral, 3=Basa)", ge=1, le=3)
    rainfall: int = Field(..., description="Kategori Curah Hujan (1=Rendah, 2=Sedang, 3=Tinggi)", ge=1, le=3)
    irigasi: int = Field(1, description="Ketersediaan irigasi (0 = Tidak Ada, 1 = Ada)", ge=0, le=1)
    selected_model: str = Field("Naive Bayes", description="Model klasifikasi yang dipilih")

# Informasi Budidaya Tanaman
CROP_ADVICE_CATALOG = {
    "Padi": {
        "deskripsi": "Padi adalah tanaman pangan utama yang membutuhkan banyak air dan tanah kaya nitrogen.",
        "jarak_tanam": "20 x 20 cm atau 25 x 25 cm (metode Tegel atau Legowo).",
        "pupuk_utama": "Urea (Nitrogen), SP-36 (Fosfor), KCl (Kalium).",
        "waktu_panen": "110 - 120 hari setelah tanam.",
        "tips_sukses": "Jaga genangan air sekitar 2-5 cm pada fase vegetatif, dan keringkan lahan menjelang panen."
    },
    "Jagung": {
        "deskripsi": "Jagung tumbuh subur di lahan kering dengan sinar matahari penuh and drainase yang baik.",
        "jarak_tanam": "75 x 20 cm dengan 1 tanaman per lubang.",
        "pupuk_utama": "Pupuk NPK, Urea, dan pupuk kandang matang.",
        "waktu_panen": "90 - 105 hari setelah tanam.",
        "tips_sukses": "Lakukan pembumbunan tanah di sekitar batang untuk memperkokoh tanaman dan mencegah rebah rebah."
    },
    "Kopi": {
        "deskripsi": "Kopi (terutama Arabika) tumbuh optimal di daerah pegunungan yang sejuk dengan curah hujan tinggi dan teduh.",
        "jarak_tanam": "2.5 x 2.5 meter atau 2.75 x 2.75 meter.",
        "pupuk_utama": "Kompos organik, SP-36, dan urea secara berkala.",
        "waktu_panen": "2.5 - 3 tahun pertama untuk buah pertama, matang sekitar 9 bulan setelah berbunga.",
        "tips_sukses": "Tanam pohon pelindung (seperti sengon atau lamtoro) untuk mengatur intensitas sinar matahari yang diterima kopi."
    }
}

LABEL_MAP = {
    "N": {1: "Rendah", 2: "Sedang", 3: "Tinggi"},
    "P": {1: "Rendah", 2: "Sedang", 3: "Tinggi"},
    "K": {1: "Rendah", 2: "Sedang", 3: "Tinggi"},
    "temperature": {1: "Rendah (<20°C)", 2: "Sedang (20-25°C)", 3: "Tinggi (>25°C)"},
    "humidity": {1: "Rendah (<55%)", 2: "Sedang (55-70%)", 3: "Tinggi (>70%)"},
    "ph": {1: "Masam (<5.5)", 2: "Netral (5.5-7.0)", 3: "Basa (>7.0)"},
    "rainfall": {1: "Rendah (<100 mm)", 2: "Sedang (100-200 mm)", 3: "Tinggi (>200 mm)"},
    "irigasi": {0: "Tidak Ada", 1: "Ada"}
}

def generate_custom_advice(user_inputs, predicted_crop, ideal_profile):
    """
    Membandingkan input kategori user dengan profil ideal kategori tanaman.
    """
    tips = []
    
    # Periksa Nitrogen (N)
    if user_inputs["N"] < ideal_profile["N"]:
        tips.append({
            "parameter": "Nitrogen (N)",
            "status": LABEL_MAP["N"][user_inputs["N"]],
            "keterangan": f"Kadar N tanah Anda ({LABEL_MAP['N'][user_inputs['N']]}) di bawah optimal untuk {predicted_crop} (ideal: {LABEL_MAP['N'][ideal_profile['N']]}).",
            "saran": "Tambahkan pupuk Nitrogen seperti Urea atau ZA, atau gunakan pupuk kandang matang dari kotoran ayam/kambing."
        })
    
    # Periksa Fosfor (P)
    if user_inputs["P"] < ideal_profile["P"]:
        tips.append({
            "parameter": "Fosfor (P)",
            "status": LABEL_MAP["P"][user_inputs["P"]],
            "keterangan": f"Kadar P tanah Anda ({LABEL_MAP['P'][user_inputs['P']]}) kurang ideal untuk {predicted_crop} (ideal: {LABEL_MAP['P'][ideal_profile['P']]}).",
            "saran": "Gunakan pupuk SP-36, TSP, atau tepung tulang organik untuk merangsang perkembangan akar."
        })
        
    # Periksa Kalium (K)
    if user_inputs["K"] < ideal_profile["K"]:
        tips.append({
            "parameter": "Kalium (K)",
            "status": LABEL_MAP["K"][user_inputs["K"]],
            "keterangan": f"Kadar K tanah Anda ({LABEL_MAP['K'][user_inputs['K']]}) di bawah ideal untuk {predicted_crop} (ideal: {LABEL_MAP['K'][ideal_profile['K']]}).",
            "saran": "Gunakan pupuk KCl atau abu kayu bakar untuk meningkatkan kesehatan tanaman."
        })

    # Periksa pH tanah
    if user_inputs["ph"] != ideal_profile["ph"]:
        status_text = LABEL_MAP["ph"][user_inputs["ph"]]
        ideal_text = LABEL_MAP["ph"][ideal_profile["ph"]]
        if user_inputs["ph"] == 1:
            tips.append({
                "parameter": "Keasaman Tanah (pH)",
                "status": status_text,
                "keterangan": f"pH tanah Anda {status_text}, sedangkan idealnya adalah {ideal_text}.",
                "saran": "Taburkan kapur pertanian (Dolomit atau Kalsit) sekitar 2-4 minggu sebelum penanaman untuk menaikkan pH."
            })
        elif user_inputs["ph"] == 3:
            tips.append({
                "parameter": "Keasaman Tanah (pH)",
                "status": status_text,
                "keterangan": f"pH tanah Anda {status_text}, sedangkan idealnya adalah {ideal_text}.",
                "saran": "Tambahkan belerang bubuk (sulfur) atau kompos organik dalam jumlah banyak untuk membantu menurunkan pH."
            })

    # Periksa Curah Hujan (Rainfall)
    if user_inputs["rainfall"] < ideal_profile["rainfall"]:
        tips.append({
            "parameter": "Curah Hujan (Air)",
            "status": LABEL_MAP["rainfall"][user_inputs["rainfall"]],
            "keterangan": f"Curah hujan di daerah Anda ({LABEL_MAP['rainfall'][user_inputs['rainfall']]}) kurang dari kebutuhan alami {predicted_crop} (ideal: {LABEL_MAP['rainfall'][ideal_profile['rainfall']]}).",
            "saran": "Buat sistem irigasi tetes atau lakukan penyiraman tambahan secara manual secara teratur (pagi/sore)."
        })
    elif user_inputs["rainfall"] > ideal_profile["rainfall"]:
        tips.append({
            "parameter": "Curah Hujan (Air)",
            "status": LABEL_MAP["rainfall"][user_inputs["rainfall"]],
            "keterangan": f"Curah hujan di daerah Anda ({LABEL_MAP['rainfall'][user_inputs['rainfall']]}) melebihi kebutuhan alami {predicted_crop} (ideal: {LABEL_MAP['rainfall'][ideal_profile['rainfall']]}).",
            "saran": "Pastikan sistem drainase/parit di lahan dibuat dalam dan bersih agar air tidak menggenang."
        })

    # Periksa Irigasi
    if "irigasi" in ideal_profile:
        irigasi_val = user_inputs.get("irigasi", 1)
        if ideal_profile["irigasi"] == 1 and irigasi_val == 0:
            tips.append({
                "parameter": "Sistem Irigasi",
                "status": "Tidak Ada",
                "keterangan": f"Tanaman {predicted_crop} sangat membutuhkan sistem irigasi yang baik, tetapi lahan Anda tidak memilikinya.",
                "saran": "Pertimbangkan untuk membuat saluran irigasi buatan atau sistem pengairan pompa air."
            })

    # Jika semua parameter relatif seimbang
    if not tips:
        tips.append({
            "parameter": "Kondisi Lahan",
            "status": "Sangat Sesuai",
            "keterangan": "Kondisi tanah dan iklim Anda sudah sangat sesuai dengan profil ideal tanaman ini.",
            "saran": "Pertahankan kesuburan tanah dengan pemeliharaan organik rutin dan rotasi tanaman yang baik."
        })

    return tips

@app.get("/api/health")
def health():
    global model_data
    # Coba muat ulang jika belum dimuat
    if model_data is None:
        load_model()
        
    if model_data is None:
        return {
            "status": "warning",
            "message": "API berjalan tetapi file model_tanaman.pkl belum dimuat/ditemukan."
        }
        
    return {
        "status": "healthy",
        "accuracies": model_data.get("accuracies"),
        "features": model_data.get("features"),
        "classes": model_data.get("classes")
    }

def calculate_smoothed_nb_probabilities(nb_model, scaler, features, inputs):
    # Scale inputs
    input_list = [inputs[f] for f in features]
    input_df = pd.DataFrame([input_list], columns=features)
    input_scaled = scaler.transform(input_df)[0]
    
    classes = list(nb_model.classes_)
    class_prior = list(nb_model.class_prior_)
    
    log_numerators = []
    
    for c_idx, c_name in enumerate(classes):
        prior = float(class_prior[c_idx])
        log_l = math.log(prior)
        
        for f_idx, f_name in enumerate(features):
            val_scaled = float(input_scaled[f_idx])
            mean = float(nb_model.theta_[c_idx][f_idx])
            variance = float(nb_model.var_[c_idx][f_idx])
            eps = float(getattr(nb_model, "epsilon_", 1e-9))
            var_eps = variance + eps
            
            # Floor exponent to prevent float underflow
            pdf_exponent = -((val_scaled - mean) ** 2) / (2 * var_eps)
            pdf_exponent = max(pdf_exponent, -15.0)
            
            pdf_denominator = math.sqrt(2 * math.pi * var_eps)
            log_pdf = pdf_exponent - math.log(pdf_denominator)
            log_l += log_pdf
            
        log_numerators.append(log_l)
        
    # Apply dynamic temperature scaling to make probabilities smooth
    max_log_num = max(log_numerators)
    diffs = [ln - max_log_num for ln in log_numerators]
    min_diff = min(diffs)
    
    # If the range is large, scale it so the minimum class gets ~1-5%
    T = max(abs(min_diff) / 4.0, 1.0)
    
    scaled_diffs = [d / T for d in diffs]
    exps = [math.exp(sd) for sd in scaled_diffs]
    sum_exps = sum(exps)
    probs = [e / sum_exps for e in exps]
    
    prob_dict = {classes[i]: float(probs[i]) for i in range(len(classes))}
    prediction = classes[int(np.argmax(probs))]
    confidence = float(np.max(probs))
    
    return prediction, confidence, prob_dict

@app.post("/api/predict")
def predict(request: CropPredictRequest, current_user: dict = Depends(get_current_user)):
    global model_data
    if model_data is None:
        load_model()
        
    if model_data is None:
        raise HTTPException(status_code=503, detail="Model machine learning belum siap. Silakan jalankan script latihan terlebih dahulu.")

    # Ambil data input
    inputs = {
        "N": request.N,
        "P": request.P,
        "K": request.K,
        "temperature": request.temperature,
        "humidity": request.humidity,
        "ph": request.ph,
        "rainfall": request.rainfall,
        "irigasi": request.irigasi
    }
    
    # 1. Prediksi Naive Bayes
    nb_model = model_data["nb"]
    scaler = model_data["scaler"]
    features = model_data["features"]
    
    # Calculate smoothed probabilities using dynamic temperature scaling
    nb_prediction, nb_confidence, nb_prob_dict = calculate_smoothed_nb_probabilities(
        nb_model, scaler, features, inputs
    )
    print("DEBUG: smoothed probs =", nb_prob_dict)
    
    # Dapatkan saran kustom dan profil ideal untuk hasil
    profiles = model_data["profiles"]
    
    nb_ideal = profiles.get(nb_prediction)
    nb_advice_static = CROP_ADVICE_CATALOG.get(nb_prediction, {})
    nb_custom_advice = generate_custom_advice(inputs, nb_prediction, nb_ideal)
    
    # Simpan hasil analisis ke MongoDB atau Local Fallback
    # (KNN disamakan dengan Naive Bayes untuk mencegah error pada riwayat lama)
    record_data = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "inputs": inputs,
        "selected_model": "Naive Bayes",
        "agreement": True,
        "user": current_user["username"],
        "knn": {
            "prediction": nb_prediction,
            "confidence": nb_confidence
        },
        "nb": {
            "prediction": nb_prediction,
            "confidence": nb_confidence
        }
    }

    if history_col is not None:
        try:
            db_record = record_data.copy()
            db_record["timestamp"] = datetime.utcnow()
            history_col.insert_one(db_record)
            print("Prediksi berhasil dicatat di MongoDB!")
        except Exception as db_err:
            print(f"Gagal mencatat prediksi ke MongoDB: {db_err}. Menyimpan ke lokal.")
            # Fallback ke penyimpanan lokal
            fallback_history = load_fallback_history()
            record_data["id"] = "fallback_" + str(int(datetime.utcnow().timestamp() * 1000))
            fallback_history.insert(0, record_data)
            save_fallback_history(fallback_history[:50])
    else:
        # Gunakan local fallback langsung
        fallback_history = load_fallback_history()
        record_data["id"] = "fallback_" + str(int(datetime.utcnow().timestamp() * 1000))
        fallback_history.insert(0, record_data)
        save_fallback_history(fallback_history[:50])
        print("Prediksi berhasil dicatat di penyimpanan lokal!")
            
    return {
        "inputs": inputs,
        "selected_model": "Naive Bayes",
        "agreement": True,
        "knn": {
            "prediction": nb_prediction,
            "confidence": nb_confidence,
            "probabilities": nb_prob_dict,
            "ideal_profile": nb_ideal,
            "advice": nb_advice_static,
            "custom_advice": nb_custom_advice
        },
        "nb": {
            "prediction": nb_prediction,
            "confidence": nb_confidence,
            "probabilities": nb_prob_dict,
            "ideal_profile": nb_ideal,
            "advice": nb_advice_static,
            "custom_advice": nb_custom_advice
        }
    }

@app.get("/api/history")
def get_history(current_user: dict = Depends(get_current_user)):
    # Coba ambil dari MongoDB jika aktif
    if history_col is not None:
        try:
            # Jika admin, ambil semua. Jika user biasa, filter berdasarkan username.
            query = {} if current_user["role"] == "admin" else {"user": current_user["username"]}
            # Menambah limit ke 50 jika admin agar riwayat lebih lengkap
            limit_val = 50 if current_user["role"] == "admin" else 10
            cursor = history_col.find(query).sort("timestamp", -1).limit(limit_val)
            history = []
            for doc in cursor:
                knn_data = doc.get("knn") if isinstance(doc.get("knn"), dict) else {}
                nb_data = doc.get("nb") if isinstance(doc.get("nb"), dict) else {}
                history.append({
                    "id": str(doc["_id"]),
                    "timestamp": doc.get("timestamp").isoformat() if doc.get("timestamp") else None,
                    "inputs": doc.get("inputs"),
                    "selected_model": doc.get("selected_model", "Naive Bayes"),
                    "agreement": doc.get("agreement"),
                    "knn_prediction": knn_data.get("prediction"),
                    "knn_confidence": knn_data.get("confidence"),
                    "nb_prediction": nb_data.get("prediction"),
                    "nb_confidence": nb_data.get("confidence"),
                    "user": doc.get("user", "anonim")
                })
            return history
        except Exception as e:
            print(f"Gagal mengambil riwayat dari MongoDB, beralih ke lokal: {e}")
            
    # Ambil dari penyimpanan lokal sebagai fallback
    fallback_history = load_fallback_history()
    formatted_history = []
    
    # Filter by user if not admin
    user_history = fallback_history
    if current_user["role"] != "admin":
        user_history = [item for item in fallback_history if item.get("user") == current_user["username"]]
        
    limit_val = 50 if current_user["role"] == "admin" else 10
    for item in user_history[:limit_val]:
        knn_data = item.get("knn") if isinstance(item.get("knn"), dict) else {}
        nb_data = item.get("nb") if isinstance(item.get("nb"), dict) else {}
        formatted_history.append({
            "id": item.get("id", "fallback_" + str(item.get("timestamp"))),
            "timestamp": item.get("timestamp"),
            "inputs": item.get("inputs"),
            "selected_model": item.get("selected_model", "Naive Bayes"),
            "agreement": item.get("agreement"),
            "knn_prediction": knn_data.get("prediction"),
            "knn_confidence": knn_data.get("confidence"),
            "nb_prediction": nb_data.get("prediction"),
            "nb_confidence": nb_data.get("confidence"),
            "user": item.get("user", "anonim")
        })
    return formatted_history

@app.delete("/api/history")
def delete_history(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Hanya admin yang diperbolehkan menghapus riwayat prediksi.")
        
    deleted_count = 0
    # Coba bersihkan MongoDB
    if history_col is not None:
        try:
            result = history_col.delete_many({})
            deleted_count = result.deleted_count
        except Exception as e:
            print(f"Gagal membersihkan riwayat di MongoDB: {e}")
            
    # Bersihkan file fallback lokal
    if os.path.exists(FALLBACK_FILE):
        try:
            os.remove(FALLBACK_FILE)
            print("Penyimpanan lokal berhasil dibersihkan.")
        except Exception as e:
            print(f"Gagal membersihkan penyimpanan lokal: {e}")
            
    return {
        "message": "Semua riwayat berhasil dibersihkan.",
        "deleted_count": deleted_count
    }

@app.delete("/api/history/{history_id}")
def delete_single_history(history_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Hanya admin yang diperbolehkan menghapus riwayat prediksi.")
        
    # Hapus dari MongoDB jika aktif
    if history_col is not None:
        try:
            if not history_id.startswith("fallback_"):
                from bson import ObjectId
                result = history_col.delete_one({"_id": ObjectId(history_id)})
                if result.deleted_count > 0:
                    return {"message": "Riwayat berhasil dihapus dari database."}
        except Exception as e:
            print(f"Gagal menghapus riwayat di MongoDB: {e}")
            
    # Hapus dari file fallback lokal
    try:
        fallback_history = load_fallback_history()
        updated_history = [item for item in fallback_history if item.get("id") != history_id]
        if len(updated_history) < len(fallback_history):
            save_fallback_history(updated_history)
            return {"message": "Riwayat berhasil dihapus secara lokal."}
    except Exception as e:
        print(f"Gagal menghapus riwayat lokal: {e}")
        
    return {"message": "Riwayat berhasil dihapus (lokal/database)."}

# Auth Routes
@app.post("/api/auth/register")
def register(request: UserRegisterRequest):
    # Periksa kesediaan username di MongoDB
    if users_col is not None:
        try:
            existing = users_col.find_one({"username": request.username})
            if existing:
                raise HTTPException(status_code=400, detail="Username sudah terdaftar.")
            h_pass, salt = hash_password(request.password)
            users_col.insert_one({
                "username": request.username,
                "password_hash": h_pass,
                "salt": salt,
                "role": "user",
                "created_at": datetime.utcnow().isoformat() + "Z"
            })
            return {"message": "Registrasi berhasil!"}
        except Exception as e:
            print(f"Gagal registrasi di MongoDB: {e}")

    # Fallback ke penyimpanan lokal
    users = load_fallback_users()
    if any(u["username"] == request.username for u in users):
        raise HTTPException(status_code=400, detail="Username sudah terdaftar.")
    h_pass, salt = hash_password(request.password)
    users.append({
        "username": request.username,
        "password_hash": h_pass,
        "salt": salt,
        "role": "user",
        "created_at": datetime.utcnow().isoformat() + "Z"
    })
    save_fallback_users(users)
    return {"message": "Registrasi berhasil secara lokal!"}

@app.post("/api/auth/login")
def login(request: UserLoginRequest):
    user = None
    
    # Cari di MongoDB
    if users_col is not None:
        try:
            user = users_col.find_one({"username": request.username})
        except Exception as e:
            print(f"Gagal mencari user di MongoDB: {e}")

    # Cari di Fallback Lokal
    if user is None:
        users = load_fallback_users()
        found = [u for u in users if u["username"] == request.username]
        if found:
            user = found[0]

    if user is None or not verify_password(request.password, user["password_hash"], user["salt"]):
        raise HTTPException(status_code=401, detail="Username atau password salah.")

    # Buat Sesi Token
    token = secrets.token_hex(32)
    expires_at = (datetime.utcnow() + timedelta(hours=24)).isoformat() + "Z"

    session_doc = {
        "token": token,
        "username": user["username"],
        "role": user["role"],
        "expires_at": expires_at
    }

    # Simpan Sesi di MongoDB
    if sessions_col is not None:
        try:
            sessions_col.insert_one(session_doc.copy())
        except Exception as e:
            print(f"Gagal mencatat sesi di MongoDB: {e}")

    # Simpan Sesi di Lokal Fallback / Memory
    global local_active_sessions
    local_active_sessions[token] = session_doc

    return {
        "token": token,
        "username": user["username"],
        "role": user["role"]
    }

@app.get("/api/auth/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@app.post("/api/auth/logout")
def logout(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        return {"message": "Sudah keluar."}
    token = authorization.split(" ")[1]

    # Hapus dari MongoDB
    if sessions_col is not None:
        try:
            sessions_col.delete_one({"token": token})
        except Exception as e:
            print(f"Gagal menghapus sesi di MongoDB: {e}")

    # Hapus dari lokal fallback/memory
    global local_active_sessions
    if token in local_active_sessions:
        del local_active_sessions[token]

    return {"message": "Logout berhasil."}

# Admin Endpoints
@app.get("/api/admin/users")
def admin_get_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Akses ditolak. Hanya admin yang diperbolehkan.")
        
    # Ambil dari MongoDB
    if users_col is not None:
        try:
            users = list(users_col.find({}, {"_id": 0, "password_hash": 0, "salt": 0}))
            # Convert created_at datetimes to ISO strings if needed
            for u in users:
                if isinstance(u.get("created_at"), datetime):
                    u["created_at"] = u["created_at"].isoformat() + "Z"
            return users
        except Exception as e:
            print(f"Gagal mengambil user dari MongoDB: {e}")
            
    # Fallback ke penyimpanan lokal
    local_users = load_fallback_users()
    safe_users = []
    for u in local_users:
        safe_users.append({
            "username": u["username"],
            "role": u["role"],
            "created_at": u.get("created_at", datetime.utcnow().isoformat() + "Z")
        })
    return safe_users

@app.get("/api/admin/stats")
def admin_get_stats(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Akses ditolak. Hanya admin yang diperbolehkan.")
        
    history_records = []
    if history_col is not None:
        try:
            cursor = history_col.find()
            for doc in cursor:
                history_records.append(doc)
        except Exception as e:
            print(f"Gagal mengambil riwayat dari MongoDB: {e}")
            
    if not history_records:
        history_records = load_fallback_history()
        
    total_predictions = len(history_records)
    agreement_count = total_predictions
    
    nb_dist = {"Padi": 0, "Jagung": 0, "Kopi": 0}
    nb_conf_sum = 0
    
    for r in history_records:
        nb_data = r.get("nb", {})
        nb_pred = nb_data.get("prediction") or r.get("nb_prediction")
        nb_conf = nb_data.get("confidence") or r.get("nb_confidence")
        
        if nb_pred in nb_dist:
            nb_dist[nb_pred] += 1
        if nb_conf is not None:
            nb_conf_sum += float(nb_conf)
            
    nb_avg_conf = (nb_conf_sum / total_predictions) if total_predictions > 0 else 0
    
    total_users = 0
    if users_col is not None:
        try:
            total_users = users_col.count_documents({})
        except Exception:
            pass
    if total_users == 0:
        total_users = len(load_fallback_users())
        
    return {
        "total_predictions": total_predictions,
        "total_users": total_users,
        "agreement_rate": 100.0,
        "nb_stats": {
            "distribution": nb_dist,
            "average_confidence": round(nb_avg_conf, 4)
        },
        "knn_stats": {
            "distribution": nb_dist,
            "average_confidence": round(nb_avg_conf, 4)
        }
    }

@app.get("/api/admin/dataset")
def admin_get_dataset(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Akses ditolak. Hanya admin yang diperbolehkan.")
        
    csv_path = os.path.join(os.path.dirname(__file__), "crop_data.csv")
    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail="Berkas dataset crop_data.csv tidak ditemukan.")
        
    try:
        df = pd.read_csv(csv_path)
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal membaca berkas dataset: {str(e)}")

@app.get("/api/admin/calculate-nb")
def calculate_nb(
    N: int, P: int, K: int, ph: int, 
    temperature: int, humidity: int, rainfall: int, irigasi: int,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Akses ditolak. Hanya admin yang diperbolehkan.")
        
    global model_data
    if model_data is None:
        load_model()
        
    if model_data is None:
        raise HTTPException(status_code=503, detail="Model machine learning belum siap.")
        
    import math
    try:
        # Get components
        nb_model = model_data["nb"]
        scaler = model_data["scaler"]
        features = model_data["features"]
        classes = list(nb_model.classes_)
        
        # Prepare inputs
        inputs = {
            "N": N, "P": P, "K": K, "ph": ph,
            "temperature": temperature, "humidity": humidity, 
            "rainfall": rainfall, "irigasi": irigasi
        }
        
        # Scale inputs
        input_list = [inputs[f] for f in features]
        input_df = pd.DataFrame([input_list], columns=features)
        input_scaled = scaler.transform(input_df)[0]
        
        # Build scaling details list
        scaled_details = []
        for i, f in enumerate(features):
            mean_val = float(scaler.mean_[i])
            std_val = float(scaler.scale_[i])
            scaled_details.append({
                "feature": f,
                "raw": int(inputs[f]),
                "scaled": float(input_scaled[i]),
                "mean": mean_val,
                "std": std_val
            })
            
        # Prior probabilities
        class_prior = list(nb_model.class_prior_)
        class_count = list(nb_model.class_count_)
        total_count = float(sum(class_count))
        
        # Calculate likelihoods and posteriors
        class_results = []
        
        for c_idx, c_name in enumerate(classes):
            prior = float(class_prior[c_idx])
            count = float(class_count[c_idx])
            feature_likelihoods = []
            likelihood_prod = 1.0
            
            for f_idx, f_name in enumerate(features):
                val_scaled = float(input_scaled[f_idx])
                mean = float(nb_model.theta_[c_idx][f_idx])
                variance = float(nb_model.var_[c_idx][f_idx])
                # Gunakan nilai epsilon_ aktual dari model untuk penyelarasan perataan variansi (smoothing)
                eps = float(getattr(nb_model, "epsilon_", 1e-9))
                var_eps = variance + eps
                
                pdf_exponent = -((val_scaled - mean) ** 2) / (2 * var_eps)
                # Floor exponent to prevent float underflow and absolute 0%
                pdf_exponent = max(pdf_exponent, -15.0)
                
                pdf_denominator = math.sqrt(2 * math.pi * var_eps)
                pdf_val = (1.0 / pdf_denominator) * math.exp(pdf_exponent)
                
                feature_likelihoods.append({
                    "feature": f_name,
                    "scaled_value": val_scaled,
                    "mean": mean,
                    "variance": variance,
                    "pdf_exponent": pdf_exponent,
                    "pdf_denominator": pdf_denominator,
                    "likelihood": pdf_val
                })
                likelihood_prod *= pdf_val
                
            numerator = prior * likelihood_prod
            
            class_results.append({
                "class_name": c_name,
                "prior": prior,
                "count": count,
                "total_count": total_count,
                "features": feature_likelihoods,
                "likelihood_product": likelihood_prod,
                "numerator": numerator,
                "posterior": 0.0 # will fill after normalization
            })
            
        # Normalize to get posteriors using dynamic temperature softmax to prevent overconfidence
        log_numerators = [math.log(res["numerator"]) for res in class_results]
        max_log_num = max(log_numerators)
        diffs = [ln - max_log_num for ln in log_numerators]
        min_diff = min(diffs)
        
        T = max(abs(min_diff) / 4.0, 1.0)
        scaled_diffs = [d / T for d in diffs]
        exps = [math.exp(sd) for sd in scaled_diffs]
        sum_exps = sum(exps)
        
        for c_idx in range(len(class_results)):
            class_results[c_idx]["posterior"] = float(exps[c_idx] / sum_exps)
                
        # Find prediction (argmax of posteriors)
        pred_idx = int(np.argmax([r["posterior"] for r in class_results]))
        prediction = class_results[pred_idx]["class_name"]
        confidence = class_results[pred_idx]["posterior"]
        
        # Format names nicely for client
        class_mapping = {"Padi": "🌾 Padi (K1)", "Jagung": "🌽 Jagung (K2)", "Kopi": "☕ Kopi (K3)"}
        for res in class_results:
            res["class_display"] = class_mapping.get(res["class_name"], res["class_name"])
            
        return {
            "inputs": inputs,
            "scaled_inputs": scaled_details,
            "classes": class_results,
            "prediction": prediction,
            "prediction_display": class_mapping.get(prediction, prediction),
            "confidence": confidence
        }
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Gagal memproses perhitungan Naive Bayes: {str(e)}")

class AddToTrainingRequest(BaseModel):
    N: int = Field(..., ge=1, le=3)
    P: int = Field(..., ge=1, le=3)
    K: int = Field(..., ge=1, le=3)
    temperature: int = Field(..., ge=1, le=3)
    humidity: int = Field(..., ge=1, le=3)
    ph: int = Field(..., ge=1, le=3)
    rainfall: int = Field(..., ge=1, le=3)
    irigasi: int = Field(..., ge=0, le=1)
    label: str = Field(..., description="Label tanaman (Padi, Jagung, Kopi)")

@app.post("/api/admin/add-to-training")
def add_to_training(request: AddToTrainingRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Akses ditolak. Hanya admin yang diperbolehkan.")
        
    csv_path = os.path.join(os.path.dirname(__file__), "crop_data.csv")
    
    # 1. Read existing crop_data.csv or load default
    if os.path.exists(csv_path):
        df = pd.read_csv(csv_path)
    else:
        # Fallback to load default dataset from Crop_recommendation (1).csv
        try:
            from api.train import load_and_categorize_user_dataset
            df = load_and_categorize_user_dataset()
        except ImportError:
            try:
                from train import load_and_categorize_user_dataset
                df = load_and_categorize_user_dataset()
            except ImportError:
                # generate synthetic dataset as last resort
                np.random.seed(42)
                data = []
                CROP_PROFILES_FALLBACK = {
                    "Padi": {"N": 3, "P": 2, "K": 3, "temperature": 3, "humidity": 3, "ph": 2, "rainfall": 3, "irigasi": 1},
                    "Jagung": {"N": 2, "P": 2, "K": 2, "temperature": 2, "humidity": 2, "ph": 2, "rainfall": 2, "irigasi": 1},
                    "Kopi": {"N": 1, "P": 2, "K": 3, "temperature": 1, "humidity": 2, "ph": 1, "rainfall": 2, "irigasi": 0}
                }
                for crop_name, profile in CROP_PROFILES_FALLBACK.items():
                    for _ in range(20):
                        row = {}
                        for feature, ideal_val in profile.items():
                            row[feature] = int(ideal_val)
                        row["label"] = crop_name
                        data.append(row)
                df = pd.DataFrame(data)
        
    # 2. Append new row
    new_row = {
        "N": request.N,
        "P": request.P,
        "K": request.K,
        "temperature": request.temperature,
        "humidity": request.humidity,
        "ph": request.ph,
        "rainfall": request.rainfall,
        "irigasi": request.irigasi,
        "label": request.label
    }
    
    new_df = pd.DataFrame([new_row])
    df = pd.concat([df, new_df], ignore_index=True)
    
    # 3. Save back to csv
    df.to_csv(csv_path, index=False)
    
    # 4. Retrain model
    try:
        features = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall", "irigasi"]
        X = df[features]
        y = df["label"]
        
        from sklearn.model_selection import train_test_split
        from sklearn.preprocessing import StandardScaler
        from sklearn.naive_bayes import GaussianNB
        from sklearn.metrics import accuracy_score
        
        class_counts = y.value_counts()
        can_stratify = all(count >= 2 for count in class_counts) and len(class_counts) > 1
        
        if can_stratify:
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
        else:
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        nb = GaussianNB(var_smoothing=0.2)
        nb.fit(X_train_scaled, y_train)
        nb_preds = nb.predict(X_test_scaled)
        nb_acc = accuracy_score(y_test, nb_preds)
        
        # Save model pickle
        model_data_new = {
            "nb": nb,
            "scaler": scaler,
            "features": features,
            "classes": list(nb.classes_),
            "accuracies": {
                "nb": float(nb_acc)
            },
            "profiles": {
                "Padi": {
                    "N": 3, "P": 2, "K": 3, "temperature": 3, "humidity": 3, "ph": 2, "rainfall": 3, "irigasi": 1
                },
                "Jagung": {
                    "N": 2, "P": 2, "K": 2, "temperature": 2, "humidity": 2, "ph": 2, "rainfall": 2, "irigasi": 1
                },
                "Kopi": {
                    "N": 1, "P": 2, "K": 3, "temperature": 1, "humidity": 2, "ph": 1, "rainfall": 2, "irigasi": 0
                }
            }
        }
        
        model_path = os.path.join(os.path.dirname(__file__), "model_tanaman.pkl")
        with open(model_path, "wb") as f:
            pickle.dump(model_data_new, f)
            
        # Reload model in memory
        global model_data
        model_data = model_data_new
        
        return {
            "status": "success",
            "message": "Data berhasil ditambahkan ke dataset latihan dan model berhasil dilatih ulang!",
            "accuracy": round(float(nb_acc) * 100, 2),
            "total_rows": len(df)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal melatih ulang model: {str(e)}")

