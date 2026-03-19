#!/usr/bin/env bash
# lock-model.sh — pin OpenClaw's main agent to a specific model
#
# Usage:
#   lock-model.sh status          → show current locked model
#   lock-model.sh apply           → re-apply the lock (reset if it drifted)
#   lock-model.sh set <model>     → change the lock to a new model, then apply
#
# Examples:
#   lock-model.sh set ollama/qwen2.5:7b    ← current laptop
#   lock-model.sh set ollama/qwen3:14b     ← better laptop someday
#   lock-model.sh set anthropic/claude-sonnet-4-5-20250929

CONFIG="$HOME/.openclaw/openclaw.json"

# ── helpers ───────────────────────────────────────────────────────────────────

get_locked() {
  python3 -c "
import json, pathlib
d = json.loads(pathlib.Path('$CONFIG').read_text())
agents = d.get('agents', {}).get('list', [])
main = next((a for a in agents if a.get('id') == 'main'), {})
print(main.get('model', '(not set)'))
"
}

apply_lock() {
  local model="$1"
  python3 -c "
import json, pathlib
p = pathlib.Path('$CONFIG')
d = json.loads(p.read_text())
# set in agents.list for main
agents = d.setdefault('agents', {}).setdefault('list', [])
main = next((a for a in agents if a.get('id') == 'main'), None)
if main is None:
    main = {'id': 'main'}
    agents.append(main)
main['model'] = '$model'
# also set as global default
d['agents'].setdefault('defaults', {}).setdefault('model', {})['primary'] = '$model'
d['agents']['defaults'].setdefault('models', {})
# keep only the locked model in defaults.models
d['agents']['defaults']['models'] = {'$model': {}}
p.write_text(json.dumps(d, indent=2))
print('Applied: $model')
"
}

# ── commands ──────────────────────────────────────────────────────────────────

CMD="${1:-status}"

case "$CMD" in
  status)
    echo "Locked model: $(get_locked)"
    ;;

  apply)
    CURRENT=$(get_locked)
    if [ "$CURRENT" = "(not set)" ]; then
      echo "No lock set. Use: lock-model.sh set <model>"
      exit 1
    fi
    apply_lock "$CURRENT"
    echo "Done. Restart the OpenClaw gateway to pick up the change:"
    echo "  openclaw gateway restart"
    ;;

  set)
    MODEL="$2"
    if [ -z "$MODEL" ]; then
      echo "Usage: lock-model.sh set <model>"
      echo "  e.g. lock-model.sh set ollama/qwen2.5:7b"
      exit 1
    fi
    apply_lock "$MODEL"
    echo "Done. Restart the OpenClaw gateway to pick up the change:"
    echo "  openclaw gateway restart"
    ;;

  *)
    echo "Usage: lock-model.sh [status|apply|set <model>]"
    exit 1
    ;;
esac
