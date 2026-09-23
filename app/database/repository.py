from sqlalchemy.orm import Session

from app.database.models import NetworkFlowRecord


def save_flow(
    db: Session,
    flow: dict,
    prediction: dict | None = None,
) -> NetworkFlowRecord:
    """
    Save one network flow and its AI detection result.
    """

    record = NetworkFlowRecord(
        src_ip=flow["src_ip"],
        dst_ip=flow["dst_ip"],
        src_port=flow["src_port"],
        dst_port=flow["dst_port"],
        protocol=flow["protocol"],
        duration=flow["duration"],
        forward_packets=flow["forward_packets"],
        backward_packets=flow["backward_packets"],
        total_packets=flow["total_packets"],
        forward_bytes=flow["forward_bytes"],
        backward_bytes=flow["backward_bytes"],
        total_bytes=flow["total_bytes"],
        average_packet_size=flow["average_packet_size"],
        packets_per_second=flow["packets_per_second"],
        bytes_per_second=flow["bytes_per_second"],
        tcp_flags=flow.get("tcp_flags", ""),

        # AI result
        prediction=(
            prediction["prediction"]
            if prediction
            else None
        ),
        label=(
            prediction["label"]
            if prediction
            else None
        ),
        probability=(
            prediction["probability"]
            if prediction
            else None
        ),
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return record