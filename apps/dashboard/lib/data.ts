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
