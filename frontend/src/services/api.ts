const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export interface Stats {
  total_flows: number;
  benign_flows: number;
  ddos_flows: number;
}

export interface NetworkFlow {
  id: number;
  timestamp: string;
  src_ip: string;
  dst_ip: string;
  src_port: number;
  dst_port: number;
  protocol: string;
  duration: number;
  total_packets: number;
  total_bytes: number;
  average_packet_size: number;
  packets_per_second: number;
  bytes_per_second: number;
  label: "BENIGN" | "DDoS";
  probability: number;
}
export interface DemoTestResult {
  test_type: "benign" | "ddos";
  sample_source: string;
  expected_label: "BENIGN" | "DDoS";
  prediction: number;
  label: "BENIGN" | "DDoS";
  confidence: number;
  benign_probability: number;
  ddos_probability: number;
  features: {
    duration: number;
    forward_packets: number;
    backward_packets: number;
    total_packets: number;
    forward_bytes: number;
    backward_bytes: number;
    total_bytes: number;
    average_packet_size: number;
    packets_per_second: number;
    bytes_per_second: number;
  };
  database_saved: boolean;
  message: string;
}

export async function testDemoModel(
  testType: "benign" | "ddos",
): Promise<DemoTestResult> {
  const response = await fetch(
    `${API_BASE_URL}/api/demo/test?test_type=${testType}`,
  );

  if (!response.ok) {
    throw new Error("Failed to run AI demo test");
  }

  return response.json();
}

export async function getStats(): Promise<Stats> {
  const response = await fetch(`${API_BASE_URL}/api/stats`);

  if (!response.ok) {
    throw new Error("Failed to fetch statistics");
  }

  return response.json();
}

export async function getFlows(): Promise<NetworkFlow[]> {
  const response = await fetch(`${API_BASE_URL}/api/flows`);

  if (!response.ok) {
    throw new Error("Failed to fetch network flows");
  }
    

  return response.json();
}
