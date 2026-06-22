import pandas as pd

def calculate_manual_nb(inputs):
    # Load dataset
    df = pd.read_csv("api/crop_data.csv")
    total_count = len(df)
    
    classes = ["Padi", "Jagung", "Kopi"]
    class_mapping_inverse = {"Padi": "rice", "Jagung": "maize", "Kopi": "coffee"}
    class_mapping = {"rice": "Padi", "maize": "Jagung", "coffee": "Kopi"}
    
    # Class counts
    class_counts = df["label"].value_counts().to_dict()
    print("Class counts in dataset:", class_counts)
    
    # Prior probabilities
    priors = {}
    for c in classes:
        priors[c] = class_counts.get(c, 0) / total_count
        print(f"P(Label={class_mapping_inverse[c]}) = {class_counts.get(c, 0)}/{total_count} = {priors[c]:.4f}")
        
    features = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall", "irigasi"]
    
    likelihoods = {}
    posteriors = {}
    
    for c in classes:
        c_df = df[df["label"] == c]
        c_count = len(c_df)
        
        feat_probs = []
        prod = 1.0
        
        print(f"\n--- Class: {class_mapping_inverse[c]} ---")
        for f in features:
            v = inputs[f]
            # count matching rows
            match_count = len(c_df[c_df[f] == v])
            k = 2 if f == "irigasi" else 3
            prob = (match_count + 1) / (c_count + k)
            feat_probs.append(prob)
            prod *= prob
            print(f"  P({f}={v} | {class_mapping_inverse[c]}) = ({match_count}+1)/({c_count}+{k}) = {prob:.4f}")
            
        likelihoods[c] = prod
        posteriors[c] = prod * priors[c]
        print(f"P(X | {class_mapping_inverse[c]}) = {prod:.10f}")
        print(f"P(X | {class_mapping_inverse[c]}) * P({class_mapping_inverse[c]}) = {posteriors[c]:.10f}")
        
    # Sum of posteriors
    sum_post = sum(posteriors.values())
    print(f"\nSum of posteriors = {sum_post:.10f}")
    
    # Normalized posteriors (probabilities)
    normalized_probs = {c: posteriors[c] / sum_post for c in classes}
    for c in classes:
        print(f"Normalized P({class_mapping_inverse[c]} | X) = {normalized_probs[c]:.4f} ({normalized_probs[c]*100:.2f}%)")
        
    # Prediction
    best_class = max(normalized_probs, key=normalized_probs.get)
    print(f"\nPrediction: {class_mapping_inverse[best_class].upper()} with confidence {normalized_probs[best_class]:.4f}")

# Input from user request
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

calculate_manual_nb(test_inputs)
