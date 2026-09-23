from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String

from app.database.db import Base


class NetworkFlowRecord(Base):
    """
    Stores a completed network flow.
    """

    __tablename__ = "network_flows"

    id = Column(Integer, primary_key=True, index=True)

    timestamp = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    src_ip = Column(String, nullable=False)
    dst_ip = Column(String, nullable=False)

    src_port = Column(Integer, nullable=False)
    dst_port = Column(Integer, nullable=False)

    protocol = Column(String, nullable=False)

    duration = Column(Float, nullable=False)

    forward_packets = Column(Integer, nullable=False)
    backward_packets = Column(Integer, nullable=False)
    total_packets = Column(Integer, nullable=False)

    forward_bytes = Column(Integer, nullable=False)
    backward_bytes = Column(Integer, nullable=False)
    total_bytes = Column(Integer, nullable=False)

    average_packet_size = Column(Float, nullable=False)

    packets_per_second = Column(Float, nullable=False)
    bytes_per_second = Column(Float, nullable=False)
    tcp_flags = Column(String, nullable=True)

    # AI detection result
    prediction = Column(Integer, nullable=True)
    label = Column(String, nullable=True)
    probability = Column(Float, nullable=True)

    def __repr__(self):
        return (
            f"<NetworkFlowRecord("
            f"id={self.id}, "
            f"{self.src_ip}:{self.src_port} -> "
            f"{self.dst_ip}:{self.dst_port}, "
            f"protocol={self.protocol}, "
            f"label={self.label}"
            f")>"
        )