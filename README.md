# Anki Cortex

A private, phone-first study app. It reviews course and book cards with five grades, saves reading progress, and reads dated course material from Cortex.

## Run locally

```sh
npm install
npm run build
python3 ops/install_local.py
```

Open `http://127.0.0.1:3464` on the Mac or `https://macmini.tail5b2d63.ts.net:8444` on the tailnet. The installer keeps study data in `~/Library/Application Support/Anki Cortex` across app updates. `npm run mcp` starts the separate stdio MCP server for the ChatGPT tunnel.

## Study limits

The queue allows 30 distinct cards per Bogota day, with due cards first. Daily generation targets five new cards and pauses at 30 unreviewed cards. Cards need a cited source; course passages need a taught date, and book passages must be within the saved checkpoint. EZ extends the FSRS Easy interval.

ChatGPT runs the daily generation task; the local monitor alerts after 8:00 a.m. if its run result is missing or failed. See [ChatGPT setup](docs/chatgpt.md).
