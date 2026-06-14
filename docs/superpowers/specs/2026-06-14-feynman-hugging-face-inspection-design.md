# Feynman Hugging Face Inspection Design

## Goal

Add a secure, bounded Hugging Face inspection capability that gives Nexus and Feynman useful public model/dataset evidence without downloading repositories, using tokens, or changing the visual product.

## Architecture

`lib/huggingFaceInspection.ts` owns reference normalization, public Hub endpoint construction, response normalization, file allowlisting, byte-bounded text reads, and report formatting. The existing protected `/api/tools` route exposes the module as `huggingface_inspect`; `lib/agent.ts` advertises it only for explicit Hugging Face intent.

The Feynman progressive collector receives one optional inspection dependency. When the topic contains a valid public Hugging Face repository URL, that dependency runs concurrently with the first paper/web wave and contributes one directly read source within the existing direct-read budget.

## Data Flow

1. Normalize a model or dataset reference to `repoType`, `repoId`, and canonical public URL.
2. Read public metadata and a bounded top-level tree concurrently.
3. For datasets, also read bounded Dataset Viewer configuration, split, and feature metadata.
4. For explicit `read_file`, accept only a safe relative path with an allowlisted text extension and reject responses above 64 KiB.
5. Return a normalized text receipt with access posture, metadata, structure, files, warnings, and source URL.

## Failure And Security Posture

Every network call is time-bounded. Missing dataset-viewer conversion, unavailable trees, rate limits, and partial Hub failures become warnings when core metadata remains usable. Private/gated repositories are reported from public metadata but Nexus does not attempt authentication. Credential-bearing URLs, traversal, revisions other than `main`, binary paths, oversized content, and non-Hugging Face hosts are rejected.

## Acceptance

Focused runtime tests prove normalization, public-only posture, bounded dataset structure, file allowlisting, hard byte caps, and Feynman evidence integration. Static validation proves tool catalog, security policy, route wiring, parity, and verification wiring.
