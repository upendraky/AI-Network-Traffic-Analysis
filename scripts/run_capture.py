import sys

from app.network.capture import start_capture


def main():
    packet_count = 20

    if len(sys.argv) > 1:
        packet_count = int(sys.argv[1])

    start_capture(packet_count)


if __name__ == "__main__":
    main()
