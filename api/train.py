import os
import pickle
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.naive_bayes import CategoricalNB
from sklearn.metrics import accuracy_score

# 1. Definisi profil ideal tanaman langsung dalam Kategori diskret (V1-V8)
# N, P, K, Temp, Hum, pH, Rainfall: 1=Rendah/Masam, 2=Sedang/Netral, 3=Tinggi/Basa
# Irigasi: 0=Tidak Ada, 1=Ada Irigasi
CROP_PROFILES = {
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

def generate_dataset(num_samples_per_crop=20):
    np.random.seed(42)
    data = []
    
    for crop_name, profile in CROP_PROFILES.items():
        for _ in range(num_samples_per_crop):
            row = {}
            for feature, ideal_val in profile.items():
                if feature == "irigasi":
                    if crop_name == "Jagung":
                        val = np.random.choice([0, 1], p=[0.4, 0.6])
                    else:
                        val = ideal_val
                elif feature == "ph":
                    # pH varies between 1, 2, 3
                    val = np.random.choice([1, 2, 3], p=[0.1, 0.8, 0.1] if ideal_val == 2 else ([0.8, 0.2, 0.0] if ideal_val == 1 else [0.0, 0.2, 0.8]))
                else:
                    # Categories 1, 2, 3
                    if ideal_val == 3:
                        val = np.random.choice([2, 3], p=[0.2, 0.8])
                    elif ideal_val == 2:
                        val = np.random.choice([1, 2, 3], p=[0.15, 0.7, 0.15])
                    else:  # ideal_val == 1
                        val = np.random.choice([1, 2], p=[0.8, 0.2])
                row[feature] = int(val)
            row["label"] = crop_name
            data.append(row)
            
    return pd.DataFrame(data)

def load_and_categorize_user_dataset():
    csv_path = os.path.join(os.path.dirname(__file__), "Crop_recommendation (1).csv")
    if not os.path.exists(csv_path):
        print(f"File {csv_path} tidak ditemukan. Beralih ke generator data sintetis.")
        return generate_dataset(20)
        
    print(f"Membaca dataset user dari {csv_path}...")
    raw_df = pd.read_csv(csv_path)
    
    categorized_rows = []
    for idx, row in raw_df.iterrows():
        # Map N
        if row['N'] < 60:
            n_cat = 1
        elif row['N'] <= 90:
            n_cat = 2
        else:
            n_cat = 3
            
        # Map P
        if row['P'] < 35:
            p_cat = 1
        elif row['P'] <= 55:
            p_cat = 2
        else:
            p_cat = 3
            
        # Map K
        if row['K'] < 20:
            k_cat = 1
        elif row['K'] <= 35:
            k_cat = 2
        else:
            k_cat = 3
            
        # Map temperature
        if row['temperature'] < 20:
            t_cat = 1
        elif row['temperature'] <= 25:
            t_cat = 2
        else:
            t_cat = 3
            
        # Map humidity
        if row['humidity'] < 55:
            h_cat = 1
        elif row['humidity'] <= 70:
            h_cat = 2
        else:
            h_cat = 3
            
        # Map ph
        if row['ph'] < 5.5:
            ph_cat = 1
        elif row['ph'] <= 7.0:
            ph_cat = 2
        else:
            ph_cat = 3
            
        # Map rainfall
        if row['rainfall'] < 100:
            r_cat = 1
        elif row['rainfall'] <= 200:
            r_cat = 2
        else:
            r_cat = 3
            
        # Map label and irigasi
        label_map = {"rice": "Padi", "maize": "Jagung", "coffee": "Kopi"}
        crop = label_map.get(row['label'].strip().lower(), "Jagung")
        
        if crop == "Padi":
            irigasi = 1
        elif crop == "Kopi":
            irigasi = 0
        else:  # Jagung
            irigasi = 1 if (int(row['N']) + int(row['P'])) % 2 == 0 else 0
            
        categorized_rows.append({
            "N": n_cat,
            "P": p_cat,
            "K": k_cat,
            "temperature": t_cat,
            "humidity": h_cat,
            "ph": ph_cat,
            "rainfall": r_cat,
            "irigasi": irigasi,
            "label": crop
        })
        
    df = pd.DataFrame(categorized_rows)
    print(f"Dataset berhasil dimuat dan dipetakan ke 8 kriteria. Total baris data: {len(df)}")
    return df

def main():
    print("Memproses dataset pelatihan...")
    df = load_and_categorize_user_dataset()
    
    # Simpan dataset CSV untuk dokumentasi
    os.makedirs("api", exist_ok=True)
    df.to_csv("api/crop_data.csv", index=False)
    print("Dataset kategori agronomi berhasil disimpan ke api/crop_data.csv")
    
    # Pisahkan fitur dan label
    features = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall", "irigasi"]
    X = df[features]
    y = df["label"]
    
    # Split train-test dengan stratify agar seimbang
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # Scaling Fitur (Meskipun data kategorikal, scaler tetap dilatih untuk keselarasan pipeline)
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # 2. Train Model Naive Bayes dengan Laplace Smoothing (alpha=1.0)
    nb = CategoricalNB(alpha=1.0)
    nb.fit(X_train, y_train)
    nb_preds = nb.predict(X_test)
    nb_acc = accuracy_score(y_test, nb_preds)
    print(f"Akurasi Model Naive Bayes: {nb_acc * 100:.2f}%")
    
    # Simpan model, scaler, dan metadata dalam satu file pickle
    model_data = {
        "nb": nb,
        "scaler": scaler,
        "features": features,
        "classes": list(nb.classes_),
        "accuracies": {
            "nb": float(nb_acc)
        },
        "profiles": CROP_PROFILES
    }
    
    model_path = "api/model_tanaman.pkl"
    with open(model_path, "wb") as f:
        pickle.dump(model_data, f)
        
    print(f"Model Naive Bayes dan scaler berhasil disimpan ke {model_path}!")

if __name__ == "__main__":
    main()
