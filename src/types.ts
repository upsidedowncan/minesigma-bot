export type ChatProfile = "fastmc" | "vanilla";

export type BotConfig = {
  host: string;
  port: number;
  username: string;
  password?: string;
  version?: string;
  auth: "offline" | "microsoft" | "mojang";
  viewDistance: "tiny" | "short" | "normal" | "far";
  admins?: string[];
  chatProfile?: ChatProfile;
  autoEat?: boolean;
  autoTotem?: boolean;
  autoArmor?: boolean;
  antiAfk?: boolean;
  autoRespawn?: boolean;
  critMode?: boolean;
  parkour?: boolean;
  reach?: number;
};

export type BotPreset = {
  name: string;
  config: BotConfig;
  createdAt: string;
};

export type HomePosition = {
  name: string;
  x: number;
  y: number;
  z: number;
  dimension?: string;
};

export type BotState = {
  running: boolean;
  connected: boolean;
  status: string;
  username?: string;
  host?: string;
  port?: number;
  version?: string;
  error?: string;
  startedAt?: string;
  connectedAt?: string;
  kickedReason?: string;
  kickedLoggedIn?: boolean;
};

export type ChatLogEntry = {
  at: string;
  source: "chat" | "system" | "error";
  text: string;
  html?: string;
};

export type GuiSlot = {
  index: number;
  name: string;
  count: number;
  lore?: string[];
};

export type GuiSnapshot = {
  title: string;
  type: string;
  slotCount: number;
  slots: GuiSlot[];
} | null;

export type BotSummary = {
  username: string;
  health: number;
  food: number;
  oxygenLevel?: number;
  position?: { x: number; y: number; z: number };
  inventory: GuiSlot[];
};
