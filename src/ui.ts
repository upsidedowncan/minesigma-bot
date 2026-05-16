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
  <title>Minesigma BOT</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
  <style>
    :root {
      color-scheme: dark;
      --bg: #0e1218;
      --bg2: #111823;
      --panel: #171d27;
      --panel2: #1e2734;
      --panel3: #0f141c;
      --line: #344356;
      --line2: #60708a;
      --txt: #eef3f8;
      --muted: #a9b4c3;
      --slot: #0f141c;
      --green: #7eef7d;
      --cyan: #69d8ee;
      --amber: #f3c96b;
      --red: #f08080;
      --shadow: 0 28px 90px rgba(0, 0, 0, .42);
      --mono: "IBM Plex Mono","JetBrains Mono","SFMono-Regular",monospace;
      --display: "Space Grotesk","Manrope",sans-serif;
    }
    html { scroll-behavior: smooth; }
    body {
      min-height:100vh;
      color:var(--txt);
      font-family:var(--display);
      background:
        radial-gradient(circle at 18% 12%, rgba(105, 216, 238, .16), transparent 26rem),
        radial-gradient(circle at 82% 16%, rgba(126, 239, 125, .14), transparent 24rem),
        radial-gradient(circle at 50% 100%, rgba(243, 201, 107, .08), transparent 20rem),
        linear-gradient(180deg, rgba(255,255,255,.03), transparent 28rem),
        repeating-linear-gradient(45deg, rgba(255,255,255,.024) 0 2px, transparent 2px 8px),
        linear-gradient(180deg, var(--bg2), var(--bg));
    }
    * { box-sizing: border-box; }
    .wrap { width:min(1500px, calc(100% - 32px)); margin:0 auto; padding:28px 0 44px; }
    .layout { display:grid; grid-template-columns: 1.05fr 1fr; gap:16px; }
    .left, .right { display:grid; gap:16px; align-content:start; }
    .card { border:2px solid var(--line); border-radius:0; box-shadow:var(--shadow); background:rgba(23, 29, 39, .96); }
    .card-body { background:transparent; }
    .card-title { font-size:1rem; font-family:var(--display); margin-bottom:10px; }
    .field label { color:var(--cyan); font-size:.8rem; font-weight:700; font-family:var(--mono); text-transform:uppercase; letter-spacing:.06em; }
    .status { white-space:pre-wrap; max-height:170px; overflow:auto; background:var(--panel3); border:1px solid var(--line); border-radius:0; padding:10px; font-family:var(--mono); font-size:13px; color:var(--txt); }
    .cmdline { display:grid; grid-template-columns: 1fr auto; gap:8px; margin-top:10px; }
    .hint { color:var(--muted); margin-top:8px; font-family:var(--mono); }
    .quick { display:grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap:8px; }
    .chat { max-height:320px; overflow:auto; background:var(--panel3); border:1px solid var(--line); border-radius:0; padding:10px; font-family:var(--mono); font-size:13px; color:var(--txt); }
    .chatline { margin-bottom:4px; }
    .tools { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px; align-items:center; }
    .slots9 { display:grid; grid-template-columns: repeat(9,minmax(0,1fr)); gap:6px; }
    .slot {
      border:1px solid var(--line); background:var(--slot); color:var(--txt);
      min-height:48px; padding:5px; font-size:11px; text-align:left; font-family:var(--mono); font-weight:500; border-radius:0;
    }
    .inv { max-height:220px; overflow:auto; }
    .botstats { max-height:180px; overflow:auto; background:var(--panel3); border:1px solid var(--line); border-radius:0; padding:10px; white-space:pre-wrap; font-family:var(--mono); font-size:13px; color:var(--txt); }
    .tab { cursor:pointer; border-radius:0 !important; }
    .hidden { display:none !important; }
    .card .card-body { padding:20px; }
    .card .card-body > .card-title { color:var(--txt); }
    .card .card-body > .h4,
    .card .card-body > h1,
    .card .card-body > h1.h4 { color:var(--txt); }
    .card .text-secondary,
    .card .form-text { color:var(--txt) !important; }
    .badge { border-radius:0 !important; border:1px solid var(--line) !important; background:linear-gradient(180deg, #111722, #0e131a) !important; color:var(--txt) !important; font-family:var(--mono); font-weight:500; }
    .form-control,
    .form-select {
      border-radius:0 !important;
      border:1px solid var(--line);
      background:#0f141c;
      color:var(--txt);
      box-shadow:none;
      font-family:var(--mono);
    }
    .form-control:focus,
    .form-select:focus {
      border-color:var(--line2);
      box-shadow:none;
      background:#0f141c;
      color:var(--txt);
    }
    .form-control::placeholder { color:#7f8b9d; }
    .btn {
      border-radius:0 !important;
      font-family:var(--mono);
      font-weight:800;
      letter-spacing:0;
      box-shadow:0 6px 0 #11161d;
    }
    .btn:active { transform:translateY(4px) scale(.99); box-shadow:none !important; }
    .btn-success {
      border-color:#1c3625;
      background:linear-gradient(180deg, #8fe891, #56b85d);
      color:#07150b;
      box-shadow:0 6px 0 #1b4825;
    }
    .btn-success:hover { filter:brightness(1.04); color:#07150b; }
    .btn-primary {
      border-color:#244d2a;
      background:linear-gradient(180deg, #8fe891, #56b85d);
      color:#07150b;
      box-shadow:0 6px 0 #1b4825;
    }
    .btn-danger {
      border-color:#6e2f2f;
      background:linear-gradient(180deg, #ef8b8b, #cf5454);
      color:#240909;
      box-shadow:0 6px 0 #7b2d2d;
    }
    .btn-danger:hover { filter:brightness(1.04); color:#240909; }
    .btn-outline-danger,
    .btn-outline-warning,
    .btn-outline-secondary,
    .btn-outline-primary,
    .btn-light,
    .btn-dark {
      border-color:var(--line);
      background:#11161e;
      color:var(--muted);
      box-shadow:0 6px 0 #11161d;
    }
    .btn-outline-danger:hover,
    .btn-outline-warning:hover,
    .btn-outline-secondary:hover,
    .btn-outline-primary:hover,
    .btn-light:hover,
    .btn-dark:hover {
      color:var(--txt);
      background:#141a23;
      border-color:var(--line2);
    }
    .btn-warning {
      border-color:#614f1f;
      background:linear-gradient(180deg, #f3c96b, #ca9d35);
      color:#201803;
      box-shadow:0 6px 0 #7b611e;
    }
    .btn-warning:hover { filter:brightness(1.03); color:#201803; }
    .btn-outline-danger {
      border-color:#6e2f2f;
      color:#f2b0b0;
    }
    .btn-outline-danger:hover {
      color:#f9d4d4;
      background:#341617;
      border-color:#b85f5f;
    }
    .btn-outline-warning {
      border-color:#614f1f;
      color:#f3d48a;
    }
    .btn-outline-warning:hover {
      color:#fff0bf;
      background:#2e250d;
      border-color:#c6a550;
    }
    .btn-group .btn.active { color:#08120b; background:linear-gradient(180deg, #8fe891, #56b85d); border-color:#244d2a; }
    .card-title,
    .h4 { letter-spacing:0; }
    .badge.rounded-pill { border-radius:0 !important; }
    .input-group > .form-control,
    .input-group > .form-select,
    .input-group > .btn { border-radius:0 !important; }
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
          <h1 class="h4 mb-1 text-white">Minesigma BOT</h1>
        </div>
        <span class="badge rounded-pill text-bg-light border" id="uptime-pill">обновление: 1500 мс</span>
      </div>
    </div>
    <div class="layout">
      <section class="left">
        <div class="card">
          <div class="card-body">
          <h3 class="card-title">Подключение</h3>
          <form id="config-form">
            <div class="row g-3">
              <div class="field col-md-3"><label class="form-label">Сервер</label><input class="form-control" id="host" name="host" value="${esc(config.host)}" required /></div>
              <div class="field col-md-3"><label class="form-label">Порт</label><input class="form-control" id="port" name="port" type="number" min="1" max="65535" value="${config.port}" required /></div>
              <div class="field col-md-3"><label class="form-label">Имя бота</label><input class="form-control" id="username" name="username" value="${esc(config.username)}" required /></div>
              <div class="field col-md-3"><label class="form-label">Пароль</label><input class="form-control" id="password" name="password" type="password" value="${esc(config.password ?? "")}" /></div>
              <div class="field col-md-3"><label class="form-label">Авторизация</label><select class="form-select" id="auth" name="auth"><option value="offline" ${selected(config.auth, "offline")}>offline</option><option value="microsoft" ${selected(config.auth, "microsoft")}>microsoft</option><option value="mojang" ${selected(config.auth, "mojang")}>mojang</option></select></div>
              <div class="field col-md-3"><label class="form-label">Версия</label><input class="form-control" id="version" name="version" placeholder="auto или 1.21.11" value="${esc(config.version ?? "")}" /></div>
              <div class="field col-md-6"><label class="form-label">Админы</label><input class="form-control" id="admins" name="admins" placeholder="Owner1, Owner2" value="${esc((config.admins ?? []).join(", "))}" /></div>
            </div>
            <div class="d-flex flex-wrap gap-2 mt-3">
              <button class="btn btn-success" type="submit">Сохранить</button>
              <button class="btn btn-primary" type="button" id="start-btn">Запустить бота</button>
              <button class="btn btn-danger" type="button" id="stop-btn">Остановить бота</button>
              <button class="btn btn-warning" type="button" id="restart-btn">Перезапуск</button>
              <button class="btn btn-outline-warning" type="button" id="ping-btn">Проверить сервер</button>
            </div>
          </form>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
          <h3 class="card-title">Статус бота</h3>
          <div id="status" class="status">Загрузка...</div>
          <div class="cmdline">
            <input class="form-control" id="cmd-input" placeholder="Например: bot add 3, bot move forward 2, bot follow Player" />
            <button class="btn btn-success" id="cmd-run" type="button">Выполнить</button>
          </div>
          <div class="form-text" id="cmd-result">—</div>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
          <h3 class="card-title">Быстрые действия</h3>
          <div class="quick">
            <button class="btn btn-light border" data-cmd="bot add 3">Добавить 3 ботов</button>
            <button class="btn btn-danger" data-cmd="bot remove all">Очистить ботов</button>
            <button class="btn btn-light border" data-cmd="bot move forward 2">Шаг вперёд</button>
            <button class="btn btn-light border" data-cmd="bot jump">Прыжок</button>
            <button class="btn btn-danger" data-cmd="bot stop">Остановить движение</button>
            <button class="btn btn-warning" data-cmd="bot attack">Атаковать рядом</button>
            <button class="btn btn-light border" data-cmd="bot spin">Развернуть</button>
            <button class="btn btn-light border" data-cmd="bot use 0">Слот 0</button>
          </div>
          <div class="input-group mt-3">
            <input class="form-control" id="target-name" placeholder="Имя игрока" />
            <button class="btn btn-outline-primary" id="follow-target" type="button">Следовать</button>
            <button class="btn btn-danger" id="attack-target" type="button">Атака</button>
            <button class="btn btn-outline-warning" id="spin-target" type="button">Круг</button>
          </div>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
          <h3 class="card-title">Макросы и история</h3>
          <div class="btn-group mb-3" role="group">
            <button class="btn btn-dark tab active" type="button" data-tab="macro">Макросы</button>
            <button class="btn btn-outline-dark tab" type="button" data-tab="history">История</button>
          </div>
          <div id="tab-macro">
            <div class="d-flex flex-wrap gap-2">
              <button class="btn btn-light border" data-macro="bot chat Hello">Сказать привет</button>
              <button class="btn btn-light border" data-macro="bot move forward 3; bot jump; bot move forward 2">Рывок</button>
              <button class="btn btn-light border" data-macro="bot add 5; bot follow Utoplennik228">Добавить и следовать</button>
              <button class="btn btn-light border" data-macro="bot attack Utoplennik228">Фокус атаки</button>
            </div>
            <div class="cmdline">
              <input class="form-control" id="macro-input" placeholder="команда бота; команда бота; команда бота" />
              <button id="macro-run" class="btn btn-warning" type="button">Запустить макрос</button>
            </div>
          </div>
          <div id="tab-history" class="hidden">
            <div id="cmd-history" class="status">Пока нет команд</div>
            <div class="mt-3"><button class="btn btn-danger" id="history-clear" type="button">Очистить историю</button></div>
          </div>
          </div>
        </div>
      </section>

      <section class="right">
        <div class="card">
          <div class="card-body">
          <h3 class="card-title">Чат</h3>
          <div class="tools">
            <input class="form-control" id="chat-filter" placeholder="Фильтр чата..." />
            <select class="form-select" id="chat-source-filter">
              <option value="all">всё</option>
              <option value="chat">чат</option>
              <option value="system">система</option>
              <option value="error">ошибки</option>
            </select>
            <label class="form-check d-flex align-items-center gap-2 mb-0 text-secondary"><input class="form-check-input mt-0" id="chat-autoscroll" type="checkbox" checked /> автоскролл</label>
            <label class="form-check d-flex align-items-center gap-2 mb-0 text-secondary"><input class="form-check-input mt-0" id="chat-dedupe" type="checkbox" checked /> скрывать повторы</label>
          </div>
          <div id="chatlog" class="chat">Загрузка...</div>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
          <h3 class="card-title">Окно</h3>
          <div id="gui-meta" class="form-text mb-2">Нет открытого окна</div>
          <div id="gui-grid" class="slots9"></div>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
          <h3 class="card-title">Боты</h3>
          <div class="tools">
            <select class="form-select" id="bot-select"><option value="0">бот #1</option></select>
            <input class="form-control" id="inv-filter" placeholder="Найти предмет..." />
            <select class="form-select" id="refresh-rate">
              <option value="800">800 мс</option>
              <option value="1500" selected>1500 мс</option>
              <option value="2500">2500 мс</option>
              <option value="5000">5000 мс</option>
            </select>
          </div>
          <div id="bot-stats" class="botstats">Боты не запущены</div>
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
      if (!arr.length) { cmdHistoryEl.textContent = "Пока нет команд"; return; }
      cmdHistoryEl.textContent = arr.slice().reverse().map((x) => "[" + x.at.slice(11,19) + "] " + x.cmd).join("\\n");
    };

    const text = (state) => {
      const statusMap = {
        idle: "ожидание",
        online: "онлайн",
        connecting: "подключение",
        error: "ошибка",
        kicked: "кикнут",
        stopped: "остановлен"
      };
      const yesNo = (value) => value ? "да" : "нет";
      const lines = [
        "статус: " + (statusMap[state.status] || state.status),
        "работает: " + yesNo(state.running),
        "подключен: " + yesNo(state.connected)
      ];
      if (state.username) lines.push("имя: " + state.username);
      if (state.host) lines.push("сервер: " + state.host + ":" + state.port);
      if (state.version) lines.push("версия: " + state.version);
      if (state.error) lines.push("ошибка: " + state.error);
      if (state.kickedReason) lines.push("причина кика: " + state.kickedReason);
      if (typeof state.kickedLoggedIn === "boolean") lines.push("вход выполнен: " + state.kickedLoggedIn);
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
      const head = "<span style='color:#69d8ee'>[" + e.at.slice(11,19) + "] " + e.source + "</span> ";
      if (e.html) return "<div class='chatline'>" + head + e.html + "</div>";
      return "<div class='chatline'>" + head + safe(e.text || "") + "</div>";
      }).join("") || "Сообщений пока нет";
      if (chatAutoscrollEl.checked) chatEl.scrollTop = chatEl.scrollHeight;
    };

    const renderGui = (gui) => {
      guiGridEl.innerHTML = "";
      if (!gui) { guiMetaEl.textContent = "Нет открытого окна"; return; }
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
        botStatsEl.textContent = "Боты не запущены";
        invGridEl.innerHTML = "";
        botSelectEl.innerHTML = "<option value='0'>бот #1</option>";
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
      uptimePillEl.textContent = "обновление: " + ms + " мс";
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
      cmdResultEl.textContent = "Настройки сохранены";
      await refreshStatus();
    });

    document.getElementById("start-btn").addEventListener("click", async () => { await send("/api/start", { method: "POST" }); await refresh(); });
    document.getElementById("stop-btn").addEventListener("click", async () => { await send("/api/stop", { method: "POST" }); await refresh(); });
    document.getElementById("restart-btn").addEventListener("click", async () => { await send("/api/restart", { method: "POST" }); await refresh(); });
    document.getElementById("ping-btn").addEventListener("click", async () => {
      const res = await send("/api/ping", { method: "POST" });
      const r = res.result;
      statusEl.textContent = r.reachable ? "пинг: доступен\\nзадержка: " + r.latencyMs : "пинг: недоступен\\nошибка: " + (r.error || "неизвестно");
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
