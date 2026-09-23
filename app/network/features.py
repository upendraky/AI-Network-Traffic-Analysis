from scapy.layers.inet import IP, TCP, UDP, ICMP
from scapy.layers.inet6 import IPv6

def extract_features(packet):
    """
    Extract network traffic features from a Scapy packet.
    """

    features = {
        "src_ip": None,
        "dst_ip": None,
        "src_port": 0,
        "dst_port": 0,
        "protocol": "OTHER",
        "packet_size": len(packet),
        "ttl": 0,
        "tcp_flags": "",
    }

    # IPv4
    if IP in packet:
        features["src_ip"] = packet[IP].src
        features["dst_ip"] = packet[IP].dst
        features["ttl"] = packet[IP].ttl

    # IPv6
    elif IPv6 in packet:
        features["src_ip"] = packet[IPv6].src
        features["dst_ip"] = packet[IPv6].dst
        features["ttl"] = packet[IPv6].hlim

    # TCP
    if TCP in packet:
        features["protocol"] = "TCP"
        features["src_port"] = packet[TCP].sport
        features["dst_port"] = packet[TCP].dport
        features["tcp_flags"] = str(packet[TCP].flags)

    # UDP
    elif UDP in packet:
        features["protocol"] = "UDP"
        features["src_port"] = packet[UDP].sport
        features["dst_port"] = packet[UDP].dport

    # ICMP
    elif ICMP in packet:
        features["protocol"] = "ICMP"

    return features