# Document and design source closure

## Outcome

Close the Documenso, DocuSeal, Frontend Slides, and Penpot source inventories
without turning Nexus into a signing service, presentation editor, binary
document converter, or public artifact publisher.

## Implemented/adapted value

- Export the canonical runtime CSS variables as a structured, categorized JSON
  manifest with `npm run design:tokens:export`.
- Validate the export source without writing with
  `npm run design:tokens:check`.
- Keep primary branded assets in readable SVG and validate that the SVG source
  remains present and parseable.
- Preserve the existing Next.js protected-route, API-route, form, reduced
  motion, and accessibility patterns as Nexus-native behavior rather than
  importing an upstream application architecture.

## Current-source correction

Documenso's current README identifies React Router v7 and Hono, not the
previously inventoried Next.js 14 App Router stack. The stale App Router
capability is therefore excluded rather than used as implementation evidence.

## Explicit exclusions

- No signing workflow, e-signature server, or email action tokens.
- No untrusted PDF/PPT parsing, form-field extraction, browser PDF renderer, or
  PowerPoint conversion without a separately reviewed parser sandbox,
  retention policy, and document-intelligence product lane.
- No presentation authoring/runtime, style-preview generator, in-browser deck
  editor, screenshot QA lane, PDF deck export, or automatic deployment. These
  are complete features of a different artifact-authoring product, not hidden
  partial capabilities in Nexus.
- No fixed-stage phone presentation work while phone/PWA work is deferred.
- No external skill installer or cross-host instruction mutation.

## Acceptance

- The four matrices are reviewed on 2026-07-27, complete, and contain no
  pending capabilities.
- The token exporter finds at least 100 canonical runtime tokens and requires
  core color, spacing, radius, typography, and motion entries.
- The primary SVG icon is readable and contains an SVG root.
- `npm run document-design:check`, `npm run source:parity:check`, and
  `npm run type-check` pass.
