import { execSync } from "child_process";

export interface Agent {
  id: string;
  name: string;
  emoji: string;
  model: string;
  workspace: string;
  status: "active" | "idle" | "error";
}

export interface Channel {
  name: string;
  enabled: boolean;
  status: string;
  detail: string;
}

export interface MemoryStatus {
  agent: string;
  files: number;
  chunks: number;
  fts: string;
  vector: string;
}

export interface SecurityRule {
  id: string;
  action: string;
  policy: string;
  reason: string;
  riskScore: number;
}

function run(cmd: string): string {
  try {
    return execSync(cmd, {
      encoding: "utf-8",
      timeout: 10000,
      env: { ...process.env, NO_COLOR: "1" },
    }).trim();
  } catch {
    return "";
  }
}

export function getAgents(): Agent[] {
  const config = JSON.parse(
    run("cat /home/node/.openclaw/openclaw.json") || "{}"
  );
  const agents = config?.agents?.list || [];
  return agents.map((a: any) => ({
    id: a.id,
    name: a.identity?.name || a.name || a.id,
    emoji: a.identity?.emoji || (a.id === "main" ? "🚀" : "🤖"),
    model: a.model || "default",
    workspace: a.workspace || "~/.openclaw/workspace",
    status: "idle" as const,
  }));
}

export function getChannels(): Channel[] {
  const raw = run("openclaw channels status 2>&1");
  const channels: Channel[] = [];
  const lines = raw.split("\n");
  for (const line of lines) {
    const match = line.match(
      /^- (\w+)\s+(\w+):\s+(enabled|disabled),\s*(.*)/
    );
    if (match) {
      channels.push({
        name: `${match[1]} (${match[2]})`,
        enabled: match[3] === "enabled",
        status: match[3],
        detail: match[4],
      });
    }
  }
  return channels;
}

export function getMemoryStatus(): MemoryStatus[] {
  const raw = run("openclaw memory status 2>&1");
  const statuses: MemoryStatus[] = [];
  const blocks = raw.split("Memory Search (");
  for (const block of blocks.slice(1)) {
    const agent = block.split(")")[0];
    const filesMatch = block.match(/Indexed: (\d+)\/(\d+) files · (\d+) chunks/);
    const ftsMatch = block.match(/FTS: (\w+)/);
    const vectorMatch = block.match(/Vector: (\w+)/);
    statuses.push({
      agent,
      files: filesMatch ? parseInt(filesMatch[1]) : 0,
      chunks: filesMatch ? parseInt(filesMatch[3]) : 0,
      fts: ftsMatch?.[1] || "unknown",
      vector: vectorMatch?.[1] || "unknown",
    });
  }
  return statuses;
}

export function getSecurityPolicy(): SecurityRule[] {
  try {
    const raw = run("cat /workspace/workspace/security-policy.json");
    const policy = JSON.parse(raw);
    return (policy.rules || []).map((r: any) => ({
      id: r.id,
      action: r.action,
      policy: r.policy,
      reason: r.reason,
      riskScore: r.riskScore,
    }));
  } catch {
    return [];
  }
}

export function getSystemStatus() {
  const raw = run("openclaw gateway health 2>&1");
  const gatewayOk = raw.includes("OK");
  return {
    gateway: gatewayOk ? "healthy" : "down",
    version: run("openclaw --version 2>&1") || "unknown",
  };
}

export interface CostSummary {
  totalCost: number;
  totalTokens: number;
  raw: string;
}

export function getCostSummary(): CostSummary {
  const raw = run("openclaw gateway usage-cost 2>&1");
  const costMatch = raw.match(/\$([\d.]+)/);
  const tokenMatch = raw.match(/([\d,]+)\s*tokens/);
  return {
    totalCost: costMatch ? parseFloat(costMatch[1]) : 0,
    totalTokens: tokenMatch ? parseInt(tokenMatch[1].replace(/,/g, "")) : 0,
    raw,
  };
}

export interface DoctorCheck {
  level: "critical" | "warn" | "info" | "ok";
  id: string;
  message: string;
}

export interface HealthStatus {
  gatewayHealthy: boolean;
  checks: DoctorCheck[];
  disk: string;
  memory: string;
}

// --- Sessions ---

export interface Session {
  agentId: string;
  sessionId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  updatedAt: number;
  kind: string;
}

export function getSessions(): Session[] {
  const raw = run("openclaw sessions --json --all-agents 2>&1");
  try {
    const data = JSON.parse(raw);
    return (data.sessions || []).map((s: any) => ({
      agentId: s.agentId || "unknown",
      sessionId: s.sessionId || s.key || "",
      model: s.model || "default",
      inputTokens: s.inputTokens || 0,
      outputTokens: s.outputTokens || 0,
      totalTokens: s.totalTokens || 0,
      updatedAt: s.updatedAt || 0,
      kind: s.kind || "direct",
    }));
  } catch {
    return [];
  }
}

// --- Skills ---

export interface Skill {
  name: string;
  description: string;
  emoji: string;
  eligible: boolean;
  disabled: boolean;
  source: string;
  bundled: boolean;
  missing: {
    bins: string[];
    anyBins: string[];
    env: string[];
    config: string[];
    os: string[];
  };
}

export function getSkills(): Skill[] {
  const raw = run("openclaw skills list --json 2>&1");
  try {
    const data = JSON.parse(raw);
    return (data.skills || []).map((s: any) => ({
      name: s.name || "",
      description: s.description || "",
      emoji: s.emoji || "",
      eligible: s.eligible ?? false,
      disabled: s.disabled ?? false,
      source: s.source || "",
      bundled: s.bundled ?? false,
      missing: {
        bins: s.missing?.bins || [],
        anyBins: s.missing?.anyBins || [],
        env: s.missing?.env || [],
        config: s.missing?.config || [],
        os: s.missing?.os || [],
      },
    }));
  } catch {
    return [];
  }
}

// --- Plugins ---

export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  status: "loaded" | "disabled" | "error";
  origin: string;
  toolNames: string[];
  error?: string;
}

export function getPlugins(): Plugin[] {
  const raw = run("openclaw plugins list --json 2>&1");
  try {
    // JSON may be preceded by stderr lines — find the first `{`
    const jsonStart = raw.indexOf("{");
    if (jsonStart === -1) return [];
    const data = JSON.parse(raw.slice(jsonStart));
    return (data.plugins || []).map((p: any) => ({
      id: p.id || "",
      name: p.name || p.id || "",
      description: p.description || "",
      version: p.version || "",
      status: p.status || "disabled",
      origin: p.origin || "",
      toolNames: p.toolNames || [],
      error: p.error,
    }));
  } catch {
    return [];
  }
}

// --- Cron Jobs ---

export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  agent: string;
  task: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

export function getCronJobs(): CronJob[] {
  // Try gateway first, fall back to local jobs.json
  const raw = run("openclaw cron list --all --json 2>&1");
  try {
    const data = JSON.parse(raw);
    if (Array.isArray(data.jobs) && data.jobs.length > 0) {
      return data.jobs.map((j: any) => ({
        id: j.id || "",
        name: j.name || j.id || "",
        schedule: j.cron || j.schedule || "",
        agent: j.agent || j.agentId || "",
        task: j.message || j.task || "",
        enabled: j.enabled ?? !j.disabled,
        lastRun: j.lastRun || j.lastRunAt,
        nextRun: j.nextRun || j.nextRunAt,
      }));
    }
  } catch {
    // fall through
  }
  // Fallback: read local jobs.json
  try {
    const local = run("cat /workspace/cron/jobs.json");
    const data = JSON.parse(local);
    return (data.jobs || []).map((j: any) => ({
      id: j.id || "",
      name: j.name || j.id || "",
      schedule: j.schedule || "",
      agent: j.agent || "",
      task: j.task || "",
      enabled: j.enabled ?? true,
    }));
  } catch {
    return [];
  }
}

export interface CronRun {
  jobId: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  output?: string;
}

export function getCronRuns(jobId: string): CronRun[] {
  const raw = run(`openclaw cron runs --id ${jobId} --json 2>&1`);
  try {
    const data = JSON.parse(raw);
    return (data.runs || []).map((r: any) => ({
      jobId: r.jobId || jobId,
      status: r.status || "unknown",
      startedAt: r.startedAt || "",
      finishedAt: r.finishedAt,
      output: r.output,
    }));
  } catch {
    return [];
  }
}

// --- ClawHub Discovery ---

export interface HubSkill {
  slug: string;
  name: string;
  summary: string;
  version: string;
  downloads: number;
  author: string;
}

export function getHubSkills(limit: number = 20): HubSkill[] {
  const raw = run(`clawhub explore --json --limit ${limit} 2>&1`);
  try {
    const data = JSON.parse(raw);
    return (data.skills || data.results || []).map((s: any) => ({
      slug: s.slug || s.name || "",
      name: s.name || s.slug || "",
      summary: s.summary || s.description || "",
      version: s.version || "",
      downloads: s.downloads || 0,
      author: s.author || "",
    }));
  } catch {
    return [];
  }
}

export function getHealthStatus(): HealthStatus {
  const doctorRaw = run("openclaw doctor 2>&1");
  const healthRaw = run("openclaw gateway health 2>&1");
  const disk = run("df -h / 2>&1 | tail -1");
  const mem = run("free -m 2>&1 | grep Mem");

  const checks: DoctorCheck[] = [];
  const lines = doctorRaw.split("\n");
  for (const line of lines) {
    if (line.includes("CRITICAL") || line.includes("critical")) {
      checks.push({ level: "critical", id: "doctor", message: line.trim() });
    } else if (line.includes("WARN") || line.includes("warn")) {
      checks.push({ level: "warn", id: "doctor", message: line.trim() });
    }
  }

  if (checks.length === 0) {
    checks.push({ level: "ok", id: "doctor", message: "All checks passed" });
  }

  return {
    gatewayHealthy: healthRaw.includes("OK"),
    checks,
    disk: disk || "unavailable",
    memory: mem || "unavailable",
  };
}
