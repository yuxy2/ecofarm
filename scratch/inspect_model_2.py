import pickle
import os

MODEL_PATH = "api/model_tanaman.pkl"
if os.path.exists(MODEL_PATH):
    with open(MODEL_PATH, "rb") as f:
        model_data = pickle.load(f)
    print("Features:", model_data["features"])
    print("Classes:", model_data["classes"])
    nb = model_data["nb"]
    print("Model attributes:", dir(nb))
    if hasattr(nb, 'category_count_'):
        print("category_count_ is present")
        for i, f in enumerate(model_data["features"]):
            print(f"Feature {f} category count shape: {[c.shape for c in nb.category_count_]}")
            break
else:
    print("Model not found")
