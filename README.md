# Minesigma BOT

Local Bun + Mineflayer bot harness with a browser UI for runtime config and bot lifecycle control.

## Setup

```bash
bun install
```

## Run Dev

```bash
bun run dev
```

Then open `http://localhost:3000`.

## GitHub Release Download Page

This repo includes a static Vercel-ready page in `web/index.html`.

Before deploying, edit these constants near the bottom of `web/index.html`:

```js
const GITHUB_OWNER = "YOUR_GITHUB_USERNAME";
const GITHUB_REPO = "minesigma-bot";
```

The page fetches `https://api.github.com/repos/<owner>/<repo>/releases/latest`,
shows the latest tag, and links to the first release asset. If no asset exists,
it falls back to the GitHub source archive.

## Deploy To Vercel

1. Push this project to GitHub.
2. Create a GitHub release with a `.zip`, `.tar.gz`, or `.tgz` asset.
3. Import the repo in Vercel.
4. Use the included `vercel.json`; the static output directory is `web`.

## What you can configure

- Server host/IP
- Server port
- Bot nickname/username
- Password (optional)
- Auth mode (`offline`, `microsoft`, `mojang`)
- Minecraft version override (optional)

## API Endpoints

- `GET /api/status` - current config + bot state
- `GET /api/bots` - per-bot health/hunger/position/inventory snapshot
- `GET /api/chat` - chat/system/error log entries
- `GET /api/gui` - active GUI snapshot
- `POST /api/config` - update config
- `POST /api/start` - start bot
- `POST /api/stop` - stop bot
- `POST /api/restart` - restart bot
- `POST /api/ping` - TCP ping configured host/port
- `POST /api/command` - run bot command from UI
- `POST /api/gui/click` - click GUI slot index

## Commands

Use the friendlier `bot ...` syntax in the web command box or Minecraft chat.
Only configured admins can run commands from Minecraft chat.

Examples:

- `bot chat hello`
- `bot add 3`
- `bot remove all`
- `bot move forward 2`
- `bot jump`
- `bot stop`
- `bot follow <player>`
- `bot come <player>` or just `bot come` from chat
- `bot look <player>`
- `bot guard <player>` or just `bot guard` from chat
- `bot circle <player>` is written as `bot spin <player>`
- `bot attack <player>` or `bot attack`
- `bot use 0` through `bot use 8`
- `bot hold 0` through `bot hold 8`
- `bot click slot 13`
- `bot sneak on` / `bot sneak off`
- `bot sprint on` / `bot sprint off`
- `bot status`
- `bot list players`
- `bot message <player> <text>`
- `bot logout`
- `bot reconnect`
- `bot spammer start 3s <message> --count 10`
- `bot spammer status`
- `bot spammer stop`

Bounded block commands for private/test worlds:

- `bot mine block` - mines the block the bot is looking at, within reach
- `bot mine nearby <block_name> [1..10]` - mines up to 10 nearby matching blocks
- `bot place <0..8>` - places from a hotbar slot against the block the bot is looking at
- `bot clear soft [1..2]` - clears nearby soft blocks only, capped to radius 2 and 25 blocks

The older short syntax still works for existing macros:

- `summon 3`
- `despawn`
- `forward 1`, `back 2`, `left 3`, `right 1`
- `follow <player>`
- `spin <player>`
- `attack <player>`
- `click.item.slot.0` through `click.item.slot.8`

Minecraft chat also still accepts the legacy `*<command>` prefix.

## Notes

- Web server port defaults to `3000`.
- Override with `WEB_PORT`, for example:
  - `WEB_PORT=8080 bun run dev`
