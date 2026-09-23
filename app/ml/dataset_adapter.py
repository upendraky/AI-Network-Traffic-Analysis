import pandas as pd


CIC_TO_MODEL = {
    "Flow Duration": "duration",
    "Total Fwd Packets": "forward_packets",
    "Total Backward Packets": "backward_packets",
    "Total Length of Fwd Packets": "forward_bytes",
    "Total Length of Bwd Packets": "backward_bytes",
    "Average Packet Size": "average_packet_size",
    "Flow Packets/s": "packets_per_second",
    "Flow Bytes/s": "bytes_per_second",
}


MODEL_FEATURES = [
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


def adapt_cic_ids2017(df: pd.DataFrame) -> pd.DataFrame:
    """
    Convert CIC-IDS2017 features into the standardized
    feature schema used by the NTA DDoS detection model.
    """

    data = df.copy()

    # Clean column names.
    data.columns = data.columns.str.strip()

    required_columns = list(CIC_TO_MODEL.keys()) + ["Label"]

    missing = [
        column
        for column in required_columns
        if column not in data.columns
    ]

    if missing:
        raise ValueError(
            f"Missing CIC-IDS2017 columns: {missing}"
        )

    # Rename CIC features to internal schema.
    data = data.rename(columns=CIC_TO_MODEL)

    # CIC-IDS2017 Flow Duration is measured in microseconds.
    # Convert to seconds to match live flow duration.
    data["duration"] = data["duration"] / 1_000_000.0

    numeric_columns = [
        "duration",
        "forward_packets",
        "backward_packets",
        "forward_bytes",
        "backward_bytes",
        "average_packet_size",
        "packets_per_second",
        "bytes_per_second",
    ]

    for column in numeric_columns:
        data[column] = pd.to_numeric(
            data[column],
            errors="coerce",
        )

    # Replace invalid numerical values.
    data[numeric_columns] = (
        data[numeric_columns]
        .replace([float("inf"), float("-inf")], 0)
        .fillna(0)
    )

    # Derive total packet count.
    data["total_packets"] = (
        data["forward_packets"]
        + data["backward_packets"]
    )

    # Derive total byte count.
    data["total_bytes"] = (
        data["forward_bytes"]
        + data["backward_bytes"]
    )

    # Convert labels into binary classification.
    data["target"] = (
        data["Label"]
        .astype(str)
        .str.strip()
        .str.upper()
        .map({
            "BENIGN": 0,
            "DDOS": 1,
        })
    )

    # Remove rows whose labels could not be mapped.
    data = data.dropna(subset=["target"])

    data["target"] = data["target"].astype(int)

    return data[MODEL_FEATURES + ["target"]]