import time

from scapy.all import sniff

from app.network.features import extract_features
from app.network.flow import FlowManager

from app.ml.predict import predict_flow

from app.database.db import SessionLocal
from app.database.repository import save_flow


class NetworkCapture:
    """
    Captures packets, aggregates them into flows,
    runs AI detection, and stores results.
    """

    def __init__(self):
        self.flow_manager = FlowManager()

    def process_packet(self, packet):
        """
        Process one captured packet.
        """

        features = extract_features(packet)

        # Ignore packets without an IP address.
        if not features["src_ip"] or not features["dst_ip"]:
            return

        timestamp = time.time()

        flow = self.flow_manager.add_packet(
            features=features,
            timestamp=timestamp,
        )

        print(
            f"{flow.src_ip}:{flow.src_port} <-> "
            f"{flow.dst_ip}:{flow.dst_port} | "
            f"{flow.protocol} | "
            f"Packets: {flow.total_packets} | "
            f"Bytes: {flow.total_bytes}"
        )

    def analyze_flow(self, flow):
        """
        Run AI prediction and save the flow.
        """

        prediction = predict_flow(flow)

        db = SessionLocal()

        try:
            record = save_flow(
                db,
                flow,
                prediction,
            )

            print(
                "\n[AI DETECTION]"
                f"\nFlow: {flow['src_ip']}:{flow['src_port']} "
                f"-> {flow['dst_ip']}:{flow['dst_port']}"
                f"\nPrediction: {prediction['label']}"
                f"\nProbability: "
                f"{prediction['probability']:.6f}"
                f"\nDatabase ID: {record.id}"
            )

            if prediction["label"] == "DDoS":
                print("🚨 ALERT: DDoS traffic detected!")

            print("-" * 60)

        finally:
            db.close()

    def start(self, packet_count=20):
        """
        Capture network packets and analyze resulting flows.
        """

        print("=" * 60)
        print("NTA - AI Network Traffic Analyzer")
        print("=" * 60)

        print(
            f"\nStarting packet capture: "
            f"{packet_count} packets..."
        )

        sniff(
            prn=self.process_packet,
            count=packet_count,
            store=False,
        )

        print("\nPacket capture completed.")

        # Flush active flows so they are analyzed immediately.
        flows = self.flow_manager.get_active_flows()

        print(
            f"Completed flows ready for AI analysis: "
            f"{len(flows)}"
        )

        for flow in flows:
            self.analyze_flow(flow)

        print("\nAI analysis completed.")

    def get_flows(self):
        """
        Return all collected flows.
        """

        return self.flow_manager.get_flows()


def start_capture(packet_count=20):
    """
    Backward-compatible entry point.
    """

    capture = NetworkCapture()

    capture.start(packet_count)

    return capture.get_flows()
