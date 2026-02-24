import { describe, it } from "node:test";
import assert from "node:assert";
import { readFileSync, existsSync } from "node:fs";

const ROOT = process.env.WORKSPACE_ROOT || "/workspace";

function readJSON(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

describe("Config Validation", () => {
  it("config.json is valid with 8+ agents", () => {
    const config = readJSON(`${ROOT}/config.json`);
    assert.ok(config.agents?.list, "Missing agents.list");
    assert.ok(config.agents.list.length >= 8, `Expected 8+ agents, got ${config.agents.list.length}`);
  });

  it("all specialist agents have config.json and system.md", () => {
    const agents = ["ninja", "ops", "cto", "accounting", "finance", "legal", "marketing"];
    for (const agent of agents) {
      assert.ok(
        existsSync(`${ROOT}/agents/${agent}/config.json`),
        `Missing: agents/${agent}/config.json`
      );
      assert.ok(
        existsSync(`${ROOT}/agents/${agent}/prompts/system.md`),
        `Missing: agents/${agent}/prompts/system.md`
      );
    }
  });

  it("agent configs are valid JSON with required fields", () => {
    const agents = ["ninja", "ops", "cto", "accounting", "finance", "legal", "marketing"];
    for (const agent of agents) {
      const config = readJSON(`${ROOT}/agents/${agent}/config.json`);
      assert.ok(config.model, `Agent ${agent} missing model`);
      assert.ok(config.workspace, `Agent ${agent} missing workspace`);
      assert.ok(config.permissions, `Agent ${agent} missing permissions`);
    }
  });

  it("security-policy.json has required sections", () => {
    const policy = readJSON(`${ROOT}/workspace/security-policy.json`);
    assert.ok(policy.rules?.length >= 10, `Expected 10+ rules, got ${policy.rules?.length}`);
    assert.ok(policy.denylist?.length >= 3, `Expected 3+ deny entries`);
    assert.ok(policy.allowlist?.length >= 3, `Expected 3+ allow entries`);
    assert.ok(policy.rateLimits, "Missing rateLimits section");
    assert.ok(policy.inputValidation, "Missing inputValidation section");
  });

  it("cron/jobs.json is valid with required fields", () => {
    const cron = readJSON(`${ROOT}/cron/jobs.json`);
    assert.ok(cron.jobs?.length >= 3, `Expected 3+ jobs, got ${cron.jobs?.length}`);
    for (const job of cron.jobs) {
      assert.ok(job.id, `Job missing id`);
      assert.ok(job.schedule, `Job ${job.id} missing schedule`);
      assert.ok(job.agent, `Job ${job.id} missing agent`);
      assert.ok(job.task, `Job ${job.id} missing task`);
    }
  });

  it("skill manifests are valid JSON", () => {
    const skills = ["invoice-manager-bridge", "financial-model-bridge", "deploy", "content-writer", "re-om-extractor"];
    for (const skill of skills) {
      const path = `${ROOT}/skills/${skill}/manifest.json`;
      if (existsSync(path)) {
        const manifest = readJSON(path);
        assert.ok(manifest.id || manifest.name, `Skill ${skill} manifest missing id/name`);
      }
    }
  });

  it("no API keys in exportable files", () => {
    const files = [
      `${ROOT}/config.json`,
      `${ROOT}/workspace/security-policy.json`,
      `${ROOT}/cron/jobs.json`,
    ];
    for (const f of files) {
      const content = readFileSync(f, "utf-8");
      assert.ok(!content.includes("sk-ant-api"), `API key found in ${f}`);
      assert.ok(!content.match(/sk-[a-zA-Z0-9]{20,}/), `Potential secret in ${f}`);
    }
  });
});
