#!/usr/bin/env python3
"""Merge gitignored key=value files into backend/.env without printing values."""
from pathlib import Path

root = Path(__file__).resolve().parents[2]
env_path = root / ".env"
extra_path = root / ".env.supabase.local"


def parse(text: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        out[key.strip()] = value
    return out


def main() -> None:
    if not extra_path.exists():
        raise SystemExit("missing .env.supabase.local")
    current = parse(env_path.read_text() if env_path.exists() else "")
    extra = parse(extra_path.read_text())
    blocked = {"MONGO_URI", "JWT_SECRET", "R2_SECRET_ACCESS_KEY", "R2_ACCESS_KEY_ID", "SMTP_PASS"}
    updated = []
    for key, value in extra.items():
        if key in blocked:
            continue
        current[key] = value
        updated.append(key)
    lines = env_path.read_text().splitlines() if env_path.exists() else []
    kept = []
    seen = set()
    for line in lines:
        if not line.strip() or line.strip().startswith("#") or "=" not in line:
            kept.append(line)
            continue
        key = line.split("=", 1)[0].strip()
        if key in extra:
            kept.append(f"{key}={extra[key]}")
            seen.add(key)
        else:
            kept.append(line)
            seen.add(key)
    for key, value in extra.items():
        if key not in seen and key not in blocked:
            kept.append(f"{key}={value}")
    env_path.write_text("\n".join(kept).rstrip() + "\n")
    extra_path.chmod(0o600)
    env_path.chmod(0o600)
    print("merged_keys", ",".join(sorted(updated)))


if __name__ == "__main__":
    main()
