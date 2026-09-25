const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";


// ============================================================
// TYPES
// ============================================================

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

  forward_packets: number;
  backward_packets: number;
  total_packets: number;

  forward_bytes: number;
  backward_bytes: number;
  total_bytes: number;

  average_packet_size: number;
  packets_per_second: number;
  bytes_per_second: number;

  tcp_flags: string;

  prediction: number;
  label: "BENIGN" | "DDoS";
  probability: number;
}


// ============================================================
// AI DEMO RESULT
// ============================================================

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


// Backward compatibility with the existing App.tsx
export type DemoResult = DemoTestResult;


// ============================================================
// MONITOR STATUS
// ============================================================

export interface MonitorStatus {
  running: boolean;

  started_at: number | null;

  stopped_at: number | null;

  packets_captured: number;

  flows_analyzed: number;

  active_flows: number;

  completed_flows: number;

  last_error: string | null;
}


// ============================================================
// MONITOR RESPONSE
// ============================================================

export interface MonitorResponse {
  success: boolean;

  message: string;

  status: MonitorStatus;
}


// ============================================================
// CAPTURE STATUS
// ============================================================

export interface CaptureStatus {
  status: string;

  monitoring: boolean;

  message: string;

  capture_command: string;

  monitor: MonitorStatus;
}


// ============================================================
// API REQUEST HELPER
// ============================================================

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,

      headers: {
        "Content-Type": "application/json",

        ...(options?.headers || {}),
      },
    },
  );

  if (!response.ok) {
    let message = `API request failed: ${response.status}`;

    try {
      const errorData = await response.json();

      if (errorData?.detail) {
        message = errorData.detail;
      }
    } catch {
      // Keep default error message.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}


// ============================================================
// HEALTH
// ============================================================

export async function getHealth() {
  return apiRequest<{
    status: string;

    service: string;

    timestamp: string;
  }>("/api/health");
}


// ============================================================
// STATISTICS
// ============================================================

export async function getStats(): Promise<Stats> {
  return apiRequest<Stats>("/api/stats");
}


// ============================================================
// NETWORK FLOWS
// ============================================================

export async function getFlows(
  limit: number = 100,
): Promise<NetworkFlow[]> {
  return apiRequest<NetworkFlow[]>(
    `/api/flows?limit=${limit}`,
  );
}


export async function getFlow(
  flowId: number,
): Promise<NetworkFlow> {
  return apiRequest<NetworkFlow>(
    `/api/flows/${flowId}`,
  );
}


// ============================================================
// MONITORING
// ============================================================

export async function getMonitorStatus(): Promise<MonitorStatus> {
  return apiRequest<MonitorStatus>(
    "/api/monitor/status",
  );
}


export async function startMonitor(): Promise<MonitorResponse> {
  return apiRequest<MonitorResponse>(
    "/api/monitor/start",
    {
      method: "POST",
    },
  );
}


export async function stopMonitor(): Promise<MonitorResponse> {
  return apiRequest<MonitorResponse>(
    "/api/monitor/stop",
    {
      method: "POST",
    },
  );
}


// ============================================================
// LEGACY CAPTURE STATUS
// ============================================================

export async function getCaptureStatus(): Promise<CaptureStatus> {
  return apiRequest<CaptureStatus>(
    "/api/capture/status",
  );
}


// ============================================================
// AI MODEL DEMO
// ============================================================

export async function testDemoModel(
  testType: "benign" | "ddos",
): Promise<DemoTestResult> {
  return apiRequest<DemoTestResult>(
    `/api/demo/test?test_type=${testType}`,
  );
}


// ============================================================
// DEFAULT API OBJECT
// ============================================================

export default {
  getHealth,

  getStats,

  getFlows,

  getFlow,

  getMonitorStatus,

  startMonitor,

  stopMonitor,

  getCaptureStatus,

  testDemoModel,
};