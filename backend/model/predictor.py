
from typing import Dict, List, Union

import joblib


class IncidentClassifier:
    def __init__(self, model_path: str = "incident_model.joblib"):
        models = joblib.load(model_path)
        self._category = models["category"]
        self._priority = models["priority"]

    def predict(self, description: str) -> Dict[str, Union[str, float]]:
        return self.predict_batch([description])[0]

    def predict_batch(self, descriptions: List[str]) -> List[Dict[str, Union[str, float]]]:
        texts = [str(d).strip() for d in descriptions]
        cat_p = self._category.predict_proba(texts)
        pri_p = self._priority.predict_proba(texts)
        cat_cls, pri_cls = self._category.classes_, self._priority.classes_
        out = []
        for cp, pp in zip(cat_p, pri_p):
            ci, pi = cp.argmax(), pp.argmax()
            
            category = str(cat_cls[ci])
            priority = str(pri_cls[pi])
            
            # Generate a response recommendation based on category and priority
            recommendation = self._generate_recommendation(category, priority)
            
            out.append({
                "category": category,
                "priority": priority,
                "category_confidence": round(float(cp[ci]), 4),
                "priority_confidence": round(float(pp[pi]), 4),
                "response_recommendation": recommendation
            })
        return out

    def _generate_recommendation(self, category: str, priority: str) -> str:
        """Rule-based response generator for the hackathon MVP."""
        
        # Base actions by category
        if category == "Medical Emergency":
            action = "Dispatch EMS immediately. Instruct caller to stay on the line and check for breathing/pulse."
        elif category == "Violent Crime":
            action = "Dispatch armed response units. Advise caller to find a safe location and avoid confronting suspects."
        elif category == "Traffic Incident":
            action = "Dispatch traffic control and tow services. If injuries reported, dispatch EMS."
        elif category == "Property Crime":
            action = "Dispatch patrol unit to take a report. Tell caller not to touch anything to preserve evidence."
        elif category == "Public Disturbance":
            action = "Dispatch community policing unit to de-escalate the situation."
        elif category == "Suspicious Activity":
            action = "Log report and notify neighborhood patrol to monitor the area."
        else:
            action = "Standard operating procedure applies. Await dispatcher review."
            
        # Modify urgency based on priority
        if priority == "Critical":
            return f"URGENT (CRITICAL PRIORITY): {action} ETA goal: < 5 minutes."
        elif priority == "High":
            return f"EXPEDITE (HIGH PRIORITY): {action} ETA goal: < 15 minutes."
        elif priority == "Medium":
            return f"STANDARD RESPONSE: {action}"
        else:
            return f"LOW PRIORITY QUEUE: {action} Dispatch when units are available."

