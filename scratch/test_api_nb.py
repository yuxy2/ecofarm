import sys
import os

# Add api to path so we can import
sys.path.append(os.path.abspath("."))
import pickle

from api.index import calculate_smoothed_nb_probabilities

# Load model data
MODEL_PATH = "api/model_tanaman.pkl"
with open(MODEL_PATH, "rb") as f:
    model_data = pickle.load(f)

nb_model = model_data["nb"]
scaler = model_data["scaler"]
features = model_data["features"]

test_inputs = {
    "N": 2,
    "P": 2,
    "K": 2,
    "temperature": 2,
    "humidity": 2,
    "ph": 2,
    "rainfall": 2,
    "irigasi": 1
}

prediction, confidence, prob_dict = calculate_smoothed_nb_probabilities(
    nb_model, scaler, features, test_inputs
)

print(f"Prediction: {prediction}")
print(f"Confidence: {confidence:.10f}")
print("Probability Dictionary:")
for c, p in prob_dict.items():
    print(f"  {c}: {p:.10f}")

# Verify exact match
expected_prediction = "Kopi"  # Coffee
expected_rice_prob = 0.0319488698
expected_maize_prob = 0.3995173504
expected_coffee_prob = 0.5685337798

print("\n--- Verifying Exact Matches ---")
print(f"Prediction matches: {prediction == expected_prediction}")
print(f"Rice prob matches: {abs(prob_dict['Padi'] - expected_rice_prob) < 1e-6} (got {prob_dict['Padi']:.6f}, expected {expected_rice_prob:.6f})")
print(f"Maize prob matches: {abs(prob_dict['Jagung'] - expected_maize_prob) < 1e-6} (got {prob_dict['Jagung']:.6f}, expected {expected_maize_prob:.6f})")
print(f"Coffee prob matches: {abs(prob_dict['Kopi'] - expected_coffee_prob) < 1e-6} (got {prob_dict['Kopi']:.6f}, expected {expected_coffee_prob:.6f})")
