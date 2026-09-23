import { useEffect, useMemo, useState } from "react";
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
  Globe2,
  Loader2,
  Network,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wifi,
  X,
  Zap,
} from "lucide-react";

import {
  getFlows,
  getStats,
  testDemoModel,
  type DemoTestResult,
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
  if (bytes < 1024) {
    return `${bytes.toFixed(0)} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}


function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}


function formatProbability(value: number) {
  return `${(value * 100).toFixed(4)}%`;
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
  icon: React.ReactNode;
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
  icon: React.ReactNode;
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
// FLOW DETAILS MODAL
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
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
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

          <div>
            <div className="mb-3 flex items-center gap-2">
              <Network className="h-4 w-4 text-cyan-400" />
              <h3 className="font-semibold text-white">
                Flow Information
              </h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
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
                label="Total Packets"
                value={formatNumber(flow.total_packets)}
              />
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              <h3 className="font-semibold text-white">
                Traffic Statistics
              </h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        <div
          className={`mt-5 rounded-xl border p-5 ${
            demoResult.label === "DDoS"
              ? "border-red-500/30 bg-red-500/5"
              : "border-emerald-500/30 bg-emerald-500/5"
          }`}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                AI Prediction
              </p>

              <div className="mt-1 flex items-center gap-2">
                {demoResult.label === "DDoS" ? (
                  <ShieldAlert className="h-6 w-6 text-red-400" />
                ) : (
                  <ShieldCheck className="h-6 w-6 text-emerald-400" />
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

            <div className="rounded-xl bg-slate-950/60 px-5 py-3 text-center">
              <p className="text-xs text-slate-500">
                Confidence
              </p>

              <p className="text-2xl font-bold text-white">
                {demoResult.confidence.toFixed(4)}%
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-950/50 p-3">
              <p className="text-xs text-slate-500">
                Expected
              </p>

              <p className="mt-1 font-semibold text-white">
                {demoResult.expected_label}
              </p>
            </div>

            <div className="rounded-lg bg-slate-950/50 p-3">
              <p className="text-xs text-slate-500">
                DDoS Probability
              </p>

              <p className="mt-1 font-semibold text-white">
                {demoResult.ddos_probability.toFixed(4)}%
              </p>
            </div>

            <div className="rounded-lg bg-slate-950/50 p-3">
              <p className="text-xs text-slate-500">
                Database
              </p>

              <p className="mt-1 font-semibold text-emerald-400">
                Not Saved
              </p>
            </div>
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

export default function App() {
  const [stats, setStats] = useState<Stats>({
    total_flows: 0,
    benign_flows: 0,
    ddos_flows: 0,
  });

  const [flows, setFlows] = useState<NetworkFlow[]>([]);

  const [loading, setLoading] = useState(true);

  const [backendOnline, setBackendOnline] = useState(false);

  const [selectedFlow, setSelectedFlow] =
    useState<NetworkFlow | null>(null);

  const loadDashboard = async () => {
    try {
      const [statsData, flowsData] = await Promise.all([
        getStats(),
        getFlows(),
      ]);

      setStats(statsData);
      setFlows(flowsData);
      setBackendOnline(true);
    } catch (error) {
      console.error("Dashboard loading error:", error);
      setBackendOnline(false);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadDashboard();

    const interval = window.setInterval(
      loadDashboard,
      5000,
    );

    return () => {
      window.clearInterval(interval);
    };
  }, []);


  const detectionRate = useMemo(() => {
    if (stats.total_flows === 0) {
      return 0;
    }

    return (
      (stats.ddos_flows / stats.total_flows) *
      100
    );
  }, [stats]);


  const trafficData = useMemo(() => {
    return flows
      .slice(0, 10)
      .reverse()
      .map((flow) => ({
        id: `Flow ${flow.id}`,
        packets: flow.total_packets,
        bytes: flow.total_bytes,
      }));
  }, [flows]);


  const classificationData = useMemo(() => {
    return [
      {
        name: "BENIGN",
        value: stats.benign_flows,
      },
      {
        name: "DDoS",
        value: stats.ddos_flows,
      },
    ];
  }, [stats]);


  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-500/10 p-2.5">
              <Network className="h-6 w-6 text-cyan-400" />
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                NTA
                <span className="ml-2 font-normal text-slate-400">
                  AI Network Traffic Analyzer
                </span>
              </h1>

              <p className="text-xs text-slate-500">
                Network visibility & AI-powered DDoS analysis
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  backendOnline
                    ? "bg-emerald-400"
                    : "bg-red-400"
                }`}
              />

              <span className="text-xs text-slate-400">
                {backendOnline
                  ? "Backend Online"
                  : "Backend Offline"}
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5">
              <Wifi className="h-3.5 w-3.5 text-cyan-400" />

              <span className="text-xs text-slate-400">
                Capture Ready
              </span>
            </div>

            <button
              type="button"
              onClick={loadDashboard}
              className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 transition hover:border-slate-700 hover:text-white"
              title="Refresh dashboard"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading ? "animate-spin" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </header>


      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Security Overview */}

        <section>
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-cyan-400" />

            <div>
              <h2 className="text-lg font-semibold text-white">
                Security Overview
              </h2>

              <p className="text-sm text-slate-500">
                Current network traffic classification
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Flows"
              value={formatNumber(stats.total_flows)}
              subtitle="Captured network flows"
              icon={<Activity className="h-5 w-5 text-cyan-400" />}
              iconClass="bg-cyan-500/10"
            />

            <StatCard
              title="Benign Flows"
              value={formatNumber(stats.benign_flows)}
              subtitle="Normal traffic"
              icon={<ShieldCheck className="h-5 w-5 text-emerald-400" />}
              iconClass="bg-emerald-500/10"
            />

            <StatCard
              title="DDoS Detected"
              value={formatNumber(stats.ddos_flows)}
              subtitle="Potential threats"
              icon={<ShieldAlert className="h-5 w-5 text-red-400" />}
              iconClass="bg-red-500/10"
            />

            <StatCard
              title="Detection Rate"
              value={`${detectionRate.toFixed(2)}%`}
              subtitle="DDoS / total flows"
              icon={<Gauge className="h-5 w-5 text-amber-400" />}
              iconClass="bg-amber-500/10"
            />
          </div>
        </section>


        {/* AI Status */}

        <section className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-cyan-500/10 p-3">
                <Sparkles className="h-5 w-5 text-cyan-400" />
              </div>

              <div>
                <p className="text-sm font-semibold text-white">
                  AI Security Status
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  XGBoost classifier is connected to the
                  network-flow analysis pipeline.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              AI Engine Active
            </div>
          </div>
        </section>


        {/* ===================================================
            HOW NTA WORKS
        =================================================== */}

        <section>
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-cyan-400" />

              <h2 className="text-lg font-semibold text-white">
                How NTA Works
              </h2>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              End-to-end traffic analysis and AI classification
              pipeline
            </p>
          </div>

          <div className="grid gap-3 xl:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr]">
            <PipelineStep
              number={1}
              title="Packet Capture"
              description="Scapy captures live network packets."
              icon={<Wifi className="h-4 w-4" />}
            />

            <PipelineArrow />

            <PipelineStep
              number={2}
              title="Flow Analysis"
              description="Packets are grouped into bidirectional flows."
              icon={<Network className="h-4 w-4" />}
            />

            <PipelineArrow />

            <PipelineStep
              number={3}
              title="Feature Extraction"
              description="Traffic statistics become model features."
              icon={<Activity className="h-4 w-4" />}
            />

            <PipelineArrow />

            <PipelineStep
              number={4}
              title="AI Detection"
              description="XGBoost classifies traffic patterns."
              icon={<BrainCircuit className="h-4 w-4" />}
            />

            <PipelineArrow />

            <PipelineStep
              number={5}
              title="Persistence"
              description="Flow results are stored in SQLite."
              icon={<Database className="h-4 w-4" />}
            />

            <PipelineArrow />

            <PipelineStep
              number={6}
              title="Visualization"
              description="FastAPI data is displayed in React."
              icon={<BarChart3 className="h-4 w-4" />}
            />
          </div>
        </section>


        {/* ===================================================
            AI MODEL TEST LAB
        =================================================== */}

        <DemoTestLab />


        {/* ===================================================
            NETWORK CAPTURE ENGINE
        =================================================== */}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Wifi className="h-5 w-5 text-cyan-400" />

                <h2 className="text-lg font-semibold text-white">
                  Network Capture Engine
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Capture live traffic using the Scapy packet
                engine.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
                Manual Capture Command
              </p>

              <code className="block max-w-full overflow-x-auto whitespace-nowrap text-xs text-cyan-300">
                sudo ./venv/bin/python -c
                "from app.network.capture import
                start_capture; start_capture(20)"
              </code>
            </div>
          </div>
        </section>


        {/* ===================================================
            AI ANALYSIS ENGINE
        =================================================== */}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-purple-500/10 p-3">
                <BrainCircuit className="h-5 w-5 text-purple-400" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-white">
                  AI Analysis Engine
                </h2>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                  Flow-level traffic characteristics are
                  analyzed by the trained XGBoost model to
                  classify network activity as BENIGN or DDoS.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-2 text-xs text-purple-300">
              <Zap className="h-3.5 w-3.5" />
              XGBoost
            </div>
          </div>
        </section>


        {/* ===================================================
            ANALYTICS
        =================================================== */}

        <section>
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-cyan-400" />

              <h2 className="text-lg font-semibold text-white">
                Traffic Analytics
              </h2>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Traffic volume and AI classification distribution
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Traffic chart */}

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">
                    Traffic Analysis
                  </h3>

                  <p className="text-xs text-slate-500">
                    Recent flow packet and byte volume
                  </p>
                </div>

                <Activity className="h-4 w-4 text-cyan-400" />
              </div>

              <div className="h-72">
                {trafficData.length > 0 ? (
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
                        tick={{
                          fill: "#64748b",
                          fontSize: 11,
                        }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <YAxis
                        tick={{
                          fill: "#64748b",
                          fontSize: 11,
                        }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <Tooltip
                        contentStyle={{
                          background: "#020617",
                          border: "1px solid #1e293b",
                          borderRadius: "10px",
                          color: "#fff",
                        }}
                      />

                      <Legend />

                      <Bar
                        dataKey="packets"
                        name="Packets"
                        fill="#22d3ee"
                        radius={[4, 4, 0, 0]}
                      />

                      <Bar
                        dataKey="bytes"
                        name="Bytes"
                        fill="#8b5cf6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-600">
                    No traffic data available
                  </div>
                )}
              </div>
            </div>


            {/* Classification chart */}

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">
                    AI Classification
                  </h3>

                  <p className="text-xs text-slate-500">
                    BENIGN vs DDoS flow distribution
                  </p>
                </div>

                <Shield className="h-4 w-4 text-cyan-400" />
              </div>

              <div className="h-72">
                {stats.total_flows > 0 ? (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <PieChart>
                      <Pie
                        data={classificationData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        innerRadius={55}
                        paddingAngle={3}
                      >
                        {classificationData.map(
                          (entry) => (
                            <Cell
                              key={entry.name}
                              fill={
                                entry.name === "DDoS"
                                  ? "#ef4444"
                                  : "#10b981"
                              }
                            />
                          ),
                        )}
                      </Pie>

                      <Tooltip
                        contentStyle={{
                          background: "#020617",
                          border: "1px solid #1e293b",
                          borderRadius: "10px",
                          color: "#fff",
                        }}
                      />

                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-600">
                    No classification data available
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>


        {/* ===================================================
            NETWORK FLOWS
        =================================================== */}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
          <div className="flex flex-col gap-3 border-b border-slate-800 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-cyan-400" />

                <h2 className="text-lg font-semibold text-white">
                  Network Flows
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Recently captured and analyzed network flows
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock3 className="h-3.5 w-3.5" />

              Auto-refresh every 5 seconds
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4 font-medium">
                    Flow
                  </th>

                  <th className="px-6 py-4 font-medium">
                    Source
                  </th>

                  <th className="px-6 py-4 font-medium">
                    Destination
                  </th>

                  <th className="px-6 py-4 font-medium">
                    Protocol
                  </th>

                  <th className="px-6 py-4 font-medium">
                    Packets
                  </th>

                  <th className="px-6 py-4 font-medium">
                    Bytes
                  </th>

                  <th className="px-6 py-4 font-medium">
                    Prediction
                  </th>

                  <th className="px-6 py-4 font-medium">
                    Inspect
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/80">
                {flows.length > 0 ? (
                  flows.map((flow) => (
                    <tr
                      key={flow.id}
                      onClick={() => setSelectedFlow(flow)}
                      className="cursor-pointer transition hover:bg-slate-800/30"
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-slate-500">
                          #{flow.id}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="max-w-[180px]">
                          <p
                            className="truncate font-mono text-xs text-slate-300"
                            title={flow.src_ip}
                          >
                            {formatAddress(flow.src_ip)}
                          </p>

                          <p className="mt-1 text-xs text-slate-600">
                            :{flow.src_port}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="max-w-[180px]">
                          <p
                            className="truncate font-mono text-xs text-slate-300"
                            title={flow.dst_ip}
                          >
                            {formatAddress(flow.dst_ip)}
                          </p>

                          <p className="mt-1 text-xs text-slate-600">
                            :{flow.dst_port}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-400">
                          {flow.protocol}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-300">
                        {formatNumber(flow.total_packets)}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-300">
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
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedFlow(flow);
                          }}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-300"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-12 text-center"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <Globe2 className="h-8 w-8 text-slate-700" />

                        <p className="text-sm text-slate-500">
                          No network flows captured yet.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>


        {/* ===================================================
            FOOTER
        =================================================== */}

        <footer className="border-t border-slate-800 pt-6 pb-4">
          <div className="flex flex-col gap-2 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <p>
              NTA — AI Network Traffic Analyzer
            </p>

            <p>
              Scapy • XGBoost • SQLite • FastAPI • React
            </p>
          </div>
        </footer>
      </main>


      {/* =====================================================
          FLOW MODAL
      ===================================================== */}

      {selectedFlow && (
        <FlowDetails
          flow={selectedFlow}
          onClose={() => setSelectedFlow(null)}
        />
      )}
    </div>
  );
}