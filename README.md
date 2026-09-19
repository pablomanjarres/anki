<p align="center">
  <a href="https://pablomanjarres.com/oss/anki"><img src=".github/banner.webp" alt="Anki" width="100%" /></a>
</p>

<h1 align="center">Anki</h1>

<p align="center"><em>A private study deck that knows which lecture and page you have reached.</em></p>

<p align="center">
  <img alt="React 19" src="https://img.shields.io/badge/React_19-20232A?style=flat&logo=react&logoColor=61DAFB" />
  <img alt="TypeScript 7" src="https://img.shields.io/badge/TypeScript_7-3178C6?style=flat&logo=typescript&logoColor=white" />
  <img alt="Vite 8" src="https://img.shields.io/badge/Vite_8-646CFF?style=flat&logo=vite&logoColor=white" />
  <img alt="MCP 14 tools" src="https://img.shields.io/badge/MCP-14_tools-c8542a?style=flat&logo=modelcontextprotocol&logoColor=white" />
  <img alt="License MIT" src="https://img.shields.io/badge/license-MIT-c8542a?style=flat" />
  <img alt="Status WIP" src="https://img.shields.io/badge/status-WIP-e0a642?style=flat" />
  <a href="https://pablomanjarres.com/portfolio/projects/anki"><img alt="Portfolio" src="https://img.shields.io/badge/portfolio-pablomanjarres.com-c8542a?style=flat" /></a>
  <a href="https://pablomanjarres.com/oss/anki"><img alt="Landing" src="https://img.shields.io/badge/landing-pablo--oss-c8542a?style=flat" /></a>
</p>

<p align="center"><img src="https://pablomanjarres.com/portfolio/previews/anki.png" alt="Anki preview" width="720" /></p>

Anki turns reached course material and book pages into cited study cards. It reads class dates and source passages from Cortex, and keeps book checkpoints and reviews in its own local database. The phone PWA runs on a Mac and opens through a private Tailscale address. ChatGPT can generate grounded cards through Anki's separate MCP connection.

## Highlights

- **Thirty distinct reviews per day.** `server/store/reviews.ts` puts due cards first, keeps overdue cards in a visible backlog, and allows same-day relearning after the cap.
- **Five ways to grade recall.** `server/store/reviews.ts` uses FSRS for Again, Hard, Mid, and Easy; EZ extends the Easy interval. The review screen adds swipe-up reveal, visible grade buttons, and undo.
- **Every generated card has evidence.** `server/cortex/index.ts` selects material reached by class date or book checkpoint. `server/generation/submit.ts` checks the source quote and answer before saving a card.
- **Fourteen focused MCP tools.** `server/mcp/` exposes seven reads and seven writes for generation context, cards, reading progress, grading, and run records.
- **A small morning batch.** The ChatGPT task targets five new cards. `server/store/cards.ts` records success, zero-card, and rejected results, while `server/monitor/check.ts` alerts after 8:00 a.m. Bogota if a run is missing or failed.

## How it works

```text
src/                 # Phone-first React PWA
server/http/         # App API and static assets
server/store/        # SQLite cards, reviews, reading, runs
server/cortex/       # Read-only dated course and book context
server/generation/   # Grounded card submission
server/mcp/          # ChatGPT tools
server/monitor/      # Missed-run alert
ops/                 # Login service and tunnel installers
```

The local server serves the PWA and stores study history in SQLite. Its Cortex reader uses taught dates from course schedules rather than file upload dates; book passages stop at the saved page or location. The MCP server lets ChatGPT read eligible context and submit cited cards through the same validation and daily limits.

## What's inside

| Path | What it is |
| --- | --- |
| `src/` | Home, decks, books, review, and statistics on phone and desktop. |
| `server/store/` | SQLite data and FSRS scheduling. |
| `server/cortex/` | Eligible course and book passages from Cortex. |
| `server/mcp/` | Fourteen narrow tools for ChatGPT. |
| `ops/` | macOS login service, private Tailscale port, and tunnel supervisor. |

## Tech stack

React 19 · TypeScript 7 · Vite 8 · Hono 4 · SQLite · ts-fsrs 5 · MCP SDK 1.30 · Tailscale · Node.js

## Getting started

```bash
npm install
npm run build
npm run test:server
python3 ops/install_local.py
```

The installer runs Anki at login, restarts it if it exits, and serves HTTPS on port 8444 to devices in the same tailnet. Study data stays in `~/Library/Application Support/Anki` across updates. Open `http://127.0.0.1:3464` on the Mac. Cortex is read locally and is required for course and book generation context.

### Wire up the MCP server

Run `npm run mcp` to start the stdio MCP server. To connect ChatGPT, create a private Secure MCP Tunnel for Anki and run `python3 ops/install_tunnel.py tunnel_<id>`. See [ChatGPT setup](docs/chatgpt.md) for the scheduled generation prompt. The tunnel uses the existing local Cortex tunnel runtime; it does not expose the study database on a public web endpoint.

## License

MIT.

---

<p align="center">
  <a href="https://pablomanjarres.com/oss/anki">Landing</a> ·
  <a href="https://pablomanjarres.com/portfolio/projects/anki">Portfolio write-up</a> ·
  Built by Pablo Manjarres
</p>
