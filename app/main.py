from datetime import datetime
from pathlib import Path
import os
import joblib
import pandas as pd

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.database.db import Base, SessionLocal, engine
from app.database.models import NetworkFlowRecord


# ============================================================
# DATABASE
# ============================================================

Base.metadata.create_all(bind=engine)


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="NTA - AI Network Traffic Analyzer",
    description="AI-powered network traffic monitoring and DDoS detection system.",
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        FRONTEND_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "name": "NTA - AI Network Traffic Analyzer",
        "status": "online",
        "version": "1.0.0",
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "service": "network-traffic-analyzer",
        "timestamp": datetime.utcnow().isoformat(),
    }


# ============================================================
# STATISTICS
# ============================================================

@app.get("/api/stats")
def stats():

    db = SessionLocal()

    try:
        flows = db.query(NetworkFlowRecord).all()

        total_flows = len(flows)

        benign_flows = sum(
            1
            for flow in flows
            if flow.label == "BENIGN"
        )

        ddos_flows = sum(
            1
            for flow in flows
            if flow.label == "DDoS"
        )

        return {
            "total_flows": total_flows,
            "benign_flows": benign_flows,
            "ddos_flows": ddos_flows,
        }

    finally:
        db.close()


# ============================================================
# NETWORK FLOWS
# ============================================================

@app.get("/api/flows")
def get_flows():

    db = SessionLocal()

    try:

        flows = (
            db.query(NetworkFlowRecord)
            .order_by(NetworkFlowRecord.id.desc())
            .all()
        )

        return [
            {
                "id": flow.id,
                "timestamp": flow.timestamp,

                "src_ip": flow.src_ip,
                "dst_ip": flow.dst_ip,

                "src_port": flow.src_port,
                "dst_port": flow.dst_port,

                "protocol": flow.protocol,

                "duration": flow.duration,

                "forward_packets": flow.forward_packets,
                "backward_packets": flow.backward_packets,
                "total_packets": flow.total_packets,

                "forward_bytes": flow.forward_bytes,
                "backward_bytes": flow.backward_bytes,
                "total_bytes": flow.total_bytes,

                "average_packet_size": flow.average_packet_size,

                "packets_per_second": flow.packets_per_second,
                "bytes_per_second": flow.bytes_per_second,

                "tcp_flags": flow.tcp_flags,

                "prediction": flow.prediction,
                "label": flow.label,
                "probability": flow.probability,
            }
            for flow in flows
        ]

    finally:
        db.close()


# ============================================================
# SINGLE FLOW
# ============================================================

@app.get("/api/flows/{flow_id}")
def get_flow(flow_id: int):

    db = SessionLocal()

    try:

        flow = (
            db.query(NetworkFlowRecord)
            .filter(NetworkFlowRecord.id == flow_id)
            .first()
        )

        if flow is None:
            raise HTTPException(
                status_code=404,
                detail="Flow not found",
            )

        return {
            "id": flow.id,
            "timestamp": flow.timestamp,

            "src_ip": flow.src_ip,
            "dst_ip": flow.dst_ip,

            "src_port": flow.src_port,
            "dst_port": flow.dst_port,

            "protocol": flow.protocol,

            "duration": flow.duration,

            "forward_packets": flow.forward_packets,
            "backward_packets": flow.backward_packets,
            "total_packets": flow.total_packets,

            "forward_bytes": flow.forward_bytes,
            "backward_bytes": flow.backward_bytes,
            "total_bytes": flow.total_bytes,

            "average_packet_size": flow.average_packet_size,

            "packets_per_second": flow.packets_per_second,
            "bytes_per_second": flow.bytes_per_second,

            "tcp_flags": flow.tcp_flags,

            "prediction": flow.prediction,
            "label": flow.label,
            "probability": flow.probability,
        }

    finally:
        db.close()


# ============================================================
# CAPTURE INFORMATION
# ============================================================

@app.get("/api/capture/status")
def capture_status():

    return {
        "status": "ready",
        "message": "NTA packet capture engine is ready.",
        "capture_command": (
            "sudo ./venv/bin/python -c "
            "\"from app.network.capture import start_capture; "
            "start_capture(20)\""
        ),
    }


# ============================================================
# AI DEMO TEST
# ============================================================

MODEL_PATH = (
    Path(__file__).resolve().parent.parent
    / "models"
    / "xgboost_ddos.joblib"
)

DATASET_PATH = (
    Path(__file__).resolve().parent.parent
    / "data"
    / "processed"
    / "ids"
    / "ddos_binary.csv"
)

DEMO_FEATURES = [
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


# Load model once when the API starts.
try:
    demo_model = joblib.load(MODEL_PATH)
    print("XGBoost demo model loaded.")
except Exception as error:
    demo_model = None
    print(f"Warning: Could not load demo model: {error}")


@app.get("/api/demo/test")
def demo_test(test_type: str = "benign"):

    if test_type not in {"benign", "ddos"}:
        raise HTTPException(
            status_code=400,
            detail="test_type must be 'benign' or 'ddos'",
        )

    if demo_model is None:
        raise HTTPException(
            status_code=500,
            detail="XGBoost model could not be loaded.",
        )

    if not DATASET_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail=f"Demo dataset not found: {DATASET_PATH}",
        )

    try:

        # ----------------------------------------------------
        # Load real processed CIC-IDS2017 samples
        # ----------------------------------------------------

        dataset = pd.read_csv(DATASET_PATH)

        target_value = 1 if test_type == "ddos" else 0

        samples = dataset[
            dataset["target"] == target_value
        ]

        if samples.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No {test_type} samples found in dataset.",
            )

        # Use a real dataset sample.
        sample = samples.iloc[0]

        input_data = pd.DataFrame(
            [[sample[feature] for feature in DEMO_FEATURES]],
            columns=DEMO_FEATURES,
        )

        # ----------------------------------------------------
        # XGBoost prediction
        # ----------------------------------------------------

        prediction = int(
            demo_model.predict(input_data)[0]
        )

        probabilities = demo_model.predict_proba(
            input_data
        )[0]

        benign_probability = float(
            probabilities[0]
        )

        ddos_probability = float(
            probabilities[1]
        )

        # ----------------------------------------------------
        # Model result
        # ----------------------------------------------------

        label = (
            "DDoS"
            if prediction == 1
            else "BENIGN"
        )

        confidence = max(
            benign_probability,
            ddos_probability,
        )

        expected_label = (
            "DDoS"
            if target_value == 1
            else "BENIGN"
        )

        return {
            "test_type": test_type,
            "sample_source": "CIC-IDS2017 processed dataset",

            "expected_label": expected_label,

            "prediction": prediction,
            "label": label,

            "confidence": round(
                confidence * 100,
                4,
            ),

            "benign_probability": round(
                benign_probability * 100,
                6,
            ),

            "ddos_probability": round(
                ddos_probability * 100,
                6,
            ),

            "features": {
                feature: float(sample[feature])
                for feature in DEMO_FEATURES
            },

            "database_saved": False,

            "message": (
                "Demo classification completed. "
                "The test sample was not added to the live database."
            ),
        }

    except HTTPException:
        raise

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )