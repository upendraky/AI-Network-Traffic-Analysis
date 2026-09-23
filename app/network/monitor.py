import time

from app.ml.predict import predict_flow
from app.network.capture import NetworkCapture


class NetworkMonitor:
    """
    Captures live network traffic, builds flows,
    and sends completed flows to the AI model.
    """

    def __init__(self):
        self.capture = NetworkCapture()

    def process_completed_flows(self):
        flows = self.capture.get_flows()

        print("\n" + "=" * 70)
        print("AI NETWORK TRAFFIC ANALYSIS")
        print("=" * 70)

        print(f"Flows detected: {len(flows)}")

        for flow in flows:
            try:
                result = predict_flow(flow)

                print("\nFlow:")
                print(
                    f"{flow['src_ip']}:{flow['src_port']} "
                    f"-> "
                    f"{flow['dst_ip']}:{flow['dst_port']}"
                )

                print(f"Protocol: {flow['protocol']}")
                print(f"Packets: {flow['total_packets']}")
                print(f"Bytes: {flow['total_bytes']}")

                print(
                    f"AI Prediction: {result['label']}"
                )

                print(
                    f"DDoS Probability: "
                    f"{result['probability']:.6f}"
                )

                if result["prediction"] == 1:
                    print("🚨 ALERT: DDoS traffic detected!")
                else:
                    print("✓ Traffic appears benign.")

            except Exception as e:
                print(f"Prediction error: {e}")

    def start(self, packet_count=100):

        print("=" * 70)
        print("NTA - AI NETWORK TRAFFIC MONITOR")
        print("=" * 70)

        print(f"\nCapturing {packet_count} packets...")

        self.capture.start(packet_count)

        print("\nCapture finished.")

        self.process_completed_flows()


def start_monitor(packet_count=100):

    monitor = NetworkMonitor()

    monitor.start(packet_count)


if __name__ == "__main__":
    start_monitor(100)
