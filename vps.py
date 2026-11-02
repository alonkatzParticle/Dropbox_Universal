"""
vps.py — Check on, or update, the copy of this app running on the Hostinger VPS.

What it does:
  python3 vps.py           → STATUS ONLY. Connects to the server, proves it is the
                             right machine, and lists what is running. Changes nothing.
  python3 vps.py deploy    → Pulls the latest code from GitHub on the server, rebuilds
                             the Docker container, and checks the app answers.

How it fits in: this replaces typing the SSH commands from DEPLOY.md by hand.
It uses your Mac's built-in `ssh` program, so SSH asks for the password itself
(once per run). The password is never stored in this file.

Depends on: the VPS_* settings in .env (see .env.example). No extra packages.
"""

import subprocess  # Runs the `ssh` program
import sys         # Reads the command-line word ("deploy") and exits with a code
from pathlib import Path  # Finds the .env file next to this script

ENV_FILE = Path(__file__).parent / ".env"  # The settings file in the project root
REQUIRED = ["VPS_HOST", "VPS_USER", "VPS_PROJECT_DIR", "VPS_APP_PORT"]


def load_settings():
    """
    Reads VPS_* settings from the .env file.
    Input: none. Returns: a dict like {"VPS_HOST": "76.13.2.74", ...}.
    Exits with a clear message if any setting is missing.
    """
    settings = {}
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            line = line.strip()
            if line.startswith("VPS_") and "=" in line:  # Only our settings
                key, value = line.split("=", 1)
                settings[key.strip()] = value.strip().strip('"').strip("'")
    missing = [k for k in REQUIRED if not settings.get(k)]
    if missing:
        print(f"✗ Missing in .env: {', '.join(missing)} (see .env.example)")
        sys.exit(1)
    return settings


def status_script(s):
    """
    Builds the read-only commands that prove we're on the right server.
    Input: settings dict. Returns: a bash script as text.
    """
    return f"""
echo "=== CONNECTED ==="
echo "Server name : $(hostname)"
echo "Server IPs  : $(hostname -I 2>/dev/null)"
echo "Logged in as: $(whoami)"
echo "Server time : $(date)"
echo
echo "=== PROJECTS IN /var/www ==="
ls /var/www
echo
echo "=== RUNNING CONTAINERS ==="
docker ps --format 'table {{{{.Names}}}}\\t{{{{.Status}}}}\\t{{{{.Ports}}}}'
echo
echo "=== WEB ADDRESSES (nginx) ==="
grep -H -E 'server_name|proxy_pass' /etc/nginx/sites-enabled/* 2>/dev/null
echo
echo "=== THIS APP ({s['VPS_PROJECT_DIR']}) ==="
if [ -d "{s['VPS_PROJECT_DIR']}" ]; then
  cd "{s['VPS_PROJECT_DIR']}"
  echo "Code version: $(git log --oneline -1 2>/dev/null)"
  echo -n "App answer  : "
  curl -s -m 5 http://localhost:{s['VPS_APP_PORT']}/api/auto || echo "no answer on port {s['VPS_APP_PORT']}"
  echo
else
  echo "Folder not found — the app has not been set up on this server yet."
fi
"""


def deploy_script(s):
    """
    Builds the commands that update the app on the server.
    Keeps the live logs.json safe (git would otherwise refuse to pull,
    because the running app edits that file).
    Input: settings dict. Returns: a bash script as text.
    """
    d = s["VPS_PROJECT_DIR"]
    return f"""
set -e  # Stop at the first failed step
cd "{d}"
git config --global --add safe.directory "{d}"
echo "=== BEFORE: $(git log --oneline -1) ==="
cp logs.json /tmp/dropbox-logs-backup.json 2>/dev/null || true  # Save live logs
git checkout -- logs.json 2>/dev/null || true                   # Let git pull cleanly
git pull origin main
cp /tmp/dropbox-logs-backup.json logs.json 2>/dev/null || true  # Put live logs back
echo "=== AFTER:  $(git log --oneline -1) ==="
docker compose up -d --build
sleep 8  # Give the app a moment to start
echo -n "App answer: "
curl -s -m 10 http://localhost:{s['VPS_APP_PORT']}/api/auto || echo "NO ANSWER — check: docker compose logs app"
echo
docker ps --format 'table {{{{.Names}}}}\\t{{{{.Status}}}}'
"""


def run_on_server(s, script):
    """
    Opens ONE ssh connection and runs the script there.
    SSH will ask for the password in the terminal if no key is set up.
    Input: settings dict, bash script text. Returns: ssh's exit code (0 = success).
    """
    target = f"{s['VPS_USER']}@{s['VPS_HOST']}"
    print(f"Connecting to {target} …")
    try:
        result = subprocess.run(
            ["ssh", "-o", "ConnectTimeout=15", "-o", "StrictHostKeyChecking=accept-new",
             target, "bash -s"],  # "bash -s" = run the script we send in
            input=script, text=True,
        )
        return result.returncode
    except FileNotFoundError:
        print("✗ The `ssh` program was not found on this computer.")
        return 1


def main():
    """Entry point: picks status (default) or deploy, runs it, reports the result."""
    settings = load_settings()
    mode = sys.argv[1] if len(sys.argv) > 1 else "status"
    if mode not in ("status", "deploy"):
        print("Usage: python3 vps.py [status|deploy]")
        sys.exit(1)
    script = deploy_script(settings) if mode == "deploy" else status_script(settings)
    code = run_on_server(settings, script)
    print("\n✓ Done." if code == 0 else f"\n✗ Something failed (exit code {code}). Read the lines above.")
    sys.exit(code)


if __name__ == "__main__":
    main()
