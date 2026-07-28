# REPO_CONTEXT.md

## Repository Thesis

`heygen-com/hyperframes` is an Apache-2.0 HTML-native video framework. It turns
HTML, CSS, media, and seekable animation into deterministic frames and MP4
output through a local CLI, headless Chrome, and FFmpeg. The useful Nexus
adaptation is a deterministic media-production contract, not a bundled renderer.

## Repository Shape

- The current `main` tree is a large monorepo with core, engine, producer,
  studio, player, shader, Lambda, CLI, registry, examples, and 19 agent skills.
- The README names Node 22+ and FFmpeg for manual use and documents local,
  Docker, hosted, and AWS rendering paths.
- Agent workflows cover product launch videos, explainers, PR videos, captions,
  talking-head recuts, motion graphics, music videos, slideshows, general
  video, and Remotion migration.

## Execution Model

Compositions are HTML documents with absolute timing/tracks. A browser engine
seeks each frame and FFmpeg encodes video/audio. Animation adapters include
GSAP, CSS, Lottie, Three.js, Anime.js, WAAPI, and custom runtimes. Cloud and
Lambda paths add infrastructure, network, and cost authority.

## Nexus Adaptation

`deterministic-media-production` captures the brief, beat sheet, frozen asset
ledger, seekable timeline, accessibility, lint/preview/render evidence, and
truthful unavailable state. HyperFrames, FFmpeg, browsers, media generators,
and cloud rendering remain optional and uninstalled.

## Quality Signals and Risks

The source has an explicit license, security/contribution docs, tests, and a
deterministic architecture. The full clone includes large Git LFS baselines and
the runtime can download/install or deploy significant infrastructure. Nexus
therefore adapts the process and requires explicit authority for any renderer.
Reviewed 2026-07-27.
