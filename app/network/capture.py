import time
from typing import Optional

from scapy.all import sniff

from app.database.db import SessionLocal
from app.database.repository import save_flow
from app.ml.predict import predict_flow
from app.network.features import extract_features
from app.network.flow import FlowManager, NetworkFlow


class NetworkCapture:
    """
    Network packet capture and flow-processing engine.

    Responsibilities:
        - Capture packets using Scapy.
        - Extract packet-level features.
        - Aggregate packets into bidirectional flows.
        - Detect completed flows.
        - Convert NetworkFlow objects into dictionaries.
        - Run AI classification.
        - Persist predictions to SQLite.
        - Provide capture status and statistics.
        - Support fixed capture and future continuous monitoring.
    """

    def __init__(self, flow_timeout: float = 30.0):
        self.flow_manager = FlowManager(timeout=flow_timeout)

        self.running = False

        self.packets_captured = 0
        self.flows_analyzed = 0

        self.last_error: Optional[str] = None
        self.started_at: Optional[float] = None
        self.stopped_at: Optional[float] = None

    # ==================================================================
    # PACKET PROCESSING
    # ==================================================================

    def process_packet(self, packet) -> None:
        """
        Process one packet captured by Scapy.
        """

        try:
            features = extract_features(packet)

            # Ignore packets without usable IP endpoints.
            if not features.get("src_ip") or not features.get("dst_ip"):
                return

            timestamp = time.time()

            self.packets_captured += 1

            self.flow_manager.add_packet(
                features=features,
                timestamp=timestamp,
            )

            # Process flows completed because of:
            # - TCP FIN/RST
            # - inactivity timeout triggered by a new packet
            self._process_completed_flows()

        except Exception as exc:
            self.last_error = str(exc)

            print("\n[PACKET PROCESSING ERROR]")
            print(f"{type(exc).__name__}: {exc}")

    # ==================================================================
    # COMPLETED FLOW PROCESSING
    # ==================================================================

    def _process_completed_flows(self) -> None:
        """
        Process every completed flow currently waiting in the queue.
        """

        completed_flows = self.flow_manager.drain_completed_flows()

        for flow in completed_flows:
            self.analyze_flow(flow)

    # ==================================================================
    # AI + DATABASE
    # ==================================================================

    def analyze_flow(self, flow: NetworkFlow) -> Optional[dict]:
        """
        Analyze one completed NetworkFlow.

        The NetworkFlow object is converted exactly once into the
        dictionary representation used by both the ML and database
        layers.
        """

        try:
            # ----------------------------------------------------------
            # CONVERT FLOW OBJECT TO DICTIONARY
            # ----------------------------------------------------------

            flow_data = flow.to_dict()

            # ----------------------------------------------------------
            # AI CLASSIFICATION
            # ----------------------------------------------------------

            prediction = predict_flow(flow_data)

            # ----------------------------------------------------------
            # DATABASE PERSISTENCE
            # ----------------------------------------------------------

            db = SessionLocal()

            try:
                record = save_flow(
                    db,
                    flow_data,
                    prediction,
                )

                self.flows_analyzed += 1

                # ------------------------------------------------------
                # OUTPUT
                # ------------------------------------------------------

                print("\n[AI DETECTION]")

                print(
                    f"Flow: "
                    f"{flow.src_ip}:{flow.src_port} -> "
                    f"{flow.dst_ip}:{flow.dst_port}"
                )

                print(
                    f"Prediction: "
                    f"{prediction['label']}"
                )

                print(
                    f"Probability: "
                    f"{prediction['probability']:.6f}"
                )

                print(
                    f"Database ID: "
                    f"{record.id}"
                )

                print("-" * 60)

                # ------------------------------------------------------
                # ALERT
                # ------------------------------------------------------

                if prediction["label"] == "DDoS":
                    print("🚨 ALERT: DDoS traffic detected!")

                return prediction

            finally:
                db.close()

        except Exception as exc:
            self.last_error = str(exc)

            print("\n[AI ANALYSIS ERROR]")
            print(f"{type(exc).__name__}: {exc}")

            return None

    # ==================================================================
    # FLOW EXPIRATION
    # ==================================================================

    def expire_flows(self) -> None:
        """
        Expire inactive flows and process them.

        The future continuous monitoring engine will call this
        periodically, including during periods when no new packets
        arrive.
        """

        current_time = time.time()

        self.flow_manager.expire_flows(current_time)

        self._process_completed_flows()

    # ==================================================================
    # FLUSH
    # ==================================================================

    def flush_flows(self) -> None:
        """
        Complete and process every currently active flow.

        Used when:
            - capture stops
            - monitoring stops
            - application shuts down
            - a test needs to finalize all flows
        """

        completed_flows = self.flow_manager.flush_all()

        for flow in completed_flows:
            self.analyze_flow(flow)

    # ==================================================================
    # FIXED PACKET CAPTURE
    # ==================================================================

    def start(self, packet_count: int = 20) -> list[NetworkFlow]:
        """
        Start a fixed packet-count capture.

        This method is used for:
            - development
            - testing
            - demonstrations
            - validating Scapy packet capture

        The same packet-processing pipeline is reused by the future
        continuous monitoring system.
        """

        self.running = True
        self.last_error = None

        self.packets_captured = 0
        self.flows_analyzed = 0

        self.started_at = time.time()
        self.stopped_at = None

        print("=" * 60)
        print("NTA - AI Network Traffic Analyzer")
        print("=" * 60)
        print()

        print(
            f"Starting packet capture: "
            f"{packet_count} packets..."
        )

        try:
            sniff(
                prn=self.process_packet,
                count=packet_count,
                store=False,
            )

        except KeyboardInterrupt:
            print("\nPacket capture interrupted by user.")

        except Exception as exc:
            self.last_error = str(exc)

            print("\n[CAPTURE ERROR]")
            print(f"{type(exc).__name__}: {exc}")

        finally:
            self.running = False
            self.stopped_at = time.time()

            # Complete flows that did not naturally terminate.
            self.flush_flows()

        print()
        print("Packet capture completed.")

        print(
            f"Packets captured: "
            f"{self.packets_captured}"
        )

        print(
            f"Flows analyzed: "
            f"{self.flows_analyzed}"
        )

        return self.flow_manager.get_flows()

    # ==================================================================
    # STATUS
    # ==================================================================

    def get_status(self) -> dict:
        """
        Return current capture-engine status.

        This will later be exposed through FastAPI.
        """

        return {
            "running": self.running,
            "packets_captured": self.packets_captured,
            "flows_analyzed": self.flows_analyzed,
            "active_flows": self.flow_manager.active_count,
            "completed_flows": self.flow_manager.completed_count,
            "started_at": self.started_at,
            "stopped_at": self.stopped_at,
            "last_error": self.last_error,
        }

    # ==================================================================
    # FLOW ACCESS
    # ==================================================================

    def get_flows(self) -> list[NetworkFlow]:
        """
        Return currently known flows.
        """

        return self.flow_manager.get_flows()


# ======================================================================
# SIMPLE FUNCTION API
# ======================================================================

def start_capture(packet_count: int = 20) -> list[NetworkFlow]:
    """
    Convenience function for running a local fixed packet capture.

    Example:

        sudo ./venv/bin/python -c \
        "from app.network.capture import start_capture; start_capture(20)"
    """

    capture = NetworkCapture()

    return capture.start(packet_count)