"""
Train and evaluate the incident classifier (category + priority).

Usage:
    python train_model.py
    python train_model.py --train train_80.csv --test test_20.csv --key test_20_answer_key.csv

Outputs:
    incident_model.joblib   -> loaded by predictor.py in your backend
"""
import argparse

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.pipeline import FeatureUnion, Pipeline

TARGETS = ["category", "priority"]


def build_pipeline() -> Pipeline:
    """TF-IDF (word 1-2 grams + character n-grams) -> Logistic Regression."""
    features = FeatureUnion([
        ("word", TfidfVectorizer(lowercase=True, ngram_range=(1, 2), sublinear_tf=True, min_df=1)),
        ("char", TfidfVectorizer(lowercase=True, analyzer="char_wb", ngram_range=(3, 5),
                                 sublinear_tf=True, min_df=2)),
    ])
    clf = LogisticRegression(max_iter=2000, C=10, class_weight="balanced")
    return Pipeline([("tfidf", features), ("clf", clf)])


def report(name, y_true, y_pred):
    print(f"\n=== {name} ===")
    print(f"Accuracy : {accuracy_score(y_true, y_pred):.4f}")
    print(f"Macro F1 : {f1_score(y_true, y_pred, average='macro'):.4f}")
    print(classification_report(y_true, y_pred, digits=3))
    labels = sorted(set(y_true) | set(y_pred))
    cm = pd.DataFrame(confusion_matrix(y_true, y_pred, labels=labels),
                      index=[f"true_{l}" for l in labels], columns=[f"pred_{l}" for l in labels])
    print(cm.to_string())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--train", default="train_80.csv")
    ap.add_argument("--test", default="test_20.csv")
    ap.add_argument("--key", default="test_20_answer_key.csv", help="true labels for the test file")
    ap.add_argument("--out", default="incident_model.joblib")
    args = ap.parse_args()

    train = pd.read_csv(args.train)
    X = train["description"].astype(str)

    # 1) 5-fold cross-validation on the training data
    print("##### 5-fold cross-validation on training data #####")
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    for t in TARGETS:
        pred = cross_val_predict(build_pipeline(), X, train[t], cv=skf)
        print(f"{t:9s} CV accuracy: {accuracy_score(train[t], pred):.4f} | "
              f"macro F1: {f1_score(train[t], pred, average='macro'):.4f}")

    # 2) Fit on the full training set, then score on the unseen test set
    models = {t: build_pipeline().fit(X, train[t]) for t in TARGETS}

    test = pd.read_csv(args.test)
    key = pd.read_csv(args.key)
    test = test.merge(key, on="incident_id", how="left")
    print("\n##### Hold-out test set (20%) #####")
    for t in TARGETS:
        pred = models[t].predict(test["description"].astype(str))
        test[f"pred_{t}"] = pred
        report(t, test[t], pred)

    both = ((test["category"] == test["pred_category"]) & (test["priority"] == test["pred_priority"])).mean()
    print(f"\nBoth category AND priority correct: {both:.4f}")

    test.to_csv("test_predictions.csv", index=False)
    print("Saved row-level predictions -> test_predictions.csv")

    # 3) Final model: retrain on train + test so the deployed model uses all data
    full = pd.concat([train[["description", *TARGETS]], test[["description", *TARGETS]]], ignore_index=True)
    final = {t: build_pipeline().fit(full["description"].astype(str), full[t]) for t in TARGETS}
    joblib.dump(final, args.out)
    print(f"Saved final model (trained on {len(full)} rows) -> {args.out}")


if __name__ == "__main__":
    main()
