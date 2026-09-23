import joblib
import pandas as pd

from pathlib import Path

from app.ml.preprocess import prepare_features


PROJECT_ROOT = Path(__file__).resolve().parents[2]

MODEL_PATH = PROJECT_ROOT / "models" / "xgboost_ddos.joblib"


# IMPORTANT:
# These must exactly match the features used during training.
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

        self.model = joblib.load(MODEL_PATH)

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

        # Make sure feature order is correct.
        features = features.astype(float)

        # Generate probability.
        probability = float(
            self.model.predict_proba(features)[0][1]
        )

        # Binary prediction.
        prediction = int(probability >= 0.5)

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
