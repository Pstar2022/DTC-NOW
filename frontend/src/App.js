import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import {
  Cpu,
  Memory,
  HardDrive,
  WifiHigh,
  Thermometer,
  Lightning,
  Trash,
  Play,
  Robot,
  Clock,
  CaretUp,
  CaretDown,
  Circle,
  Gauge,
  CheckCircle,
  Warning,
  XCircle,
  Info,
  ArrowClockwise,
  Gear,
  ChartLine,
} from "@phosphor-icons/react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { ScrollArea } from "./components/ui/scroll-area";
import { Switch } from "./components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Toaster, toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Utility function to get color based on value
const getStatusColor = (value, thresholds = { warning: 50, critical: 85 }) => {
  if (value >= thresholds.critical) return "#FF3B30";
  if (value >= thresholds.warning) return "#FFCC00";
  return "#00FF66";
};

const getStatusClass = (value, thresholds = { warning: 50, critical: 85 }) => {
  if (value >= thresholds.critical) return "critical";
  if (value >= thresholds.warning) return "warning";
  return "healthy";
};

// Health Score Component
const HealthScore = ({ score, status, breakdown }) => {
  const getScoreColor = () => {
    if (score >= 80) return "#00FF66";
    if (score >= 60) return "#FFCC00";
    if (score >= 40) return "#FF9500";
    return "#FF3B30";
  };

  const getPulseClass = () => {
    if (score >= 80) return "pulse-healthy";
    if (score >= 60) return "pulse-warning";
    return "pulse-critical";
  };

  return (
    <div
      className="bg-[#0A0A0A] border border-white/10 rounded-sm p-6 h-full"
      data-testid="health-score-widget"
    >
      <h3 className="text-sm uppercase font-bold tracking-[0.2em] text-zinc-400 mb-4 flex items-center gap-2">
        <Gauge size={20} weight="bold" />
        System Health
      </h3>
      <div className="flex flex-col items-center">
        <div
          className={`relative w-32 h-32 rounded-full border-4 flex items-center justify-center ${getPulseClass()}`}
          style={{ borderColor: getScoreColor() }}
        >
          <div className="text-center">
            <span
              className="text-5xl font-mono font-bold tabular-nums"
              style={{ color: getScoreColor() }}
              data-testid="health-score-value"
            >
              {score}
            </span>
            <span className="text-xl text-zinc-400">%</span>
          </div>
        </div>
        <span
          className="mt-3 text-lg font-bold uppercase tracking-wide"
          style={{ color: getScoreColor() }}
          data-testid="health-score-status"
        >
          {status}
        </span>
        <div className="mt-4 w-full grid grid-cols-2 gap-2 text-xs">
          {Object.entries(breakdown).map(([key, value]) => (
            <div
              key={key}
              className="flex justify-between items-center px-2 py-1 bg-white/5 rounded-sm"
            >
              <span className="text-zinc-500 capitalize">{key}</span>
              <span
                className="font-mono tabular-nums"
                style={{ color: getStatusColor(100 - value) }}
              >
                {value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Metric Card Component
const MetricCard = ({ icon: Icon, title, value, unit, subValue, history, color }) => {
  const statusClass = getStatusClass(value);

  return (
    <div
      className="bg-[#0A0A0A] border border-white/10 rounded-sm p-6 h-full"
      data-testid={`metric-card-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm uppercase font-bold tracking-[0.2em] text-zinc-400 flex items-center gap-2">
          <Icon size={20} weight="bold" style={{ color }} />
          {title}
        </h3>
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className="text-4xl font-mono font-medium tabular-nums"
          style={{ color: getStatusColor(value) }}
          data-testid={`${title.toLowerCase().replace(/\s+/g, "-")}-value`}
        >
          {typeof value === "number" ? value.toFixed(1) : value}
        </span>
        <span className="text-lg text-zinc-500">{unit}</span>
      </div>
      {subValue && <p className="text-sm text-zinc-500 mt-1">{subValue}</p>}
      {history && history.length > 0 && (
        <div className="mt-4 h-16">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <defs>
                <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill={`url(#gradient-${title})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

// Network Card Component
const NetworkCard = ({ networkUp, networkDown, history }) => {
  return (
    <div
      className="bg-[#0A0A0A] border border-white/10 rounded-sm p-6 h-full"
      data-testid="metric-card-network"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm uppercase font-bold tracking-[0.2em] text-zinc-400 flex items-center gap-2">
          <WifiHigh size={20} weight="bold" className="text-[#00FFFF]" />
          Network
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-1 text-zinc-500 text-xs mb-1">
            <CaretUp size={14} className="text-[#00FF66]" />
            Upload
          </div>
          <span
            className="text-2xl font-mono font-medium tabular-nums text-white"
            data-testid="network-upload-value"
          >
            {networkUp.toFixed(1)}
          </span>
          <span className="text-sm text-zinc-500 ml-1">MB/s</span>
        </div>
        <div>
          <div className="flex items-center gap-1 text-zinc-500 text-xs mb-1">
            <CaretDown size={14} className="text-[#00FFFF]" />
            Download
          </div>
          <span
            className="text-2xl font-mono font-medium tabular-nums text-white"
            data-testid="network-download-value"
          >
            {networkDown.toFixed(1)}
          </span>
          <span className="text-sm text-zinc-500 ml-1">MB/s</span>
        </div>
      </div>
      {history && history.length > 0 && (
        <div className="mt-4 h-16">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <Line
                type="monotone"
                dataKey="up"
                stroke="#00FF66"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="down"
                stroke="#00FFFF"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

// Process List Component
const ProcessList = ({ processes, onKillProcess }) => {
  return (
    <div
      className="bg-[#0A0A0A] border border-white/10 rounded-sm h-full flex flex-col"
      data-testid="process-list"
    >
      <div className="p-4 border-b border-white/10">
        <h3 className="text-sm uppercase font-bold tracking-[0.2em] text-zinc-400 flex items-center gap-2">
          <Cpu size={20} weight="bold" className="text-[#00FF66]" />
          Active Processes
        </h3>
      </div>
      <ScrollArea className="flex-1">
        <table className="w-full">
          <thead className="sticky top-0 bg-[#0A0A0A]">
            <tr className="text-xs text-zinc-500 uppercase tracking-wider">
              <th className="text-left p-3 font-medium">Process</th>
              <th className="text-right p-3 font-medium">CPU</th>
              <th className="text-right p-3 font-medium">Memory</th>
              <th className="text-right p-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {processes.map((proc) => (
              <tr
                key={proc.pid}
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
                data-testid={`process-row-${proc.pid}`}
              >
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <Circle
                      size={8}
                      weight="fill"
                      className={
                        proc.status === "Running"
                          ? "text-[#00FF66]"
                          : "text-zinc-500"
                      }
                    />
                    <span className="font-mono text-sm">{proc.name}</span>
                  </div>
                </td>
                <td className="p-3 text-right">
                  <span
                    className="font-mono text-sm tabular-nums"
                    style={{ color: getStatusColor(proc.cpu_percent) }}
                  >
                    {proc.cpu_percent.toFixed(1)}%
                  </span>
                </td>
                <td className="p-3 text-right">
                  <span className="font-mono text-sm tabular-nums text-zinc-300">
                    {proc.memory_mb.toFixed(0)} MB
                  </span>
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => onKillProcess(proc.pid, proc.name)}
                    className="p-1.5 rounded-sm bg-transparent border border-[#FF3B30]/50 text-[#FF3B30] hover:bg-[#FF3B30] hover:text-white transition-colors"
                    data-testid={`process-kill-button-${proc.pid}`}
                    title="Kill Process"
                  >
                    <XCircle size={16} weight="bold" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  );
};

// AI Recommendations Component
const AIRecommendations = ({ recommendations, loading, onRefresh }) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "#FF3B30";
      case "medium":
        return "#FFCC00";
      case "low":
        return "#00FF66";
      default:
        return "#00FFFF";
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "high":
        return <Warning size={16} weight="bold" />;
      case "medium":
        return <Info size={16} weight="bold" />;
      case "low":
        return <CheckCircle size={16} weight="bold" />;
      default:
        return <Lightning size={16} weight="bold" />;
    }
  };

  return (
    <div
      className="bg-[#0a111a] border border-cyan-500/30 rounded-sm h-full flex flex-col relative overflow-hidden glow-ai"
      data-testid="ai-recommendations"
    >
      <div
        className="absolute inset-0 opacity-5 bg-cover bg-center pointer-events-none"
        style={{
          backgroundImage: `url(https://images.unsplash.com/photo-1754738797051-4e0c6983473a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTN8MHwxfHNlYXJjaHwzfHxhYnN0cmFjdCUyMGRhcmslMjB0ZWNobm9sb2d5fGVufDB8fHx8MTc3NTQ2NzI4Mnww&ixlib=rb-4.1.0&q=85)`,
        }}
      />
      <div className="p-4 border-b border-cyan-500/30 flex items-center justify-between relative z-10">
        <h3 className="text-sm uppercase font-bold tracking-[0.2em] text-[#00FFFF] flex items-center gap-2">
          <Robot size={20} weight="bold" />
          AI Recommendations
        </h3>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-sm bg-transparent border border-cyan-500/30 text-[#00FFFF] hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
          data-testid="ai-refresh-button"
        >
          <ArrowClockwise
            size={16}
            weight="bold"
            className={loading ? "animate-spin" : ""}
          />
        </button>
      </div>
      <ScrollArea className="flex-1 relative z-10">
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-pulse text-[#00FFFF]">
                <Robot size={32} weight="bold" />
              </div>
              <span className="ml-2 text-zinc-400">Analyzing system...</span>
            </div>
          ) : recommendations.length === 0 ? (
            <p className="text-zinc-500 text-center py-8">
              Click refresh to get AI-powered recommendations
            </p>
          ) : (
            recommendations.map((rec, index) => (
              <div
                key={rec.id || index}
                className="p-4 bg-black/30 border border-white/5 rounded-sm"
                data-testid={`ai-recommendation-${index}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="mt-0.5"
                    style={{ color: getPriorityColor(rec.priority) }}
                  >
                    {getPriorityIcon(rec.priority)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-zinc-200">{rec.recommendation}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className="text-xs uppercase tracking-wide px-2 py-0.5 rounded-sm bg-white/5"
                        style={{ color: getPriorityColor(rec.priority) }}
                      >
                        {rec.priority}
                      </span>
                      <span className="text-xs text-zinc-500 uppercase">
                        {rec.category}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

// Task Scheduler Component
const TaskScheduler = ({ tasks, onToggleTask, onRunTask }) => {
  const getTypeIcon = (type) => {
    switch (type) {
      case "cleanup":
        return <Trash size={16} weight="bold" />;
      case "memory":
        return <Memory size={16} weight="bold" />;
      case "startup":
        return <Gear size={16} weight="bold" />;
      default:
        return <Clock size={16} weight="bold" />;
    }
  };

  return (
    <div
      className="bg-[#0A0A0A] border border-white/10 rounded-sm h-full flex flex-col"
      data-testid="task-scheduler"
    >
      <div className="p-4 border-b border-white/10">
        <h3 className="text-sm uppercase font-bold tracking-[0.2em] text-zinc-400 flex items-center gap-2">
          <Clock size={20} weight="bold" className="text-[#FFCC00]" />
          Task Scheduler
        </h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`p-4 border rounded-sm transition-colors ${
                task.enabled
                  ? "bg-white/5 border-white/10"
                  : "bg-black/20 border-white/5 opacity-60"
              }`}
              data-testid={`task-item-${task.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div
                    className={`mt-0.5 ${
                      task.enabled ? "text-[#00FF66]" : "text-zinc-600"
                    }`}
                  >
                    {getTypeIcon(task.task_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-white truncate">
                      {task.name}
                    </h4>
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                      {task.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-zinc-500">
                        {task.schedule}
                      </span>
                      {task.last_run && (
                        <span className="text-xs text-zinc-600">
                          Last: {new Date(task.last_run).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onRunTask(task.id, task.name)}
                    className="p-1.5 rounded-sm bg-transparent border border-[#00FF66]/50 text-[#00FF66] hover:bg-[#00FF66] hover:text-black transition-colors"
                    data-testid={`task-run-button-${task.id}`}
                    title="Run Now"
                  >
                    <Play size={14} weight="bold" />
                  </button>
                  <Switch
                    checked={task.enabled}
                    onCheckedChange={(checked) => onToggleTask(task.id, checked)}
                    data-testid={`task-toggle-${task.id}`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

// Performance Tips Component
const PerformanceTips = ({ tips }) => {
  const getCategoryIcon = (category) => {
    switch (category) {
      case "startup":
        return <Lightning size={16} weight="bold" />;
      case "disk":
        return <HardDrive size={16} weight="bold" />;
      case "memory":
        return <Memory size={16} weight="bold" />;
      case "temperature":
        return <Thermometer size={16} weight="bold" />;
      default:
        return <ChartLine size={16} weight="bold" />;
    }
  };

  return (
    <div
      className="bg-[#0A0A0A] border border-white/10 rounded-sm h-full flex flex-col"
      data-testid="performance-tips"
    >
      <div className="p-4 border-b border-white/10">
        <h3 className="text-sm uppercase font-bold tracking-[0.2em] text-zinc-400 flex items-center gap-2">
          <Lightning size={20} weight="bold" className="text-[#FFCC00]" />
          Performance Tips
        </h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {tips.map((tip) => (
            <div
              key={tip.id}
              className="p-3 bg-white/5 border border-white/5 rounded-sm"
              data-testid={`tip-item-${tip.id}`}
            >
              <div className="flex items-start gap-3">
                <div className="text-[#FFCC00] mt-0.5">
                  {getCategoryIcon(tip.category)}
                </div>
                <div>
                  <h4 className="font-medium text-sm text-white">{tip.title}</h4>
                  <p className="text-xs text-zinc-500 mt-1">{tip.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

// Main Dashboard Component
const Dashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [metricsHistory, setMetricsHistory] = useState({
    cpu: [],
    ram: [],
    disk: [],
    network: [],
  });
  const [healthScore, setHealthScore] = useState(null);
  const [processes, setProcesses] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [tips, setTips] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch system metrics
  const fetchMetrics = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/system/metrics`);
      setMetrics(response.data);
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
    }
  }, []);

  // Fetch metrics history
  const fetchMetricsHistory = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/system/metrics/history`);
      setMetricsHistory(response.data);
    } catch (error) {
      console.error("Failed to fetch metrics history:", error);
    }
  }, []);

  // Fetch health score
  const fetchHealthScore = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/system/health-score`);
      setHealthScore(response.data);
    } catch (error) {
      console.error("Failed to fetch health score:", error);
    }
  }, []);

  // Fetch processes
  const fetchProcesses = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/system/processes`);
      setProcesses(response.data);
    } catch (error) {
      console.error("Failed to fetch processes:", error);
    }
  }, []);

  // Fetch scheduled tasks
  const fetchTasks = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/scheduler/tasks`);
      setTasks(response.data);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    }
  }, []);

  // Fetch performance tips
  const fetchTips = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/tips`);
      setTips(response.data);
    } catch (error) {
      console.error("Failed to fetch tips:", error);
    }
  }, []);

  // Fetch AI recommendations
  const fetchRecommendations = useCallback(async () => {
    if (!metrics || processes.length === 0) {
      toast.error("Waiting for system data...");
      return;
    }
    setAiLoading(true);
    try {
      const response = await axios.post(`${API}/ai/recommendations`, {
        metrics: metrics,
        processes: processes.slice(0, 5),
      });
      setRecommendations(response.data);
      toast.success("AI recommendations updated!");
    } catch (error) {
      console.error("Failed to fetch AI recommendations:", error);
      toast.error("Failed to get AI recommendations");
    } finally {
      setAiLoading(false);
    }
  }, [metrics, processes]);

  // Kill process
  const killProcess = async (pid, name) => {
    try {
      await axios.post(`${API}/processes/kill?pid=${pid}`);
      toast.success(`Process ${name} terminated`);
      fetchProcesses();
    } catch (error) {
      console.error("Failed to kill process:", error);
      toast.error("Failed to terminate process");
    }
  };

  // Toggle task
  const toggleTask = async (taskId, enabled) => {
    try {
      await axios.put(`${API}/scheduler/tasks/${taskId}?enabled=${enabled}`);
      toast.success(`Task ${enabled ? "enabled" : "disabled"}`);
      fetchTasks();
    } catch (error) {
      console.error("Failed to toggle task:", error);
      toast.error("Failed to update task");
    }
  };

  // Run task
  const runTask = async (taskId, name) => {
    try {
      toast.info(`Running ${name}...`);
      await axios.post(`${API}/scheduler/tasks/${taskId}/run`);
      toast.success(`${name} completed!`);
      fetchTasks();
    } catch (error) {
      console.error("Failed to run task:", error);
      toast.error("Failed to run task");
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchMetrics();
    fetchHealthScore();
    fetchProcesses();
    fetchTasks();
    fetchTips();
  }, [fetchMetrics, fetchHealthScore, fetchProcesses, fetchTasks, fetchTips]);

  // Set up polling for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMetrics();
      fetchMetricsHistory();
      fetchHealthScore();
      fetchProcesses();
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchMetrics, fetchMetricsHistory, fetchHealthScore, fetchProcesses]);

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="dashboard">
      {/* Header */}
      <header className="bg-[#050505] border-b border-white/10 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gauge size={32} weight="bold" className="text-[#00FF66]" />
            <h1 className="text-2xl font-black tracking-tight font-heading">
              PC Efficiency Manager
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-zinc-500 font-mono">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 bg-[#0A0A0A] border border-white/10">
            <TabsTrigger
              value="overview"
              data-testid="tab-overview"
              className="data-[state=active]:bg-[#00FF66] data-[state=active]:text-black"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="processes"
              data-testid="tab-processes"
              className="data-[state=active]:bg-[#00FF66] data-[state=active]:text-black"
            >
              Processes
            </TabsTrigger>
            <TabsTrigger
              value="scheduler"
              data-testid="tab-scheduler"
              className="data-[state=active]:bg-[#00FF66] data-[state=active]:text-black"
            >
              Scheduler
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Health Score - Span 1 column */}
              <div className="lg:col-span-1">
                {healthScore && (
                  <HealthScore
                    score={healthScore.score}
                    status={healthScore.status}
                    breakdown={healthScore.breakdown}
                  />
                )}
              </div>

              {/* Metrics - Span 3 columns */}
              <div className="md:col-span-2 lg:col-span-3 grid grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics && (
                  <>
                    <MetricCard
                      icon={Cpu}
                      title="CPU"
                      value={metrics.cpu_usage}
                      unit="%"
                      history={metricsHistory.cpu}
                      color="#00FF66"
                    />
                    <MetricCard
                      icon={Memory}
                      title="RAM"
                      value={metrics.ram_usage}
                      unit="%"
                      subValue={`${metrics.ram_used.toFixed(1)} / ${metrics.ram_total} GB`}
                      history={metricsHistory.ram}
                      color="#00FFFF"
                    />
                    <MetricCard
                      icon={HardDrive}
                      title="Disk"
                      value={metrics.disk_usage}
                      unit="%"
                      subValue={`${metrics.disk_used.toFixed(0)} / ${metrics.disk_total} GB`}
                      history={metricsHistory.disk}
                      color="#FFCC00"
                    />
                    <MetricCard
                      icon={Thermometer}
                      title="Temp"
                      value={metrics.temperature}
                      unit="°C"
                      color="#FF3B30"
                    />
                  </>
                )}
              </div>

              {/* Network Card */}
              <div className="md:col-span-1">
                {metrics && (
                  <NetworkCard
                    networkUp={metrics.network_up}
                    networkDown={metrics.network_down}
                    history={metricsHistory.network}
                  />
                )}
              </div>

              {/* AI Recommendations */}
              <div className="md:col-span-2 lg:col-span-2 min-h-[300px]">
                <AIRecommendations
                  recommendations={recommendations}
                  loading={aiLoading}
                  onRefresh={fetchRecommendations}
                />
              </div>

              {/* Performance Tips */}
              <div className="md:col-span-1 lg:col-span-1 min-h-[300px]">
                <PerformanceTips tips={tips} />
              </div>
            </div>
          </TabsContent>

          {/* Processes Tab */}
          <TabsContent value="processes" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 min-h-[500px]">
                <ProcessList processes={processes} onKillProcess={killProcess} />
              </div>
              <div className="min-h-[500px]">
                <AIRecommendations
                  recommendations={recommendations}
                  loading={aiLoading}
                  onRefresh={fetchRecommendations}
                />
              </div>
            </div>
          </TabsContent>

          {/* Scheduler Tab */}
          <TabsContent value="scheduler" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="min-h-[400px]">
                <TaskScheduler
                  tasks={tasks}
                  onToggleTask={toggleTask}
                  onRunTask={runTask}
                />
              </div>
              <div className="min-h-[400px]">
                <PerformanceTips tips={tips} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#0A0A0A",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#fff",
          },
        }}
      />
    </div>
  );
}

export default App;
