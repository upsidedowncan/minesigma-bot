import type { BotConfig } from "./types.ts";

const esc = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const selected = (left: string, right: string): string => (left === right ? "selected" : "");

export const renderPage = (config: BotConfig): string => `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Minesigma BOT Control Room</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
  <style>
    :root {
      --bg:#f5f7fb;
      --line:#d8e0e8;
      --txt:#1d2633;
      --muted:#657287;
      --slot:#f7fafc;
      --mono: "SFMono-Regular","Cascadia Mono","JetBrains Mono",monospace;
    }
    body {
      min-height:100vh;
      color:var(--txt);
      background:var(--bg);
    }
    .wrap { padding:20px; max-width:1500px; margin:0 auto; }
    .layout { display:grid; grid-template-columns: 1.05fr 1fr; gap:16px; }
    .left, .right { display:grid; gap:16px; align-content:start; }
    .card { border:1px solid var(--line); border-radius:8px; box-shadow:0 8px 24px rgba(29,38,51,0.05); }
    .card-title { font-size:1rem; }
    .field label { color:var(--muted); font-size:.8rem; font-weight:600; }
    .status { white-space:pre-wrap; max-height:170px; overflow:auto; background:#f8fafc; border:1px solid var(--line); border-radius:7px; padding:10px; font-family:var(--mono); font-size:13px; }
    .cmdline { display:grid; grid-template-columns: 1fr auto; gap:8px; margin-top:10px; }
    .hint { color:var(--muted); margin-top:8px; }
    .quick { display:grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap:8px; }
    .chat { max-height:320px; overflow:auto; background:#f8fafc; border:1px solid var(--line); border-radius:7px; padding:10px; font-family:var(--mono); font-size:13px; }
    .chatline { margin-bottom:4px; }
    .tools { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px; align-items:center; }
    .slots9 { display:grid; grid-template-columns: repeat(9,minmax(0,1fr)); gap:6px; }
    .slot {
      border:1px solid var(--line); background:var(--slot); color:#263346;
      min-height:48px; padding:5px; font-size:11px; text-align:left; font-family:var(--mono); font-weight:500;
    }
    .inv { max-height:220px; overflow:auto; }
    .botstats { max-height:180px; overflow:auto; background:#f8fafc; border:1px solid var(--line); border-radius:7px; padding:10px; white-space:pre-wrap; font-family:var(--mono); font-size:13px; }
    .tab { cursor:pointer; }
    .hidden { display:none !important; }
    @media (max-width: 1180px) {
      .layout { grid-template-columns:1fr; }
      .quick { grid-template-columns: repeat(2,minmax(0,1fr)); }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card mb-3">
      <div class="card-body d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div>
          <h1 class="h4 mb-1">Minesigma BOT Control Room</h1>
          <div class="text-secondary">Run, watch, and steer your Mineflayer bots from one place.</div>
        </div>
        <span class="badge rounded-pill text-bg-light border" id="uptime-pill">refresh: 1500 ms</span>
      </div>
    </div>
    <div class="layout">
      <section class="left">
        <div class="card">
          <div class="card-body">
          <h3 class="card-title">Connection</h3>
          <form id="config-form">
            <div class="row g-3">
              <div class="field col-md-3"><label class="form-label">Server</label><input class="form-control" id="host" name="host" value="${esc(config.host)}" required /></div>
              <div class="field col-md-3"><label class="form-label">Port</label><input class="form-control" id="port" name="port" type="number" min="1" max="65535" value="${config.port}" required /></div>
              <div class="field col-md-3"><label class="form-label">Bot name</label><input class="form-control" id="username" name="username" value="${esc(config.username)}" required /></div>
              <div class="field col-md-3"><label class="form-label">Password</label><input class="form-control" id="password" name="password" type="password" value="${esc(config.password ?? "")}" /></div>
              <div class="field col-md-3"><label class="form-label">Login</label><select class="form-select" id="auth" name="auth"><option value="offline" ${selected(config.auth, "offline")}>offline</option><option value="microsoft" ${selected(config.auth, "microsoft")}>microsoft</option><option value="mojang" ${selected(config.auth, "mojang")}>mojang</option></select></div>
              <div class="field col-md-3"><label class="form-label">Version</label><input class="form-control" id="version" name="version" placeholder="auto or 1.21.11" value="${esc(config.version ?? "")}" /></div>
              <div class="field col-md-6"><label class="form-label">Admins</label><input class="form-control" id="admins" name="admins" placeholder="Owner1, Owner2" value="${esc((config.admins ?? []).join(", "))}" /></div>
            </div>
            <div class="d-flex flex-wrap gap-2 mt-3">
              <button class="btn btn-success" type="submit">Save settings</button>
              <button class="btn btn-primary" type="button" id="start-btn">Start bot</button>
              <button class="btn btn-outline-danger" type="button" id="stop-btn">Stop bot</button>
              <button class="btn btn-outline-warning" type="button" id="restart-btn">Restart</button>
              <button class="btn btn-outline-secondary" type="button" id="ping-btn">Test server</button>
            </div>
          </form>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
          <h3 class="card-title">Bot Status</h3>
          <div id="status" class="status">Loading...</div>
          <div class="cmdline">
            <input class="form-control" id="cmd-input" placeholder="Try: bot add 3, bot move forward 2, bot follow Player" />
            <button class="btn btn-success" id="cmd-run" type="button">Run</button>
          </div>
          <div class="form-text" id="cmd-result">—</div>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
          <h3 class="card-title">Quick Actions</h3>
          <div class="quick">
            <button class="btn btn-light border" data-cmd="bot add 3">Add 3 bots</button>
            <button class="btn btn-light border" data-cmd="bot remove all">Clear bots</button>
            <button class="btn btn-light border" data-cmd="bot move forward 2">Move forward</button>
            <button class="btn btn-light border" data-cmd="bot jump">Jump</button>
            <button class="btn btn-light border" data-cmd="bot stop">Stop moving</button>
            <button class="btn btn-light border" data-cmd="bot attack">Attack nearby</button>
            <button class="btn btn-light border" data-cmd="bot spin">Turn around</button>
            <button class="btn btn-light border" data-cmd="bot use 0">Use hotbar 0</button>
          </div>
          <div class="input-group mt-3">
            <input class="form-control" id="target-name" placeholder="Player name" />
            <button class="btn btn-outline-primary" id="follow-target" type="button">Follow</button>
            <button class="btn btn-outline-danger" id="attack-target" type="button">Attack</button>
            <button class="btn btn-outline-secondary" id="spin-target" type="button">Circle</button>
          </div>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
          <h3 class="card-title">Macros and History</h3>
          <div class="btn-group mb-3" role="group">
            <button class="btn btn-dark tab active" type="button" data-tab="macro">Macros</button>
            <button class="btn btn-outline-dark tab" type="button" data-tab="history">History</button>
          </div>
          <div id="tab-macro">
            <div class="d-flex flex-wrap gap-2">
              <button class="btn btn-light border" data-macro="bot chat Hello">Say hello</button>
              <button class="btn btn-light border" data-macro="bot move forward 3; bot jump; bot move forward 2">Dash</button>
              <button class="btn btn-light border" data-macro="bot add 5; bot follow Utoplennik228">Add and follow</button>
              <button class="btn btn-light border" data-macro="bot attack Utoplennik228">Focus attack</button>
            </div>
            <div class="cmdline">
              <input class="form-control" id="macro-input" placeholder="bot command; bot command; bot command" />
              <button id="macro-run" class="btn btn-warning" type="button">Run macro</button>
            </div>
          </div>
          <div id="tab-history" class="hidden">
            <div id="cmd-history" class="status">No commands yet</div>
            <div class="mt-3"><button class="btn btn-outline-secondary" id="history-clear" type="button">Clear history</button></div>
          </div>
          </div>
        </div>
      </section>

      <section class="right">
        <div class="card">
          <div class="card-body">
          <h3 class="card-title">Chat</h3>
          <div class="tools">
            <input class="form-control" id="chat-filter" placeholder="Filter chat..." />
            <select class="form-select" id="chat-source-filter">
              <option value="all">all</option>
              <option value="chat">chat</option>
              <option value="system">system</option>
              <option value="error">error</option>
            </select>
            <label class="form-check d-flex align-items-center gap-2 mb-0 text-secondary"><input class="form-check-input mt-0" id="chat-autoscroll" type="checkbox" checked /> auto-scroll</label>
            <label class="form-check d-flex align-items-center gap-2 mb-0 text-secondary"><input class="form-check-input mt-0" id="chat-dedupe" type="checkbox" checked /> hide repeats</label>
          </div>
          <div id="chatlog" class="chat">Loading...</div>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
          <h3 class="card-title">Open Window</h3>
          <div id="gui-meta" class="form-text mb-2">No open window</div>
          <div id="gui-grid" class="slots9"></div>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
          <h3 class="card-title">Bots</h3>
          <div class="tools">
            <select class="form-select" id="bot-select"><option value="0">bot #1</option></select>
            <input class="form-control" id="inv-filter" placeholder="Find item..." />
            <select class="form-select" id="refresh-rate">
              <option value="800">800 ms</option>
              <option value="1500" selected>1500 ms</option>
              <option value="2500">2500 ms</option>
              <option value="5000">5000 ms</option>
            </select>
          </div>
          <div id="bot-stats" class="botstats">No bots are running</div>
          <div id="inv-grid" class="slots9 inv"></div>
          </div>
        </div>
      </section>
    </div>
  </div>

  <script type="module">
    const statusEl = document.getElementById("status");
    const chatEl = document.getElementById("chatlog");
    const guiMetaEl = document.getElementById("gui-meta");
    const guiGridEl = document.getElementById("gui-grid");
    const cmdInputEl = document.getElementById("cmd-input");
    const cmdResultEl = document.getElementById("cmd-result");
    const botStatsEl = document.getElementById("bot-stats");
    const invGridEl = document.getElementById("inv-grid");
    const form = document.getElementById("config-form");
    const botSelectEl = document.getElementById("bot-select");
    const invFilterEl = document.getElementById("inv-filter");
    const chatFilterEl = document.getElementById("chat-filter");
    const chatSourceFilterEl = document.getElementById("chat-source-filter");
    const chatAutoscrollEl = document.getElementById("chat-autoscroll");
    const chatDedupeEl = document.getElementById("chat-dedupe");
    const refreshRateEl = document.getElementById("refresh-rate");
    const uptimePillEl = document.getElementById("uptime-pill");
    const cmdHistoryEl = document.getElementById("cmd-history");

    let refreshTimer = null;
    let latestBots = [];
    let latestChat = [];

    const historyKey = "minesigma_bot_cmd_history_v1";
    const loadHistory = () => JSON.parse(localStorage.getItem(historyKey) || "[]");
    const saveHistory = (arr) => localStorage.setItem(historyKey, JSON.stringify(arr.slice(-80)));
    const pushHistory = (cmd) => {
      if (!cmd) return;
      const arr = loadHistory();
      arr.push({ at: new Date().toISOString(), cmd });
      saveHistory(arr);
      renderHistory();
    };
    const renderHistory = () => {
      const arr = loadHistory();
      if (!arr.length) { cmdHistoryEl.textContent = "No commands yet"; return; }
      cmdHistoryEl.textContent = arr.slice().reverse().map((x) => "[" + x.at.slice(11,19) + "] " + x.cmd).join("\\n");
    };

    const text = (state) => {
      const lines = [
        "status: " + state.status,
        "running: " + state.running,
        "connected: " + state.connected
      ];
      if (state.username) lines.push("username: " + state.username);
      if (state.host) lines.push("host: " + state.host + ":" + state.port);
      if (state.version) lines.push("version: " + state.version);
      if (state.error) lines.push("error: " + state.error);
      if (state.kickedReason) lines.push("kickedReason: " + state.kickedReason);
      if (typeof state.kickedLoggedIn === "boolean") lines.push("kickedLoggedIn: " + state.kickedLoggedIn);
      return lines.join("\\n");
    };

    const send = async (url, options = {}) => {
      const res = await fetch(url, options);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || ("HTTP " + res.status));
      return data;
    };

    const safe = (v) => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");

    const refreshStatus = async () => {
      const data = await send("/api/status");
      statusEl.textContent = text(data.state);
    };

    const refreshChat = async () => {
      const data = await send("/api/chat");
      latestChat = data.log || [];
      const f = chatFilterEl.value.trim().toLowerCase();
      const s = chatSourceFilterEl.value;
      const dedupe = chatDedupeEl.checked;
      let rows = latestChat.slice(-220);
      if (s !== "all") rows = rows.filter((e) => e.source === s);
      if (f) rows = rows.filter((e) => String(e.text || "").toLowerCase().includes(f));
      if (dedupe) {
        const seen = new Set();
        rows = rows.filter((e) => {
          const key = e.source + "|" + e.text;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
      chatEl.innerHTML = rows.map((e) => {
        const head = "<span style='color:#8e97a8'>[" + e.at.slice(11,19) + "] " + e.source + "</span> ";
        if (e.html) return "<div class='chatline'>" + head + e.html + "</div>";
        return "<div class='chatline'>" + head + safe(e.text || "") + "</div>";
      }).join("") || "No messages yet";
      if (chatAutoscrollEl.checked) chatEl.scrollTop = chatEl.scrollHeight;
    };

    const renderGui = (gui) => {
      guiGridEl.innerHTML = "";
      if (!gui) { guiMetaEl.textContent = "No open window"; return; }
      guiMetaEl.textContent = gui.title + " [" + gui.type + "], slots=" + gui.slotCount;
      const map = new Map(gui.slots.map((s) => [s.index, s]));
      for (let i = 0; i < gui.slotCount; i++) {
        const item = map.get(i);
        const btn = document.createElement("button");
        btn.className = "slot";
        btn.type = "button";
        btn.textContent = item ? "#" + i + " " + item.name + " x" + item.count : "#" + i + " empty";
        btn.addEventListener("click", async () => {
          try {
            const r = await send("/api/gui/click", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ index: i })
            });
            cmdResultEl.textContent = r.message;
            await refreshGui();
          } catch (err) { cmdResultEl.textContent = err.message; }
        });
        guiGridEl.appendChild(btn);
      }
    };

    const refreshGui = async () => {
      const data = await send("/api/gui");
      renderGui(data.gui);
    };

    const renderBots = () => {
      const bots = latestBots;
      if (!bots.length) {
        botStatsEl.textContent = "No bots are running";
        invGridEl.innerHTML = "";
        botSelectEl.innerHTML = "<option value='0'>bot #1</option>";
        return;
      }

      const cur = Number(botSelectEl.value || "0");
      botSelectEl.innerHTML = bots.map((b, i) => "<option value='" + i + "'>" + safe(b.username) + "</option>").join("");
      botSelectEl.value = String(Math.min(cur, bots.length - 1));

      botStatsEl.textContent = bots.map((b, i) => {
        const p = b.position ? (b.position.x + "," + b.position.y + "," + b.position.z) : "n/a";
        return "#" + (i + 1) + " " + b.username + " | hp=" + b.health + " food=" + b.food + " oxy=" + (b.oxygenLevel ?? "n/a") + " pos=" + p;
      }).join("\\n");

      const selectedBot = bots[Number(botSelectEl.value || "0")] || bots[0];
      const filter = invFilterEl.value.trim().toLowerCase();
      const map = new Map((selectedBot.inventory || []).map((s) => [s.index, s]));
      invGridEl.innerHTML = "";
      for (let i = 0; i < 46; i++) {
        const item = map.get(i);
        const txt = item ? ("#" + i + " " + item.name + " x" + item.count) : ("#" + i + " empty");
        if (filter && !txt.toLowerCase().includes(filter)) continue;
        const btn = document.createElement("button");
        btn.className = "slot";
        btn.type = "button";
        btn.textContent = txt;
        invGridEl.appendChild(btn);
      }
    };

    const refreshBots = async () => {
      const data = await send("/api/bots");
      latestBots = data.bots || [];
      renderBots();
    };

    const refresh = async () => {
      await Promise.all([refreshStatus(), refreshChat(), refreshGui(), refreshBots()]);
    };

    const runCommand = async (command, track = true) => {
      if (!command || !command.trim()) return;
      try {
        const res = await send("/api/command", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ command: command.trim() })
        });
        cmdResultEl.textContent = res.message;
        if (track) pushHistory(command.trim());
        await refresh();
      } catch (err) {
        cmdResultEl.textContent = err.message;
      }
    };

    const runMacro = async (macroText) => {
      const parts = String(macroText || "").split(";").map((p) => p.trim()).filter(Boolean);
      for (const part of parts) {
        await runCommand(part);
        await new Promise((r) => setTimeout(r, 260));
      }
    };

    const resetRefreshTimer = () => {
      if (refreshTimer) clearInterval(refreshTimer);
      const ms = Number(refreshRateEl.value || "1500");
      uptimePillEl.textContent = "refresh: " + ms + " ms";
      refreshTimer = setInterval(refresh, ms);
    };

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const payload = {
        host: String(formData.get("host") || ""),
        port: Number(formData.get("port") || 25565),
        username: String(formData.get("username") || ""),
        password: String(formData.get("password") || "") || undefined,
        auth: String(formData.get("auth") || "offline"),
        version: String(formData.get("version") || "") || undefined,
        admins: String(formData.get("admins") || "")
      };
      await send("/api/config", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      cmdResultEl.textContent = "Settings saved";
      await refreshStatus();
    });

    document.getElementById("start-btn").addEventListener("click", async () => { await send("/api/start", { method: "POST" }); await refresh(); });
    document.getElementById("stop-btn").addEventListener("click", async () => { await send("/api/stop", { method: "POST" }); await refresh(); });
    document.getElementById("restart-btn").addEventListener("click", async () => { await send("/api/restart", { method: "POST" }); await refresh(); });
    document.getElementById("ping-btn").addEventListener("click", async () => {
      const res = await send("/api/ping", { method: "POST" });
      const r = res.result;
      statusEl.textContent = r.reachable ? "ping: reachable\\nlatencyMs: " + r.latencyMs : "ping: unreachable\\nerror: " + (r.error || "unknown");
    });
    document.getElementById("cmd-run").addEventListener("click", async () => runCommand(cmdInputEl.value));
    cmdInputEl.addEventListener("keydown", async (e) => { if (e.key === "Enter") { e.preventDefault(); await runCommand(cmdInputEl.value); } });

    document.querySelectorAll("[data-cmd]").forEach((el) => {
      el.addEventListener("click", async () => runCommand(el.getAttribute("data-cmd")));
    });

    const targetName = document.getElementById("target-name");
    document.getElementById("follow-target").addEventListener("click", async () => runCommand("bot follow " + targetName.value));
    document.getElementById("attack-target").addEventListener("click", async () => runCommand("bot attack " + targetName.value));
    document.getElementById("spin-target").addEventListener("click", async () => runCommand("bot spin " + targetName.value));

    const macroInput = document.getElementById("macro-input");
    document.getElementById("macro-run").addEventListener("click", async () => runMacro(macroInput.value));
    document.querySelectorAll("[data-macro]").forEach((el) => {
      el.addEventListener("click", async () => runMacro(el.getAttribute("data-macro")));
    });

    document.querySelectorAll(".tab").forEach((el) => {
      el.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach((x) => {
          x.classList.remove("active", "btn-dark");
          x.classList.add("btn-outline-dark");
        });
        el.classList.add("active");
        el.classList.remove("btn-outline-dark");
        el.classList.add("btn-dark");
        const tab = el.getAttribute("data-tab");
        document.getElementById("tab-macro").classList.toggle("hidden", tab !== "macro");
        document.getElementById("tab-history").classList.toggle("hidden", tab !== "history");
      });
    });

    document.getElementById("history-clear").addEventListener("click", () => {
      saveHistory([]);
      renderHistory();
    });

    [invFilterEl, botSelectEl, chatFilterEl, chatSourceFilterEl, chatDedupeEl].forEach((el) => {
      el.addEventListener("input", () => { renderBots(); refreshChat(); });
      el.addEventListener("change", () => { renderBots(); refreshChat(); });
    });
    refreshRateEl.addEventListener("change", resetRefreshTimer);

    renderHistory();
    await refresh();
    resetRefreshTimer();
  </script>
</body>
</html>
`;
