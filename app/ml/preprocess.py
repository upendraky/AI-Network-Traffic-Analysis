import pandas as pd


NUMERIC_FEATURES = [
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

CATEGORICAL_FEATURES = []


def prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Prepare network-flow data for machine learning.
    """

    data = df.copy()

    feature_columns = (
        NUMERIC_FEATURES +
        CATEGORICAL_FEATURES
    )

    missing_columns = [
        column
        for column in feature_columns
        if column not in data.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Missing required features: {missing_columns}"
        )

    data = data[feature_columns]

    for column in NUMERIC_FEATURES:
        data[column] = pd.to_numeric(
            data[column],
            errors="coerce",
        )

    data[NUMERIC_FEATURES] = (
        data[NUMERIC_FEATURES]
        .replace([float("inf"), float("-inf")], 0)
        .fillna(0)
    )

    return data