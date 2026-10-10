
from typing import Any, Dict, List, Union

import joblib


class IncidentClassifier:
    def __init__(self, model_path: str = "incident_model.joblib"):
        models = joblib.load(model_path)
        self._category = models["category"]
        self._priority = models["priority"]

    def predict(self, description: str) -> Dict[str, Any]:
        return self.predict_batch([description])[0]

    def predict_batch(self, descriptions: List[str]) -> List[Dict[str, Any]]:
        texts = [str(d).strip() for d in descriptions]
        cat_p = self._category.predict_proba(texts)
        pri_p = self._priority.predict_proba(texts)
        cat_cls, pri_cls = self._category.classes_, self._priority.classes_
        out = []
        for i, (cp, pp) in enumerate(zip(cat_p, pri_p)):
            ci, pi = cp.argmax(), pp.argmax()
            
            category = str(cat_cls[ci])
            priority = str(pri_cls[pi])
            
            out.append({
                "category": category,
                "priority": priority,
                "category_confidence": round(float(cp[ci]), 4),
                "priority_confidence": round(float(pp[pi]), 4),
                "extracted_signals": self._extract_signals(texts[i])
            })
        return out

    def _extract_signals(self, text: str) -> Dict[str, bool]:
        text_lower = text.lower()
        return {
            "has_injuries": any(word in text_lower for word in ["injur", "blood", "bleed", "hurt", "casualty", "paramedic", "ambulance", "unconscious", "cpr", "fatal"]),
            "has_weapons": any(word in text_lower for word in ["gun", "shoot", "shot", "knife", "stab", "weapon", "armed", "rifle", "pistol", "firearm"]),
            "has_fire": any(word in text_lower for word in ["fire", "smoke", "flame", "burn", "blaze", "arson"]),
            "road_blocked": any(word in text_lower for word in ["block", "traffic", "crash", "collision", "pileup", "closed", "accident"])
        }
