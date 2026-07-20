const crypto = require("node:crypto");
const { normalizeBubbleLabel, normalizeGroupName, normalizeServerInput, normalizeTags } = require("./store");

function nowIso() {
  return new Date().toISOString();
}

function randomSecret() {
  return crypto.randomBytes(24).toString("hex");
}

function toIso(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function loadPg() {
  try {
    return require("pg");
  } catch {
    throw new Error("PostgreSQL storage requires the pg package. Run npm install, or unset DATABASE_URL to use JSON storage.");
  }
}

function createPostgresStore(options = {}) {
  const { Pool } = loadPg();
  const pool = new Pool({
    connectionString: options.connectionString,
    max: Number(process.env.SERVERDECK_PG_POOL_SIZE || 5)
  });

  async function query(sql, params = []) {
    return pool.query(sql, params);
  }

  async function waitForDatabase() {
    const attempts = Number(process.env.SERVERDECK_DB_CONNECT_ATTEMPTS || 30);
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        await query("select 1");
        return;
      } catch (err) {
        if (attempt === attempts) throw err;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  async function load() {
    await waitForDatabase();
    await query(`
      create table if not exists groups (
        id uuid primary key,
        name text not null,
        created_at timestamptz not null,
        updated_at timestamptz not null
      )
    `);
    await query("create unique index if not exists groups_name_lower_idx on groups (lower(name))");
    await query(`
      create table if not exists servers (
        id uuid primary key,
        name text not null,
        host text not null,
        user_name text not null,
        port integer not null,
        -- One or more SSH key paths, newline-separated (see splitKeyPaths in
        -- src/ssh.js). A single path is the common case; multiple keys are tried
        -- in turn at connect time. Backward compatible — no migration needed.
        key_path text not null default '',
        bubble_label text not null default '',
        group_id uuid references groups(id) on delete set null,
        tags text[] not null default '{}',
        notes text not null default '',
        agent_token text not null,
        created_at timestamptz not null,
        updated_at timestamptz not null
      )
    `);
    await query("alter table servers add column if not exists password_enc text not null default ''");
    await query(`
      create table if not exists agent_reports (
        id uuid primary key,
        server_id uuid not null references servers(id) on delete cascade,
        received_at timestamptz not null,
        source text not null,
        payload jsonb not null
      )
    `);
    await query("create index if not exists agent_reports_server_received_idx on agent_reports (server_id, received_at desc)");
    await query(`
      create table if not exists task_runs (
        id uuid primary key,
        server_id uuid not null references servers(id) on delete cascade,
        task text not null,
        action_task text not null,
        input jsonb not null,
        refreshed_at timestamptz not null,
        status text not null,
        exit_code integer,
        signal text,
        duration_ms integer not null,
        timed_out boolean not null,
        stdout text not null,
        stderr text not null
      )
    `);
    await query("create index if not exists task_runs_server_task_refreshed_idx on task_runs (server_id, task, refreshed_at desc)");
    await query(`
      create table if not exists settings (
        key text primary key,
        value jsonb not null,
        updated_at timestamptz not null
      )
    `);
    await query("create table if not exists opencode_machines (id uuid primary key, name text not null, token_hash text not null, created_at timestamptz not null, last_seen timestamptz, revoked boolean not null default false)");
    await query("create table if not exists opencode_sessions (id text not null, machine_id uuid not null references opencode_machines(id) on delete cascade, title text not null, directory text not null, updated_at timestamptz not null, snapshot jsonb not null default '[]', primary key (id, machine_id))");
    return { ok: true };
  }

  async function getSetting(key) {
    const result = await query("select value from settings where key = $1", [key]);
    return result.rows[0] ? result.rows[0].value : null;
  }

  async function setSetting(key, value) {
    await query(
      "insert into settings (key, value, updated_at) values ($1, $2, $3) on conflict (key) do update set value = $2, updated_at = $3",
      [key, JSON.stringify(value), nowIso()]
    );
    return value;
  }

  async function assertGroupExists(groupId) {
    if (!groupId) return;
    const result = await query("select id from groups where id = $1", [groupId]);
    if (result.rowCount === 0) {
      const err = new Error("Group not found");
      err.statusCode = 400;
      throw err;
    }
  }

  function groupFromRow(row) {
    return {
      id: row.id,
      name: row.name,
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at)
    };
  }

  function reportFromRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      receivedAt: toIso(row.received_at),
      source: row.source,
      payload: row.payload || {}
    };
  }

  function taskRunFromRow(row) {
    return {
      id: row.id,
      task: row.task,
      actionTask: row.action_task,
      input: row.input || {},
      refreshedAt: toIso(row.refreshed_at),
      status: row.status,
      exitCode: row.exit_code,
      signal: row.signal,
      durationMs: row.duration_ms,
      timedOut: row.timed_out,
      stdout: row.stdout || "",
      stderr: row.stderr || ""
    };
  }

  async function serverFromRow(row) {
    if (!row) return null;
    const reports = await query(
      "select * from agent_reports where server_id = $1 order by received_at desc limit 72",
      [row.id]
    );
    const tasks = await query(
      "select * from task_runs where server_id = $1 order by refreshed_at desc limit 500",
      [row.id]
    );
    const reportHistory = reports.rows.map(reportFromRow);
    return {
      id: row.id,
      name: row.name,
      host: row.host,
      user: row.user_name,
      port: row.port,
      keyPath: row.key_path || "",
      bubbleLabel: row.bubble_label || "",
      groupId: row.group_id || "",
      tags: row.tags || [],
      notes: row.notes || "",
      passwordEnc: row.password_enc || "",
      agentToken: row.agent_token,
      lastReport: reportHistory[0] || null,
      reportHistory,
      taskHistory: tasks.rows.map(taskRunFromRow),
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at)
    };
  }

  async function listGroups() {
    const result = await query("select * from groups order by name asc");
    return result.rows.map(groupFromRow);
  }

  async function createGroup(input = {}) {
    const name = normalizeGroupName(input.name);
    if (!name) {
      const err = new Error("Group name is required");
      err.statusCode = 400;
      throw err;
    }
    const createdAt = nowIso();
    try {
      const result = await query(
        "insert into groups (id, name, created_at, updated_at) values ($1, $2, $3, $3) returning *",
        [crypto.randomUUID(), name, createdAt]
      );
      return groupFromRow(result.rows[0]);
    } catch (err) {
      if (err.code === "23505") {
        err.message = "Group already exists";
        err.statusCode = 409;
      }
      throw err;
    }
  }

  async function updateGroup(id, input = {}) {
    const name = normalizeGroupName(input.name);
    if (!name) {
      const err = new Error("Group name is required");
      err.statusCode = 400;
      throw err;
    }
    try {
      const result = await query(
        "update groups set name = $2, updated_at = $3 where id = $1 returning *",
        [id, name, nowIso()]
      );
      return result.rows[0] ? groupFromRow(result.rows[0]) : null;
    } catch (err) {
      if (err.code === "23505") {
        err.message = "Group already exists";
        err.statusCode = 409;
      }
      throw err;
    }
  }

  async function deleteGroup(id) {
    const result = await query("delete from groups where id = $1", [id]);
    return result.rowCount > 0;
  }

  async function listServers() {
    const result = await query("select * from servers order by created_at desc");
    return Promise.all(result.rows.map(serverFromRow));
  }

  async function getServer(id) {
    const result = await query("select * from servers where id = $1", [id]);
    return serverFromRow(result.rows[0]);
  }

  async function createServer(input) {
    const normalized = normalizeServerInput(input);
    await assertGroupExists(normalized.groupId);
    const createdAt = nowIso();
    const result = await query(`
      insert into servers (
        id, name, host, user_name, port, key_path, bubble_label, group_id, tags, notes, password_enc, agent_token, created_at, updated_at
      ) values ($1, $2, $3, $4, $5, $6, $7, nullif($8, '')::uuid, $9, $10, $11, $12, $13, $13)
      returning *
    `, [
      crypto.randomUUID(),
      normalized.name,
      normalized.host,
      normalized.user,
      normalized.port,
      normalized.keyPath,
      normalizeBubbleLabel(normalized.bubbleLabel),
      normalized.groupId,
      normalizeTags(normalized.tags),
      normalized.notes,
      normalized.passwordEnc,
      randomSecret(),
      createdAt
    ]);
    return serverFromRow(result.rows[0]);
  }

  async function updateServer(id, input) {
    const existing = await getServer(id);
    if (!existing) return null;
    const normalized = normalizeServerInput(input, existing);
    await assertGroupExists(normalized.groupId);
    const result = await query(`
      update servers set
        name = $2,
        host = $3,
        user_name = $4,
        port = $5,
        key_path = $6,
        bubble_label = $7,
        group_id = nullif($8, '')::uuid,
        tags = $9,
        notes = $10,
        password_enc = $11,
        updated_at = $12
      where id = $1
      returning *
    `, [
      id,
      normalized.name,
      normalized.host,
      normalized.user,
      normalized.port,
      normalized.keyPath,
      normalized.bubbleLabel,
      normalized.groupId,
      normalizeTags(normalized.tags),
      normalized.notes,
      normalized.passwordEnc,
      nowIso()
    ]);
    return serverFromRow(result.rows[0]);
  }

  async function deleteServer(id) {
    const result = await query("delete from servers where id = $1", [id]);
    return result.rowCount > 0;
  }

  async function recordReport(serverId, report) {
    const receivedAt = nowIso();
    const result = await query(
      "insert into agent_reports (id, server_id, received_at, source, payload) values ($1, $2, $3, 'agent', $4) returning *",
      [crypto.randomUUID(), serverId, receivedAt, report]
    );
    return reportFromRow(result.rows[0]);
  }

  async function recordTaskRun(serverId, run) {
    const refreshedAt = nowIso();
    const result = await query(`
      insert into task_runs (
        id, server_id, task, action_task, input, refreshed_at, status, exit_code, signal, duration_ms, timed_out, stdout, stderr
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      returning *
    `, [
      crypto.randomUUID(),
      serverId,
      String(run.task || "overview"),
      String(run.actionTask || run.task || "overview"),
      run.input || {},
      refreshedAt,
      run.status || "ok",
      run.exitCode ?? null,
      run.signal ?? null,
      Number(run.durationMs || 0),
      Boolean(run.timedOut),
      String(run.stdout || ""),
      String(run.stderr || "")
    ]);
    return taskRunFromRow(result.rows[0]);
  }

  async function listTaskHistory(serverId, task) {
    const params = [serverId];
    let sql = "select * from task_runs where server_id = $1";
    if (task) {
      params.push(task);
      sql += " and task = $2";
    }
    sql += " order by refreshed_at desc limit 500";
    const result = await query(sql, params);
    return result.rows.map(taskRunFromRow);
  }

  function machineFromRow(row) { return row && { id: row.id, name: row.name, tokenHash: row.token_hash, createdAt: toIso(row.created_at), lastSeen: toIso(row.last_seen), revoked: row.revoked }; }
  function sessionFromRow(row) { return row && { id: row.id, machineId: row.machine_id, title: row.title, directory: row.directory, updatedAt: toIso(row.updated_at), snapshot: row.snapshot || [] }; }
  async function listOpencodeMachines() { return (await query("select * from opencode_machines order by created_at desc")).rows.map(machineFromRow); }
  async function addOpencodeMachine(input = {}) { const at = nowIso(); return machineFromRow((await query("insert into opencode_machines (id,name,token_hash,created_at,revoked) values ($1,$2,$3,$4,false) returning *", [crypto.randomUUID(), String(input.name || "OpenCode machine").trim() || "OpenCode machine", String(input.tokenHash || ""), at])).rows[0]); }
  async function updateOpencodeMachine(id, input = {}) { const old = await query("select * from opencode_machines where id=$1", [id]); if (!old.rows[0]) return null; const row = old.rows[0]; return machineFromRow((await query("update opencode_machines set name=$2, token_hash=$3, last_seen=$4, revoked=$5 where id=$1 returning *", [id, input.name ?? row.name, input.tokenHash ?? row.token_hash, input.lastSeen ?? row.last_seen, input.revoked ?? row.revoked])).rows[0]); }
  async function deleteOpencodeMachine(id) { return (await query("delete from opencode_machines where id=$1", [id])).rowCount > 0; }
  async function findOpencodeMachineByTokenHash(tokenHash) { return machineFromRow((await query("select * from opencode_machines where token_hash=$1", [tokenHash])).rows[0]); }
  async function upsertOpencodeSession(input = {}) { return sessionFromRow((await query("insert into opencode_sessions (id,machine_id,title,directory,updated_at,snapshot) values ($1,$2,$3,$4,$5,$6) on conflict (id,machine_id) do update set title=$3,directory=$4,updated_at=$5,snapshot=$6 returning *", [String(input.id), input.machineId, String(input.title || "Untitled"), String(input.directory || ""), input.updatedAt || nowIso(), JSON.stringify(Array.isArray(input.snapshot) ? input.snapshot : [])])).rows[0]); }
  async function listOpencodeSessions() { return (await query("select * from opencode_sessions order by updated_at desc")).rows.map(sessionFromRow); }
  async function deleteOpencodeSession(id) { return (await query("delete from opencode_sessions where id=$1", [id])).rowCount > 0; }

  return {
    load,
    getSetting,
    setSetting,
    listGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    listServers,
    getServer,
    createServer,
    updateServer,
    deleteServer,
    recordReport,
    recordTaskRun,
    listTaskHistory,
    listOpencodeMachines, addOpencodeMachine, updateOpencodeMachine, deleteOpencodeMachine, findOpencodeMachineByTokenHash,
    upsertOpencodeSession, listOpencodeSessions, deleteOpencodeSession
  };
}

module.exports = {
  createPostgresStore
};
