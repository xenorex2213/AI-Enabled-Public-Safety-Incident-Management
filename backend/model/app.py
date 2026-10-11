import json
import os
import threading

from flask import Flask, jsonify, request

from predictor import IncidentClassifier

app = Flask(__name__)
MODEL_PATH = "incident_model.joblib"
REVIEW_THRESHOLD = float(os.environ.get("REVIEW_THRESHOLD", "0.6"))
_lock = threading.Lock()


def _load():
    try:
        return IncidentClassifier(model_path=MODEL_PATH)
    except Exception as e:
        print(f"Warning: Could not load model during startup: {e}")
        return None


classifier = _load()


def _with_review_flag(result: dict) -> dict:
    result["needs_review"] = min(result["category_confidence"],
                                 result["priority_confidence"]) < REVIEW_THRESHOLD
    return result


def _clean(v):
    """Make ids JSON friendly (numpy ints, UUIDs, etc.)."""
    if hasattr(v, "item"):
        return v.item()
    return v if isinstance(v, (int, float, str, type(None))) else str(v)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"model_loaded": classifier is not None}), 200


@app.route("/api/v1/classify-incident", methods=["POST"])
def classify_incident():
    """Body: {"description": "..."}  ->  category, priority, confidences, signals."""
    if not classifier:
        return jsonify({"error": "Model not loaded"}), 500
    data = request.get_json(silent=True)
    if not data or "description" not in data:
        return jsonify({"error": "Missing 'description' in request body"}), 400
    try:
        return jsonify(_with_review_flag(classifier.predict(data["description"]))), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/v1/predict-incidents", methods=["GET", "POST"])
def predict_incidents():
    """
    Read rows from the incident table, predict category + priority for each, return JSON.
      GET  /api/v1/predict-incidents?limit=50&status=Open
      POST /api/v1/predict-incidents   body: {"ids": [1, 2, 3]}  (optional "limit", "status")
    """
    if not classifier:
        return jsonify({"error": "Model not loaded. POST /api/v1/retrain first."}), 500
    from db import load_incidents
    body = request.get_json(silent=True) or {}
    limit = int(body.get("limit", request.args.get("limit", 100)))
    status = body.get("status", request.args.get("status"))
    ids = body.get("ids")
    try:
        df = load_incidents(limit=limit, ids=ids, status=status)
    except Exception as e:
        return jsonify({"error": f"Database error: {e}"}), 500

    df = df.dropna(subset=["text"])
    preds = classifier.predict_batch(df["text"].tolist()) if len(df) else []
    out = [{"incident_id": _clean(i), "description": t, **_with_review_flag(p)}
           for i, t, p in zip(df["incident_id"], df["text"], preds)]
    return jsonify({"count": len(out), "predictions": out}), 200


@app.route("/api/v1/retrain", methods=["POST"])
def retrain():
    """Re-learn from the 'historical data' table and hot-swap the model."""
    global classifier
    from train_from_db import train_from_db
    try:
        with _lock:
            metrics = train_from_db(out_path=MODEL_PATH)
            classifier = _load()
        return jsonify({"status": "retrained", "metrics": metrics}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/v1/model-info", methods=["GET"])
def model_info():
    try:
        with open("model_metrics.json") as f:
            return jsonify(json.load(f)), 200
    except FileNotFoundError:
        return jsonify({"error": "No metrics yet. POST /api/v1/retrain"}), 404


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
