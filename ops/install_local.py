#!/usr/bin/env python3
"""Install Anki Cortex locally without moving or resetting the study database."""

from pathlib import Path
import os
import plistlib
import shutil
import subprocess

ROOT = Path(__file__).resolve().parent.parent
DATA = Path.home() / "Library/Application Support/Anki Cortex"
AGENTS = Path.home() / "Library/LaunchAgents"
NODE = shutil.which("node")
TAILSCALE = shutil.which("tailscale")


def install_agent(label: str, args: list[str], **schedule: object) -> None:
    definition = {
        "Label": label,
        "ProgramArguments": args,
        "WorkingDirectory": str(ROOT),
        "EnvironmentVariables": {"PATH": os.environ.get("PATH", "/opt/homebrew/bin:/usr/bin:/bin")},
        "RunAtLoad": True,
        "StandardOutPath": str(DATA / f"{label}.log"),
        "StandardErrorPath": str(DATA / f"{label}.error.log"),
        **schedule,
    }
    target = AGENTS / f"{label}.plist"
    target.write_bytes(plistlib.dumps(definition))
    domain = f"gui/{os.getuid()}"
    subprocess.run(["launchctl", "bootout", domain, str(target)], check=False, capture_output=True)
    subprocess.run(["launchctl", "bootstrap", domain, str(target)], check=True)


def main() -> None:
    if not NODE or not TAILSCALE:
        raise SystemExit("node and tailscale must be on PATH")
    if not (ROOT / "dist/index.html").exists():
        raise SystemExit("Run npm run build before installing")
    DATA.mkdir(parents=True, exist_ok=True, mode=0o700)
    AGENTS.mkdir(parents=True, exist_ok=True)
    install_agent("com.pablo.anki-cortex", [NODE, "--import", "tsx", "server/http/index.ts"], KeepAlive=True, ThrottleInterval=10)
    install_agent("com.pablo.anki-generation-monitor", [NODE, "--import", "tsx", "server/monitor/index.ts"], StartInterval=1800)
    subprocess.run([TAILSCALE, "serve", "--bg", "--https=8444", "--yes", "3464"], check=True)
    print("Anki Cortex installed; study data stays at", DATA)


if __name__ == "__main__":
    main()
