import joblib
import pandas as pd

from pathlib import Path
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score


PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATA_PATH = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "ids"
    / "ddos_binary.csv"
)

MODEL_DIR = PROJECT_ROOT / "models"

MODEL_PATH = MODEL_DIR / "xgboost_ddos.joblib"


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

TARGET = "target"


def main():

    print("=" * 60)
    print("NTA - XGBoost Model Training")
    print("=" * 60)

    MODEL_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    print("\nLoading dataset:")
    print(DATA_PATH)

    df = pd.read_csv(DATA_PATH)

    print("Dataset shape:", df.shape)

    # --------------------------------------------------
    # Validate required columns
    # --------------------------------------------------

    required_columns = FEATURES + [TARGET]

    missing_columns = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Missing columns: {missing_columns}"
        )

    df = df[required_columns].copy()

    # --------------------------------------------------
    # Clean numerical features
    # --------------------------------------------------

    for column in FEATURES:

        df[column] = pd.to_numeric(
            df[column],
            errors="coerce"
        )

    df[FEATURES] = (
        df[FEATURES]
        .replace(
            [float("inf"), float("-inf")],
            0
        )
        .fillna(0)
    )

    # --------------------------------------------------
    # Target
    # --------------------------------------------------

    df[TARGET] = df[TARGET].astype(int)

    print("\nClass distribution:")
    print(df[TARGET].value_counts())

    # --------------------------------------------------
    # Prepare X and y
    # --------------------------------------------------

    X = df[FEATURES]
    y = df[TARGET]

    print("\nFeature count:", len(FEATURES))

    print("\nFeatures:")
    for feature in FEATURES:
        print(" -", feature)

    # --------------------------------------------------
    # Train/Test split
    # --------------------------------------------------

    print("\nSplitting dataset...")

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
        stratify=y,
    )

    print("Training samples:", len(X_train))
    print("Testing samples:", len(X_test))

    # --------------------------------------------------
    # XGBoost
    # --------------------------------------------------

    print("\nTraining XGBoost...")

    model = XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="binary:logistic",
        eval_metric="logloss",
        random_state=42,
        n_jobs=-1,
    )

    model.fit(
        X_train,
        y_train
    )

    print("\nModel training completed.")

    # --------------------------------------------------
    # Evaluation
    # --------------------------------------------------

    y_pred = model.predict(X_test)

    y_probability = model.predict_proba(
        X_test
    )[:, 1]

    print("\nClassification Report:")

    print(
        classification_report(
            y_test,
            y_pred,
            target_names=[
                "BENIGN",
                "DDoS"
            ],
        )
    )

    roc_auc = roc_auc_score(
        y_test,
        y_probability
    )

    print(
        f"ROC-AUC: {roc_auc:.6f}"
    )

    # --------------------------------------------------
    # Save model
    # --------------------------------------------------

    joblib.dump(
        model,
        MODEL_PATH
    )

    print("\nModel saved:")
    print(MODEL_PATH)

    print("\nTraining complete.")


if __name__ == "__main__":
    main()
