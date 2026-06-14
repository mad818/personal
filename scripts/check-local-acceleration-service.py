#!/usr/bin/env python3
"""Deterministic dependency-free checks for the local acceleration bridge."""

from __future__ import annotations

import math
import os
import runpy
import shutil
import socket
import threading
import time
import json
import asyncio
from pathlib import Path
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
STATE_DIR = ROOT / "tmp-codex-runtime" / "local-acceleration-service-check"
shutil.rmtree(STATE_DIR, ignore_errors=True)
os.environ["NEXUS_LOCAL_ACCELERATION_STATE_DIR"] = str(STATE_DIR)
os.environ["NEXUS_LOCAL_ACCELERATION_EMBED_MODE"] = "hash"
os.environ["NEXUS_LOCAL_ACCELERATION_HASH_DIMENSION"] = "128"
os.environ["NEXUS_LOCAL_ACCELERATION_VECTOR_BACKEND"] = "local"
os.environ["NEXUS_LOCAL_ACCELERATION_ALLOW_EXEC"] = "false"
TURBOQUANT_FIXTURE = STATE_DIR / "turboquant"
TURBOQUANT_FIXTURE.mkdir(parents=True, exist_ok=True)
(TURBOQUANT_FIXTURE / "proof.py").write_text("print('proof')\n", encoding="utf-8")
(TURBOQUANT_FIXTURE / "benchmark.py").write_text("print('benchmark')\n", encoding="utf-8")
os.environ["NEXUS_TURBOQUANT_ROOT"] = str(TURBOQUANT_FIXTURE)

service = runpy.run_path(str(ROOT / "scripts" / "local-acceleration-service.py"))

def post_json(url: str, payload: dict[str, object]) -> dict[str, object]:
    request = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(request, timeout=3) as response:
        return json.loads(response.read())


assert service["HTTP_BACKEND"] in {"fastapi", "stdlib"}
first = service["_hash_embed"]("alpha local semantic retrieval")
second = service["_hash_embed"]("alpha local semantic retrieval")
different = service["_hash_embed"]("beta unrelated storage")
assert first == second
assert first != different
assert len(first) == 128
assert abs(math.sqrt(sum(value * value for value in first)) - 1.0) < 1e-6
assert service["_embed"](["alpha", "beta"]) == [
    service["_hash_embed"]("alpha"),
    service["_hash_embed"]("beta"),
]
assert service["turbovec_health"]()["engine"] == "turbovec"
assert service["turbovec_health"]()["backend"] == "local_fallback"
assert service["turboquant_health"]()["engine"] == "turboquant"
assert service["_turboquant_capabilities"]()["controls"] == ["proof", "benchmark"]
assert service["_turboquant_command"]("proof")[1] == "proof.py"
assert service["_turboquant_command"]("benchmark")[1] == "benchmark.py"

upsert = asyncio.run(
    service["turbovec_upsert"](
        service["Request"](
            {
                "bitWidth": 4,
                "documents": [
                    {
                        "id": "alpha",
                        "text": "alpha semantic retrieval",
                        "metadata": {"domain": "alpha"},
                    },
                    {
                        "id": "beta",
                        "text": "beta unrelated storage",
                        "metadata": {"domain": "beta"},
                    },
                ],
            }
        )
    )
)
assert upsert.content["ok"] is True
search = asyncio.run(
    service["turbovec_search"](
        service["Request"](
            {
                "query": "alpha semantic retrieval",
                "limit": 2,
                "allowlist": ["alpha"],
                "filters": {"domains": ["alpha"]},
            }
        )
    )
)
assert [match["id"] for match in search.content["matches"]] == ["alpha"]
assert service["turbovec_persist"]().content["ok"] is True
assert service["turbovec_reload"]().content["reloaded"] is True
rebuild = service["turbovec_rebuild"]()
assert rebuild.content.get("vectorCount") == 2, rebuild.content
removed = asyncio.run(
    service["turbovec_remove"](service["Request"]({"ids": ["alpha", "beta"]}))
)
assert removed.content["removed"] == 2

if service["HTTP_BACKEND"] == "stdlib":
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]
    thread = threading.Thread(
        target=service["app"].serve,
        args=("127.0.0.1", port),
        daemon=True,
    )
    thread.start()
    time.sleep(0.1)
    with urlopen(f"http://127.0.0.1:{port}/turbovec/health", timeout=3) as response:
        assert json.loads(response.read())["engine"] == "turbovec"
    http_upsert = post_json(
        f"http://127.0.0.1:{port}/turbovec/upsert",
        {
            "bitWidth": 4,
            "documents": [
                {
                    "id": "http-alpha",
                    "text": "alpha semantic retrieval",
                    "metadata": {"domain": "alpha"},
                },
                {
                    "id": "http-beta",
                    "text": "beta unrelated storage",
                    "metadata": {"domain": "beta"},
                },
            ],
        },
    )
    assert http_upsert["ok"] is True
    http_search = post_json(
        f"http://127.0.0.1:{port}/turbovec/search",
        {
            "query": "alpha semantic retrieval",
            "limit": 2,
            "allowlist": ["http-alpha"],
            "filters": {"domains": ["alpha"]},
        },
    )
    assert [match["id"] for match in http_search["matches"]] == ["http-alpha"]
    for operation in ("prepare", "persist", "reload", "rebuild"):
        assert post_json(f"http://127.0.0.1:{port}/turbovec/{operation}", {})["ok"] is True
    assert post_json(
        f"http://127.0.0.1:{port}/turbovec/remove",
        {"ids": ["http-alpha", "http-beta"]},
    )["removed"] == 2

try:
    service["_run_turboquant"]("proof", service["EXEC_CONFIRMATION"])
except service["ServiceError"] as exc:
    assert "disabled" in str(exc).lower()
else:
    raise AssertionError("TurboQuant execution must stay disabled by default.")

shutil.rmtree(STATE_DIR, ignore_errors=True)
print("ok local-acceleration-service (stdlib backend, local vectors, hash embeddings, execution gate)")
