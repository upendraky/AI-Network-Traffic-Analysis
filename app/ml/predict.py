from pathlib import Path

import pandas as pd
from xgboost import XGBClassifier

from app.ml.preprocess import prepare_features


PROJECT_ROOT = Path(__file__).resolve().parents[2]

MODEL_PATH = (
    PROJECT_ROOT
    / "models"
    / "xgboost_ddos.json"
)


FEATURES = [
    "duration",
    "forward_packets",
    "backward_packets",
    "total_packets",
    "forward_bytes",
    "backward_bytes",
    "total_bytes",
    "average_packet_size",
    "packets_per_second",
    "bytes_per_second",
]


class DDoSPredictor:
    """
    Loads the trained XGBoost model and predicts
    whether a network flow is BENIGN or DDoS.
    """

    def __init__(self):

        print("Loading NTA AI model...")

        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"XGBoost model not found: {MODEL_PATH}\n"
                "Run the training script first."
            )

        self.model = XGBClassifier()

        self.model.load_model(
            MODEL_PATH
        )

        print("XGBoost model loaded.")

    def predict(self, flow: dict) -> dict:
        """
        Predict a single network flow.
        """

        # Convert one flow into a DataFrame.
        df = pd.DataFrame([flow])

        # Apply feature preprocessing.
        features = prepare_features(df)

        # Keep ONLY the features used during training.
        features = features[FEATURES]

        # Make sure feature order and types are correct.
        features = features.astype(float)

        # Generate DDoS probability.
        probability = float(
            self.model.predict_proba(features)[0][1]
        )

        # Binary prediction.
        prediction = int(
            probability >= 0.5
        )

        label = (
            "DDoS"
            if prediction == 1
            else "BENIGN"
        )

        return {
            "prediction": prediction,
            "label": label,
            "probability": probability,
        }


_predictor = None


def get_predictor() -> DDoSPredictor:
    """
    Return a singleton predictor instance.
    """

    global _predictor

    if _predictor is None:
        _predictor = DDoSPredictor()

    return _predictor


def predict_flow(flow: dict) -> dict:
    """
    Convenience function for predicting a flow.
    """

    return get_predictor().predict(flow)