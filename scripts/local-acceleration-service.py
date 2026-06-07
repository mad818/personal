#!/usr/bin/env python3
"""
Loopback-only companion service for Nexus local acceleration.

TurboVec is imported only when the operator installs the upstream MIT package.
TurboQuant stays a separate GPL runtime; this service can run its reviewed
validation commands only after an explicit environment opt-in and per-request
confirmation.

Run:
    python scripts/local-acceleration-service.py
"""

from __future__ import annotations

import hashlib
import importlib
import importlib.util
import json
import math
import os
import subprocess
import sys
import threading
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Any
from urllib.error import URLError
from urllib.parse import urlparse
from urllib.request import Request as UrlRequest
from urllib.request import urlopen

try:
    from fastapi import FastAPI, HTTPException, Request
    from fastapi.responses import JSONResponse
    import uvicorn
except ImportError as exc:
    raise SystemExit(
        f"Missing dependency: {exc}\nRun: pip install fastapi uvicorn"
    ) from exc


SERVICE_VERSION = "1.0.0"
EXEC_CONFIRMATION = "RUN_TURBOQUANT_LOCAL_COMMAND"
HOST = os.getenv("NEXUS_LOCAL_ACCELERATION_HOST", "127.0.0.1").strip()
PORT = int(os.getenv("NEXUS_LOCAL_ACCELERATION_PORT", "5052"))
STATE_DIR = Path(
    os.getenv("NEXUS_LOCAL_ACCELERATION_STATE_DIR", ".nexus/local-acceleration")
).resolve()
STATE_PATH = STATE_DIR / "turbovec-state.json"
INDEX_PATH = STATE_DIR / "turbovec-index.bin"
OLLAMA_BASE_URL = os.getenv("NEXUS_LOCAL_ACCELERATION_OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_EMBED_MODEL = os.getenv("NEXUS_LOCAL_ACCELERATION_EMBED_MODEL", "nomic-embed-text").strip()
TURBOVEC_DEFAULT_BITS = int(os.getenv("NEXUS_TURBOVEC_BIT_WIDTH", "4"))
TURBOQUANT_ROOT_RAW = os.getenv("NEXUS_TURBOQUANT_ROOT", "").strip()
TURBOQUANT_ROOT = Path(TURBOQUANT_ROOT_RAW).resolve() if TURBOQUANT_ROOT_RAW else None
TURBOQUANT_ALLOW_EXEC = os.getenv("NEXUS_LOCAL_ACCELERATION_ALLOW_EXEC", "").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}
TURBOQUANT_COMMAND_TIMEOUT = max(
    30, min(7_200, int(os.getenv("NEXUS_TURBOQUANT_COMMAND_TIMEOUT_SECONDS", "900")))
)
TURBOQUANT_BENCHMARK_SCRIPT = os.getenv(
    "NEXUS_TURBOQUANT_BENCHMARK_SCRIPT", "proof.py"
).strip()

MAX_DOCUMENTS = 64
MAX_DOCUMENT_CHARS = 32_000
MAX_QUERY_CHARS = 4_000
MAX_ALLOWLIST = 4_096
MAX_RESULTS = 100

if HOST not in {"127.0.0.1", "localhost", "::1"}:
    raise SystemExit("Local acceleration service refuses non-loopback bind hosts.")
if TURBOVEC_DEFAULT_BITS not in {2, 3, 4}:
    raise SystemExit("NEXUS_TURBOVEC_BIT_WIDTH must be 2, 3, or 4.")


class ServiceError(Exception):
    """An operator-safe error that may be returned to the Nexus client."""


class ReadWriteLock:
    """Allow concurrent searches while keeping index mutations exclusive."""

    def __init__(self) -> None:
        self._condition = threading.Condition(threading.Lock())
        self._readers = 0
        self._writer = False
        self._writers_waiting = 0

    @contextmanager
    def read(self) -> Any:
        with self._condition:
            while self._writer or self._writers_waiting:
                self._condition.wait()
            self._readers += 1
        try:
            yield
        finally:
            with self._condition:
                self._readers -= 1
                if self._readers == 0:
                    self._condition.notify_all()

    @contextmanager
    def write(self) -> Any:
        with self._condition:
            self._writers_waiting += 1
            while self._writer or self._readers:
                self._condition.wait()
            self._writers_waiting -= 1
            self._writer = True
        try:
            yield
        finally:
            with self._condition:
                self._writer = False
                self._condition.notify_all()


def _is_loopback_url(raw: str) -> bool:
    try:
        parsed = urlparse(raw)
        return parsed.scheme in {"http", "https"} and parsed.hostname in {
            "127.0.0.1",
            "localhost",
            "::1",
        }
    except ValueError:
        return False


if not _is_loopback_url(OLLAMA_BASE_URL):
    raise SystemExit("The embedding endpoint must use a loopback HTTP(S) URL.")


app = FastAPI(
    title="Nexus Local Acceleration Service",
    description="Loopback-only TurboVec and TurboQuant control bridge",
    version=SERVICE_VERSION,
)

_lock = threading.RLock()
_index_gate = ReadWriteLock()
_documents: dict[str, dict[str, Any]] = {}
_index: Any = None
_dimension: int | None = None
_bit_width = TURBOVEC_DEFAULT_BITS
_last_vector_operation: dict[str, Any] = {}
_last_turboquant_operation: dict[str, Any] = {}


def _optional_module(name: str) -> Any | None:
    try:
        return importlib.import_module(name)
    except Exception:
        return None


def _module_available(name: str) -> bool:
    try:
        return importlib.util.find_spec(name) is not None
    except Exception:
        return False


def _turbovec_types() -> tuple[Any | None, Any | None]:
    module = _optional_module("turbovec")
    if module is None:
        return None, None
    return getattr(module, "TurboQuantIndex", None), getattr(module, "IdMapIndex", None)


def _write_state() -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "schemaVersion": 1,
        "bitWidth": _bit_width,
        "dimension": _dimension,
        "documents": _documents,
    }
    temporary = STATE_PATH.with_suffix(".tmp")
    temporary.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    temporary.replace(STATE_PATH)


def _read_state() -> None:
    global _documents, _dimension, _bit_width
    if not STATE_PATH.exists():
        return
    try:
        payload = json.loads(STATE_PATH.read_text(encoding="utf-8"))
        documents = payload.get("documents", {})
        bit_width = int(payload.get("bitWidth", TURBOVEC_DEFAULT_BITS))
        dimension = payload.get("dimension")
        if not isinstance(documents, dict) or bit_width not in {2, 3, 4}:
            raise ValueError("invalid state")
        clean: dict[str, dict[str, Any]] = {}
        for document_id, document in documents.items():
            if not isinstance(document_id, str) or not isinstance(document, dict):
                continue
            text = document.get("text")
            metadata = document.get("metadata", {})
            if isinstance(text, str) and text and isinstance(metadata, dict):
                clean[document_id] = {"text": text, "metadata": metadata}
        _documents = clean
        _bit_width = bit_width
        _dimension = int(dimension) if isinstance(dimension, int) and dimension > 0 else None
    except Exception as exc:
        raise ServiceError("Stored TurboVec state is invalid or corrupt.") from exc


def _post_json(url: str, payload: dict[str, Any], timeout: int = 30) -> dict[str, Any]:
    if not _is_loopback_url(url):
        raise ServiceError("Embedding requests are restricted to loopback.")
    request = UrlRequest(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            parsed = json.loads(response.read().decode("utf-8"))
    except (URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise ServiceError("The local Ollama embedding endpoint is unavailable.") from exc
    if not isinstance(parsed, dict):
        raise ServiceError("The local Ollama embedding response is invalid.")
    return parsed


def _validate_vector(vector: Any) -> list[float]:
    if not isinstance(vector, list) or not vector:
        raise ServiceError("The local embedding response did not contain a vector.")
    clean = [float(value) for value in vector]
    if any(not math.isfinite(value) for value in clean):
        raise ServiceError("The local embedding response contained non-finite values.")
    return clean


def _embed(texts: list[str]) -> list[list[float]]:
    try:
        payload = _post_json(
            f"{OLLAMA_BASE_URL}/api/embed",
            {"model": OLLAMA_EMBED_MODEL, "input": texts},
        )
        embeddings = payload.get("embeddings")
        if isinstance(embeddings, list) and len(embeddings) == len(texts):
            vectors = [_validate_vector(vector) for vector in embeddings]
            dimensions = {len(vector) for vector in vectors}
            if len(dimensions) == 1:
                return vectors
    except ServiceError:
        pass

    vectors = []
    for text in texts:
        payload = _post_json(
            f"{OLLAMA_BASE_URL}/api/embeddings",
            {"model": OLLAMA_EMBED_MODEL, "prompt": text},
        )
        vectors.append(_validate_vector(payload.get("embedding")))
    dimensions = {len(vector) for vector in vectors}
    if len(dimensions) != 1:
        raise ServiceError("Local embedding dimensions do not match.")
    return vectors


def _new_index(dimension: int, bit_width: int) -> Any:
    _, id_map_type = _turbovec_types()
    if id_map_type is None:
        raise ServiceError("TurboVec is not installed in this Python environment.")

    attempts = [
        lambda: id_map_type(dim=dimension, bit_width=bit_width),
        lambda: id_map_type(dimension, bit_width),
    ]
    index = None
    for attempt in attempts:
        try:
            index = attempt()
            break
        except TypeError:
            continue
    if index is None:
        raise ServiceError("Installed TurboVec IdMapIndex is not compatible with the bridge.")
    return index


def _numeric_id(document_id: str) -> int:
    value = int.from_bytes(
        hashlib.blake2b(document_id.encode("utf-8"), digest_size=8).digest(),
        "big",
        signed=False,
    )
    return value or 1


def _assert_id_mapping(document_ids: list[str]) -> None:
    reverse: dict[int, str] = {}
    for document_id in document_ids:
        numeric_id = _numeric_id(document_id)
        collision = reverse.get(numeric_id)
        if collision is not None and collision != document_id:
            raise ServiceError("TurboVec stable-ID hash collision detected.")
        reverse[numeric_id] = document_id


def _id_maps() -> tuple[dict[str, int], dict[int, str]]:
    forward = {document_id: _numeric_id(document_id) for document_id in _documents}
    _assert_id_mapping(list(forward))
    reverse = {numeric_id: document_id for document_id, numeric_id in forward.items()}
    return forward, reverse


def _as_numpy_vectors(vectors: list[list[float]]) -> Any:
    numpy = _optional_module("numpy")
    if numpy is None:
        raise ServiceError("TurboVec requires NumPy in this Python environment.")
    return numpy.asarray(vectors, dtype=numpy.float32)


def _as_numpy_ids(ids: list[int]) -> Any:
    numpy = _optional_module("numpy")
    if numpy is None:
        raise ServiceError("TurboVec requires NumPy in this Python environment.")
    return numpy.asarray(ids, dtype=numpy.uint64)


def _index_add_batch(document_ids: list[str], vectors: list[list[float]]) -> None:
    if _index is None or not hasattr(_index, "add_with_ids"):
        raise ServiceError("TurboVec stable-ID batch add is unavailable.")
    try:
        _index.add_with_ids(
            _as_numpy_vectors(vectors),
            _as_numpy_ids([_numeric_id(document_id) for document_id in document_ids]),
        )
    except Exception as exc:
        raise ServiceError("TurboVec rejected vectors during stable-ID ingest.") from exc


def _index_remove(document_id: str) -> bool:
    if _index is None:
        return False
    for method_name in ("remove", "delete"):
        method = getattr(_index, method_name, None)
        if callable(method):
            try:
                result = method(_numeric_id(document_id))
                return result is not False
            except Exception as exc:
                raise ServiceError("TurboVec rejected stable-ID removal.") from exc
    raise ServiceError("Installed TurboVec stable-ID removal is unavailable.")


def _index_search(
    vector: list[float],
    limit: int,
    allowed_numeric_ids: list[int] | None,
) -> list[tuple[str, float]]:
    if _index is None or not hasattr(_index, "search"):
        return []
    query = _as_numpy_vectors([vector])[0]
    kwargs = {"k": limit}
    if allowed_numeric_ids is not None:
        kwargs["allowlist"] = _as_numpy_ids(allowed_numeric_ids)
    try:
        scores, ids = _index.search(query, **kwargs)
    except Exception as exc:
        raise ServiceError("TurboVec search failed.") from exc
    scores_list = scores.tolist() if hasattr(scores, "tolist") else list(scores)
    ids_list = ids.tolist() if hasattr(ids, "tolist") else list(ids)
    _, reverse = _id_maps()
    normalized = []
    for score, numeric_id in zip(scores_list, ids_list):
        document_id = reverse.get(int(numeric_id))
        if document_id is not None:
            normalized.append((document_id, float(score)))
    return normalized


def _prepare_index() -> bool:
    if _index is None:
        return False
    method = getattr(_index, "prepare", None)
    if not callable(method):
        return False
    method()
    return True


def _save_index() -> bool:
    if _index is None:
        return False
    method = getattr(_index, "write", None)
    if not callable(method):
        return False
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    method(str(INDEX_PATH))
    return True


def _load_saved_index() -> bool:
    global _index
    if not INDEX_PATH.exists():
        return False
    _, id_map_type = _turbovec_types()
    loader = getattr(id_map_type, "load", None) if id_map_type is not None else None
    if not callable(loader):
        raise ServiceError("Installed TurboVec stable-ID load is unavailable.")
    try:
        _index = loader(str(INDEX_PATH))
    except Exception as exc:
        raise ServiceError("Stored TurboVec binary index is invalid or corrupt.") from exc
    return True


def _rebuild_index() -> dict[str, Any]:
    global _index, _dimension
    started = time.monotonic()
    _index = None
    if not _documents:
        _dimension = None
        _write_state()
        return {"ok": True, "vectorCount": 0, "durationMs": 0}

    ids = list(_documents)
    vectors = _embed([_documents[document_id]["text"] for document_id in ids])
    _dimension = len(vectors[0])
    _index = _new_index(_dimension, _bit_width)
    _id_maps()
    _index_add_batch(ids, vectors)
    prepared = _prepare_index()
    _write_state()
    return {
        "ok": True,
        "vectorCount": len(ids),
        "prepared": prepared,
        "durationMs": round((time.monotonic() - started) * 1000),
    }


def _ensure_index() -> None:
    if _index is None and _documents:
        _rebuild_index()


def _safe_id(value: Any) -> str:
    if not isinstance(value, str):
        raise ServiceError("TurboVec IDs must be strings.")
    clean = value.strip()
    if not clean or len(clean) > 240:
        raise ServiceError("TurboVec IDs must contain 1-240 characters.")
    return clean


def _safe_documents(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list) or not value or len(value) > MAX_DOCUMENTS:
        raise ServiceError(f"TurboVec upsert requires 1-{MAX_DOCUMENTS} documents.")
    documents = []
    for item in value:
        if not isinstance(item, dict):
            raise ServiceError("TurboVec documents must be objects.")
        text = item.get("text")
        metadata = item.get("metadata", {})
        if not isinstance(text, str) or not text.strip() or len(text) > MAX_DOCUMENT_CHARS:
            raise ServiceError("TurboVec document text is missing or too large.")
        if not isinstance(metadata, dict):
            raise ServiceError("TurboVec document metadata must be an object.")
        documents.append({"id": _safe_id(item.get("id")), "text": text.strip(), "metadata": metadata})
    return documents


def _metadata_matches(metadata: dict[str, Any], filters: dict[str, Any]) -> bool:
    for filter_name, metadata_name in (
        ("routes", "route"),
        ("tags", "tags"),
        ("domains", "domain"),
    ):
        accepted = filters.get(filter_name)
        if isinstance(accepted, list) and accepted:
            actual = metadata.get(metadata_name)
            actual_values = actual if isinstance(actual, list) else [actual]
            if not any(value in accepted for value in actual_values):
                return False
    created = metadata.get("createdAt")
    after = filters.get("createdAfter")
    before = filters.get("createdBefore")
    if isinstance(after, (int, float)) and (not isinstance(created, (int, float)) or created < after):
        return False
    if isinstance(before, (int, float)) and (not isinstance(created, (int, float)) or created > before):
        return False
    return True


def _turbovec_stats() -> dict[str, Any]:
    vector_type, id_map_type = _turbovec_types()
    return {
        "available": id_map_type is not None,
        "positionalIndexAvailable": vector_type is not None,
        "stableIdsAvailable": id_map_type is not None,
        "vectorCount": len(_documents),
        "dimension": _dimension,
        "bitWidth": _bit_width,
        "embeddingModel": OLLAMA_EMBED_MODEL,
        "prepared": _index is not None,
        "statePersisted": STATE_PATH.exists(),
        "binaryIndexPersisted": INDEX_PATH.exists(),
        "lastOperation": _last_vector_operation,
    }


def _turboquant_available() -> bool:
    return _module_available("turboquant") or bool(TURBOQUANT_ROOT and TURBOQUANT_ROOT.is_dir())


def _turboquant_capabilities() -> dict[str, Any]:
    return {
        "available": _turboquant_available(),
        "separateGplRuntime": True,
        "modes": ["off", "capture_only", "hybrid"],
        "keyBits": [2, 3, 4],
        "valueBits": [2, 4],
        "keyCompression": ["random_rotation", "lloyd_max", "qjl_residual_sign_bits"],
        "valueCompression": ["grouped_quantization", "bit_packing"],
        "serving": ["vllm_openai_compatible", "dense", "moe_full_attention"],
        "controls": ["validate", "audit", "test", "benchmark"],
        "executionEnabled": TURBOQUANT_ALLOW_EXEC,
    }


def _turboquant_limitations() -> dict[str, Any]:
    return {
        "fusedHybridDecode": False,
        "prefillAllocationReduced": False,
        "fullAttentionOnly": True,
        "valueQualitySensitive": True,
        "hybridDequantizationOverhead": True,
        "moeSupport": "full-attention layers only",
        "source": "upstream README reviewed 2026-06-07",
    }


def _turboquant_stats() -> dict[str, Any]:
    return {
        "available": _turboquant_available(),
        "rootConfigured": TURBOQUANT_ROOT is not None,
        "executionEnabled": TURBOQUANT_ALLOW_EXEC,
        "lastOperation": _last_turboquant_operation,
    }


def _relative_script(name: str) -> Path:
    if TURBOQUANT_ROOT is None or not TURBOQUANT_ROOT.is_dir():
        raise ServiceError("NEXUS_TURBOQUANT_ROOT is not configured to an installed runtime.")
    candidate = (TURBOQUANT_ROOT / name).resolve()
    try:
        candidate.relative_to(TURBOQUANT_ROOT)
    except ValueError as exc:
        raise ServiceError("TurboQuant command path escaped the configured runtime root.") from exc
    if candidate.suffix.lower() != ".py" or not candidate.is_file():
        raise ServiceError("The reviewed TurboQuant command script is missing.")
    return candidate


def _turboquant_command(operation: str) -> tuple[list[str], str]:
    if operation == "validate":
        script = _relative_script("validate_paper.py")
        return [sys.executable, str(script)], "validate_paper.py"
    if operation == "audit":
        script = _relative_script("audit_claims.py")
        return [sys.executable, str(script)], "audit_claims.py"
    if operation == "benchmark":
        script = _relative_script(TURBOQUANT_BENCHMARK_SCRIPT)
        return [sys.executable, str(script)], TURBOQUANT_BENCHMARK_SCRIPT
    if operation == "test":
        if TURBOQUANT_ROOT is None or not TURBOQUANT_ROOT.is_dir():
            raise ServiceError("NEXUS_TURBOQUANT_ROOT is not configured to an installed runtime.")
        return [
            sys.executable,
            "-m",
            "pytest",
            "test_modular.py",
            "test_turboquant.py",
            "-q",
        ], "python -m pytest test_modular.py test_turboquant.py -q"
    raise ServiceError("Unknown TurboQuant command.")


def _run_turboquant(operation: str, confirmation: Any) -> dict[str, Any]:
    global _last_turboquant_operation
    if not TURBOQUANT_ALLOW_EXEC:
        raise ServiceError("TurboQuant command execution is disabled.")
    if confirmation != EXEC_CONFIRMATION:
        raise ServiceError("TurboQuant command confirmation is required.")
    command, label = _turboquant_command(operation)
    started = time.monotonic()
    try:
        result = subprocess.run(
            command,
            cwd=str(TURBOQUANT_ROOT),
            capture_output=True,
            check=False,
            shell=False,
            timeout=TURBOQUANT_COMMAND_TIMEOUT,
        )
        combined = result.stdout + result.stderr
        summary = {
            "operation": operation,
            "command": label,
            "succeeded": result.returncode == 0,
            "returnCode": result.returncode,
            "durationMs": round((time.monotonic() - started) * 1000),
            "outputBytes": len(combined),
            "outputSha256": hashlib.sha256(combined).hexdigest(),
            "completedAt": int(time.time() * 1000),
        }
    except subprocess.TimeoutExpired as exc:
        combined = (exc.stdout or b"") + (exc.stderr or b"")
        summary = {
            "operation": operation,
            "command": label,
            "succeeded": False,
            "timedOut": True,
            "durationMs": round((time.monotonic() - started) * 1000),
            "outputBytes": len(combined),
            "outputSha256": hashlib.sha256(combined).hexdigest(),
            "completedAt": int(time.time() * 1000),
        }
    _last_turboquant_operation = summary
    return summary


async def _json_body(request: Request) -> dict[str, Any]:
    try:
        body = await request.json()
    except Exception as exc:
        raise ServiceError("Request body must be valid JSON.") from exc
    if not isinstance(body, dict):
        raise ServiceError("Request body must be a JSON object.")
    return body


def _error_response(exc: Exception) -> JSONResponse:
    message = str(exc) if isinstance(exc, ServiceError) else "Local acceleration operation failed."
    return JSONResponse({"error": message[:220]}, status_code=503)


@app.get("/turbovec/health")
def turbovec_health() -> dict[str, Any]:
    available = _turbovec_types()[1] is not None
    return {
        "status": "ok" if available else "degraded",
        "available": available,
        "engine": "turbovec",
        "serviceVersion": SERVICE_VERSION,
    }


@app.get("/turbovec/stats")
def turbovec_stats() -> dict[str, Any]:
    with _lock:
        return _turbovec_stats()


@app.post("/turbovec/upsert")
async def turbovec_upsert(request: Request) -> JSONResponse:
    global _index, _dimension, _bit_width, _last_vector_operation
    try:
        body = await _json_body(request)
        documents = _safe_documents(body.get("documents"))
        bits = int(body.get("bitWidth", _bit_width))
        if bits not in {2, 3, 4}:
            raise ServiceError("TurboVec bit width must be 2, 3, or 4.")
        started = time.monotonic()
        vectors = _embed([document["text"] for document in documents])
        with _index_gate.write():
            with _lock:
                _assert_id_mapping(
                    list(_documents) + [document["id"] for document in documents]
                )
                if _index is None or _dimension != len(vectors[0]) or _bit_width != bits:
                    _bit_width = bits
                    _dimension = len(vectors[0])
                    _index = _new_index(_dimension, _bit_width)
                    existing = list(_documents.items())
                    if existing:
                        existing_vectors = _embed([item[1]["text"] for item in existing])
                        _index_add_batch(
                            [document_id for document_id, _ in existing],
                            existing_vectors,
                        )
                for document, vector in zip(documents, vectors):
                    if document["id"] in _documents:
                        _index_remove(document["id"])
                    _index_add_batch([document["id"]], [vector])
                    _documents[document["id"]] = {
                        "text": document["text"],
                        "metadata": document["metadata"],
                    }
                _write_state()
                _last_vector_operation = {
                    "operation": "upsert",
                    "count": len(documents),
                    "durationMs": round((time.monotonic() - started) * 1000),
                    "completedAt": int(time.time() * 1000),
                }
        return JSONResponse({"ok": True, "upserted": len(documents), "vectorCount": len(_documents)})
    except Exception as exc:
        return _error_response(exc)


@app.post("/turbovec/search")
async def turbovec_search(request: Request) -> JSONResponse:
    global _last_vector_operation
    try:
        body = await _json_body(request)
        query = body.get("query")
        if not isinstance(query, str) or not query.strip() or len(query) > MAX_QUERY_CHARS:
            raise ServiceError("TurboVec query is missing or too large.")
        limit = max(1, min(MAX_RESULTS, int(body.get("limit", 12))))
        allowlist_raw = body.get("allowlist")
        allowlist = None
        if allowlist_raw is not None:
            if not isinstance(allowlist_raw, list) or len(allowlist_raw) > MAX_ALLOWLIST:
                raise ServiceError("TurboVec allowlist is invalid or too large.")
            allowlist = {_safe_id(value) for value in allowlist_raw}
        filters = body.get("filters", {})
        if not isinstance(filters, dict):
            raise ServiceError("TurboVec filters must be an object.")
        started = time.monotonic()
        vector = _embed([query.strip()])[0]
        with _index_gate.write():
            with _lock:
                _ensure_index()
        with _lock:
            candidate_documents = {
                document_id: dict(document["metadata"])
                for document_id, document in _documents.items()
                if (allowlist is None or document_id in allowlist)
                and _metadata_matches(document["metadata"], filters)
            }
            total_documents = len(_documents)
        if not candidate_documents:
            raw = []
        else:
            with _index_gate.read():
                raw = _index_search(
                    vector,
                    min(limit, len(candidate_documents)),
                    [_numeric_id(document_id) for document_id in candidate_documents]
                    if len(candidate_documents) < total_documents
                    else None,
                )
        with _lock:
            matches = []
            for document_id, score in raw:
                metadata = candidate_documents.get(document_id)
                if metadata is None:
                    continue
                matches.append(
                    {"id": document_id, "score": score, "metadata": metadata}
                )
                if len(matches) >= limit:
                    break
            _last_vector_operation = {
                "operation": "search",
                "resultCount": len(matches),
                "durationMs": round((time.monotonic() - started) * 1000),
                "completedAt": int(time.time() * 1000),
            }
        return JSONResponse({"matches": matches})
    except Exception as exc:
        return _error_response(exc)


@app.post("/turbovec/remove")
async def turbovec_remove(request: Request) -> JSONResponse:
    global _last_vector_operation
    try:
        body = await _json_body(request)
        ids_raw = body.get("ids")
        if not isinstance(ids_raw, list) or not ids_raw or len(ids_raw) > MAX_ALLOWLIST:
            raise ServiceError("TurboVec remove IDs are invalid or too large.")
        ids = list(dict.fromkeys(_safe_id(value) for value in ids_raw))
        removed = 0
        with _index_gate.write():
            with _lock:
                _ensure_index()
                for document_id in ids:
                    if document_id in _documents:
                        _index_remove(document_id)
                        del _documents[document_id]
                        removed += 1
                _write_state()
                _last_vector_operation = {
                    "operation": "remove",
                    "count": removed,
                    "completedAt": int(time.time() * 1000),
                }
        return JSONResponse({"ok": True, "removed": removed, "vectorCount": len(_documents)})
    except Exception as exc:
        return _error_response(exc)


@app.post("/turbovec/prepare")
def turbovec_prepare() -> JSONResponse:
    try:
        with _index_gate.write():
            with _lock:
                _ensure_index()
                return JSONResponse({"ok": True, "prepared": _prepare_index()})
    except Exception as exc:
        return _error_response(exc)


@app.post("/turbovec/persist")
def turbovec_persist() -> JSONResponse:
    try:
        with _index_gate.write():
            with _lock:
                _write_state()
                return JSONResponse({"ok": True, "binaryIndexSaved": _save_index()})
    except Exception as exc:
        return _error_response(exc)


@app.post("/turbovec/reload")
def turbovec_reload() -> JSONResponse:
    try:
        with _index_gate.write():
            with _lock:
                _read_state()
                binary_loaded = _load_saved_index()
                result = (
                    {
                        "ok": True,
                        "vectorCount": len(_documents),
                        "binaryLoaded": True,
                    }
                    if binary_loaded
                    else _rebuild_index()
                )
                return JSONResponse({**result, "reloaded": True})
    except Exception as exc:
        return _error_response(exc)


@app.post("/turbovec/rebuild")
def turbovec_rebuild() -> JSONResponse:
    try:
        with _index_gate.write():
            with _lock:
                return JSONResponse(_rebuild_index())
    except Exception as exc:
        return _error_response(exc)


@app.get("/turboquant/health")
def turboquant_health() -> dict[str, Any]:
    available = _turboquant_available()
    return {
        "status": "ok" if available else "degraded",
        "available": available,
        "engine": "turboquant",
        "serviceVersion": SERVICE_VERSION,
    }


@app.get("/turboquant/stats")
def turboquant_stats() -> dict[str, Any]:
    return _turboquant_stats()


@app.get("/turboquant/capabilities")
def turboquant_capabilities() -> dict[str, Any]:
    return _turboquant_capabilities()


@app.get("/turboquant/limitations")
def turboquant_limitations() -> dict[str, Any]:
    return _turboquant_limitations()


@app.post("/turboquant/validate")
async def turboquant_validate(request: Request) -> JSONResponse:
    try:
        body = await _json_body(request)
        return JSONResponse(_run_turboquant("validate", body.get("confirmation")))
    except Exception as exc:
        return _error_response(exc)


@app.post("/turboquant/audit")
async def turboquant_audit(request: Request) -> JSONResponse:
    try:
        body = await _json_body(request)
        return JSONResponse(_run_turboquant("audit", body.get("confirmation")))
    except Exception as exc:
        return _error_response(exc)


@app.post("/turboquant/test")
async def turboquant_test(request: Request) -> JSONResponse:
    try:
        body = await _json_body(request)
        return JSONResponse(_run_turboquant("test", body.get("confirmation")))
    except Exception as exc:
        return _error_response(exc)


@app.post("/turboquant/benchmark")
async def turboquant_benchmark(request: Request) -> JSONResponse:
    try:
        body = await _json_body(request)
        return JSONResponse(_run_turboquant("benchmark", body.get("confirmation")))
    except Exception as exc:
        return _error_response(exc)


try:
    _read_state()
except ServiceError:
    _documents = {}
    _dimension = None


if __name__ == "__main__":
    print(f"Nexus Local Acceleration Service starting on http://{HOST}:{PORT}")
    uvicorn.run(app, host=HOST, port=PORT, log_level="warning")
