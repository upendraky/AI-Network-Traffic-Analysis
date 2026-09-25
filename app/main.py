from datetime import datetime, timezone
from pathlib import Path
import os

import pandas as pd
from xgboost import XGBClassifier

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.database.db import Base, SessionLocal, engine
from app.database.models import NetworkFlowRecord
from app.network.monitor import (
    get_monitor_status,
    start_monitor,
    stop_monitor,
)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_PATH = (
    BASE_DIR
    / "models"
    / "xgboost_ddos.json"
)

DATASET_PATH = (
    BASE_DIR
    / "data"
    / "processed"
    / "ids"
    / "ddos_binary.csv"
)


# ============================================================
# DATABASE
# ============================================================

Base.metadata.create_all(bind=engine)


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="NTA - AI Network Traffic Analyzer",
    description=(
        "AI-powered network traffic monitoring "
        "and DDoS detection system."
    ),
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173",
)

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
# AI DEMO CONFIGURATION
# ============================================================

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


# Load the model once when FastAPI starts.
try:
    demo_model = XGBClassifier()
    demo_model.load_model(MODEL_PATH)

    print("XGBoost demo model loaded.")

except Exception as error:
    demo_model = None

    print(
        f"Warning: Could not load demo model: {error}"
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
        "timestamp": datetime.now(
            timezone.utc
        ).isoformat(),
    }


# ============================================================
# STATISTICS
# ============================================================

@app.get("/api/stats")
def stats():
    """
    Return overall network-flow statistics.
    """

    db = SessionLocal()

    try:
        total_flows = (
            db.query(NetworkFlowRecord)
            .count()
        )

        benign_flows = (
            db.query(NetworkFlowRecord)
            .filter(
                NetworkFlowRecord.label == "BENIGN"
            )
            .count()
        )

        ddos_flows = (
            db.query(NetworkFlowRecord)
            .filter(
                NetworkFlowRecord.label == "DDoS"
            )
            .count()
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
def get_flows(limit: int = 100):
    """
    Return recent network flows.

    The limit prevents the dashboard from requesting the entire
    database unnecessarily.
    """

    if limit < 1:
        raise HTTPException(
            status_code=400,
            detail="limit must be greater than 0",
        )

    if limit > 1000:
        limit = 1000

    db = SessionLocal()

    try:
        flows = (
            db.query(NetworkFlowRecord)
            .order_by(
                NetworkFlowRecord.id.desc()
            )
            .limit(limit)
            .all()
        )

        return [
            {
                "id": flow.id,
                "timestamp": (
                    flow.timestamp.isoformat()
                    if flow.timestamp
                    else None
                ),

                "src_ip": flow.src_ip,
                "dst_ip": flow.dst_ip,

                "src_port": flow.src_port,
                "dst_port": flow.dst_port,

                "protocol": flow.protocol,

                "duration": flow.duration,

                "forward_packets": (
                    flow.forward_packets
                ),

                "backward_packets": (
                    flow.backward_packets
                ),

                "total_packets": (
                    flow.total_packets
                ),

                "forward_bytes": (
                    flow.forward_bytes
                ),

                "backward_bytes": (
                    flow.backward_bytes
                ),

                "total_bytes": (
                    flow.total_bytes
                ),

                "average_packet_size": (
                    flow.average_packet_size
                ),

                "packets_per_second": (
                    flow.packets_per_second
                ),

                "bytes_per_second": (
                    flow.bytes_per_second
                ),

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
    """
    Return complete information for one flow.
    """

    db = SessionLocal()

    try:
        flow = (
            db.query(NetworkFlowRecord)
            .filter(
                NetworkFlowRecord.id == flow_id
            )
            .first()
        )

        if flow is None:
            raise HTTPException(
                status_code=404,
                detail="Flow not found",
            )

        return {
            "id": flow.id,

            "timestamp": (
                flow.timestamp.isoformat()
                if flow.timestamp
                else None
            ),

            "src_ip": flow.src_ip,
            "dst_ip": flow.dst_ip,

            "src_port": flow.src_port,
            "dst_port": flow.dst_port,

            "protocol": flow.protocol,

            "duration": flow.duration,

            "forward_packets": (
                flow.forward_packets
            ),

            "backward_packets": (
                flow.backward_packets
            ),

            "total_packets": (
                flow.total_packets
            ),

            "forward_bytes": (
                flow.forward_bytes
            ),

            "backward_bytes": (
                flow.backward_bytes
            ),

            "total_bytes": (
                flow.total_bytes
            ),

            "average_packet_size": (
                flow.average_packet_size
            ),

            "packets_per_second": (
                flow.packets_per_second
            ),

            "bytes_per_second": (
                flow.bytes_per_second
            ),

            "tcp_flags": flow.tcp_flags,

            "prediction": flow.prediction,

            "label": flow.label,

            "probability": flow.probability,
        }

    finally:
        db.close()


# ============================================================
# MONITOR STATUS
# ============================================================

@app.get("/api/monitor/status")
def monitor_status():
    """
    Return the real-time monitoring-engine status.
    """

    return get_monitor_status()


# ============================================================
# START MONITORING
# ============================================================

@app.post("/api/monitor/start")
def monitor_start():
    """
    Start continuous network monitoring.

    Packet capture requires appropriate operating-system
    privileges on macOS.
    """

    status = get_monitor_status()

    if status["running"]:
        return {
            "success": False,
            "message": "NTA monitoring is already running.",
            "status": status,
        }

    started = start_monitor()

    status = get_monitor_status()

    if not started:
        return {
            "success": False,
            "message": "NTA monitoring could not be started.",
            "status": status,
        }

    return {
        "success": True,
        "message": "NTA continuous monitoring started.",
        "status": status,
    }


# ============================================================
# STOP MONITORING
# ============================================================

@app.post("/api/monitor/stop")
def monitor_stop():
    """
    Stop continuous network monitoring safely.
    """

    status = get_monitor_status()

    if not status["running"]:
        return {
            "success": False,
            "message": "NTA monitoring is not running.",
            "status": status,
        }

    stopped = stop_monitor()

    status = get_monitor_status()

    return {
        "success": stopped,
        "message": (
            "NTA continuous monitoring stopped."
            if stopped
            else "NTA monitoring could not be stopped."
        ),
        "status": status,
    }


# ============================================================
# LEGACY CAPTURE INFORMATION
# ============================================================

@app.get("/api/capture/status")
def capture_status():
    """
    Backward-compatible capture endpoint.

    The frontend previously used this endpoint, so it remains
    available while the dashboard migrates to the monitor API.
    """

    monitor = get_monitor_status()

    return {
        "status": (
            "running"
            if monitor["running"]
            else "ready"
        ),

        "monitoring": monitor["running"],

        "message": (
            "NTA continuous monitoring is running."
            if monitor["running"]
            else "NTA packet capture engine is ready."
        ),

        "capture_command": (
            "sudo ./venv/bin/python "
            "-m app.network.monitor"
        ),

        "monitor": monitor,
    }


# ============================================================
# AI DEMO TEST
# ============================================================

@app.get("/api/demo/test")
def demo_test(
    test_type: str = "benign",
):
    """
    Run a controlled AI demonstration using a real processed
    CIC-IDS2017 sample.

    The sample is classified but NOT written to the live
    network-flow database.
    """

    # --------------------------------------------------------
    # Validate test type
    # --------------------------------------------------------

    if test_type not in {
        "benign",
        "ddos",
    }:
        raise HTTPException(
            status_code=400,
            detail=(
                "test_type must be "
                "'benign' or 'ddos'"
            ),
        )

    # --------------------------------------------------------
    # Validate model
    # --------------------------------------------------------

    if demo_model is None:
        raise HTTPException(
            status_code=500,
            detail=(
                "XGBoost model could not be loaded."
            ),
        )

    # --------------------------------------------------------
    # Validate dataset
    # --------------------------------------------------------

    if not DATASET_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail=(
                f"Demo dataset not found: "
                f"{DATASET_PATH}"
            ),
        )

    try:

        # ----------------------------------------------------
        # Load processed CIC-IDS2017 dataset
        # ----------------------------------------------------

        dataset = pd.read_csv(
            DATASET_PATH
        )

        target_value = (
            1
            if test_type == "ddos"
            else 0
        )

        samples = dataset[
            dataset["target"] == target_value
        ]

        if samples.empty:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"No {test_type} samples "
                    "found in dataset."
                ),
            )

        # Use a real processed dataset sample.
        sample = samples.iloc[0]

        # ----------------------------------------------------
        # Prepare model input
        # ----------------------------------------------------

        input_data = pd.DataFrame(
            [
                [
                    sample[feature]
                    for feature in DEMO_FEATURES
                ]
            ],
            columns=DEMO_FEATURES,
        )

        # ----------------------------------------------------
        # XGBoost prediction
        # ----------------------------------------------------

        prediction = int(
            demo_model.predict(
                input_data
            )[0]
        )

        probabilities = (
            demo_model.predict_proba(
                input_data
            )[0]
        )

        benign_probability = float(
            probabilities[0]
        )

        ddos_probability = float(
            probabilities[1]
        )

        # ----------------------------------------------------
        # Result
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

            "sample_source": (
                "CIC-IDS2017 processed dataset"
            ),

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
                feature: float(
                    sample[feature]
                )
                for feature in DEMO_FEATURES
            },

            "database_saved": False,

            "message": (
                "Demo classification completed. "
                "The test sample was not added "
                "to the live database."
            ),
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )