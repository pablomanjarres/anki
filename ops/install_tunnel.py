#!/usr/bin/env python3
"""Keep the dedicated Anki MCP tunnel connected after login."""

from pathlib import Path
import json
import sys

from install_local import ROOT, install_agent

SUPPORT = Path.home() / "Library/Application Support"
CORTEX_TUNNEL = SUPPORT / "CortexChatGPTTunnel"
ANKI_TUNNEL = SUPPORT / "AnkiChatGPTTunnel"


def main() -> None:
    if len(sys.argv) != 2 or not sys.argv[1].startswith("tunnel_"):
        raise SystemExit("Usage: python3 ops/install_tunnel.py tunnel_...")
    supervisor = CORTEX_TUNNEL / "keep-connected.py"
    key = CORTEX_TUNNEL / "runtime.key"
    client = CORTEX_TUNNEL / "tunnel-client"
    if not all(item.exists() for item in (supervisor, key, client)):
        raise SystemExit("The existing Cortex tunnel client and runtime key are required")
    ANKI_TUNNEL.mkdir(parents=True, exist_ok=True, mode=0o700)
    command = f"{ROOT / 'node_modules/.bin/tsx'} {ROOT / 'server/mcp/index.ts'}"
    config = {
        "alias": "anki-chatgpt",
        "name": "Anki",
        "tunnel_id": sys.argv[1],
        "mcp_command": command,
        "recovery_hint": "Check Anki's local service and the Mac tunnel client.",
    }
    target = ANKI_TUNNEL / "connection.json"
    target.write_text(json.dumps(config))
    target.chmod(0o600)
    install_agent("com.pablo.anki-chatgpt-tunnel", [sys.executable, str(supervisor), str(ANKI_TUNNEL)], StartInterval=120)
    print("Anki's private tunnel supervisor installed")


if __name__ == "__main__":
    main()
