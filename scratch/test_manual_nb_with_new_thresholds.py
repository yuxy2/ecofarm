import pandas as pd
import numpy as np

def load_and_categorize():
    raw_df = pd.read_csv("api/Crop_recommendation (1).csv")
    categorized_rows = []
    
    for idx, row in raw_df.iterrows():
        # Map N (V1)
        if row['N'] < 60:
            n_cat = 1
        elif row['N'] <= 90:
            n_cat = 2
        else:
            n_cat = 3
            
        # Map P (V2) - adjusted to matching threshold
        if row['P'] < 30:
            p_cat = 1
        elif row['P'] <= 50:
            p_cat = 2
        else:
            p_cat = 3
            
        # Map K (V3) - adjusted to matching threshold
        if row['K'] < 20:
            k_cat = 1
        elif row['K'] < 35:  # strictly less than 35
            k_cat = 2
        else:
            k_cat = 3
            
        # Map temperature (V4)
        if row['temperature'] < 20:
            t_cat = 1
        elif row['temperature'] <= 25:
            t_cat = 2
        else:
            t_cat = 3
            
        # Map humidity (V5) - adjusted to matching threshold
        if row['humidity'] < 57.8:
            h_cat = 1
        elif row['humidity'] <= 70:
            h_cat = 2
        else:
            h_cat = 3
            
        # Map ph (V6)
        if row['ph'] < 5.5:
            ph_cat = 1
        elif row['ph'] <= 7.0:
            ph_cat = 2
        else:
            ph_cat = 3
            
        # Map rainfall (V7)
        if row['rainfall'] < 100:
            r_cat = 1
        elif row['rainfall'] <= 200:
            r_cat = 2
        else:
            r_cat = 3
            
        # Map label and irigasi (V8)
        label_map = {"rice": "Padi", "maize": "Jagung", "coffee": "Kopi"}
        crop = label_map.get(row['label'].strip().lower(), "Jagung")
        
        if crop == "Padi":
            irigasi = 1
        else:  # Jagung dan Kopi
            irigasi = 0
            
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
        
    return pd.DataFrame(categorized_rows)

def calculate_nb(df, inputs):
    total_count = len(df)
    classes = ["Padi", "Jagung", "Kopi"]
    class_mapping_inverse = {"Padi": "rice", "Jagung": "maize", "Kopi": "coffee"}
    
    class_counts = df["label"].value_counts().to_dict()
    print("Class counts in dataset:", class_counts)
    
    priors = {c: class_counts.get(c, 0) / total_count for c in classes}
    features = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall", "irigasi"]
    
    likelihoods = {}
    posteriors = {}
    
    for c in classes:
        c_df = df[df["label"] == c]
        c_count = len(c_df)
        prod = 1.0
        
        print(f"\n--- Class: {class_mapping_inverse[c]} ---")
        for f in features:
            v = inputs[f]
            match_count = len(c_df[c_df[f] == v])
            k = 2 if f == "irigasi" else 3
            prob = (match_count + 1) / (c_count + k)
            prod *= prob
            print(f"  P({f}={v} | {class_mapping_inverse[c]}) = ({match_count}+1)/({c_count}+{k}) = {prob:.4f}")
            
        likelihoods[c] = prod
        posteriors[c] = prod * priors[c]
        print(f"P(X | {class_mapping_inverse[c]}) = {prod:.10f}")
        print(f"P(X | {class_mapping_inverse[c]}) * P({class_mapping_inverse[c]}) = {posteriors[c]:.10f}")

    sum_post = sum(posteriors.values())
    print(f"\nSum of posteriors = {sum_post:.10f}")
    for c in classes:
        print(f"Normalized P({class_mapping_inverse[c]} | X) = {posteriors[c] / sum_post:.10f}")

df_cat = load_and_categorize()
test_inputs = {"N": 2, "P": 2, "K": 2, "temperature": 2, "humidity": 2, "ph": 2, "rainfall": 2, "irigasi": 1}
calculate_nb(df_cat, test_inputs)
