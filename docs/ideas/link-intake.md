# Idea link intake

Use this lane when you have a fresh batch of GitHub repos or X posts to assimilate into Nexus.

## Fast paths

1. **RECON → Repo intel → Idea link intake** — paste links in the panel and click Register links.
2. **CLI** — register one or more URLs:

```bash
npm run ideas:register -- https://github.com/org/repo https://x.com/user/status/123
```

3. **Edit the queue file** — append objects to [`pending-links.json`](./pending-links.json).

## What happens next

Each new link gets:

- A stable `id` and `kind` (`github`, `x`, or `other`)
- `status: pending` in `pending-links.json`
- A stub source-parity matrix at `docs/ideas/source-parity/<id>.json` with `status: foundation`

Then follow the [source assimilation contract](./source-assimilation-contract.md):

1. Inspect the primary source (README, license, architecture).
2. Fill the capability matrix (`implemented` / `adapted` / `excluded` / `pending`).
3. Adapt into existing Nexus surfaces — do not vendor upstream code blindly.
4. Add focused proof (`npm run …:check` or file paths).
5. Move the queue item to `triaged` or `shipped` when the matrix is honest.

## Checks

```bash
npm run ideas:link-intake:check
npm run source:parity:check
```

## Related docs

- [`external-links-mapping.md`](./external-links-mapping.md) — prior 66-link mapping
- [`assimilation-intake-queue.json`](./assimilation-intake-queue.json) — shipped Wave 1–6 batch
- [`source-assimilation-contract.md`](./source-assimilation-contract.md) — completion rules
