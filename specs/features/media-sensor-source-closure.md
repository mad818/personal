# Media and sensor source closure

## Outcome

Close Pixelle Video, ViMax, Supertonic, Pear Desktop, and RuView using current
source truth and explicit product, compute, licensing, privacy, and consent
boundaries.

## Current-source corrections

- Pixelle Video now redirects to `ATH-MaaS/Pixelle-Video` and presents a
  complete automated video-creation pipeline.
- ViMax presents agentic video generation, not the previously inventoried
  long-video question-answering and temporal-grounding product.
- Supertonic is an on-device multilingual TTS project. Its README does not
  expose noise reduction, transcription, sentiment, topic extraction, or
  diarization, and it carries a July 23, 2026 archive notice.
- Pear is an unofficial music-player extension, not a generic local-library
  playback engine for Nexus.
- RuView explicitly performs through-wall presence, motion, breathing, and
  heart-rate inference from WiFi signals.

## Explicit exclusions

- No video authoring, video decoding, frame-to-model prompt injection, or
  multimodal media retention without a governed media lane.
- No archived ONNX TTS/model dependency without a maintained supply chain,
  separate model-license review, and consent-aware voice surface.
- No music library scanner, codecs, playlist database, or streaming-client
  extension.
- No through-wall occupancy, passive motion, or vital-sign sensing. These are
  high-risk surveillance capabilities even when cameras are not used.
- The presence of a general IoT page does not authorize sensitive human-sensing
  ingestion or display.

## Acceptance

- All five matrices are complete, reviewed on 2026-07-27, and contain no
  pending capability.
- The Pixelle redirect, ViMax generation correction, Supertonic archive/model
  license, Pear unofficial-extension boundary, and RuView surveillance boundary
  remain explicit.
- `npm run media-sensor:check` and `npm run source:parity:check` pass.
