import { BotManager } from "./bot-manager.ts";
import { pingTcp } from "./ping.ts";
import { renderPage } from "./ui.ts";
import type { BotConfig } from "./types.ts";

const WEB_PORT = Number(Bun.env.WEB_PORT ?? 3000);
const manager = new BotManager();

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });

const parseConfig = async (request: Request): Promise<Partial<BotConfig>> => {
  const body = (await request.json()) as Partial<BotConfig>;
  const next: Partial<BotConfig> = {};

  if (typeof body.host === "string" && body.host.trim()) {
    next.host = body.host.trim();
  }
  if (typeof body.port === "number" && Number.isInteger(body.port) && body.port > 0 && body.port <= 65535) {
    next.port = body.port;
  }
  if (typeof body.username === "string" && body.username.trim()) {
    next.username = body.username.trim();
  }
  if (typeof body.password === "string") {
    next.password = body.password.trim() || undefined;
  }
  if (body.auth === "offline" || body.auth === "microsoft" || body.auth === "mojang") {
    next.auth = body.auth;
  }
  if (typeof body.version === "string") {
    next.version = body.version.trim() || undefined;
  }
  if (Array.isArray(body.admins)) {
    next.admins = body.admins.map((a) => String(a).trim()).filter(Boolean);
  } else if (typeof (body as any).admins === "string") {
    next.admins = String((body as any).admins)
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);
  }

  return next;
};

Bun.serve({
  port: WEB_PORT,
  idleTimeout: 30,
  routes: {
    "/": () => {
      const html = renderPage(manager.getConfig());
      return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
    },
    "/api/status": () => json({ ok: true, config: manager.getConfig(), state: manager.getState() }),
    "/api/bots": () => json({ ok: true, bots: manager.getBots() }),
    "/api/chat": () => json({ ok: true, log: manager.getChatLog() }),
    "/api/gui": () => json({ ok: true, gui: manager.getGui() }),
    "/api/config": async (request) => {
      if (request.method !== "POST") {
        return json({ ok: false, error: "Method not allowed" }, 405);
      }
      try {
        const nextConfig = await parseConfig(request);
        const config = manager.updateConfig(nextConfig);
        return json({ ok: true, config, state: manager.getState() });
      } catch {
        return json({ ok: false, error: "Invalid JSON body" }, 400);
      }
    },
    "/api/start": async (request) => {
      if (request.method !== "POST") {
        return json({ ok: false, error: "Method not allowed" }, 405);
      }
      const state = await manager.start();
      return json({ ok: true, state });
    },
    "/api/command": async (request) => {
      if (request.method !== "POST") {
        return json({ ok: false, error: "Method not allowed" }, 405);
      }
      try {
        const body = (await request.json()) as { command?: string };
        const command = String(body.command ?? "");
        const result = await manager.executeCommand(command);
        return json(result, result.ok ? 200 : 400);
      } catch {
        return json({ ok: false, message: "Invalid JSON body" }, 400);
      }
    },
    "/api/gui/click": async (request) => {
      if (request.method !== "POST") {
        return json({ ok: false, error: "Method not allowed" }, 405);
      }
      try {
        const body = (await request.json()) as { index?: number };
        const index = Number(body.index);
        if (!Number.isInteger(index) || index < 0) {
          return json({ ok: false, message: "Invalid slot index" }, 400);
        }
        const result = await manager.clickGuiSlot(index);
        return json(result, result.ok ? 200 : 400);
      } catch {
        return json({ ok: false, message: "Invalid JSON body" }, 400);
      }
    },
    "/api/ping": async (request) => {
      if (request.method !== "POST") {
        return json({ ok: false, error: "Method not allowed" }, 405);
      }
      const config = manager.getConfig();
      const result = await pingTcp(config.host, config.port);
      return json({ ok: result.ok, target: `${config.host}:${config.port}`, result });
    },
    "/api/stop": async (request) => {
      if (request.method !== "POST") {
        return json({ ok: false, error: "Method not allowed" }, 405);
      }
      const state = await manager.stop();
      return json({ ok: true, state });
    },
    "/api/restart": async (request) => {
      if (request.method !== "POST") {
        return json({ ok: false, error: "Method not allowed" }, 405);
      }
      const state = await manager.restart();
      return json({ ok: true, state });
    }
  },
  fetch: () => json({ ok: false, error: "Not found" }, 404)
});

console.log(`Minesigma BOT running at http://localhost:${WEB_PORT}`);
console.log("Open the UI to configure and control your bot.");
