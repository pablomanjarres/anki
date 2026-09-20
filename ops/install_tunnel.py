#!/usr/bin/env python3
"""Keep the dedicated Anki MCP tunnel connected after login."""

from pathlib import Path
import json
import shlex
import sys

from install_local import ROOT, install_agent

SUPPORT = Path.home() / "Library/Application Support"
CORTEX_TUNNEL = SUPPORT / "CortexChatGPTTunnel"
ANKI_TUNNEL = SUPPORT / "AnkiChatGPTTunnel"


def tsx_binary() -> Path:
    for directory in (ROOT, *ROOT.parents):
        candidate = directory / "node_modules/.bin/tsx"
        if candidate.is_file():
            return candidate
    raise SystemExit("Install Anki dependencies before connecting the MCP tunnel")


def main() -> None:
    if len(sys.argv) != 2 or not sys.argv[1].startswith("tunnel_"):
        raise SystemExit("Usage: python3 ops/install_tunnel.py tunnel_...")
    supervisor = CORTEX_TUNNEL / "keep-connected.py"
    key = CORTEX_TUNNEL / "runtime.key"
    client = CORTEX_TUNNEL / "tunnel-client"
    if not all(item.exists() for item in (supervisor, key, client)):
        raise SystemExit("The existing Cortex tunnel client and runtime key are required")
    ANKI_TUNNEL.mkdir(parents=True, exist_ok=True, mode=0o700)
    command = shlex.join([str(tsx_binary()), str(ROOT / "server/mcp/index.ts")])
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
