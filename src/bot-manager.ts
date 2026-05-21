import mineflayer from "mineflayer";
import { Vec3 } from "vec3";
import type { BotConfig, BotState, BotSummary, ChatLogEntry, GuiSnapshot, GuiSlot, HomePosition } from "./types.ts";

const DEFAULT_CONFIG: BotConfig = {
  host: "localhost",
  port: 25565,
  username: "MinesigmaBOT",
  auth: "offline",
  viewDistance: "normal",
  admins: [],
  chatProfile: "fastmc",
  autoEat: false,
  autoTotem: false,
  autoArmor: false,
  antiAfk: false,
  autoRespawn: false,
  critMode: false,
  parkour: false,
  reach: 3
};

const MAX_CHAT_LOG = 300;
const cloneConfig = (config: BotConfig): BotConfig => ({ ...config });
const esc = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const MC_COLORS: Record<string, string> = {
  black: "#000000",
  dark_blue: "#0000aa",
  dark_green: "#00aa00",
  dark_aqua: "#00aaaa",
  dark_red: "#aa0000",
  dark_purple: "#aa00aa",
  gold: "#ffaa00",
  gray: "#aaaaaa",
  dark_gray: "#555555",
  blue: "#5555ff",
  green: "#55ff55",
  aqua: "#55ffff",
  red: "#ff5555",
  light_purple: "#ff55ff",
  yellow: "#ffff55",
  white: "#ffffff"
};

type BotRuntime = {
  bot: mineflayer.Bot;
  hasSpawned: boolean;
  behaviorTimer: ReturnType<typeof setInterval> | null;
  lastPos: { x: number; y: number; z: number } | null;
  lastMoveAt: number;
  strafeRight: boolean;
  recoverUntil: number;
  recoverYawOffset: number;
};

type SpammerState = {
  timer: ReturnType<typeof setInterval> | null;
  message: string;
  intervalMs: number;
  remaining: number | null;
};

export class BotManager {
  private bots: BotRuntime[] = [];
  private config: BotConfig = cloneConfig(DEFAULT_CONFIG);
  private state: BotState = {
    running: false,
    connected: false,
    status: "idle"
  };
  private chatLog: ChatLogEntry[] = [];
  private guiSnapshot: GuiSnapshot = null;
  private lastChatCommandKey = "";
  private lastChatCommandAt = 0;
  private spammer: SpammerState = {
    timer: null,
    message: "",
    intervalMs: 3000,
    remaining: null
  };
  private homes: Map<string, HomePosition> = new Map();
  private deathPositions: Map<string, { x: number; y: number; z: number }> = new Map();
  private presetsDir: string = ".minesigma-presets";

  getConfig(): BotConfig {
    return cloneConfig(this.config);
  }

  getHomes(): Map<string, HomePosition> {
    return new Map(this.homes);
  }

  getDeathPositions(): Map<string, { x: number; y: number; z: number }> {
    return new Map(this.deathPositions);
  }

  updateConfig(next: Partial<BotConfig>): BotConfig {
    const admins = Array.isArray(next.admins) ? next.admins.map((a) => String(a).trim()).filter(Boolean) : this.config.admins;
    this.config = { ...this.config, ...next, admins };
    return this.getConfig();
  }

  getState(): BotState {
    return { ...this.state };
  }

  getChatLog(): ChatLogEntry[] {
    return [...this.chatLog];
  }

  getGui(): GuiSnapshot {
    return this.guiSnapshot ? { ...this.guiSnapshot, slots: [...this.guiSnapshot.slots] } : null;
  }

  getBots(): BotSummary[] {
    return this.bots.map(({ bot }) => {
      const rawItems = bot.inventory?.items?.() ?? [];
      const inv: GuiSlot[] = rawItems
        .map((item) => ({ index: item.slot, name: item.name, count: item.count, lore: (item as any).customLore ?? undefined }))
        .sort((a, b) => a.index - b.index);
      return {
        username: bot.username,
        health: bot.health ?? 0,
        food: bot.food ?? 0,
        oxygenLevel: (bot as any).oxygenLevel,
        position: bot.entity
          ? {
              x: Number(bot.entity.position.x.toFixed(2)),
              y: Number(bot.entity.position.y.toFixed(2)),
              z: Number(bot.entity.position.z.toFixed(2))
            }
          : undefined,
        inventory: inv
      };
    });
  }

  async start(): Promise<BotState> {
    this.bots = this.bots.filter(
      (runtime) => Boolean((runtime.bot as any)?._client) && !(runtime.bot as any)._client.ended
    );
    if (this.bots.length > 0) {
      this.updateAggregateState();
      if (this.bots.some((runtime) => runtime.hasSpawned)) {
        return this.getState();
      }
      if (this.state.status.includes("connecting")) {
        return this.getState();
      }
    }
    await this.spawnBots(1);
    return this.getState();
  }

  async stop(reason = "Stopped by user"): Promise<BotState> {
    if (this.bots.length === 0) {
      this.state = { ...this.state, running: false, connected: false, status: "idle" };
      return this.getState();
    }
    for (const runtime of [...this.bots]) {
      this.clearBehavior(runtime);
      runtime.bot.quit(reason);
    }
    this.stopSpammer();
    this.bots = [];
    this.guiSnapshot = null;
    this.state = { ...this.state, running: false, connected: false, status: "idle" };
    this.appendLog("system", reason);
    return this.getState();
  }

  async restart(): Promise<BotState> {
    await this.stop("Restarting");
    return this.start();
  }

  async executeCommand(raw: string): Promise<{ ok: boolean; message: string }> {
    if (this.bots.length === 0) return { ok: false, message: "Bot is not running" };
    const text = this.normalizeCommand(raw);
    if (!text) return { ok: false, message: "Command is empty" };

    const clickSlotMatch = text.match(/^click\.item\.slot\.(\d+)$/i);
    if (clickSlotMatch) {
      const slot = Number(clickSlotMatch[1]);
      if (!Number.isInteger(slot) || slot < 0 || slot > 8) return { ok: false, message: "Hotbar slot must be 0..8" };
      this.forEachBot((bot) => {
        bot.setQuickBarSlot(slot);
        bot.activateItem();
        setTimeout(() => {
          try {
            bot.deactivateItem();
          } catch {}
        }, 200);
      });
      return { ok: true, message: `Used hotbar slot ${slot} on ${this.bots.length} bot(s)` };
    }

    const [cmdRaw, ...args] = text.split(/\s+/);
    const cmd = cmdRaw.toLowerCase();
    const rest = args.join(" ");

    if (cmd === "summon") {
      const count = Number(args[0] ?? "1");
      if (!Number.isInteger(count) || count < 1 || count > 25) return { ok: false, message: "Usage: summon <1..25>" };
      await this.spawnBots(count);
      return { ok: true, message: `Summoned ${count} bot(s), total ${this.bots.length}` };
    }
    if (cmd === "despawn" || cmd === "kickbots") {
      await this.stop("Despawn");
      return { ok: true, message: "All bots despawned" };
    }
    if (cmd === "say") {
      this.forEachBot((bot) => bot.chat(rest || "..."));
      return { ok: true, message: `Sent chat from ${this.bots.length} bot(s)` };
    }
    if (cmd === "msg" || cmd === "message" || cmd === "tell") {
      const target = args[0];
      const message = args.slice(1).join(" ").trim();
      if (!target || !message) return { ok: false, message: "Usage: bot message <player> <text>" };
      this.forEachBot((bot) => bot.chat(`/msg ${target} ${message}`));
      return { ok: true, message: `Messaged ${target} from ${this.bots.length} bot(s)` };
    }
    if (cmd === "spammer") {
      return this.configureSpammer(args);
    }
    if (cmd === "jump") {
      this.forEachBot((bot) => {
        bot.setControlState("jump", true);
        setTimeout(() => bot.setControlState("jump", false), 250);
      });
      return { ok: true, message: "Jumped" };
    }
    if (cmd === "forward" || cmd === "back" || cmd === "left" || cmd === "right") {
      const blocks = Number(args[0] ?? "1");
      if (Number.isNaN(blocks) || blocks <= 0) return { ok: false, message: `Usage: ${cmd} <blocks>` };
      const ms = Math.min(12000, Math.max(200, Math.round(blocks * 350)));
      this.forEachBot((bot) => {
        bot.setControlState(cmd as "forward" | "back" | "left" | "right", true);
        setTimeout(() => bot.setControlState(cmd as "forward" | "back" | "left" | "right", false), ms);
      });
      return { ok: true, message: `${cmd} ${blocks}` };
    }
    if (cmd === "stop") {
      this.forEachBot((bot) => this.clearControlStates(bot));
      this.bots.forEach((runtime) => this.clearBehavior(runtime));
      this.stopSpammer();
      return { ok: true, message: "Stopped movement/behavior" };
    }
    if (cmd === "hold") {
      const slot = Number(args[0]);
      if (!Number.isInteger(slot) || slot < 0 || slot > 8) return { ok: false, message: "Usage: bot hold <0..8>" };
      this.forEachBot((bot) => bot.setQuickBarSlot(slot));
      return { ok: true, message: `Selected hotbar slot ${slot}` };
    }
    if (cmd === "sneak" || cmd === "sprint") {
      const enabled = this.parseToggle(args[0]);
      if (enabled === null) return { ok: false, message: `Usage: bot ${cmd} on|off` };
      this.forEachBot((bot) => bot.setControlState(cmd as "sneak" | "sprint", enabled));
      return { ok: true, message: `${cmd} ${enabled ? "on" : "off"}` };
    }
    if (cmd === "players") {
      const primary = this.primaryBot();
      const players = primary ? Object.keys(primary.players).sort() : [];
      return { ok: true, message: players.length ? `Players: ${players.join(", ")}` : "No players visible" };
    }
    if (cmd === "status") {
      return { ok: true, message: this.getStatusLine() };
    }
    if (cmd === "logout") {
      await this.stop("Logout requested");
      return { ok: true, message: "Logged out" };
    }
    if (cmd === "reconnect") {
      await this.restart();
      return { ok: true, message: "Reconnecting" };
    }
    if (cmd === "follow") {
      const target = rest.trim();
      if (!target) return { ok: false, message: "Usage: follow <player>" };
      this.bots.forEach((runtime) => this.startFollow(runtime, target));
      return { ok: true, message: `Following ${target}` };
    }
    if (cmd === "come") {
      const target = rest.trim();
      if (!target) return { ok: false, message: "Usage: bot come <player>" };
      this.bots.forEach((runtime) => this.startFollow(runtime, target));
      return { ok: true, message: `Coming to ${target}` };
    }
    if (cmd === "look") {
      const target = rest.trim();
      if (!target) return { ok: false, message: "Usage: bot look <player>" };
      this.forEachBot((bot) => {
        const ent = this.findPlayerEntity(bot, target);
        if (ent) void bot.lookAt(ent.position.offset(0, 1.6, 0), true);
      });
      return { ok: true, message: `Looking at ${target}` };
    }
    if (cmd === "guard") {
      const target = rest.trim();
      if (!target) return { ok: false, message: "Usage: bot guard <player>" };
      this.bots.forEach((runtime) => this.startGuard(runtime, target));
      return { ok: true, message: `Guarding ${target}` };
    }
    if (cmd === "spin") {
      const target = rest.trim();
      if (target) {
        this.bots.forEach((runtime) => this.startSpinAround(runtime, target));
        return { ok: true, message: `Spinning around ${target}` };
      }
      this.forEachBot((bot) => bot.look(bot.entity.yaw + Math.PI / 2, bot.entity.pitch, true));
      return { ok: true, message: "Spun bot(s)" };
    }
    if (cmd === "attack") {
      const target = rest.trim();
      this.bots.forEach((runtime) => this.startAttack(runtime, target || null));
      return { ok: true, message: target ? `Attacking ${target}` : "Attacking nearest targets" };
    }
    if (cmd === "slot") {
      const index = Number(args[0]);
      if (!Number.isInteger(index) || index < 0) return { ok: false, message: "Usage: slot <index>" };
      const primary = this.bots[0]?.bot;
      if (!primary) return { ok: false, message: "No bot" };
      await primary.clickWindow(index, 0, 0);
      this.updateGuiSnapshot(primary);
      return { ok: true, message: `Clicked slot ${index}` };
    }
    if (cmd === "mine") {
      return this.executeMineCommand(args);
    }
    if (cmd === "place") {
      return this.executePlaceCommand(args);
    }
    if (cmd === "clear") {
      return this.executeClearCommand(args);
    }
    if (cmd === "drop") {
      return this.executeDropCommand(args);
    }
    if (cmd === "give") {
      return this.executeGiveCommand(args);
    }
    if (cmd === "tpa") {
      const target = rest.trim();
      if (!target) return { ok: false, message: "Usage: tpa <player>" };
      this.forEachBot((bot) => bot.chat(`/tpa ${target}`));
      return { ok: true, message: `TPA sent to ${target} from ${this.bots.length} bot(s)` };
    }
    if (cmd === "tpahere") {
      const target = rest.trim();
      if (!target) return { ok: false, message: "Usage: tpahere <player>" };
      this.forEachBot((bot) => bot.chat(`/tpahere ${target}`));
      return { ok: true, message: `TPAHere sent to ${target} from ${this.bots.length} bot(s)` };
    }
    if (cmd === "home") {
      const name = rest.trim();
      if (!name) return { ok: false, message: "Usage: home <name>" };
      const home = this.homes.get(name);
      if (!home) return { ok: false, message: `Home '${name}' not found` };
      this.forEachBot((bot) => bot.chat(`/tpa ${home.x} ${home.y} ${home.z}`));
      return { ok: true, message: `Teleporting to home '${name}' at ${home.x}, ${home.y}, ${home.z}` };
    }
    if (cmd === "sethome") {
      const name = rest.trim();
      if (!name) return { ok: false, message: "Usage: sethome <name>" };
      const primary = this.primaryBot();
      if (!primary || !primary.entity) return { ok: false, message: "No bot position available" };
      const pos = primary.entity.position;
      this.homes.set(name, {
        name,
        x: Number(pos.x.toFixed(1)),
        y: Number(pos.y.toFixed(1)),
        z: Number(pos.z.toFixed(1)),
        dimension: (primary.entity as any).dimension
      });
      return { ok: true, message: `Home '${name}' saved at ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}` };
    }
    if (cmd === "delhome") {
      const name = rest.trim();
      if (!name) return { ok: false, message: "Usage: delhome <name>" };
      if (!this.homes.delete(name)) return { ok: false, message: `Home '${name}' not found` };
      return { ok: true, message: `Home '${name}' deleted` };
    }
    if (cmd === "listhomes") {
      if (this.homes.size === 0) return { ok: true, message: "No homes saved" };
      const list = [...this.homes.values()].map((h) => `${h.name}: ${h.x}, ${h.y}, ${h.z}`).join("; ");
      return { ok: true, message: `Homes: ${list}` };
    }
    if (cmd === "bridge") {
      const length = Number(args[0] ?? "5");
      if (!Number.isInteger(length) || length < 1 || length > 20) return { ok: false, message: "Usage: bridge <1..20>" };
      return this.executeBridgeCommand(length);
    }
    if (cmd === "pillar") {
      const height = Number(args[0] ?? "5");
      if (!Number.isInteger(height) || height < 1 || height > 20) return { ok: false, message: "Usage: pillar <1..20>" };
      return this.executePillarCommand(height);
    }
    if (cmd === "autoeat" || cmd === "autototem" || cmd === "autoarmor" || cmd === "antiafk" || cmd === "autorespawn" || cmd === "crit" || cmd === "parkour") {
      const enabled = this.parseToggle(args[0]);
      if (enabled === null) return { ok: false, message: `Usage: bot ${cmd} on|off` };
      const keyMap: Record<string, keyof BotConfig> = {
        autoeat: "autoEat",
        autototem: "autoTotem",
        autoarmor: "autoArmor",
        antiafk: "antiAfk",
        autorespawn: "autoRespawn",
        crit: "critMode",
        parkour: "parkour"
      };
      const configKey = keyMap[cmd];
      if (configKey) {
        (this.config as any)[configKey] = enabled;
      }
      if (cmd === "antiafk" && enabled) {
        this.startAntiAfk();
      } else if (cmd === "antiafk" && !enabled) {
        this.stopAntiAfk();
      }
      if (cmd === "crit" && enabled) {
        (this.config as any).reach = (this.config.reach ?? 3);
      }
      return { ok: true, message: `${cmd} ${enabled ? "enabled" : "disabled"}` };
    }
    if (cmd === "reach") {
      const dist = Number(args[0]);
      if (!Number.isFinite(dist) || dist < 3 || dist > 6) return { ok: false, message: "Usage: bot reach <3..6>" };
      this.config.reach = dist;
      return { ok: true, message: `Attack reach set to ${dist} blocks` };
    }
    if (cmd === "preset") {
      return this.executePresetCommand(args);
    }
    if (cmd === "rescue") {
      const pos = this.deathPositions.get(this.primaryBot()?.username ?? "_default") ?? null;
      if (!pos) return { ok: false, message: "No death position recorded" };
      const primary = this.primaryBot();
      if (!primary || !primary.entity) return { ok: false, message: "No bot position" };
      const cur = primary.entity.position;
      const dx = Math.abs(cur.x - pos.x);
      const dy = Math.abs(cur.y - pos.y);
      const dz = Math.abs(cur.z - pos.z);
      if (dx > 3 || dy > 3 || dz > 3) {
        this.forEachBot((bot) => bot.chat(`/tp ${pos.x} ${pos.y} ${pos.z}`));
      } else {
        this.clearBehavior(this.bots[0]);
        const runtime = this.bots[0];
        this.driveToward(runtime, pos, 4);
      }
      return { ok: true, message: `Moving to rescue point at ${pos.x}, ${pos.y}, ${pos.z}` };
    }
    if (cmd === "compass") {
      const target = rest.trim();
      if (!target) return { ok: false, message: "Usage: compass <x z> or compass <player>" };
      const coords = target.split(/\s+/);
      let tx: number, tz: number;
      if (coords.length === 2) {
        tx = Number(coords[0]);
        tz = Number(coords[1]);
        if (!Number.isFinite(tx) || !Number.isFinite(tz)) return { ok: false, message: "Invalid coordinates" };
      } else {
        const entity = this.findPlayerEntity(this.primaryBot()!, target);
        if (!entity) return { ok: false, message: `Player '${target}' not found` };
        tx = entity.position.x;
        tz = entity.position.z;
      }
      this.forEachBot((bot) => {
        if (!bot.entity) return;
        const yaw = Math.atan2(-(tz - bot.entity.position.z), -(tx - bot.entity.position.x));
        bot.look(yaw, bot.entity.pitch, true);
      });
      return { ok: true, message: `Looking toward ${tx}, ${tz}` };
    }
    if (cmd === "wall") {
      return this.executeWallCommand(args);
    }
    if (cmd === "fill") {
      return this.executeFillCommand(args);
    }
    if (cmd === "tower") {
      return this.executeTowerCommand(args);
    }
    if (cmd === "health") {
      const primary = this.primaryBot();
      if (!primary) return { ok: false, message: "No bot" };
      return {
        ok: true,
        message: `HP: ${primary.health}/20, Food: ${primary.food}/20, Air: ${(primary as any).oxygenLevel ?? 0}/300`
      };
    }
    if (text.startsWith("/")) {
      this.forEachBot((bot) => bot.chat(text.startsWith("/") ? text : `/${text}`));
      return { ok: true, message: `Command sent from ${this.bots.length} bot(s)` };
    }

    this.forEachBot((bot) => bot.chat(text.startsWith("/") ? text : `/${text}`));
    return { ok: true, message: `Command sent from ${this.bots.length} bot(s)` };
  }

  async clickGuiSlot(index: number): Promise<{ ok: boolean; message: string }> {
    const primary = this.bots[0]?.bot;
    if (!primary || !primary.currentWindow) return { ok: false, message: "No open GUI window" };
    await primary.clickWindow(index, 0, 0);
    this.updateGuiSnapshot(primary);
    return { ok: true, message: `Clicked slot ${index}` };
  }

  private async spawnBots(count: number): Promise<void> {
    const baseName = this.config.username || "MinesigmaBOT";
    for (let i = 0; i < count; i++) {
      const username = this.bots.length === 0 && i === 0 ? baseName : `${baseName}_${this.bots.length + i + 1}`;
      const bot = mineflayer.createBot({
        host: this.config.host,
        port: this.config.port,
        username,
        password: this.config.password,
        auth: this.config.auth,
        version: this.config.version,
        viewDistance: "far",
        skipValidation: true,
        hideErrors: true
      });
      const runtime: BotRuntime = {
        bot,
        hasSpawned: false,
        behaviorTimer: null,
        lastPos: null,
        lastMoveAt: Date.now(),
        strafeRight: true,
        recoverUntil: 0,
        recoverYawOffset: 0
      };
      this.bots.push(runtime);
      this.bindBotEvents(runtime);
      this.appendLog("system", `Connecting ${username}`);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    this.updateAggregateState();
  }

  private forEachBot(fn: (bot: mineflayer.Bot) => void): void {
    for (const runtime of this.bots) fn(runtime.bot);
  }

  private primaryBot(): mineflayer.Bot | null {
    return this.bots[0]?.bot ?? null;
  }

  private parseToggle(value: string | undefined): boolean | null {
    const normalized = String(value ?? "").toLowerCase();
    if (["on", "true", "yes", "1"].includes(normalized)) return true;
    if (["off", "false", "no", "0"].includes(normalized)) return false;
    return null;
  }

  private getStatusLine(): string {
    const state = this.getState();
    const bots = this.getBots();
    const botText = bots.length
      ? bots.map((bot) => `${bot.username} hp=${bot.health} food=${bot.food}`).join("; ")
      : "none";
    const profile = this.config.chatProfile ?? "fastmc";
    const autos = [
      this.config.autoEat ? "eat" : null,
      this.config.autoTotem ? "totem" : null,
      this.config.autoArmor ? "armor" : null,
      this.config.antiAfk ? "afk" : null,
      this.config.critMode ? "crit" : null
    ].filter(Boolean).join(",");
    const autoStr = autos ? ` | auto[${autos}]` : "";
    const reach = this.config.reach ?? 3;
    return `profile=${profile} | status=${state.status} | connected=${state.connected} | bots=${bots.length} | reach=${reach}${autoStr} | ${botText}`;
  }

  private clearBehavior(runtime: BotRuntime): void {
    if (runtime.behaviorTimer) {
      clearInterval(runtime.behaviorTimer);
      runtime.behaviorTimer = null;
    }
    this.clearControlStates(runtime.bot);
  }

  private clearControlStates(bot: mineflayer.Bot): void {
    const nativeClear = (bot as any).clearControlStates;
    if (typeof nativeClear === "function") {
      nativeClear.call(bot);
      return;
    }

    for (const control of ["forward", "back", "left", "right", "jump", "sprint", "sneak"] as const) {
      try {
        bot.setControlState(control, false);
      } catch {}
    }
  }

  private configureSpammer(args: string[]): { ok: boolean; message: string } {
    const action = (args[0] ?? "status").toLowerCase();
    if (action === "stop" || action === "off") {
      this.stopSpammer();
      return { ok: true, message: "Spammer stopped" };
    }
    if (action === "status") {
      const running = this.spammer.timer ? "running" : "stopped";
      const limit = this.spammer.remaining === null ? "forever" : `${this.spammer.remaining} left`;
      return {
        ok: true,
        message: `Spammer ${running}: every ${this.spammer.intervalMs}ms, ${limit}, message: ${this.spammer.message || "(none)"}`
      };
    }
    if (action !== "start" && action !== "on") {
      return { ok: false, message: "Usage: bot spammer start <interval> <message> [count] | bot spammer stop | bot spammer status" };
    }

    const parsed = this.parseSpammerStart(args.slice(1));
    if (!parsed.ok) return parsed;

    this.stopSpammer();
    this.spammer = {
      timer: null,
      message: parsed.message,
      intervalMs: parsed.intervalMs,
      remaining: parsed.count
    };
    this.spammer.timer = setInterval(() => this.tickSpammer(), parsed.intervalMs);
    this.tickSpammer();
    return {
      ok: true,
      message: `Spammer started every ${parsed.intervalMs}ms${parsed.count === null ? "" : ` for ${parsed.count} message(s)`}`
    };
  }

  private parseSpammerStart(args: string[]): { ok: true; intervalMs: number; message: string; count: number | null } | { ok: false; message: string } {
    const intervalRaw = args[0] ?? "";
    const intervalMs = this.parseDurationMs(intervalRaw);
    if (!intervalMs) {
      return { ok: false, message: "Usage: bot spammer start <interval> <message> [count]" };
    }

    let messageParts = args.slice(1);
    let count: number | null = null;
    const countFlagIndex = messageParts.findIndex((part) => part === "--count" || part === "count");
    if (countFlagIndex !== -1) {
      const value = Number(messageParts[countFlagIndex + 1]);
      if (!Number.isInteger(value) || value < 1 || value > 200) {
        return { ok: false, message: "Spammer count must be 1..200" };
      }
      count = value;
      messageParts = [...messageParts.slice(0, countFlagIndex), ...messageParts.slice(countFlagIndex + 2)];
    }

    const message = messageParts.join(" ").trim();
    if (!message) return { ok: false, message: "Spammer message is empty" };
    return { ok: true, intervalMs, message, count };
  }

  private parseDurationMs(raw: string): number | null {
    const match = raw.trim().match(/^(\d+(?:\.\d+)?)(ms|s|m)?$/i);
    if (!match) return null;
    const value = Number(match[1]);
    const unit = (match[2] ?? "ms").toLowerCase();
    const ms = unit === "m" ? value * 60000 : unit === "s" ? value * 1000 : value;
    const rounded = Math.round(ms);
    if (!Number.isFinite(rounded) || rounded < 1000 || rounded > 600000) return null;
    return rounded;
  }

  private tickSpammer(): void {
    if (!this.spammer.message) return;
    this.forEachBot((bot) => bot.chat(this.spammer.message));
    if (this.spammer.remaining === null) return;
    this.spammer.remaining -= 1;
    if (this.spammer.remaining <= 0) this.stopSpammer();
  }

  private stopSpammer(): void {
    if (this.spammer.timer) clearInterval(this.spammer.timer);
    this.spammer.timer = null;
  }

  private antiAfkInterval: ReturnType<typeof setInterval> | null = null;

  private startAntiAfk(): void {
    if (this.antiAfkInterval) return;
    this.antiAfkInterval = setInterval(() => {
      this.forEachBot((bot) => {
        if (bot.entity) {
          bot.look(bot.entity.yaw + 0.1, bot.entity.pitch, true);
        }
      });
    }, 5000);
  }

  private stopAntiAfk(): void {
    if (this.antiAfkInterval) {
      clearInterval(this.antiAfkInterval);
      this.antiAfkInterval = null;
    }
  }

  private async executeDropCommand(args: string[]): Promise<{ ok: boolean; message: string }> {
    const bot = this.primaryBot();
    if (!bot) return { ok: false, message: "No bot" };
    const target = args[0] ?? "all";
    if (target === "all") {
      const items = bot.inventory.items();
      let dropped = 0;
      for (const item of items) {
        try {
          await bot.tossStack(item);
          dropped += item.count;
          await new Promise((r) => setTimeout(r, 150));
        } catch {}
      }
      return { ok: true, message: `Dropped all items (${dropped} total)` };
    }
    const itemId = Number(target);
    if (Number.isInteger(itemId)) {
      const items = bot.inventory.items();
      const found = items.find((i) => i.slot === itemId);
      if (!found) return { ok: false, message: `Item at slot ${itemId} not found` };
      await bot.tossStack(found);
      return { ok: true, message: `Dropped ${found.name} x${found.count}` };
    }
    const items = bot.inventory.items();
    const matching = items.filter((i) => i.name === target.toLowerCase());
    if (matching.length === 0) return { ok: false, message: `No items named '${target}' in inventory` };
    let dropped = 0;
    for (const item of matching) {
      try {
        await bot.tossStack(item);
        dropped += item.count;
        await new Promise((r) => setTimeout(r, 150));
      } catch {}
    }
    return { ok: true, message: `Dropped ${dropped}x ${target}` };
  }

  private async executeGiveCommand(args: string[]): Promise<{ ok: boolean; message: string }> {
    const target = args[0];
    const itemName = args[1];
    const count = Number(args[2] ?? "1");
    if (!target || !itemName) return { ok: false, message: "Usage: give <player> <item_name> [count]" };
    if (!Number.isInteger(count) || count < 1 || count > 64) return { ok: false, message: "Count must be 1..64" };
    const bot = this.primaryBot();
    if (!bot) return { ok: false, message: "No bot" };
    const items = bot.inventory.items();
    const matching = items.filter((i) => i.name === itemName.toLowerCase());
    if (matching.length === 0) return { ok: false, message: `No ${itemName} in inventory` };
    let given = 0;
    for (const item of matching) {
      if (given >= count) break;
      const giveAmount = Math.min(count - given, item.count);
      try {
        await bot.toss((item as any).id, null, giveAmount);
        given += giveAmount;
      } catch {}
    }
    this.forEachBot((b) => b.chat(`/give ${target} ${itemName} ${given}`));
    return { ok: true, message: `Gave ${given}x ${itemName} to ${target} from ${this.bots.length} bot(s)` };
  }

  private async executeBridgeCommand(length: number): Promise<{ ok: boolean; message: string }> {
    const bot = this.primaryBot();
    if (!bot || !bot.entity) return { ok: false, message: "No bot" };
    const blockId = this.getBestBlockInHotbar(bot, ["cobblestone", "stone", "dirt", "oak_planks", "spruce_planks"]);
    if (!blockId) return { ok: false, message: "No bridging blocks in hotbar" };
    let placed = 0;
    for (let i = 0; i < length; i++) {
      bot.setControlState("back", true);
      await new Promise((r) => setTimeout(r, 150));
      bot.setControlState("back", false);
      bot.setControlState("sneak", true);
      const pos = (bot as any).blockAtCursor?.(5) ?? bot.blockAt(bot.entity.position.offset(0, -1, 0));
      if (!pos || pos.name === "air") {
        bot.setControlState("sneak", false);
        break;
      }
      bot.setQuickBarSlot(blockId);
      try {
        await bot.placeBlock(pos, new Vec3(0, 1, 0));
        placed++;
        await new Promise((r) => setTimeout(r, 200));
      } catch {}
    }
    bot.setControlState("sneak", false);
    return { ok: true, message: `Placed ${placed}/${length} bridge blocks` };
  }

  private async executePillarCommand(height: number): Promise<{ ok: boolean; message: string }> {
    const bot = this.primaryBot();
    if (!bot) return { ok: false, message: "No bot" };
    const blockId = this.getBestBlockInHotbar(bot, ["cobblestone", "stone", "dirt", "oak_planks", "spruce_planks"]);
    if (!blockId) return { ok: false, message: "No building blocks in hotbar" };
    let placed = 0;
    for (let i = 0; i < height; i++) {
      bot.look(0, -Math.PI / 2 + 0.1, true);
      bot.setQuickBarSlot(blockId);
      await new Promise<void>((r) => {
        bot.once("physicTick", () => r());
      });
      const below = bot.blockAt(bot.entity.position.offset(0, -1, 0));
      if (!below || below.name === "air") break;
      try {
        await bot.placeBlock(below, new Vec3(0, 1, 0));
        placed++;
        bot.setControlState("jump", true);
        await new Promise((r) => setTimeout(r, 200));
        bot.setControlState("jump", false);
        await new Promise((r) => setTimeout(r, 300));
      } catch {
        break;
      }
    }
    return { ok: true, message: `Built pillar ${placed}/${height} blocks high` };
  }

  private getBestBlockInHotbar(bot: mineflayer.Bot, names: string[]): number | null {
    for (const name of names) {
      const items = bot.inventory.slots.slice(36, 45);
      const item = items.find((i) => i && i.name === name);
      if (item) return item.slot - 36;
    }
    return null;
  }

  private async executeWallCommand(args: string[]): Promise<{ ok: boolean; message: string }> {
    const direction = args[0]?.toLowerCase() ?? "front";
    const heightArg = Number(args[1] ?? "3");
    const width = Number(args[2] ?? "3");
    if (!["front", "left", "right"].includes(direction)) return { ok: false, message: "Usage: wall front|left|right [height 1..5] [width 1..5]" };
    const height = Math.min(5, Math.max(1, heightArg));
    const w = Math.min(5, Math.max(1, width));
    const bot = this.primaryBot();
    if (!bot || !bot.entity) return { ok: false, message: "No bot" };
    const blockId = this.getBestBlockInHotbar(bot, ["cobblestone", "stone", "dirt", "oak_planks"]);
    if (!blockId) return { ok: false, message: "No blocks in hotbar" };
    const offsetsMap: Record<string, Array<[number, number]>> = { front: [[0, 1]], left: [[1, 0]], right: [[-1, 0]] };
    const offsets = offsetsMap[direction] ?? [[0, 1]];
    const yaw = bot.entity.yaw;
    let placed = 0;
    bot.setControlState("sneak", true);
    for (let h = 0; h < height; h++) {
      for (let sw = 0; sw < w; sw++) {
        const [ox, oz] = offsets[0];
        // Simplified placement - place blocks relative to bot facing direction
        const sideX = Math.round(-Math.sin(yaw)) * ox + Math.round(Math.cos(yaw)) * (-oz);
        const sideZ = Math.round(Math.cos(yaw)) * ox + Math.round(Math.sin(yaw)) * oz;

        const ref = bot.blockAt(bot.entity.position.offset(sideX * (sw + 1), h, sideZ * (sw + 1)))
          ?? bot.blockAt(bot.entity.position.offset(0, -1, 0));
        if (!ref || ref.name === "air") continue;
        bot.setQuickBarSlot(blockId);
        try {
          await bot.placeBlock(ref, new Vec3(0, 1, 0));
          placed++;
          await new Promise((r) => setTimeout(r, 120));
        } catch {}
      }
    }
    bot.setControlState("sneak", false);
    return { ok: true, message: `Built ${w}x${height} wall (${placed} blocks)` };
  }

  private async executeFillCommand(args: string[]): Promise<{ ok: boolean; message: string }> {
    const radius = Number(args[0] ?? "3");
    const depth = Number(args[1] ?? "1");
    if (!Number.isInteger(radius) || radius < 1 || radius > 5) return { ok: false, message: "Usage: fill <radius 1..5> [depth 1..3]" };
    if (!Number.isInteger(depth) || depth < 1 || depth > 3) return { ok: false, message: "Depth must be 1..3" };
    const bot = this.primaryBot();
    if (!bot || !bot.entity) return { ok: false, message: "No bot" };
    const blockId = this.getBestBlockInHotbar(bot, ["cobblestone", "stone", "dirt"]);
    if (!blockId) return { ok: false, message: "No blocks in hotbar" };
    let placed = 0;
    const origin = bot.entity.position.floored();
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        for (let d = 0; d < depth; d++) {
          const block = bot.blockAt(origin.offset(x, -1 - d, z));
          if (!block || block.name !== "air") continue;
          bot.setQuickBarSlot(blockId);
          try {
            await bot.placeBlock(block, new Vec3(0, 1, 0));
            placed++;
          } catch {}
        }
      }
    }
    return { ok: true, message: `Filled ${radius} radius area (${placed} blocks)` };
  }

  private async executeTowerCommand(args: string[]): Promise<{ ok: boolean; message: string }> {
    const height = Number(args[0] ?? "10");
    if (!Number.isInteger(height) || height < 1 || height > 30) return { ok: false, message: "Usage: tower <height 1..30>" };
    const bot = this.primaryBot();
    if (!bot || !bot.entity) return { ok: false, message: "No bot" };
    const blockId = this.getBestBlockInHotbar(bot, ["cobblestone", "stone", "dirt"]);
    if (!blockId) return { ok: false, message: "No blocks in hotbar" };
    let built = 0;
    bot.setControlState("sneak", true);
    for (let i = 0; i < height; i++) {
      bot.setQuickBarSlot(blockId);
      bot.look(0, -Math.PI / 2 + 0.2, true);
      const below = bot.blockAt(bot.entity.position.offset(0, -1, 0));
      if (!below || below.name === "air") break;
      try {
        await bot.placeBlock(below, new Vec3(0, 1, 0));
        built++;
        bot.setControlState("jump", true);
        await new Promise((r) => setTimeout(r, 250));
        bot.setControlState("jump", false);
        await new Promise((r) => setTimeout(r, 400));
      } catch {
        break;
      }
    }
    bot.setControlState("sneak", false);
    return { ok: true, message: `Built tower ${built}/${height} blocks tall` };
  }

  private async executeMineCommand(args: string[]): Promise<{ ok: boolean; message: string }> {
    const bot = this.primaryBot();
    if (!bot) return { ok: false, message: "No bot" };
    const mode = (args[0] ?? "block").toLowerCase();

    if (mode === "block" || mode === "look") {
      const block = (bot as any).blockAtCursor?.(5);
      if (!block || block.name === "air") return { ok: false, message: "No block in reach" };
      await this.digBlocks(bot, [block], 1);
      return { ok: true, message: `Mined ${block.name}` };
    }

    if (mode === "nearby") {
      const blockName = args[1];
      const count = Math.min(10, Math.max(1, Number(args[2] ?? "5") || 5));
      if (!blockName) return { ok: false, message: "Usage: bot mine nearby <block_name> [1..10]" };
      const blockId = (bot.registry as any)?.blocksByName?.[blockName]?.id;
      if (typeof blockId !== "number") return { ok: false, message: `Unknown block: ${blockName}` };
      const positions = (bot as any).findBlocks?.({ matching: blockId, maxDistance: 5, count }) ?? [];
      const blocks = positions.map((pos: any) => bot.blockAt(pos)).filter(Boolean);
      const mined = await this.digBlocks(bot, blocks, count);
      return { ok: true, message: `Mined ${mined}/${count} nearby ${blockName}` };
    }

    return { ok: false, message: "Usage: bot mine block | bot mine nearby <block_name> [1..10]" };
  }

  private async executePlaceCommand(args: string[]): Promise<{ ok: boolean; message: string }> {
    const bot = this.primaryBot();
    if (!bot) return { ok: false, message: "No bot" };
    const slot = Number(args[0]);
    if (!Number.isInteger(slot) || slot < 0 || slot > 8) return { ok: false, message: "Usage: bot place <0..8>" };
    const reference = (bot as any).blockAtCursor?.(5) ?? bot.blockAt(bot.entity.position.offset(0, -1, 0));
    if (!reference || reference.name === "air") return { ok: false, message: "No placement reference block in reach" };
    bot.setQuickBarSlot(slot);
    try {
      await bot.placeBlock(reference, new Vec3(0, 1, 0));
      return { ok: true, message: `Placed item from hotbar slot ${slot}` };
    } catch (err) {
      return { ok: false, message: `Could not place block: ${this.errorMessage(err)}` };
    }
  }

  private async executeClearCommand(args: string[]): Promise<{ ok: boolean; message: string }> {
    const bot = this.primaryBot();
    if (!bot) return { ok: false, message: "No bot" };
    const mode = (args[0] ?? "soft").toLowerCase();
    if (mode !== "soft") return { ok: false, message: "Usage: bot clear soft [radius 1..2]" };
    const radius = Math.min(2, Math.max(1, Number(args[1] ?? "1") || 1));
    const origin = bot.entity.position.floored();
    const blocks: any[] = [];
    const softBlocks = new Set([
      "grass",
      "short_grass",
      "tall_grass",
      "fern",
      "large_fern",
      "dead_bush",
      "snow",
      "vine",
      "seagrass",
      "tall_seagrass",
      "dirt",
      "coarse_dirt",
      "sand",
      "gravel"
    ]);

    for (let x = -radius; x <= radius; x++) {
      for (let y = -1; y <= 2; y++) {
        for (let z = -radius; z <= radius; z++) {
          const block = bot.blockAt(origin.offset(x, y, z));
          if (block && softBlocks.has(block.name)) blocks.push(block);
        }
      }
    }

    const cleared = await this.digBlocks(bot, blocks, 25);
    return { ok: true, message: `Cleared ${cleared} soft block(s) within radius ${radius}` };
  }

  private async digBlocks(bot: mineflayer.Bot, blocks: any[], limit: number): Promise<number> {
    let mined = 0;
    for (const block of blocks.slice(0, limit)) {
      if (!block || block.name === "air") continue;
      try {
        const canDig = typeof (bot as any).canDigBlock === "function" ? (bot as any).canDigBlock(block) : true;
        if (!canDig) continue;
        await bot.dig(block);
        mined += 1;
        await new Promise((resolve) => setTimeout(resolve, 120));
      } catch {}
    }
    return mined;
  }

  private errorMessage(err: unknown): string {
    if (err && typeof err === "object" && "message" in err && typeof (err as any).message === "string") {
      return (err as any).message;
    }
    return String(err);
  }

  private driveToward(runtime: BotRuntime, targetPos: { x: number; y: number; z: number }, sprintDist = 4): number {
    const bot = runtime.bot;
    const here = bot.entity.position;
    const dx = targetPos.x - here.x;
    const dz = targetPos.z - here.z;
    const horizDist = Math.sqrt(dx * dx + dz * dz);
    const baseYaw = Math.atan2(-dx, -dz);
    const inRecover = Date.now() < runtime.recoverUntil;
    const yaw = baseYaw + (inRecover ? runtime.recoverYawOffset : 0);
    bot.look(yaw, bot.entity.pitch, true);

    const isInWater = Boolean((bot.entity as any).isInWater || (bot.entity as any).isInLava);
    const wantsSprint = horizDist > sprintDist && !isInWater;
    bot.setControlState("sprint", wantsSprint);
    bot.setControlState("forward", horizDist > 1.4);

    const heightDelta = targetPos.y - here.y;
    const aheadFeet = bot.blockAt(here.offset(-Math.sin(yaw) * 1.1, 0, Math.cos(yaw) * 1.1));
    const aheadHead = bot.blockAt(here.offset(-Math.sin(yaw) * 1.1, 1, Math.cos(yaw) * 1.1));
    const blockedAhead = Boolean(aheadFeet && aheadFeet.boundingBox === "block" && aheadHead && aheadHead.boundingBox === "block");

    const shouldJump = isInWater || blockedAhead || heightDelta > 0.6;
    bot.setControlState("jump", shouldJump);

    const pos = { x: here.x, y: here.y, z: here.z };
    if (!runtime.lastPos) {
      runtime.lastPos = pos;
      runtime.lastMoveAt = Date.now();
    } else {
      const moved = Math.hypot(pos.x - runtime.lastPos.x, pos.y - runtime.lastPos.y, pos.z - runtime.lastPos.z);
      if (moved > 0.25) {
        runtime.lastPos = pos;
        runtime.lastMoveAt = Date.now();
        bot.setControlState("left", false);
        bot.setControlState("right", false);
      } else if (Date.now() - runtime.lastMoveAt > 1200) {
        runtime.recoverUntil = Date.now() + 1400;
        runtime.recoverYawOffset = runtime.strafeRight ? Math.PI / 2.8 : -Math.PI / 2.8;
        bot.setControlState("left", !runtime.strafeRight);
        bot.setControlState("right", runtime.strafeRight);
        runtime.strafeRight = !runtime.strafeRight;
        runtime.lastMoveAt = Date.now();
      }
    }

    return horizDist;
  }

  private startFollow(runtime: BotRuntime, targetName: string): void {
    this.clearBehavior(runtime);
    runtime.behaviorTimer = setInterval(() => {
      const target = this.findPlayerEntity(runtime.bot, targetName);
      if (!target || !runtime.bot.entity) return;
      runtime.bot.lookAt(target.position.offset(0, 1.6, 0), true);
      this.driveToward(runtime, target.position, 3.5);
    }, 120);
  }

  private startSpinAround(runtime: BotRuntime, targetName: string): void {
    this.clearBehavior(runtime);
    let angle = 0;
    runtime.behaviorTimer = setInterval(() => {
      const target = this.findPlayerEntity(runtime.bot, targetName);
      if (!target || !runtime.bot.entity) return;
      angle += 0.22;
      const radius = 2.7;
      const tx = target.position.x + Math.cos(angle) * radius;
      const tz = target.position.z + Math.sin(angle) * radius;
      const dest = target.position.offset(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      runtime.bot.lookAt(target.position.offset(0, 1.6, 0), true);
      this.driveToward(runtime, { x: tx, y: target.position.y, z: tz }, 4);
    }, 120);
  }

  private startAttack(runtime: BotRuntime, targetName: string | null): void {
    this.clearBehavior(runtime);
    runtime.behaviorTimer = setInterval(() => {
      const bot = runtime.bot;
      if (!bot.entity) return;

      const targetEntity = targetName
        ? this.findPlayerEntity(bot, targetName)
        : bot.nearestEntity((e) => e.type === "player" && e.username !== bot.username);
      if (!targetEntity) return;

      this.equipBestWeapon(bot);
      const dist = bot.entity.position.distanceTo(targetEntity.position);
      bot.lookAt(targetEntity.position.offset(0, 1.6, 0), true);

      if (dist > (this.config.reach ?? 3)) {
        this.driveToward(runtime, targetEntity.position, 4.5);
        return;
      }

      bot.setControlState("forward", false);
      bot.setControlState("sprint", false);

      if (this.config.critMode && bot.entity.onGround) {
        bot.setControlState("jump", true);
        setTimeout(() => bot.setControlState("jump", false), 120);
      }
      try {
        bot.attack(targetEntity);
      } catch {}
    }, 120);
  }

  private startGuard(runtime: BotRuntime, targetName: string): void {
    this.clearBehavior(runtime);
    runtime.behaviorTimer = setInterval(() => {
      const bot = runtime.bot;
      const target = this.findPlayerEntity(bot, targetName);
      if (!target || !bot.entity) return;

      const distToTarget = bot.entity.position.distanceTo(target.position);
      if (distToTarget > 3.5) {
        this.driveToward(runtime, target.position, 4);
        return;
      }

      bot.setControlState("forward", false);
      bot.setControlState("sprint", false);
      const nearest = bot.nearestEntity(
        (e) =>
          e.type === "player" &&
          e.username !== bot.username &&
          String((e as any).username ?? "").toLowerCase() !== targetName.toLowerCase() &&
          e.position.distanceTo(target.position) <= 4
      );
      if (nearest) void bot.lookAt(nearest.position.offset(0, 1.6, 0), true);
      else void bot.lookAt(target.position.offset(0, 1.6, 0), true);
    }, 160);
  }

  private equipBestWeapon(bot: mineflayer.Bot): void {
    const items = bot.inventory.items();
    if (items.length === 0) return;
    const priority = [
      "netherite_sword",
      "diamond_sword",
      "iron_sword",
      "stone_sword",
      "golden_sword",
      "wooden_sword",
      "netherite_axe",
      "diamond_axe",
      "iron_axe",
      "stone_axe",
      "golden_axe",
      "wooden_axe"
    ];
    let best = items.find((i) => i.name === priority[0]) ?? null;
    let bestIndex = best ? priority.indexOf(best.name) : Number.MAX_SAFE_INTEGER;
    for (const item of items) {
      const idx = priority.indexOf(item.name);
      if (idx !== -1 && idx < bestIndex) {
        best = item;
        bestIndex = idx;
      }
    }
    if (!best) return;
    void bot.equip(best, "hand").catch(() => {});
  }

  private appendLog(source: ChatLogEntry["source"], text: string, html?: string): void {
    this.chatLog.push({ at: new Date().toISOString(), source, text, html });
    if (this.chatLog.length > MAX_CHAT_LOG) this.chatLog = this.chatLog.slice(this.chatLog.length - MAX_CHAT_LOG);
  }

  private updateGuiSnapshot(bot: mineflayer.Bot): void {
    const window = bot.currentWindow;
    if (!window) {
      this.guiSnapshot = null;
      return;
    }
    const slots: GuiSlot[] = [];
    window.slots.forEach((item, index) => {
      if (!item) return;
      slots.push({ index, name: item.name, count: item.count, lore: (item as any).customLore ?? undefined });
    });
    this.guiSnapshot = {
      title: String(window.title ?? "Window"),
      type: String(window.type ?? "unknown"),
      slotCount: window.slots.length,
      slots
    };
  }

  private updateAggregateState(): void {
    const online = this.bots.filter((r) => r.hasSpawned).length;
    const total = this.bots.length;
    this.state = {
      ...this.state,
      running: total > 0,
      connected: online > 0,
      status: total === 0 ? "idle" : online > 0 ? "online" : "connecting",
      username: this.config.username,
      host: this.config.host,
      port: this.config.port,
      version: this.config.version,
      error: this.state.error
    };
    if (total > 1) this.state.status = `${this.state.status} (${online}/${total})`;
  }

  private bindBotEvents(runtime: BotRuntime): void {
    const bot = runtime.bot;

    bot.once("spawn", () => {
      runtime.hasSpawned = true;
      this.appendLog("system", `${bot.username} spawned`);
      runtime.lastPos = null;
      runtime.lastMoveAt = Date.now();
      this.updateAggregateState();
      if (this.config.autoArmor) this.tryEquipArmor(bot);
      if (this.config.autoTotem) this.tryEquipTotem(bot);
    });

    bot.on("chat", (username, message) => {
      this.appendLog("chat", `<${username}> ${message}`);
      const sender = this.extractSenderFromMessage(message) ?? username;
      this.tryRunChatCommand(sender, message, bot, true);
    });

    bot.on("message", (jsonMsg: any) => {
      const text = jsonMsg?.toString?.() ?? String(jsonMsg ?? "");
      const html = this.formatMcJsonToHtml(jsonMsg?.json ?? jsonMsg);
      this.appendLog("chat", text, html);
      const sender = this.extractSenderFromMessage(text);
      this.tryRunChatCommand(sender, text, bot, false);
    });

    bot.on("messagestr", (message) => {
      this.appendLog("chat", message);
      const sender = this.extractSenderFromMessage(message);
      this.tryRunChatCommand(sender, message, bot, false);
    });

    bot.on("health", () => {
      if (this.config.autoEat) this.tryAutoEat(bot);
      if (this.config.autoArmor) this.tryEquipArmor(bot);
      if (this.config.autoTotem) this.tryEquipTotem(bot);
    });

    bot.on("death", () => {
      const pos = bot.entity?.position;
      if (pos) {
        this.deathPositions.set(bot.username, {
          x: Number(pos.x.toFixed(1)),
          y: Number(pos.y.toFixed(1)),
          z: Number(pos.z.toFixed(1))
        });
      }
      this.appendLog("system", `${bot.username} died`);
      if (this.config.autoRespawn) {
        setTimeout(() => bot.chat("/spawn"), 500);
      }
    });

    bot.on("windowOpen", () => {
      if (this.bots[0]?.bot === bot) this.updateGuiSnapshot(bot);
      this.appendLog("system", `${bot.username} GUI opened`);
    });

    bot.on("windowClose", () => {
      if (this.bots[0]?.bot === bot) this.guiSnapshot = null;
      this.appendLog("system", `${bot.username} GUI closed`);
    });

    bot.on("end", (reason) => {
      this.clearBehavior(runtime);
      this.bots = this.bots.filter((r) => r !== runtime);
      const reasonText = typeof reason === "string" ? reason : "unknown";
      const normalizedError =
        reasonText === "socketClosed" && !runtime.hasSpawned
          ? "Connection closed before login. Check host/port, auth mode, and Minecraft version."
          : reasonText;
      this.state = { ...this.state, error: normalizedError };
      if (this.bots.length === 0) this.guiSnapshot = null;
      this.appendLog("system", `${bot.username} disconnected: ${normalizedError}`);
      this.updateAggregateState();
    });

    bot.on("error", (err) => {
      const message =
        typeof err === "string"
          ? err
          : typeof (err as any)?.message === "string"
            ? (err as any).message
            : JSON.stringify(err);
      this.state = { ...this.state, status: "error", error: message };
      this.appendLog("error", `${bot.username}: ${message}`);
    });

    bot.on("kicked", (reason, loggedIn) => {
      const reasonText = typeof reason === "string" ? reason : JSON.stringify(reason);
      this.state = {
        ...this.state,
        status: "kicked",
        kickedReason: reasonText,
        kickedLoggedIn: Boolean(loggedIn),
        error: reasonText
      };
      this.appendLog("error", `${bot.username} kicked: ${reasonText}`);
    });

    if (this.config.parkour) this.startParkourLoop(runtime);
  }

  private tryAutoEat(bot: mineflayer.Bot): void {
    if (bot.food >= 18) return;
    const foods = [
      "enchanted_golden_apple",
      "golden_apple",
      "cooked_beef",
      "cooked_porkchop",
      "cooked_chicken",
      "cooked_salmon",
      "bread",
      "apple",
      "carrot",
      "potato"
    ];
    const items = bot.inventory.items();
    for (const foodName of foods) {
      const item = items.find((i) => i.name === foodName);
      if (item) {
        void bot.consume().catch(() => {});
        return;
      }
    }
  }

  private tryEquipArmor(bot: mineflayer.Bot): void {
    const slots = [
      { slot: "feet", priority: ["netherite_boots", "diamond_boots", "iron_boots", "golden_boots", "leather_boots"] },
      { slot: "legs", priority: ["netherite_leggings", "diamond_leggings", "iron_leggings", "golden_leggings", "leather_leggings"] },
      { slot: "torso", priority: ["netherite_chestplate", "diamond_chestplate", "iron_chestplate", "golden_chestplate", "leather_chestplate"] },
      { slot: "head", priority: ["netherite_helmet", "diamond_helmet", "iron_helmet", "golden_helmet", "leather_helmet"] }
    ];
    const items = bot.inventory.items();
    for (const { slot, priority } of slots) {
      const equipped = bot.inventory.slots[(bot as any).inventorySlots[slot]];
      let equippedIdx = -1;
      if (equipped) equippedIdx = priority.indexOf(equipped.name);
      for (const armorName of priority) {
        const item = items.find((i) => i.name === armorName);
        if (item) {
          const itemPriorityIdx = priority.indexOf(armorName);
          if (equippedIdx === -1 || itemPriorityIdx < equippedIdx) {
            void bot.equip(item, slot as any).catch(() => {});
          }
          break;
        }
      }
    }
  }

  private tryEquipTotem(bot: mineflayer.Bot): void {
    const offhand = bot.inventory.slots[45];
    if (offhand && offhand.name === "totem_of_undying") return;
    const items = bot.inventory.items();
    const totem = items.find((i) => i.name === "totem_of_undying");
    if (totem) {
      void bot.equip(totem, "off-hand").catch(() => {});
    }
  }

  private startParkourLoop(runtime: BotRuntime): void {
    if (!this.config.parkour) return;
    this.clearBehavior(runtime);
    runtime.behaviorTimer = setInterval(() => {
      const bot = runtime.bot;
      if (!bot.entity) return;

      const jumpCooldown = 600;
      const now = Date.now();
      const canJump = !bot.controlState.jump;

      const forward = bot.blockAt(bot.entity.position.offset(-Math.sin(bot.entity.yaw) * 1.2, 0, Math.cos(bot.entity.yaw) * 1.2));
      const forwardHead = bot.blockAt(bot.entity.position.offset(-Math.sin(bot.entity.yaw) * 1.2, 1, Math.cos(bot.entity.yaw) * 1.2));

      if ((forward && forward.boundingBox === "block") && (!forwardHead || forwardHead.boundingBox !== "block")) {
        if (canJump || now - runtime.lastMoveAt > jumpCooldown) {
          bot.setControlState("forward", true);
          bot.setControlState("jump", true);
          runtime.lastMoveAt = now;
        }
      } else {
        bot.setControlState("jump", false);
        bot.setControlState("forward", true);

        if (runtime.lastMoveAt && runtime.lastPos) {
          const moved = Math.hypot(
            bot.entity.position.x - runtime.lastPos.x,
            bot.entity.position.z - runtime.lastPos.z
          );
          if (moved < 0.3) {
            bot.look(bot.entity.yaw + Math.PI / 2, bot.entity.pitch, true);
            runtime.lastMoveAt = now;
            runtime.lastPos = {
              x: bot.entity.position.x,
              y: bot.entity.position.y,
              z: bot.entity.position.z
            };
          }
        }
      }
    }, 80);
  }

  private formatMcJsonToHtml(node: any): string {
    if (typeof node === "string") return esc(node);
    if (Array.isArray(node)) return node.map((part) => this.formatMcJsonToHtml(part)).join("");
    if (!node || typeof node !== "object") return esc(String(node ?? ""));

    const text = typeof node.text === "string" ? node.text : "";
    const children = Array.isArray(node.extra) ? node.extra.map((part: any) => this.formatMcJsonToHtml(part)).join("") : "";
    const content = esc(text) + children;

    const styles: string[] = [];
    if (node.color && MC_COLORS[node.color]) styles.push(`color:${MC_COLORS[node.color]}`);
    if (node.bold) styles.push("font-weight:700");
    if (node.italic) styles.push("font-style:italic");
    if (node.underlined) styles.push("text-decoration:underline");
    if (node.strikethrough) styles.push("text-decoration:line-through");

    return styles.length ? `<span style="${styles.join(";")}">${content}</span>` : content;
  }

  private normalizeCommand(raw: string): string {
    const text = raw.trim().replace(/\s+/g, " ");
    const withoutAddress = text.replace(/^(?:@?minebot|@?bot)\s*[:,]?\s+/i, "");
    const [verbRaw = "", ...args] = withoutAddress.split(" ");
    const verb = verbRaw.toLowerCase();
    const rest = args.join(" ");

    if (verb === "add" || verb === "spawn") return `summon ${args[0] ?? "1"}`;
    if (verb === "remove" || (verb === "clear" && ["", "all", "bots"].includes((args[0] ?? "").toLowerCase()))) {
      return "despawn";
    }
    if (verb === "chat") return `say ${rest}`;
    if (verb === "dm" || verb === "pm" || verb === "whisper") return `msg ${rest}`;
    if (verb === "move" || verb === "walk") {
      const [direction = "", distance = "1"] = args;
      return `${direction.toLowerCase()} ${distance}`;
    }
    if (verb === "use" || verb === "hotbar") return `click.item.slot.${args[0] ?? "0"}`;
    if (verb === "click" && args[0]?.toLowerCase() === "slot") return `slot ${args[1] ?? ""}`.trim();
    if (verb === "wait" || verb === "halt") return "stop";
    if (verb === "circle") return `spin ${rest}`;
    if (verb === "list" && args[0]?.toLowerCase() === "players") return "players";
    if (verb === "stop" && args[0]?.toLowerCase() === "all") return "stop";

    return withoutAddress;
  }

  private extractChatCommandFastMC(message: string): string | null {
    const trimmed = message.trim();
    const direct = trimmed.match(/^(?:@?minebot|@?bot)\s*[:,]?\s+(.+)$/i);
    if (direct) return direct[1].trim() || null;

    const publicCommand = trimmed.match(/(?:»|->|:)\s*(?:Я\s*)?(?:@?minebot|@?bot)\s*[:,]?\s+(.+)$/i);
    if (publicCommand) return publicCommand[1].trim() || null;

    const mentionCommand = trimmed.match(/\s@bot\s+(.+)$/i);
    if (mentionCommand) return mentionCommand[1].trim() || null;

    const legacyPublic = trimmed.match(/(?:»|->|:)\s*(?:Я\s*)?[#*](.+)$/);
    if (legacyPublic) {
      const cmd = legacyPublic[1].trim();
      return cmd || null;
    }

    if (trimmed.startsWith("#")) return trimmed.slice(1).trim() || null;
    if (trimmed.startsWith("*")) return trimmed.slice(1).trim() || null;
    return null;
  }

  private extractChatCommandVanilla(message: string): string | null {
    const trimmed = message.trim();
    const standard = trimmed.match(/^<[^>]+>\s*@bot\s+(.+)$/);
    if (standard) return standard[1].trim() || null;

    const commandPrefix = trimmed.match(/^\[Bot\]\s*(.+)$/i);
    if (commandPrefix) return commandPrefix[1].trim() || null;

    const rawCommand = trimmed.match(/^!bot\s+(.+)$/i);
    if (rawCommand) return rawCommand[1].trim() || null;

    if (trimmed.startsWith("!")) return trimmed.slice(1).trim() || null;
    if (trimmed.startsWith("/!")) return trimmed.slice(2).trim() || null;

    return null;
  }

  private extractChatCommand(message: string): string | null {
    const profile = this.config.chatProfile ?? "fastmc";
    if (profile === "vanilla") {
      return this.extractChatCommandVanilla(message);
    }
    return this.extractChatCommandFastMC(message);
  }

  private extractSenderFromMessageWithVanilla(message: string): string | null {
    const vanillaMatch = message.match(/^<([A-Za-z0-9_]{3,16})>/);
    if (vanillaMatch) return vanillaMatch[1].trim();

    return this.extractSenderFromMessage(message);
  }

  private extractSenderFromMessage(message: string): string | null {
    const raw = message.trim();
    const beforePublicCommand = raw.match(/^(.*?)(?:»|->|:)\s*(?:Я\s*)?(?:@?bot|@?minebot|[#*])\b/i);
    if (beforePublicCommand) {
      const sender = this.extractLastUsername(beforePublicCommand[1]);
      if (sender) return sender;
    }
    const nickBeforeArrow = raw.match(/([A-Za-z0-9_]{3,16})\s*->/);
    if (nickBeforeArrow) return nickBeforeArrow[1].trim();
    const m1 = raw.match(/^<([^>]+)>/);
    if (m1) return m1[1].trim();
    const m2 = raw.match(/^\S+\s*\[([^\]]+)\]/);
    if (m2) return m2[1].trim();
    const m2b = raw.match(/»\s*([A-Za-z0-9_]{3,16})\s*»/);
    if (m2b) return m2b[1].trim();
    const m3 = raw.match(/^\S*\s*([A-Za-z0-9_]{3,16})\s*[»>:]/);
    if (m3) return m3[1].trim();
    const m4 = raw.match(/([A-Za-z0-9_]{3,16})\s*->/);
    if (m4) return m4[1].trim();
    return null;
  }

  private extractLastUsername(text: string): string | null {
    const matches = text.match(/[A-Za-z0-9_]{3,16}/g);
    if (!matches || matches.length === 0) return null;
    return matches[matches.length - 1];
  }

  private isAdmin(username: string | null): boolean {
    if (!username) return false;
    const admins = this.config.admins ?? [];
    if (admins.length === 0) return false;
    const lower = username.toLowerCase();
    return admins.some((a) => a.toLowerCase() === lower);
  }

  private tryRunChatCommand(sender: string | null, message: string, bot: mineflayer.Bot, reply: boolean): void {
    const effectiveSender = this.extractSenderFromMessageWithVanilla(message) ?? sender;
    const command = this.withCommandContext(this.extractChatCommand(message), effectiveSender);
    if (!command) return;
    if (!this.isAdmin(effectiveSender)) {
      this.appendLog("system", `Команда отклонена (не админ): ${effectiveSender ?? "unknown"} -> ${command}`);
      if (reply && effectiveSender) bot.chat(`[err] ${effectiveSender} is not admin`);
      return;
    }
    const key = `${effectiveSender}|${command}`;
    const now = Date.now();
    if (key === this.lastChatCommandKey && now - this.lastChatCommandAt < 700) return;
    this.lastChatCommandKey = key;
    this.lastChatCommandAt = now;
    void this.executeCommand(command).then((result) => {
      this.appendLog("system", `Чат-команда: ${effectiveSender ?? "unknown"} -> ${command} (${result.ok ? "ok" : "err"})`);
      if (reply) bot.chat(result.ok ? `[ok] ${result.message}` : `[err] ${result.message}`);
    });
  }

  private withCommandContext(command: string | null, sender: string | null): string | null {
    if (!command) return null;
    const trimmed = command.trim();
    if (!sender) return trimmed;
    if (/^(?:@?bot\s+|@?minebot\s+)?(?:come|guard)\s*$/i.test(trimmed)) {
      return `${trimmed} ${sender}`;
    }
    return trimmed;
  }

  private findPlayerEntity(bot: mineflayer.Bot, targetName: string): any | null {
    const needle = targetName.trim().toLowerCase();
    if (!needle) return null;
    for (const key of Object.keys(bot.players)) {
      if (key.toLowerCase() === needle) {
        const ent = bot.players[key]?.entity;
        if (ent) return ent;
      }
    }
    const nearestNamed = bot.nearestEntity((e) => e.type === "player" && String((e as any).username ?? "").toLowerCase() === needle);
    if (nearestNamed) return nearestNamed;
    return null;
  }

  // Сборки (Presets) Management

  async savePreset(name: string): Promise<{ ok: boolean; message: string }> {
    const sanitized = name.replace(/[^a-zA-Z0-9_-]/g, "_");
    if (!sanitized) return { ok: false, message: "Invalid preset name" };
    try {
      await Bun.write(`${this.presetsDir}/${sanitized}.json`, JSON.stringify(this.config, null, 2));
      return { ok: true, message: `Preset '${sanitized}' saved` };
    } catch (err) {
      return { ok: false, message: `Failed to save preset: ${this.errorMessage(err)}` };
    }
  }

  async loadPreset(name: string): Promise<{ ok: boolean; message: string }> {
    const sanitized = name.replace(/[^a-zA-Z0-9_-]/g, "_");
    try {
      const file = await Bun.file(`${this.presetsDir}/${sanitized}.json`);
      if (!(file as any).exists()) return { ok: false, message: `Preset '${sanitized}' not found` };
      const preset = JSON.parse(await file.text()) as BotConfig;
      this.config = { ...DEFAULT_CONFIG, ...preset };
      return { ok: true, message: `Preset '${sanitized}' loaded` };
    } catch (err) {
      return { ok: false, message: `Failed to load preset: ${this.errorMessage(err)}` };
    }
  }

  async deletePreset(name: string): Promise<{ ok: boolean; message: string }> {
    const sanitized = name.replace(/[^a-zA-Z0-9_-]/g, "_");
    try {
      const file = await Bun.file(`${this.presetsDir}/${sanitized}.json`);
      if (!(file as any).exists()) return { ok: false, message: `Preset '${sanitized}' not found` };
      await Bun.write(`${this.presetsDir}/${sanitized}.json`, "");
      return { ok: true, message: `Preset '${sanitized}' deleted` };
    } catch (err) {
      return { ok: false, message: `Failed to delete preset: ${this.errorMessage(err)}` };
    }
  }

  async listPresets(): Promise<string[]> {
    try {
      await Bun.write(`${this.presetsDir}/.keep`, "");
      const entries: string[] = [];
      for await (const file of new Bun.Glob("*.json").scan(this.presetsDir)) {
        entries.push(file.slice(0, -5));
      }
      return entries;
    } catch {
      return [];
    }
  }

  async executePresetCommand(args: string[]): Promise<{ ok: boolean; message: string }> {
    const action = (args[0] ?? "list").toLowerCase();
    if (action === "save") {
      const name = args[1];
      if (!name) return { ok: false, message: "Usage: preset save <name>" };
      return this.savePreset(name);
    }
    if (action === "load") {
      const name = args[1];
      if (!name) return { ok: false, message: "Usage: preset load <name>" };
      return this.loadPreset(name);
    }
    if (action === "delete") {
      const name = args[1];
      if (!name) return { ok: false, message: "Usage: preset delete <name>" };
      return this.deletePreset(name);
    }
    const presets = await this.listPresets();
    if (presets.length === 0) return { ok: true, message: "No presets saved" };
    return { ok: true, message: `Presets: ${presets.join(", ")}` };
  }
}