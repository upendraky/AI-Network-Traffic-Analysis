from pathlib import Path

import pandas as pd

from app.ml.predict import predict_flow


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATASET_PATH = PROJECT_ROOT / "data" / "processed" / "ids" / "ddos_binary.csv"


def main():
    print("=" * 70)
    print("NTA - XGBoost DDoS Prediction Test")
    print("=" * 70)

    print(f"\nDataset: {DATASET_PATH}")

    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            f"DDoS dataset not found: {DATASET_PATH}"
        )

    df = pd.read_csv(DATASET_PATH)

    # Select one known DDoS sample.
    ddos_samples = df[df["target"] == 1]

    if ddos_samples.empty:
        raise ValueError("No DDoS samples found in the dataset.")

    sample = ddos_samples.iloc[0]

    flow = {
        "src_ip": "192.168.100.10",
        "dst_ip": "192.168.100.20",
        "src_port": 50000,
        "dst_port": 80,
        "protocol": "TCP",

        "duration": float(sample["duration"]),
        "forward_packets": int(sample["forward_packets"]),
        "backward_packets": int(sample["backward_packets"]),
        "total_packets": int(sample["total_packets"]),
        "forward_bytes": int(sample["forward_bytes"]),
        "backward_bytes": int(sample["backward_bytes"]),
        "total_bytes": int(sample["total_bytes"]),
        "average_packet_size": float(sample["average_packet_size"]),
        "packets_per_second": float(sample["packets_per_second"]),
        "bytes_per_second": float(sample["bytes_per_second"]),
        "tcp_flags": "S",
    }

    print("\nKnown dataset label:")
    print("DDoS")

    print("\nFlow features:")
    for key, value in flow.items():
        print(f"  {key}: {value}")

    print("\nRunning XGBoost prediction...")

    result = predict_flow(flow)

    print("\n" + "=" * 70)
    print("AI RESULT")
    print("=" * 70)

    print(f"Prediction : {result['prediction']}")
    print(f"Label      : {result['label']}")
    print(f"Probability: {result['probability']:.6f}")

    print("\n" + "=" * 70)

    if result["label"] == "DDoS":
        print("SUCCESS: XGBoost classified the known DDoS sample as DDoS.")
    else:
        print("WARNING: XGBoost classified the known DDoS sample as BENIGN.")

    print("=" * 70)


if __name__ == "__main__":
    main()
