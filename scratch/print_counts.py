import pickle
import os
import numpy as np

MODEL_PATH = "api/model_tanaman.pkl"
if os.path.exists(MODEL_PATH):
    with open(MODEL_PATH, "rb") as f:
        model_data = pickle.load(f)
    nb = model_data["nb"]
    features = model_data["features"]
    classes = model_data["classes"]
    
    print("Classes in model:", classes)
    print("Class counts:", nb.class_count_)
    print("Class log prior:", nb.class_log_prior_)
    print("Class priors (exp):", np.exp(nb.class_log_prior_))
    
    for f_idx, f_name in enumerate(features):
        print(f"\nFeature: {f_name}")
        print("n_categories:", nb.n_categories_[f_idx])
        # category_count_ is a list of arrays, one array per feature
        # Shape of each array: (n_classes, n_categories_for_feature)
        counts = nb.category_count_[f_idx]
        probs = np.exp(nb.feature_log_prob_[f_idx])
        for c_idx, c_name in enumerate(classes):
            print(f"  Class: {c_name}")
            print(f"    Counts (index 0, 1, 2, ...): {counts[c_idx]}")
            print(f"    Probs  (index 0, 1, 2, ...): {probs[c_idx]}")
else:
    print("Model not found")
