# FEYNMAN-HUGGING-FACE-INSPECTION

## Objective

Complete the Feynman Hugging Face inspection source-parity row with bounded, public, read-only model and dataset repository inspection.

## Runtime Contract

- Expose one protected networked `huggingface_inspect` tool with `inspect` and `read_file` actions.
- Accept a normalized public Hugging Face model or dataset repository ID or URL, including valid single-segment Hub IDs.
- Inspect public repository metadata, access posture, bounded top-level files, and dataset split/schema information when available.
- Permit explicit reads only for allowlisted small text files under the repository root.
- Automatically add one normalized Hugging Face inspection receipt to Feynman evidence when the research topic includes a valid Hugging Face repository URL.
- Preserve partial metadata, tree, dataset-info, and file-read failures as warnings instead of cancelling successful evidence.

## Bounded Defaults

- Public unauthenticated Hub endpoints only.
- Main revision only.
- Maximum repository ID length: 180 characters.
- Maximum returned repository files: 40.
- Maximum returned tags: 20.
- Maximum dataset configurations: 8.
- Maximum dataset splits per configuration: 12.
- Maximum dataset feature names per configuration: 30.
- Maximum explicit text-file read: 64 KiB.
- Maximum formatted evidence receipt: 12,000 characters.

## Guardrails

- No Hugging Face token, private/gated access attempt, inference, training, file download, repository clone, external write, or code execution.
- Reject credential-bearing references, traversal, custom hosts, custom revisions, binary/model-weight files, and oversized responses.
- Keep the tool behind the existing connected-network and connector policy.
- No new provider, dependency, route, visual surface, or ARPG change.
- This tranche completes only `hugging-face-inspection`; remaining Feynman parity stays open.

## Verification

- `npm run feynman:huggingface:check`
- `npm run feynman:check`
- `npm run source:parity:check`
- `npm run type-check`
- `npm run verify`
