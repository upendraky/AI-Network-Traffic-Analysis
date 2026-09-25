import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  Activity,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  Eye,
  FlaskConical,
  Gauge,
  Loader2,
  Network,
  Play,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Square,
  Wifi,
  X,
} from "lucide-react";

import {
  getFlows,
  getHealth,
  getMonitorStatus,
  getStats,
  startMonitor,
  stopMonitor,
  testDemoModel,
  type DemoTestResult,
  type MonitorStatus,
  type NetworkFlow,
  type Stats,
} from "./services/api";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";


// ============================================================
// HELPERS
// ============================================================

function formatAddress(address: string) {
  if (!address) return "-";

  if (address.length <= 32) {
    return address;
  }

  return `${address.slice(0, 15)}...${address.slice(-12)}`;
}


function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return "0 B";

  if (bytes < 1024) {
    return `${bytes.toFixed(0)} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}


function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}


function formatProbability(value: number) {
  return `${((value || 0) * 100).toFixed(4)}%`;
}


function formatMonitorTime(value: number | null) {
  if (!value) return "-";

  return new Date(value * 1000).toLocaleTimeString();
}


// ============================================================
// PREDICTION BADGE
// ============================================================

function PredictionBadge({
  label,
  probability,
}: {
  label: "BENIGN" | "DDoS";
  probability: number;
}) {
  const isDdos = label === "DDoS";

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
        isDdos
          ? "border-red-500/30 bg-red-500/10 text-red-400"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
      }`}
    >
      {isDdos ? (
        <ShieldAlert className="h-3.5 w-3.5" />
      ) : (
        <ShieldCheck className="h-3.5 w-3.5" />
      )}

      <span>{label}</span>

      <span className="text-slate-500">
        {formatProbability(probability)}
      </span>
    </div>
  );
}


// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconClass,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{title}</p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-white">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>

        <div className={`rounded-xl p-3 ${iconClass}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}


// ============================================================
// PIPELINE STEP
// ============================================================

function PipelineStep({
  number,
  title,
  description,
  icon,
}: {
  number: number;
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">
          0{number}
        </span>

        <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400">
          {icon}
        </div>
      </div>

      <p className="text-sm font-semibold text-white">{title}</p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}


// ============================================================
// PIPELINE ARROW
// ============================================================

function PipelineArrow() {
  return (
    <div className="hidden items-center justify-center text-slate-700 xl:flex">
      <ChevronRight className="h-5 w-5" />
    </div>
  );
}


// ============================================================
// DETAIL ITEM
// ============================================================

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-all text-sm font-medium text-slate-200">
        {value}
      </p>
    </div>
  );
}


// ============================================================
// FLOW DETAILS
// ============================================================

function FlowDetails({
  flow,
  onClose,
}: {
  flow: NetworkFlow;
  onClose: () => void;
}) {
  const isDdos = flow.label === "DDoS";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">

        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950/95 px-6 py-4 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-wider text-cyan-400">
              Flow Inspection
            </p>

            <h2 className="mt-1 text-xl font-bold text-white">
              Network Flow #{flow.id}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>


        <div className="space-y-6 p-6">

          {/* Prediction */}
          <div
            className={`rounded-2xl border p-5 ${
              isDdos
                ? "border-red-500/30 bg-red-500/5"
                : "border-emerald-500/30 bg-emerald-500/5"
            }`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  AI Prediction
                </p>

                <div className="mt-2 flex items-center gap-3">

                  {isDdos ? (
                    <ShieldAlert className="h-7 w-7 text-red-400" />
                  ) : (
                    <ShieldCheck className="h-7 w-7 text-emerald-400" />
                  )}

                  <span
                    className={`text-3xl font-bold ${
                      isDdos
                        ? "text-red-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {flow.label}
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-slate-950/70 px-6 py-4 text-center">
                <p className="text-xs text-slate-500">
                  DDoS Probability
                </p>

                <p className="mt-1 text-2xl font-bold text-white">
                  {formatProbability(flow.probability)}
                </p>
              </div>

            </div>
          </div>


          {/* Flow information */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Network className="h-4 w-4 text-cyan-400" />

              <h3 className="font-semibold text-white">
                Flow Information
              </h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

              <DetailItem
                label="Source"
                value={`${flow.src_ip}:${flow.src_port}`}
              />

              <DetailItem
                label="Destination"
                value={`${flow.dst_ip}:${flow.dst_port}`}
              />

              <DetailItem
                label="Protocol"
                value={flow.protocol}
              />

              <DetailItem
                label="Timestamp"
                value={new Date(flow.timestamp).toLocaleString()}
              />

              <DetailItem
                label="Duration"
                value={`${flow.duration.toFixed(4)} sec`}
              />

              <DetailItem
                label="Prediction"
                value={flow.prediction}
              />

            </div>
          </div>


          {/* Packet statistics */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" />

              <h3 className="font-semibold text-white">
                Packet Statistics
              </h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

              <DetailItem
                label="Forward Packets"
                value={formatNumber(flow.forward_packets)}
              />

              <DetailItem
                label="Backward Packets"
                value={formatNumber(flow.backward_packets)}
              />

              <DetailItem
                label="Total Packets"
                value={formatNumber(flow.total_packets)}
              />

              <DetailItem
                label="TCP Flags"
                value={flow.tcp_flags || "-"}
              />

            </div>
          </div>


          {/* Traffic statistics */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Gauge className="h-4 w-4 text-cyan-400" />

              <h3 className="font-semibold text-white">
                Traffic Statistics
              </h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

              <DetailItem
                label="Forward Bytes"
                value={formatBytes(flow.forward_bytes)}
              />

              <DetailItem
                label="Backward Bytes"
                value={formatBytes(flow.backward_bytes)}
              />

              <DetailItem
                label="Total Bytes"
                value={formatBytes(flow.total_bytes)}
              />

              <DetailItem
                label="Average Packet"
                value={`${flow.average_packet_size.toFixed(2)} B`}
              />

              <DetailItem
                label="Packets / Sec"
                value={flow.packets_per_second.toFixed(2)}
              />

              <DetailItem
                label="Bytes / Sec"
                value={formatBytes(flow.bytes_per_second)}
              />

            </div>
          </div>


          {/* AI explanation */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">

            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-cyan-400" />

              <h3 className="font-semibold text-white">
                AI Analysis
              </h3>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              {isDdos
                ? "The XGBoost classifier identified traffic characteristics consistent with DDoS activity."
                : "The XGBoost classifier identified traffic characteristics consistent with benign network activity."}
            </p>

          </div>

        </div>
      </div>
    </div>
  );
}


// ============================================================
// AI MODEL TEST LAB
// ============================================================

function DemoTestLab() {
  const [demoResult, setDemoResult] =
    useState<DemoTestResult | null>(null);

  const [demoLoading, setDemoLoading] =
    useState<"benign" | "ddos" | null>(null);

  const [demoError, setDemoError] =
    useState<string | null>(null);


  const runDemoTest = async (
    testType: "benign" | "ddos",
  ) => {
    setDemoLoading(testType);
    setDemoError(null);

    try {
      const result = await testDemoModel(testType);

      setDemoResult(result);
    } catch (error) {
      setDemoError(
        error instanceof Error
          ? error.message
          : "Failed to run AI demo test.",
      );
    } finally {
      setDemoLoading(null);
    }
  };


  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-cyan-400" />

            <h2 className="text-lg font-semibold text-white">
              AI Model Test Lab
            </h2>
          </div>

          <p className="mt-1 text-sm text-slate-400">
            Test the XGBoost classifier using controlled
            CIC-IDS2017 samples.
          </p>
        </div>

        <span className="w-fit rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
          DEMO MODE
        </span>

      </div>


      <div className="grid gap-4 md:grid-cols-2">

        {/* BENIGN */}
        <button
          type="button"
          onClick={() => runDemoTest("benign")}
          disabled={demoLoading !== null}
          className="group rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-left transition hover:border-emerald-400/60 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <div className="flex items-center justify-between">

            <div className="flex items-center gap-3">

              <div className="rounded-lg bg-emerald-500/10 p-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </div>

              <div>
                <p className="font-semibold text-white">
                  Test BENIGN Traffic
                </p>

                <p className="text-xs text-slate-400">
                  Run a known benign sample
                </p>
              </div>

            </div>

            {demoLoading === "benign" && (
              <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
            )}

          </div>
        </button>


        {/* DDOS */}
        <button
          type="button"
          onClick={() => runDemoTest("ddos")}
          disabled={demoLoading !== null}
          className="group rounded-xl border border-red-500/30 bg-red-500/5 p-5 text-left transition hover:border-red-400/60 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <div className="flex items-center justify-between">

            <div className="flex items-center gap-3">

              <div className="rounded-lg bg-red-500/10 p-2">
                <ShieldAlert className="h-5 w-5 text-red-400" />
              </div>

              <div>
                <p className="font-semibold text-white">
                  Test DDoS Traffic
                </p>

                <p className="text-xs text-slate-400">
                  Run a known DDoS sample
                </p>
              </div>

            </div>

            {demoLoading === "ddos" && (
              <Loader2 className="h-5 w-5 animate-spin text-red-400" />
            )}

          </div>
        </button>

      </div>


      {demoError && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {demoError}
        </div>
      )}


      {demoResult && (
        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-5">

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Classification Result
              </p>

              <div className="mt-2 flex items-center gap-3">

                {demoResult.label === "DDoS" ? (
                  <ShieldAlert className="h-7 w-7 text-red-400" />
                ) : (
                  <ShieldCheck className="h-7 w-7 text-emerald-400" />
                )}

                <span
                  className={`text-2xl font-bold ${
                    demoResult.label === "DDoS"
                      ? "text-red-400"
                      : "text-emerald-400"
                  }`}
                >
                  {demoResult.label}
                </span>

              </div>
            </div>


            <div className="rounded-xl bg-slate-900 px-5 py-3 text-center">
              <p className="text-xs text-slate-500">
                Confidence
              </p>

              <p className="mt-1 text-2xl font-bold text-white">
                {demoResult.confidence.toFixed(4)}%
              </p>
            </div>

          </div>


          <div className="mt-5 grid gap-3 sm:grid-cols-3">

            <DetailItem
              label="Expected"
              value={demoResult.expected_label}
            />

            <DetailItem
              label="DDoS Probability"
              value={`${demoResult.ddos_probability.toFixed(4)}%`}
            />

            <DetailItem
              label="Benign Probability"
              value={`${demoResult.benign_probability.toFixed(4)}%`}
            />

          </div>


          <p className="mt-4 text-xs text-slate-500">
            {demoResult.message}
          </p>

        </div>
      )}

    </section>
  );
}


// ============================================================
// MAIN APP
// ============================================================

function App() {

  // ----------------------------------------------------------
  // Dashboard state
  // ----------------------------------------------------------

  const [stats, setStats] = useState<Stats>({
    total_flows: 0,
    benign_flows: 0,
    ddos_flows: 0,
  });

  const [flows, setFlows] = useState<NetworkFlow[]>([]);

  const [monitor, setMonitor] = useState<MonitorStatus>({
    running: false,
    started_at: null,
    stopped_at: null,
    packets_captured: 0,
    flows_analyzed: 0,
    active_flows: 0,
    completed_flows: 0,
    last_error: null,
  });

  const [backendOnline, setBackendOnline] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [monitorActionLoading, setMonitorActionLoading] =
    useState<"start" | "stop" | null>(null);

  const [dashboardError, setDashboardError] =
    useState<string | null>(null);



  const [selectedFlow, setSelectedFlow] =
    useState<NetworkFlow | null>(null);


  // ----------------------------------------------------------
  // Load dashboard
  // ----------------------------------------------------------

  async function loadDashboard() {
    try {
      const [
        healthData,
        statsData,
        flowsData,
        monitorData,
      ] = await Promise.all([
        getHealth(),
        getStats(),
        getFlows(100),
        getMonitorStatus(),
      ]);

      setBackendOnline(
        healthData.status === "healthy",
      );

      setStats(statsData);

      setFlows(flowsData);

      setMonitor(monitorData);

      setDashboardError(null);



    } catch (error) {

      console.error(
        "Dashboard loading error:",
        error,
      );

      setBackendOnline(false);

      setDashboardError(
        error instanceof Error
          ? error.message
          : "Unable to connect to backend.",
      );

    } finally {
      setLoading(false);
    }
  }


  // ----------------------------------------------------------
  // Monitor status only
  // ----------------------------------------------------------

  async function refreshMonitorStatus() {
    try {
      const monitorData =
        await getMonitorStatus();

      setMonitor(monitorData);

    } catch (error) {
      console.error(
        "Monitor status error:",
        error,
      );
    }
  }


  // ----------------------------------------------------------
  // Start monitoring
  // ----------------------------------------------------------

  async function handleStartMonitoring() {
    if (monitor.running) return;

    setMonitorActionLoading("start");
    setDashboardError(null);

    try {

      const result =
        await startMonitor();

      setMonitor(result.status);

      await loadDashboard();

    } catch (error) {

      console.error(
        "Start monitoring error:",
        error,
      );

      setDashboardError(
        error instanceof Error
          ? error.message
          : "Failed to start monitoring.",
      );

      await refreshMonitorStatus();

    } finally {
      setMonitorActionLoading(null);
    }
  }


  // ----------------------------------------------------------
  // Stop monitoring
  // ----------------------------------------------------------

  async function handleStopMonitoring() {
    if (!monitor.running) return;

    setMonitorActionLoading("stop");
    setDashboardError(null);

    try {

      const result =
        await stopMonitor();

      setMonitor(result.status);

      await loadDashboard();

    } catch (error) {

      console.error(
        "Stop monitoring error:",
        error,
      );

      setDashboardError(
        error instanceof Error
          ? error.message
          : "Failed to stop monitoring.",
      );

      await refreshMonitorStatus();

    } finally {
      setMonitorActionLoading(null);
    }
  }


  // ----------------------------------------------------------
  // Initial load
  // ----------------------------------------------------------

  useEffect(() => {

    loadDashboard();

    const interval =
      window.setInterval(
        () => {
          loadDashboard();
        },
        5000,
      );

    return () => {
      window.clearInterval(interval);
    };

  }, []);


  // ----------------------------------------------------------
  // Faster monitor polling while active
  // ----------------------------------------------------------

  useEffect(() => {

    if (!monitor.running) {
      return;
    }

    const interval =
      window.setInterval(
        () => {
          refreshMonitorStatus();
          loadDashboard();
        },
        3000,
      );

    return () => {
      window.clearInterval(interval);
    };

  }, [monitor.running]);


  // ----------------------------------------------------------
  // Derived statistics
  // ----------------------------------------------------------

  const detectionRate =
    stats.total_flows > 0
      ? (
          (stats.ddos_flows /
            stats.total_flows) *
          100
        ).toFixed(2)
      : "0.00";


  const trafficData = useMemo(() => {

    return flows
      .slice()
      .reverse()
      .slice(-10)
      .map((flow) => ({
        id: `#${flow.id}`,
        packets: flow.total_packets,
        bytes: flow.total_bytes,
      }));

  }, [flows]);


  const detectionData = [
    {
      name: "BENIGN",
      value: stats.benign_flows,
    },
    {
      name: "DDoS",
      value: stats.ddos_flows,
    },
  ];


  const isBusy =
    monitorActionLoading !== null;


  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          <div className="flex items-center gap-4">

            <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-400">
              <Network className="h-6 w-6" />
            </div>

            <div>

              <h1 className="text-xl font-bold">
                NTA{" "}
                <span className="font-medium text-slate-400">
                  AI Network Traffic Analyzer
                </span>
              </h1>

              <p className="text-sm text-slate-500">
                Network visibility & AI-powered DDoS analysis
              </p>

            </div>
          </div>


          <div className="flex items-center gap-3">

            {/* Backend */}
            <span className="hidden items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-400 sm:flex">

              <span
                className={`h-2 w-2 rounded-full ${
                  backendOnline
                    ? "bg-emerald-400"
                    : "bg-red-400"
                }`}
              />

              {backendOnline
                ? "Backend Online"
                : "Backend Offline"}

            </span>


            {/* Monitor */}
            <span className="hidden items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-400 md:flex">

              <span
                className={`h-2 w-2 rounded-full ${
                  monitor.running
                    ? "bg-emerald-400"
                    : "bg-slate-600"
                }`}
              />

              {monitor.running
                ? "Live Monitoring"
                : "Monitor Stopped"}

            </span>


            {/* Refresh */}
            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
              className="rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
              title="Refresh dashboard"
            >
              <RefreshCw
                className={`h-5 w-5 ${
                  loading
                    ? "animate-spin"
                    : ""
                }`}
              />
            </button>

          </div>

        </div>

      </header>


      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">


        {/* Error */}
        {dashboardError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {dashboardError}
          </div>
        )}


        {/* ====================================================
            SECURITY OVERVIEW
        ==================================================== */}

        <section>

          <div className="mb-5 flex items-center gap-3">

            <Shield className="h-6 w-6 text-cyan-400" />

            <div>
              <h2 className="text-xl font-bold">
                Security Overview
              </h2>

              <p className="text-sm text-slate-500">
                Current network traffic classification
              </p>
            </div>

          </div>


          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

            <StatCard
              title="Total Flows"
              value={formatNumber(stats.total_flows)}
              subtitle="Captured network flows"
              icon={<Activity className="h-6 w-6" />}
              iconClass="bg-cyan-500/10 text-cyan-400"
            />

            <StatCard
              title="Benign Flows"
              value={formatNumber(stats.benign_flows)}
              subtitle="Normal traffic"
              icon={<ShieldCheck className="h-6 w-6" />}
              iconClass="bg-emerald-500/10 text-emerald-400"
            />

            <StatCard
              title="DDoS Detected"
              value={formatNumber(stats.ddos_flows)}
              subtitle="Potential threats"
              icon={<ShieldAlert className="h-6 w-6" />}
              iconClass="bg-red-500/10 text-red-400"
            />

            <StatCard
              title="Detection Rate"
              value={`${detectionRate}%`}
              subtitle="DDoS / total flows"
              icon={<Gauge className="h-6 w-6" />}
              iconClass="bg-yellow-500/10 text-yellow-400"
            />

          </div>

        </section>


        {/* ====================================================
            LIVE MONITORING
        ==================================================== */}

        <section
          className={`rounded-2xl border p-7 ${
            monitor.running
              ? "border-emerald-500/40 bg-emerald-950/20"
              : "border-slate-800 bg-slate-900/60"
          }`}
        >

          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">

            <div className="flex items-start gap-4">

              <div
                className={`rounded-xl p-3 ${
                  monitor.running
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                <Wifi className="h-6 w-6" />
              </div>


              <div>

                <div className="flex flex-wrap items-center gap-3">

                  <h2 className="text-xl font-bold">
                    Live Network Monitoring
                  </h2>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      monitor.running
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-slate-700 bg-slate-900 text-slate-400"
                    }`}
                  >
                    <span className="mr-2">
                      ●
                    </span>

                    {monitor.running
                      ? "MONITORING"
                      : "STOPPED"}
                  </span>

                </div>


                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                  Start the local Scapy monitoring engine to capture
                  network packets, build flows, run AI classification,
                  and persist the results.
                </p>

              </div>

            </div>


            {/* Controls */}
            <div className="flex flex-wrap gap-3">

              <button
                type="button"
                onClick={handleStartMonitoring}
                disabled={
                  monitor.running ||
                  isBusy ||
                  !backendOnline
                }
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
              >

                {monitorActionLoading === "start" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}

                Start Monitoring

              </button>


              <button
                type="button"
                onClick={handleStopMonitoring}
                disabled={
                  !monitor.running ||
                  isBusy
                }
                className="flex items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/5 px-6 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-30"
              >

                {monitorActionLoading === "stop" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Square className="h-4 w-4" />
                )}

                Stop Monitoring

              </button>

            </div>

          </div>


          {/* Monitor statistics */}
          <div className="mt-7 grid gap-3 md:grid-cols-2 lg:grid-cols-4">

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">

              <p className="text-xs uppercase tracking-wide text-slate-500">
                Packets Captured
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                {formatNumber(monitor.packets_captured)}
              </p>

            </div>


            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">

              <p className="text-xs uppercase tracking-wide text-slate-500">
                Flows Analyzed
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                {formatNumber(monitor.flows_analyzed)}
              </p>

            </div>


            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">

              <p className="text-xs uppercase tracking-wide text-slate-500">
                Active Flows
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                {formatNumber(monitor.active_flows)}
              </p>

            </div>


            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">

              <p className="text-xs uppercase tracking-wide text-slate-500">
                Completed Flows
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                {formatNumber(monitor.completed_flows)}
              </p>

            </div>

          </div>


          {/* Monitor information */}
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">

            <span className="flex items-center gap-2">
              <Clock3 className="h-3.5 w-3.5" />

              Started:
              {formatMonitorTime(
                monitor.started_at,
              )}
            </span>


            {!monitor.running &&
              monitor.stopped_at && (
                <span className="flex items-center gap-2">
                  <Clock3 className="h-3.5 w-3.5" />

                  Stopped:
                  {formatMonitorTime(
                    monitor.stopped_at,
                  )}
                </span>
              )}

          </div>


          {/* Last error */}
          {monitor.last_error && (
            <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">

              <div className="flex items-start gap-2">

                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />

                <div>
                  <p className="font-semibold">
                    Monitor error
                  </p>

                  <p className="mt-1 text-red-300/80">
                    {monitor.last_error}
                  </p>
                </div>

              </div>

            </div>
          )}


          {/* Status message */}
          {!monitor.last_error && (
            <div className="mt-5 flex items-center gap-2 text-sm">

              <Activity
                className={`h-4 w-4 ${
                  monitor.running
                    ? "text-emerald-400"
                    : "text-slate-600"
                }`}
              />

              <span
                className={
                  monitor.running
                    ? "text-emerald-400"
                    : "text-slate-500"
                }
              >
                {monitor.running
                  ? "Live packet monitoring is active. Statistics update automatically."
                  : "Live packet monitoring is stopped."}
              </span>

            </div>
          )}

        </section>


        {/* ====================================================
            AI SECURITY STATUS
        ==================================================== */}

        <section className="rounded-2xl border border-cyan-500/20 bg-cyan-950/10 p-6">

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div className="flex items-center gap-4">

              <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-400">
                <Sparkles className="h-6 w-6" />
              </div>

              <div>

                <h3 className="font-semibold text-white">
                  AI Security Status
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                  XGBoost classifier is connected to the
                  network-flow analysis pipeline.
                </p>

              </div>

            </div>


            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">

              <CheckCircle2 className="h-5 w-5" />

              AI Engine Active

            </div>

          </div>

        </section>


        {/* ====================================================
            HOW NTA WORKS
        ==================================================== */}

        <section>

          <div className="mb-5">

            <div className="flex items-center gap-3">

              <BrainCircuit className="h-6 w-6 text-cyan-400" />

              <h2 className="text-xl font-bold">
                How NTA Works
              </h2>

            </div>

            <p className="mt-1 text-sm text-slate-500">
              End-to-end traffic analysis and AI classification pipeline
            </p>

          </div>


          <div className="flex flex-col gap-3 xl:flex-row">

            <PipelineStep
              number={1}
              title="Packet Capture"
              description="Scapy captures live network packets from the local interface."
              icon={<Wifi className="h-4 w-4" />}
            />

            <PipelineArrow />

            <PipelineStep
              number={2}
              title="Flow Management"
              description="Packets are grouped into bidirectional network flows."
              icon={<Network className="h-4 w-4" />}
            />

            <PipelineArrow />

            <PipelineStep
              number={3}
              title="Feature Extraction"
              description="Packet counts, bytes, duration and traffic rates are calculated."
              icon={<Activity className="h-4 w-4" />}
            />

            <PipelineArrow />

            <PipelineStep
              number={4}
              title="AI Classification"
              description="XGBoost classifies completed flows as BENIGN or DDoS."
              icon={<BrainCircuit className="h-4 w-4" />}
            />

            <PipelineArrow />

            <PipelineStep
              number={5}
              title="Persistence"
              description="Flow results and predictions are stored in SQLite."
              icon={<Database className="h-4 w-4" />}
            />

            <PipelineArrow />

            <PipelineStep
              number={6}
              title="Dashboard"
              description="FastAPI exposes results for this React monitoring dashboard."
              icon={<BarChart3 className="h-4 w-4" />}
            />

          </div>

        </section>


        {/* ====================================================
            ANALYTICS
        ==================================================== */}

        <section className="grid gap-6 lg:grid-cols-2">

          {/* Traffic chart */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">

            <div className="mb-5 flex items-center justify-between">

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                  Traffic Analysis
                </p>

                <h3 className="mt-1 font-semibold text-white">
                  Packets per Flow
                </h3>
              </div>

              <BarChart3 className="h-5 w-5 text-slate-500" />

            </div>


            <div className="h-72">

              {trafficData.length === 0 ? (

                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  No traffic data available.
                </div>

              ) : (

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart data={trafficData}>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1e293b"
                    />

                    <XAxis
                      dataKey="id"
                      stroke="#64748b"
                      tick={{ fontSize: 11 }}
                    />

                    <YAxis
                      stroke="#64748b"
                      tick={{ fontSize: 11 }}
                    />

                    <Tooltip
                      contentStyle={{
                        background: "#0f172a",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                    />

                    <Bar
                      dataKey="packets"
                      fill="#22d3ee"
                      radius={[5, 5, 0, 0]}
                    />

                  </BarChart>
                </ResponsiveContainer>

              )}

            </div>

          </div>


          {/* Detection chart */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">

            <div className="mb-5 flex items-center justify-between">

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                  Classification
                </p>

                <h3 className="mt-1 font-semibold text-white">
                  BENIGN vs DDoS
                </h3>
              </div>

              <ShieldCheck className="h-5 w-5 text-slate-500" />

            </div>


            <div className="h-72">

              {stats.total_flows === 0 ? (

                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  No classification data available.
                </div>

              ) : (

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <PieChart>

                    <Pie
                      data={detectionData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={4}
                    >

                      <Cell fill="#10b981" />

                      <Cell fill="#ef4444" />

                    </Pie>

                    <Tooltip
                      contentStyle={{
                        background: "#0f172a",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                    />

                    <Legend />

                  </PieChart>
                </ResponsiveContainer>

              )}

            </div>

          </div>

        </section>


        {/* ====================================================
            FLOW TABLE
        ==================================================== */}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">

          <div className="flex flex-col gap-4 border-b border-slate-800 p-6 md:flex-row md:items-center md:justify-between">

            <div>

              <div className="flex items-center gap-2">

                <Database className="h-5 w-5 text-cyan-400" />

                <h2 className="text-lg font-semibold text-white">
                  Recent Network Flows
                </h2>

              </div>

              <p className="mt-1 text-sm text-slate-500">
                Latest flows analyzed by the NTA pipeline
              </p>

            </div>


            <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400">
              {flows.length} displayed
            </span>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full min-w-[900px] text-left text-sm">

              <thead className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase tracking-wider text-slate-500">

                <tr>

                  <th className="px-6 py-4">
                    Flow
                  </th>

                  <th className="px-6 py-4">
                    Protocol
                  </th>

                  <th className="px-6 py-4">
                    Packets
                  </th>

                  <th className="px-6 py-4">
                    Bytes
                  </th>

                  <th className="px-6 py-4">
                    AI Result
                  </th>

                  <th className="px-6 py-4">
                    Action
                  </th>

                </tr>

              </thead>


              <tbody className="divide-y divide-slate-800">

                {flows.length === 0 ? (

                  <tr>

                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      No network flows have been stored yet.
                    </td>

                  </tr>

                ) : (

                  flows.map((flow) => (

                    <tr
                      key={flow.id}
                      className="transition hover:bg-slate-950/60"
                    >

                      <td className="px-6 py-4">

                        <div className="max-w-[330px]">

                          <p
                            className="truncate font-mono text-xs text-slate-300"
                            title={`${flow.src_ip}:${flow.src_port}`}
                          >
                            {formatAddress(flow.src_ip)}:
                            {flow.src_port}
                          </p>

                          <div className="my-1 text-xs text-slate-700">
                            ↓
                          </div>

                          <p
                            className="truncate font-mono text-xs text-slate-400"
                            title={`${flow.dst_ip}:${flow.dst_port}`}
                          >
                            {formatAddress(flow.dst_ip)}:
                            {flow.dst_port}
                          </p>

                        </div>

                      </td>


                      <td className="px-6 py-4">

                        <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
                          {flow.protocol}
                        </span>

                      </td>


                      <td className="px-6 py-4 text-slate-300">
                        {formatNumber(flow.total_packets)}
                      </td>


                      <td className="px-6 py-4 text-slate-300">
                        {formatBytes(flow.total_bytes)}
                      </td>


                      <td className="px-6 py-4">

                        <PredictionBadge
                          label={flow.label}
                          probability={flow.probability}
                        />

                      </td>


                      <td className="px-6 py-4">

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedFlow(flow)
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-cyan-500/40 hover:bg-cyan-500/5 hover:text-cyan-300"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Inspect
                        </button>

                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

          </div>

        </section>


        {/* ====================================================
            AI MODEL LAB
        ==================================================== */}

        <DemoTestLab />


        {/* ====================================================
            FOOTER
        ==================================================== */}

        <footer className="border-t border-slate-800 py-6">

          <div className="flex flex-col gap-3 text-xs text-slate-600 md:flex-row md:items-center md:justify-between">

            <div className="flex items-center gap-2">

              <Server className="h-4 w-4" />

              NTA — AI Network Traffic Analyzer

            </div>

            <div>
              FastAPI • React • Scapy • XGBoost • SQLite
            </div>

          </div>

        </footer>

      </main>


      {/* ======================================================
          FLOW MODAL
      ====================================================== */}

      {selectedFlow && (
        <FlowDetails
          flow={selectedFlow}
          onClose={() =>
            setSelectedFlow(null)
          }
        />
      )}

    </div>
  );
}


export default App;