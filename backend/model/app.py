from flask import Flask, request, jsonify
from predictor import IncidentClassifier

app = Flask(__name__)

try:
    classifier = IncidentClassifier(model_path="incident_model.joblib")
except Exception as e:
    print(f"Warning: Could not load model during startup: {e}")
    classifier = None

@app.route('/api/v1/classify-incident', methods=['POST'])
def classify_incident():
    if not classifier:
        return jsonify({"error": "Model not loaded"}), 500

    data = request.get_json()
    
    if not data or 'description' not in data:
        return jsonify({"error": "Missing 'description' in request body"}), 400
        
    description = data['description']
    
    try:
        result = classifier.predict(description)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
