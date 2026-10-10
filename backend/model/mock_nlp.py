
from flask import Flask, jsonify, request

app = Flask(__name__)

@app.get("/health")
def health():
    return jsonify({"model_loaded": False, "mock": True})

@app.post("/api/v1/classify-incident")
def classify():
    data = request.get_json(silent=True) or {}
    if not data.get("description"):
        return jsonify({"error": "Missing description"}), 400

    return jsonify({
        "category": "Traffic Accident",
        "priority": "HIGH",
        "category_confidence": 0.92,
        "priority_confidence": 0.87,
        "extracted_signals": {
            "has_injuries": True,
            "has_weapons": False,
            "has_fire": False,
            "road_blocked": True
        },
        "needs_review": False
    })

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
