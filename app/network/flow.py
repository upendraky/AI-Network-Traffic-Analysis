from dataclasses import dataclass, field
from typing import Optional


@dataclass
class NetworkFlow:
    """
    Represents a bidirectional network flow.

    A flow contains packets travelling between two endpoints.
    Packets are separated into forward and backward directions
    and aggregated into flow-level statistics.
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
    ) -> None:
        """
        Add one packet to the flow.

        Args:
            timestamp: Packet timestamp.
            packet_size: Packet size in bytes.
            direction: Either "forward" or "backward".
            tcp_flag: TCP flag string, if applicable.
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
        """Return flow duration in seconds."""

        return max(self.last_time - self.start_time, 0.0)

    @property
    def total_packets(self) -> int:
        """Return total number of packets."""

        return self.forward_packets + self.backward_packets

    @property
    def total_bytes(self) -> int:
        """Return total number of bytes."""

        return self.forward_bytes + self.backward_bytes

    @property
    def average_packet_size(self) -> float:
        """Return average packet size in bytes."""

        if not self.packet_sizes:
            return 0.0

        return self.total_bytes / len(self.packet_sizes)

    @property
    def packets_per_second(self) -> float:
        """Return packet transmission rate."""

        if self.duration <= 0:
            return 0.0

        return self.total_packets / self.duration

    @property
    def bytes_per_second(self) -> float:
        """Return byte transmission rate."""

        if self.duration <= 0:
            return 0.0

        return self.total_bytes / self.duration

    @property
    def is_tcp_terminated(self) -> bool:
        """
        Determine whether a TCP flow has received a FIN or RST.

        TCP termination flags:
            F  -> FIN
            R  -> RST
            FA -> FIN + ACK
            RA -> RST + ACK
        """

        if self.protocol != "TCP":
            return False

        termination_flags = {"F", "R", "FA", "RA"}

        return any(
            flag in termination_flags
            for flag in self.tcp_flags
        )

    def to_dict(self) -> dict:
        """
        Convert the flow into a dictionary.

        This representation is used by the API, database layer,
        debugging and future dashboard functionality.
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
    Manages active and completed bidirectional network flows.

    Responsibilities:
        - Create flows.
        - Match packets to existing flows.
        - Track forward/backward traffic.
        - Expire inactive flows.
        - Detect TCP termination.
        - Queue completed flows.
        - Flush active flows.
        - Provide flow statistics for monitoring/API layers.

    The class is intentionally independent of:
        - Scapy
        - XGBoost
        - SQLite
        - FastAPI
        - React

    This keeps flow aggregation reusable across live capture,
    testing, monitoring and future API functionality.
    """

    def __init__(self, timeout: float = 30.0):
        """
        Initialize the flow manager.

        Args:
            timeout: Maximum inactivity period in seconds before
                     a flow is considered completed.
        """

        self.timeout = timeout

        # Currently active flows.
        self.active_flows: dict[tuple, NetworkFlow] = {}

        # Completed flows waiting for processing.
        self.completed_flows: list[NetworkFlow] = []

    # ------------------------------------------------------------------
    # FLOW IDENTIFICATION
    # ------------------------------------------------------------------

    def _flow_key(self, features: dict) -> tuple:
        """
        Generate a bidirectional flow key.

        The two endpoints are sorted so that:

            A -> B

        and

            B -> A

        belong to the same flow.
        """

        endpoint_a = (
            features["src_ip"],
            features["src_port"],
        )

        endpoint_b = (
            features["dst_ip"],
            features["dst_port"],
        )

        return tuple(sorted([endpoint_a, endpoint_b]))

    # ------------------------------------------------------------------
    # FLOW COMPLETION
    # ------------------------------------------------------------------

    def _complete_flow(self, key: tuple) -> Optional[NetworkFlow]:
        """
        Move one active flow to the completed queue.
        """

        flow = self.active_flows.pop(key, None)

        if flow is not None:
            self.completed_flows.append(flow)

        return flow

    # ------------------------------------------------------------------
    # FLOW EXPIRATION
    # ------------------------------------------------------------------

    def _expire_flows(self, current_time: float) -> list[NetworkFlow]:
        """
        Expire flows that have been inactive longer than timeout.

        Completed flows remain in the completed queue so that the
        capture/monitor layer can process them safely.
        """

        expired_flows = []

        for key, flow in list(self.active_flows.items()):
            inactive_time = current_time - flow.last_time

            if inactive_time >= self.timeout:
                completed = self._complete_flow(key)

                if completed is not None:
                    expired_flows.append(completed)

        return expired_flows

    def expire_flows(self, current_time: float) -> list[NetworkFlow]:
        """
        Public method for expiring inactive flows.

        This method will be used by the future continuous monitor.
        """

        return self._expire_flows(current_time)

    # ------------------------------------------------------------------
    # ADD PACKET
    # ------------------------------------------------------------------

    def add_packet(
        self,
        features: dict,
        timestamp: float,
    ) -> NetworkFlow:
        """
        Add a packet to the appropriate bidirectional flow.

        Args:
            features: Packet features produced by features.py.
            timestamp: Packet timestamp.

        Returns:
            The NetworkFlow associated with the packet.

        Note:
            A flow may be completed immediately after this method
            if a TCP FIN/RST is detected. The completed flow remains
            available through drain_completed_flows().
        """

        # Expire old flows before processing the new packet.
        self._expire_flows(timestamp)

        key = self._flow_key(features)

        # --------------------------------------------------------------
        # CREATE NEW FLOW
        # --------------------------------------------------------------

        if key not in self.active_flows:
            self.active_flows[key] = NetworkFlow(
                src_ip=features["src_ip"],
                dst_ip=features["dst_ip"],
                src_port=features["src_port"],
                dst_port=features["dst_port"],
                protocol=features["protocol"],
                start_time=timestamp,
                last_time=timestamp,
            )

        flow = self.active_flows[key]

        # --------------------------------------------------------------
        # DETERMINE DIRECTION
        # --------------------------------------------------------------

        is_forward = (
            features["src_ip"] == flow.src_ip
            and features["src_port"] == flow.src_port
            and features["dst_ip"] == flow.dst_ip
            and features["dst_port"] == flow.dst_port
        )

        direction = "forward" if is_forward else "backward"

        packet_size = int(features.get("packet_size", 0))

        tcp_flag = features.get("tcp_flags")

        # --------------------------------------------------------------
        # ADD PACKET
        # --------------------------------------------------------------

        flow.add_packet(
            timestamp=timestamp,
            packet_size=packet_size,
            direction=direction,
            tcp_flag=tcp_flag,
        )

        # --------------------------------------------------------------
        # TCP TERMINATION
        # --------------------------------------------------------------

        if flow.is_tcp_terminated:
            self._complete_flow(key)

        return flow

    # ------------------------------------------------------------------
    # COMPLETED FLOW QUEUE
    # ------------------------------------------------------------------

    def drain_completed_flows(self) -> list[NetworkFlow]:
        """
        Return all completed flows and clear the queue.

        This is the main interface the capture/monitor layer should
        use when it wants to process completed flows.
        """

        completed = list(self.completed_flows)

        self.completed_flows.clear()

        return completed

    # ------------------------------------------------------------------
    # FLUSH
    # ------------------------------------------------------------------

    def flush_all(self) -> list[NetworkFlow]:
        """
        Complete every currently active flow.

        This is used when:
            - packet capture stops
            - monitoring stops
            - the application shuts down
            - a test needs to finalize all flows
        """

        for key in list(self.active_flows.keys()):
            self._complete_flow(key)

        return self.drain_completed_flows()

    # ------------------------------------------------------------------
    # FLOW ACCESS
    # ------------------------------------------------------------------

    def get_active_flows(self) -> list[NetworkFlow]:
        """Return a snapshot of currently active flows."""

        return list(self.active_flows.values())

    def get_completed_flows(self) -> list[NetworkFlow]:
        """Return completed flows waiting for processing."""

        return list(self.completed_flows)

    def get_flows(self) -> list[NetworkFlow]:
        """
        Return both active and completed flows.

        Primarily useful for debugging and monitoring.
        """

        return (
            list(self.active_flows.values())
            + list(self.completed_flows)
        )

    # ------------------------------------------------------------------
    # COUNTERS
    # ------------------------------------------------------------------

    @property
    def active_count(self) -> int:
        """Return number of currently active flows."""

        return len(self.active_flows)

    @property
    def completed_count(self) -> int:
        """Return number of completed flows waiting for processing."""

        return len(self.completed_flows)

    @property
    def total_count(self) -> int:
        """Return total active + completed flows."""

        return self.active_count + self.completed_count