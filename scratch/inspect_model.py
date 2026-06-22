import pickle
import os

MODEL_PATH = "api/model_tanaman.pkl"
if os.path.exists(MODEL_PATH):
    with open(MODEL_PATH, "rb") as f:
        model_data = pickle.load(f)
    print("Features:", model_data["features"])
    print("Classes:", model_data["classes"])
    nb_model = model_data["nb"]
    print("Class log prior:", nb_model.class_log_prior_)
    print("Class count:", nb_model.class_count_)
    for f_idx, f_name in enumerate(model_data["features"]):
        print(f"Feature: {f_name}")
        print("Feature log prob shape:", nb_model.feature_log_prob_[f_idx].shape)
        # Note: CategoricalNB uses category indices (e.g. 0, 1, 2) mapped from categories_
        print("Categories mapping:", nb_model.categories_[f_idx])
        # Print actual feature log probs
        import numpy as np
        print("Feature prob (exp):", np.exp(nb_model.feature_log_prob_[f_idx]))
else:
    print("Model not found")
