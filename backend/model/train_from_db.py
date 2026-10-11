"""
Train the category + priority models from the 'historical data' table in the database.

    python train_from_db.py            # trains, prints held-out accuracy, saves incident_model.joblib

Also importable:  from train_from_db import train_from_db
"""
import json

import joblib
import pandas as pd
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split

from db import get_engine, load_historical
from train_model import build_pipeline

MODEL_PATH = "incident_model.joblib"
METRICS_PATH = "model_metrics.json"
MIN_ROWS = 30


def train_from_db(out_path: str = MODEL_PATH, test_size: float = 0.2, engine=None) -> dict:
    raw = load_historical(engine or get_engine())
    n_raw = len(raw)

    df = raw.dropna(subset=["text", "category", "priority"]).copy()
    for c in ("text", "category", "priority"):
        df[c] = df[c].astype(str).str.strip()
    df = df[(df.text != "") & (df.category != "") & (df.priority != "")]
    # Identical descriptions would leak between train and test and inflate accuracy.
    df = df.drop_duplicates(subset=["text"]).reset_index(drop=True)
    if len(df) < MIN_ROWS:
        raise ValueError(f"Only {len(df)} usable rows in historical data (need >= {MIN_ROWS}).")

    models, metrics = {}, {"rows_in_table": n_raw, "rows_used": len(df)}
    for target in ("category", "priority"):
        counts = df[target].value_counts()
        keep = counts[counts >= 2].index          # a class with 1 row can't be split/stratified
        sub = df[df[target].isin(keep)]
        X_tr, X_te, y_tr, y_te = train_test_split(
            sub.text, sub[target], test_size=test_size, random_state=42, stratify=sub[target])
        pred = build_pipeline().fit(X_tr, y_tr).predict(X_te)
        metrics[target] = {
            "heldout_accuracy": round(float(accuracy_score(y_te, pred)), 4),
            "heldout_macro_f1": round(float(f1_score(y_te, pred, average="macro")), 4),
            "classes": {k: int(v) for k, v in counts.items()},
            "classes_dropped_too_rare": [k for k in counts.index if k not in keep],
            "train_rows": int(len(X_tr)), "test_rows": int(len(X_te)),
        }
        models[target] = build_pipeline().fit(sub.text, sub[target])   # final: all rows

    joblib.dump(models, out_path)
    with open(METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)
    return metrics


if __name__ == "__main__":
    print(json.dumps(train_from_db(), indent=2))
    print(f"\nSaved model -> {MODEL_PATH}")
