from dataclasses import dataclass, field
from typing import Optional


@dataclass
class NetworkFlow:
    """
    Represents a bidirectional network flow.
    """

    src_ip: str
    dst_ip: str
    src_port: int
    dst_port: int
    protocol: str

    start_time: float
    last_time: float

    forward_packets: int = 0
    backward_packets: int = 0

    forward_bytes: int = 0
    backward_bytes: int = 0

    packet_sizes: list[int] = field(default_factory=list)

    tcp_flags: set[str] = field(default_factory=set)

    def add_packet(
        self,
        timestamp: float,
        packet_size: int,
        direction: str,
        tcp_flag: Optional[str] = None,
    ):
        """
        Add a packet to the flow.
        """

        self.last_time = timestamp
        self.packet_sizes.append(packet_size)

        if direction == "forward":
            self.forward_packets += 1
            self.forward_bytes += packet_size
        else:
            self.backward_packets += 1
            self.backward_bytes += packet_size

        if tcp_flag:
            self.tcp_flags.add(tcp_flag)

    @property
    def duration(self) -> float:
        return max(self.last_time - self.start_time, 0.0)

    @property
    def total_packets(self) -> int:
        return self.forward_packets + self.backward_packets

    @property
    def total_bytes(self) -> int:
        return self.forward_bytes + self.backward_bytes

    @property
    def average_packet_size(self) -> float:
        if not self.packet_sizes:
            return 0.0

        return self.total_bytes / len(self.packet_sizes)

    @property
    def packets_per_second(self) -> float:
        if self.duration <= 0:
            return 0.0

        return self.total_packets / self.duration

    @property
    def bytes_per_second(self) -> float:
        if self.duration <= 0:
            return 0.0

        return self.total_bytes / self.duration

    def to_dict(self) -> dict:
        """
        Convert the flow into a dictionary.
        """

        return {
            "src_ip": self.src_ip,
            "dst_ip": self.dst_ip,
            "src_port": self.src_port,
            "dst_port": self.dst_port,
            "protocol": self.protocol,
            "duration": self.duration,
            "forward_packets": self.forward_packets,
            "backward_packets": self.backward_packets,
            "total_packets": self.total_packets,
            "forward_bytes": self.forward_bytes,
            "backward_bytes": self.backward_bytes,
            "total_bytes": self.total_bytes,
            "average_packet_size": self.average_packet_size,
            "packets_per_second": self.packets_per_second,
            "bytes_per_second": self.bytes_per_second,
            "tcp_flags": ",".join(sorted(self.tcp_flags)),
        }


class FlowManager:
    """
    Maintains active network flows and expires
    inactive flows after a configurable timeout.
    """

    def __init__(self, timeout=30.0):
        self.flows: dict[tuple, NetworkFlow] = {}
        self.completed_flows: list[dict] = []
        self.timeout = timeout

    @staticmethod
    def create_flow_key(features: dict) -> tuple:
        """
        Create a bidirectional flow key.

        A -> B and B -> A belong to the same flow.
        """

        endpoint_a = (
            features["src_ip"],
            features["src_port"],
        )

        endpoint_b = (
            features["dst_ip"],
            features["dst_port"],
        )

        endpoints = tuple(sorted([endpoint_a, endpoint_b]))

        return (
            endpoints[0],
            endpoints[1],
            features["protocol"],
        )

    def _expire_flows(self, current_time: float):
        """
        Move inactive flows from active storage
        to completed flows.
        """

        expired_keys = []

        for key, flow in self.flows.items():
            if current_time - flow.last_time >= self.timeout:
                self.completed_flows.append(flow.to_dict())
                expired_keys.append(key)

        for key in expired_keys:
            del self.flows[key]

    def add_packet(self, features: dict, timestamp: float):
        """
        Add a packet to the appropriate flow.
        """

        self._expire_flows(timestamp)

        key = self.create_flow_key(features)

        if key not in self.flows:
            flow = NetworkFlow(
                src_ip=features["src_ip"],
                dst_ip=features["dst_ip"],
                src_port=features["src_port"],
                dst_port=features["dst_port"],
                protocol=features["protocol"],
                start_time=timestamp,
                last_time=timestamp,
            )

            self.flows[key] = flow
            direction = "forward"

        else:
            flow = self.flows[key]

            if (
                features["src_ip"] == flow.src_ip
                and features["src_port"] == flow.src_port
            ):
                direction = "forward"
            else:
                direction = "backward"

        flow.add_packet(
            timestamp=timestamp,
            packet_size=features["packet_size"],
            direction=direction,
            tcp_flag=features.get("tcp_flags"),
        )

        return flow

    def get_active_flows(self) -> list[dict]:
        """
        Return currently active flows.
        """

        return [flow.to_dict() for flow in self.flows.values()]

    def get_completed_flows(self) -> list[dict]:
        """
        Return completed/expired flows.
        """

        return self.completed_flows

    def get_flows(self) -> list[dict]:
        """
        Return active and completed flows.
        """

        return self.get_active_flows() + self.completed_flows