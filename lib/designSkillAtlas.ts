export const DESIGN_SKILL_SOURCE = {
  id: "mengto-skills",
  label: "MengTo/Skills",
  repositoryUrl: "https://github.com/MengTo/Skills",
  branch: "main",
  reviewedAt: "2026-07-26",
  license: "MIT",
  readmeBlobSha: "55b0459d263ecfb29a8bde7031910669b9f1e16d",
} as const;

export const DESIGN_SKILL_SOURCE_CATEGORIES = [
  "codex",
  "customer-support",
  "media",
  "ui",
  "web-design",
] as const;

export type DesignSkillSourceCategory =
  (typeof DESIGN_SKILL_SOURCE_CATEGORIES)[number];

export const DESIGN_SKILL_FAMILY_IDS = [
  "workflow-extraction",
  "evidence-audit",
  "capture",
  "support",
  "voice-social",
  "performance",
  "media-sourcing",
  "design-brief",
  "marketing-system",
  "visual-system",
  "motion",
  "webgl",
  "ui-detail",
] as const;

export type DesignSkillFamilyId = (typeof DESIGN_SKILL_FAMILY_IDS)[number];

export const DESIGN_SKILL_AVAILABILITY = [
  "native",
  "connector_required",
  "host_required",
  "dependency_review",
] as const;

export type DesignSkillAvailability =
  (typeof DESIGN_SKILL_AVAILABILITY)[number];

interface DesignSkillSeedGroup {
  sourceCategory: DesignSkillSourceCategory;
  family: DesignSkillFamilyId;
  ids: readonly string[];
}

interface DesignSkillFamilyContract {
  label: string;
  summary: string;
  inputs: readonly string[];
  workflow: readonly string[];
  guardrails: readonly string[];
  acceptanceChecks: readonly string[];
}

export interface DesignSkillDefinition {
  id: string;
  title: string;
  sourceCategory: DesignSkillSourceCategory;
  family: DesignSkillFamilyId;
  familyLabel: string;
  purpose: string;
  availability: DesignSkillAvailability;
  requirements: string[];
  sourceUrl: string;
}

export interface ResolvedDesignSkill extends DesignSkillDefinition {
  inputs: string[];
  workflow: string[];
  guardrails: string[];
  acceptanceChecks: string[];
}

const FAMILY_CONTRACTS: Record<DesignSkillFamilyId, DesignSkillFamilyContract> =
  {
    "workflow-extraction": {
      label: "Source-to-workflow",
      summary:
        "Turn supplied evidence into a reusable, original, verifiable procedure or prompt package.",
      inputs: [
        "The complete source artifact and its provenance.",
        "The exact reusable outcome and target surface.",
        "Project constraints, audience, assets, and proof expectations.",
      ],
      workflow: [
        "Read the complete source and build an evidence ledger before proposing any reusable behavior.",
        "Separate transferable mechanics from source branding, proprietary content, incidental layout, and unsupported claims.",
        "Define one bounded capability with explicit inputs, states, defaults, accessibility, performance, and failure behavior.",
        "Produce the requested project-native artifact and keep source identity, assets, and private data out unless their use is authorized and licensed.",
        "Run the strongest available functional and visual proof, then report the source mapping and any unverified boundary.",
      ],
      guardrails: [
        "Do not clone the source page, voice, campaign, or product identity.",
        "Do not infer missing behaviors from a title or screenshot alone.",
        "Do not treat a prompt, screenshot, or generated preview as functioning proof.",
        "Preserve unrelated work and keep the resulting change narrow.",
      ],
      acceptanceChecks: [
        "Every retained behavior traces to source evidence.",
        "The result transfers to a different subject and brand.",
        "Responsive, keyboard, reduced-motion, and failure states are covered when relevant.",
        "The real artifact was exercised or the missing proof is labeled.",
      ],
    },
    "evidence-audit": {
      label: "Evidence audit",
      summary:
        "Compare claims or output with direct evidence and explain the verdict without overstating certainty.",
      inputs: [
        "The artifact, claim, or change under review.",
        "Primary reference material and the user’s acceptance criteria.",
        "Available tests, logs, screenshots, diffs, or runtime evidence.",
      ],
      workflow: [
        "Identify the authoritative source, the exact claim, and the expected behavior.",
        "Inspect direct evidence first, including diffs, call sites, tests, rendered output, and source references.",
        "Classify each finding as verified fact, supported judgment, unresolved risk, or unavailable evidence.",
        "Recommend the smallest concrete correction for every actionable mismatch.",
        "Explain what changed, why it matters, how it was verified, and what remains unproven.",
      ],
      guardrails: [
        "Do not convert similarity concerns into unsupported legal conclusions.",
        "Do not call static inspection a runtime test.",
        "Do not hide important caveats behind a simplified explanation.",
        "Do not say everything works when only a bounded path was checked.",
      ],
      acceptanceChecks: [
        "Every verdict points to concrete evidence.",
        "Facts and judgment are visibly separated.",
        "Partial or blocked verification is named precisely.",
        "The explanation is concise enough for a new reader without losing risk.",
      ],
    },
    capture: {
      label: "Browser capture",
      summary:
        "Capture trustworthy browser still or motion evidence and verify the produced media.",
      inputs: [
        "The exact page, viewport, target states, and interaction sequence.",
        "The required output format, dimensions, frame rate, and crop.",
        "Expected lazy-load, animation, canvas, authentication, or consent behavior.",
      ],
      workflow: [
        "Open the real target and establish the required viewport, load state, and authenticated boundary.",
        "Prime lazy content and reveal states through deliberate scrolling or interaction before recording.",
        "Capture only the requested browser region with an intentional cursor and state sequence.",
        "Inspect duration, dimensions, frames, seams, blank regions, crop, and visual continuity.",
        "Re-record or re-stitch any invalid segment, then retain the final evidence and verification result.",
      ],
      guardrails: [
        "Do not capture secrets, private notifications, or unrelated desktop content.",
        "Do not assume a full-page API works for canvas, WebGL, lazy, or reveal-heavy pages.",
        "Do not fabricate cursor motion, clicks, or states that were not exercised.",
        "Do not call media valid without opening or probing the output.",
      ],
      acceptanceChecks: [
        "The requested viewport and complete target are visible.",
        "No blank bands, duplicate seams, clipped overlays, or missing lazy content remain.",
        "Dimensions, duration, frame rate, and crop match the brief.",
        "The captured sequence corresponds to the described user path.",
      ],
    },
    support: {
      label: "Customer support",
      summary:
        "Resolve an account or billing case through complete-thread evidence, authority checks, and post-action read-back.",
      inputs: [
        "The complete canonical customer thread and normalized identifiers.",
        "Authoritative product, account, entitlement, billing, and refund policy.",
        "The requested outcome plus explicit send, financial, or account-action authority.",
      ],
      workflow: [
        "Read the full canonical thread and reconcile duplicates before selecting a case flow.",
        "Match the customer, account, subscription, invoice, transaction, and entitlement using authoritative identifiers.",
        "Separate the requested outcome from what policy and current authority permit.",
        "Draft first; require explicit approval before sending, refunding, cancelling, granting access, or changing an account.",
        "Read back the resulting account/billing state and sent thread, then archive or close only when every closure condition is proven.",
      ],
      guardrails: [
        "Mark missing account, thread, policy, or authority facts UNKNOWN.",
        "Never infer financial approval from a support request.",
        "Never let a successful API call substitute for state read-back or customer communication.",
        "Never expose another customer’s data or merge accounts from fuzzy identity alone.",
      ],
      acceptanceChecks: [
        "The case flow matches the actual request and complete thread.",
        "Identity, account, and canonical thread matching are proven.",
        "Every external action has authority and a post-action read-back.",
        "Closure includes the sent communication and final archive state.",
      ],
    },
    "voice-social": {
      label: "Voice and social",
      summary:
        "Create user-owned narration or social drafts with source, identity, approval, and account boundaries visible.",
      inputs: [
        "User-owned source text, purpose, audience, and desired delivery.",
        "The connected account or local voice profile when execution is requested.",
        "Length, format, disclosure, pronunciation, and approval constraints.",
      ],
      workflow: [
        "Confirm the user-owned identity, source material, target account, and whether the request is draft-only or execution-authorized.",
        "Analyze the relevant corpus or voice profile without inventing unavailable examples, credentials, or ownership.",
        "Draft concise content that preserves facts, attribution, links, and the user’s actual viewpoint.",
        "Preview pronunciation, formatting, length, link behavior, and platform-specific constraints.",
        "Save or send only through the connected authorized surface, then verify the resulting artifact or draft state.",
      ],
      guardrails: [
        "Do not impersonate a living person or claim access to a private corpus that was not supplied.",
        "Do not post, send, or generate paid media without explicit authority.",
        "Do not place voice IDs, emails, tokens, or account defaults in tracked source.",
        "Do not invent quotations, endorsements, performance, or audience claims.",
      ],
      acceptanceChecks: [
        "The draft is fact-preserving, original, and appropriate for the stated account.",
        "Execution prerequisites and approval state are explicit.",
        "Links, attribution, pronunciation, and platform length are checked.",
        "A created artifact or external draft is read back before completion is reported.",
      ],
    },
    performance: {
      label: "Performance profiling",
      summary:
        "Measure, isolate, and correct frontend or Apple-platform performance problems with cleanup proof.",
      inputs: [
        "The real slow path, device/host, reproduction steps, and target metric.",
        "A before trace or the strongest available runtime evidence.",
        "The relevant animation, timer, observer, render loop, memory, CPU, launch, or thermal boundary.",
      ],
      workflow: [
        "Reproduce the exact path and capture a baseline trace before changing behavior.",
        "Separate main-thread, layout, paint, GPU, memory, timer, observer, and offscreen work.",
        "Find the smallest ownership point that can pause, batch, dispose, virtualize, or reduce work.",
        "Implement one bounded correction with visibility, teardown, reduced-motion, and error paths.",
        "Repeat the same measurement and report measured change separately from code-level inference.",
      ],
      guardrails: [
        "Do not claim a speedup without comparable before and after evidence.",
        "Do not optimize by hiding content or breaking interaction semantics.",
        "Do not leave requestAnimationFrame, timers, observers, listeners, textures, or renderers alive after teardown.",
        "Apple Instruments and MetricKit work requires an appropriate macOS/Xcode host.",
      ],
      acceptanceChecks: [
        "The original reproduction path and metric are documented.",
        "Offscreen and hidden work pauses where appropriate.",
        "Cleanup and reduced-motion behavior are exercised.",
        "Measured results and remaining uncertainty are reported separately.",
      ],
    },
    "media-sourcing": {
      label: "Media sourcing",
      summary:
        "Select fit-for-purpose image assets with real URLs, crop guidance, provenance, and licensing checks.",
      inputs: [
        "The subject, emotional role, placement, and art direction.",
        "Required aspect ratios, responsive sizes, crop safety, and focal point.",
        "Permitted source, license, attribution, and usage context.",
      ],
      workflow: [
        "Translate the design role into specific subject, composition, light, palette, and negative-space search terms.",
        "Search the authorized source and inspect the actual asset page rather than inventing URLs.",
        "Shortlist distinct options that cover the requested ratios and preserve the focal subject under crop.",
        "Record source, author or asset identifier, license posture, attribution, and responsive transformation guidance.",
        "Preview the chosen asset in context and replace it if readability, crop, originality, or rights are unclear.",
      ],
      guardrails: [
        "Do not fabricate asset URLs or claim a license that was not checked.",
        "Do not use private, watermarked, or client-restricted imagery.",
        "Do not use a stock image as false customer, employee, testimonial, or product evidence.",
        "Do not hotlink when the source terms or production environment prohibit it.",
      ],
      acceptanceChecks: [
        "Every option has a real source and traceable license posture.",
        "The chosen crop works at all required ratios.",
        "Text contrast and focal-point preservation are proven in context.",
        "Attribution and download/hosting requirements are handed off.",
      ],
    },
    "design-brief": {
      label: "Design-first brief",
      summary:
        "Turn an interface request into a skimmable, constraint-led design and implementation brief.",
      inputs: [
        "User goal, audience, primary action, and required content.",
        "Existing product tokens, components, references, and technical constraints.",
        "Responsive, accessibility, performance, data, and state requirements.",
      ],
      workflow: [
        "State the user outcome and hierarchy before describing visual treatment.",
        "Define the information architecture, primary action, states, and responsive behavior.",
        "Specify a bounded visual system using existing product tokens and components first.",
        "Describe motion, media, and interaction only where they clarify hierarchy or feedback.",
        "Add concrete acceptance checks and iterate by changing one or two variables at a time.",
      ],
      guardrails: [
        "Do not use vague aesthetic adjectives without layout or behavior constraints.",
        "Do not replace the project design system with a reference’s identity.",
        "Do not omit empty, loading, error, focus, touch, or reduced-motion states.",
        "Do not ask the generator to invent claims, customers, metrics, or product behavior.",
      ],
      acceptanceChecks: [
        "The brief is skimmable and implementation-ready.",
        "Hierarchy, responsive behavior, and every interactive state are explicit.",
        "Visual direction is compatible with the existing product.",
        "Acceptance checks can be tested without subjective guesswork.",
      ],
    },
    "marketing-system": {
      label: "Marketing system",
      summary:
        "Build an evidence-led marketing or editorial page whose structure proves the product or service.",
      inputs: [
        "Audience, offer, conversion action, objections, and verified proof.",
        "Real product workflow, service process, pricing, media, and legal constraints.",
        "Existing brand, component, analytics, SEO, accessibility, and performance requirements.",
      ],
      workflow: [
        "Define one audience, one friction, one promise, and one primary conversion path.",
        "Build the page narrative from verified mechanism and evidence: problem, workflow, proof, controls, objections, and action.",
        "Choose a restrained visual lane that supports the offer without copying the reference identity.",
        "Implement semantic navigation, complete responsive sections, real states, qualified forms, and a deterministic or labeled sample.",
        "Validate claims, pricing, keyboard/touch behavior, mobile order, performance, SEO, reduced motion, and the complete conversion path.",
      ],
      guardrails: [
        "Do not invent customers, testimonials, metrics, logos, compliance badges, prices, or outcomes.",
        "Do not substitute a hero mockup for a complete page or real mechanism.",
        "Do not hide limits, approval steps, failure states, security boundaries, or rollback.",
        "Do not call work award-winning without verifiable evidence.",
      ],
      acceptanceChecks: [
        "The first viewport states the offer and shows credible mechanism or evidence.",
        "Every major claim is verified or clearly labeled as sample.",
        "The full page supports keyboard, touch, mobile, zoom, and reduced motion.",
        "The conversion action explains what happens next and handles errors.",
      ],
    },
    "visual-system": {
      label: "Visual system",
      summary:
        "Translate a named art direction into coherent tokens, composition, surfaces, typography, and responsive rules.",
      inputs: [
        "The named visual direction and the product’s existing design authority.",
        "Content hierarchy, target surfaces, imagery, and responsive breakpoints.",
        "Contrast, accessibility, rendering, and performance constraints.",
      ],
      workflow: [
        "Extract the named direction into a small token set for color, type, spacing, line, radius, elevation, and media treatment.",
        "Map those tokens onto the existing product hierarchy and component primitives before creating any new primitive.",
        "Compose one dominant visual idea, supporting structure, and restrained detail system across the requested surfaces.",
        "Define mobile collapse, content overflow, empty/error states, focus, touch, reduced motion, and non-JavaScript fallbacks.",
        "Render and compare the complete surface at target viewports, then remove incoherent decoration and token drift.",
      ],
      guardrails: [
        "Do not mix multiple named style lanes in one surface without a deliberate hierarchy.",
        "Do not override Nexus tokens globally for a local art-direction task.",
        "Do not trade contrast, semantics, legibility, or data truth for atmosphere.",
        "Do not copy brand assets, signature composition, or source text.",
      ],
      acceptanceChecks: [
        "The result has one recognizable, internally consistent visual idea.",
        "Tokens and components remain project-owned and reusable.",
        "Mobile, zoom, contrast, focus, and content overflow are checked.",
        "Atmospheric layers fail safely without hiding content.",
      ],
    },
    motion: {
      label: "Motion and scroll",
      summary:
        "Implement purposeful interaction or scroll motion with explicit state, timing, cleanup, and reduced-motion behavior.",
      inputs: [
        "The user state change or narrative progression the motion must explain.",
        "Trigger, start/end states, timing, easing, viewport, touch, and interruption behavior.",
        "The existing project motion budget and chosen single animation/scroll owner.",
      ],
      workflow: [
        "State the purpose, trigger, owned properties, settled state, and interruption behavior before choosing a library.",
        "Build semantic static content first so the experience remains complete without motion.",
        "Implement the smallest reusable motion primitive with bounded transform/opacity work and one property owner.",
        "Add visibility pausing, resize/refresh, touch/keyboard behavior, reduced-motion settled state, and complete teardown.",
        "Exercise forward, reverse, interrupted, hidden-tab, offscreen, mobile, and reduced-motion paths while watching CPU and layout.",
      ],
      guardrails: [
        "Do not animate without hierarchy, feedback, continuity, or narrative purpose.",
        "Do not initialize multiple smooth-scroll engines or multiple owners for one property.",
        "Do not split accessible text without preserving an unsplit accessible name.",
        "Do not leave observers, timelines, raf loops, listeners, or pinning styles after cleanup.",
      ],
      acceptanceChecks: [
        "Content is usable before animation and in reduced-motion mode.",
        "Motion remains interruptible and correct in both scroll directions where relevant.",
        "Only transform/opacity or a justified measured alternative animates continuously.",
        "No offscreen loop, layout thrash, focus loss, or cleanup leak remains.",
      ],
    },
    webgl: {
      label: "WebGL and interactive renderer",
      summary:
        "Add one justified canvas or renderer responsibility with static fallback, bounded resources, and complete disposal.",
      inputs: [
        "The exact visual or data responsibility that requires a renderer.",
        "Target devices, asset/data source, interaction model, and fallback poster.",
        "Dependency, SSR, bundle, performance, accessibility, and context-loss constraints.",
      ],
      workflow: [
        "Prove that canvas, WebGL, WebGPU, physics, or an embed materially serves the requested outcome.",
        "Define one scene responsibility, renderer ownership boundary, semantic text equivalent, and static fallback.",
        "Initialize the selected renderer behind client/feature detection with capped device pixel ratio and bounded assets.",
        "Add resize, visibility, offscreen, pointer/touch, reduced-motion, error, and context-loss handling.",
        "Measure representative devices and dispose every frame, observer, listener, target, texture, geometry, material, renderer, and embed handle.",
      ],
      guardrails: [
        "Do not add a renderer as decorative background noise.",
        "Do not install a package without explicit dependency review.",
        "Do not let canvas replace semantic content, controls, or accessible labels.",
        "Do not run high-DPR or offscreen rendering continuously.",
      ],
      acceptanceChecks: [
        "A static or semantic fallback preserves the complete message.",
        "The renderer pauses offscreen/hidden and honors reduced motion.",
        "Resize, touch, failure, context loss, and teardown are tested.",
        "Bundle and frame cost stay within the project performance budget.",
      ],
    },
    "ui-detail": {
      label: "UI detail",
      summary:
        "Apply one composable border, shadow, frame, mask, icon, blur, or state detail without replacing the component system.",
      inputs: [
        "The exact component and state that needs stronger hierarchy or feedback.",
        "Current tokens, dimensions, radii, contrast, focus, and responsive behavior.",
        "The requested detail mechanism and its fallback.",
      ],
      workflow: [
        "Confirm the detail communicates hierarchy, boundary, progress, selection, focus, or brand rather than decoration alone.",
        "Implement it through the existing component and token system with the smallest property surface.",
        "Cover default, hover, focus-visible, active, selected, disabled, loading, error, touch, and reduced-motion states as relevant.",
        "Add a dependency only after explicit review; otherwise implement a project-native CSS or SVG treatment.",
        "Inspect contrast, clipping, overflow, stacking, zoom, mobile wrapping, forced colors, and render cost.",
      ],
      guardrails: [
        "Do not communicate state through color or motion alone.",
        "Do not use a package for a detail that project CSS can express safely.",
        "Do not create global style leakage or hard-code a reference brand.",
        "Do not obscure focus rings, text, hit targets, or data.",
      ],
      acceptanceChecks: [
        "The detail has one clear state or hierarchy purpose.",
        "All applicable interaction states remain visible and accessible.",
        "No clipping, stacking, contrast, or responsive regression remains.",
        "The implementation is tokenized, bounded, and removable.",
      ],
    },
  };

const SEED_GROUPS: readonly DesignSkillSeedGroup[] = [
  {
    sourceCategory: "codex",
    family: "workflow-extraction",
    ids: [
      "article-prompts-to-skills",
      "build-daily-inspiration-sites",
      "daily-ui-inspiration-capture",
      "generate-reference-inspired-brand-worlds",
      "html-to-interaction-prompts",
      "video-to-superprompt",
    ],
  },
  {
    sourceCategory: "codex",
    family: "evidence-audit",
    ids: ["audit-reference-originality", "audit-verify-explain-grade-5"],
  },
  {
    sourceCategory: "codex",
    family: "capture",
    ids: ["browser-video-recording", "stitched-full-page-capture"],
  },
  {
    sourceCategory: "codex",
    family: "support",
    ids: ["customer-email-draft-threads", "customer-support-verification"],
  },
  {
    sourceCategory: "codex",
    family: "voice-social",
    ids: ["elevenlabs-tts", "write-like-meng-on-x", "x-bookmark-quote-posts"],
  },
  {
    sourceCategory: "codex",
    family: "performance",
    ids: ["optimize-web-animations", "performance-profiling"],
  },
  {
    sourceCategory: "customer-support",
    family: "support",
    ids: ["handle-saas-account-cases", "handle-saas-billing-cases"],
  },
  {
    sourceCategory: "media",
    family: "media-sourcing",
    ids: ["aura-asset-images", "unsplash-asset-images"],
  },
  {
    sourceCategory: "ui",
    family: "design-brief",
    ids: ["design-first-ui-prompting"],
  },
  {
    sourceCategory: "web-design",
    family: "marketing-system",
    ids: [
      "build-awwwards-quality-sites",
      "documentary-brutalist-agency",
      "editorial-portfolio-chapters",
      "editorial-service-booking",
      "landing-page",
      "operational-enterprise-ai",
      "pricing-page",
      "product-proof-saas",
    ],
  },
  {
    sourceCategory: "web-design",
    family: "visual-system",
    ids: [
      "agency-grid-layout-minimal",
      "atmosphere-background",
      "blue-cloudy-clean-modern",
      "blue-laser-clean-glass-layout",
      "book-serif-index",
      "bright-green-tech-system-webgl",
      "clean-minimal-beige-light-mode",
      "dark-blue-contrasting-clean",
      "dark-glass-clean-layout",
      "dither-laser-dark-mode",
      "editorial-tech",
      "framed-grid-layout",
      "framed-tech-dark-border-gradient",
      "funky-purple-container-tech",
      "glass-dark-mode-clock",
      "glass-dark-ui",
      "high-contrast-skeuomorphic-clean",
      "image-first-grid-layout",
      "light-mode-paper-technical",
      "mesh-gradient-dark-blue-clean",
      "nested-container-clean-agency",
      "nested-container-frames",
      "orange-clean-paper-saas",
      "skeuomorphic-ui",
      "split-layout-technical",
      "tech-green-dark-mode-modern",
      "technical-wireframe-info-layout",
    ],
  },
  {
    sourceCategory: "web-design",
    family: "motion",
    ids: [
      "ambient-section-particles",
      "animation-on-scroll",
      "animation-systems",
      "cinematic-gsap-lenis-motion-system",
      "cinematic-scroll-storytelling",
      "gooey-blob-system",
      "gsap-scrolltrigger-storytelling",
      "gsap",
      "marquee-loop",
      "masked-reveal",
      "reveal-hover-effect",
      "scroll-progress-timeline",
      "scroll-scrubbed-visual-sequence",
      "scroll-scrubbed-word-reveal",
      "scroll-world-storytelling",
      "staggered-word-reveal",
    ],
  },
  {
    sourceCategory: "web-design",
    family: "webgl",
    ids: [
      "add-shader-cursor-trail",
      "background-grid-webgl",
      "cobejs",
      "corner-lasers",
      "dither-background",
      "globe-gl",
      "globe-particles",
      "liquid-metal-border",
      "matterjs",
      "shaders-cursor-ripples",
      "thinking-orbs",
      "threejs",
      "unicorn-studio",
      "vantajs",
      "webgl-3d-object",
      "webgl-landing-steering",
      "webgl-laser",
    ],
  },
  {
    sourceCategory: "web-design",
    family: "ui-detail",
    ids: [
      "beam-glow-states",
      "beautiful-shadows",
      "company-logos",
      "container-lines",
      "corner-diagonals",
      "css-alpha-masking",
      "css-border-gradient",
      "number-details",
      "progressive-blur",
      "solar-duotone-bold",
      "tailwindcss",
    ],
  },
] as const;

export const EXCLUDED_GAME_SKILL_IDS = [
  "implement-fog-of-war",
  "author-game-levels",
  "build-game-audio-feedback",
  "build-game-camera-controls",
  "build-game-changelog",
  "build-game-inventory",
  "build-game-map-editor",
  "build-game-monster-system",
  "build-hybrid-game-assets",
  "build-isometric-arpg",
  "build-mobile-threejs-games",
  "build-threejs-enemy-systems",
  "build-vesperfall-review-assets",
  "create-game-vfx",
  "design-action-combat",
  "design-game-encounters",
  "optimize-threejs-games",
  "ship-web-games",
  "test-playable-web-games",
  "tune-enemy-ai",
] as const;

const CONNECTOR_REQUIRED_IDS = new Set([
  "browser-video-recording",
  "build-daily-inspiration-sites",
  "customer-email-draft-threads",
  "daily-ui-inspiration-capture",
  "elevenlabs-tts",
  "write-like-meng-on-x",
  "x-bookmark-quote-posts",
  "handle-saas-account-cases",
  "handle-saas-billing-cases",
  "aura-asset-images",
  "unsplash-asset-images",
]);

const HOST_REQUIRED_IDS = new Set(["performance-profiling"]);

const DEPENDENCY_REVIEW_IDS = new Set([
  "add-shader-cursor-trail",
  "background-grid-webgl",
  "beam-glow-states",
  "cinematic-gsap-lenis-motion-system",
  "cinematic-scroll-storytelling",
  "cobejs",
  "dither-background",
  "globe-gl",
  "globe-particles",
  "gsap-scrolltrigger-storytelling",
  "gsap",
  "liquid-metal-border",
  "masked-reveal",
  "matterjs",
  "shaders-cursor-ripples",
  "thinking-orbs",
  "threejs",
  "unicorn-studio",
  "vantajs",
  "webgl-3d-object",
  "webgl-landing-steering",
  "webgl-laser",
]);

const SPECIAL_PURPOSES: Record<string, string> = {
  "article-prompts-to-skills":
    "Extract independent reusable skills from a complete article or prompt source and prove each package.",
  "audit-reference-originality":
    "Audit output against supplied references for evidence-backed originality risk without making legal claims.",
  "audit-verify-explain-grade-5":
    "Audit a claim, verify it with direct evidence, and explain the bounded result in plain language.",
  "browser-video-recording":
    "Record a deliberate browser interaction as verified high-quality video evidence.",
  "build-daily-inspiration-sites":
    "Turn one approved inspiration pack into five distinct original landing-page builds through separate tasks.",
  "customer-email-draft-threads":
    "Triage complete customer email threads with a draft-only default and approval-gated external actions.",
  "customer-support-verification":
    "Run the final evidence and read-back gate for every customer support action.",
  "daily-ui-inspiration-capture":
    "Create a dated, deduplicated UI reference and prompt pack from real browser evidence.",
  "elevenlabs-tts":
    "Generate narration from user-owned text through an authorized local ElevenLabs voice profile.",
  "generate-reference-inspired-brand-worlds":
    "Create multiple original brand worlds from a visual reference while protecting signature elements.",
  "html-to-interaction-prompts":
    "Extract screenshot-backed reusable interaction prompts from supplied HTML.",
  "optimize-web-animations":
    "Profile and correct animation, canvas, timer, observer, and long-session performance problems.",
  "performance-profiling":
    "Profile Apple-platform CPU, memory, launch, battery, thermal, and hang behavior with native tools.",
  "stitched-full-page-capture":
    "Produce a trustworthy full-page image for lazy, reveal-heavy, canvas, or scroll-animated pages.",
  "video-to-superprompt":
    "Translate a reference video into a detailed, original recreation or inspiration brief.",
  "write-like-meng-on-x":
    "Adapt a supplied writing corpus into concise user-owned X drafts without impersonation or invented history.",
  "x-bookmark-quote-posts":
    "Turn authorized X bookmarks into source-backed quote-post drafts calibrated to a supplied user corpus.",
  "handle-saas-account-cases":
    "Resolve SaaS access, entitlement, duplicate, platform, and positive-closure cases from authoritative evidence.",
  "handle-saas-billing-cases":
    "Resolve SaaS cancellation, failed-payment, refund, and renewal cases with explicit financial authority.",
  "aura-asset-images":
    "Source real Aura image candidates with crop, responsive, provenance, and usage guidance.",
  "unsplash-asset-images":
    "Source real Unsplash image candidates with crop, responsive, attribution, and licensing guidance.",
  "design-first-ui-prompting":
    "Write a constraint-led, implementation-ready UI brief before generation begins.",
};

const ACRONYMS: Record<string, string> = {
  ai: "AI",
  arpg: "ARPG",
  css: "CSS",
  gsap: "GSAP",
  html: "HTML",
  js: "JS",
  saas: "SaaS",
  seo: "SEO",
  tts: "TTS",
  ui: "UI",
  ux: "UX",
  vfx: "VFX",
  webgl: "WebGL",
  webgpu: "WebGPU",
  x: "X",
};

function titleize(id: string) {
  return id
    .split("-")
    .map(
      (token) =>
        ACRONYMS[token] ??
        `${token.slice(0, 1).toUpperCase()}${token.slice(1)}`,
    )
    .join(" ");
}

function availabilityFor(id: string): DesignSkillAvailability {
  if (CONNECTOR_REQUIRED_IDS.has(id)) return "connector_required";
  if (HOST_REQUIRED_IDS.has(id)) return "host_required";
  if (DEPENDENCY_REVIEW_IDS.has(id)) return "dependency_review";
  return "native";
}

function requirementsFor(id: string, availability: DesignSkillAvailability) {
  if (id === "performance-profiling") {
    return [
      "macOS host with a compatible Xcode and Instruments installation",
      "A reproducible Apple-platform build or MetricKit evidence",
    ];
  }
  if (id === "elevenlabs-tts") {
    return [
      "Connected ElevenLabs account and user-owned local voice profile",
      "Explicit generation authority and available account quota",
    ];
  }
  if (id === "build-daily-inspiration-sites") {
    return [
      "Connected Sites build/hosting surface",
      "Five approved source briefs and explicit deployment authority",
    ];
  }
  if (id === "customer-email-draft-threads" || id.startsWith("handle-saas-")) {
    return [
      "Connected canonical mail, account, and billing sources",
      "Explicit send, account, or financial authority for external actions",
    ];
  }
  if (id === "write-like-meng-on-x" || id === "x-bookmark-quote-posts") {
    return [
      "User-owned writing corpus and authorized X source/account access",
      "Explicit approval before any external post or reply",
    ];
  }
  if (id === "aura-asset-images" || id === "unsplash-asset-images") {
    return [
      "Authorized browser or source connector",
      "Per-asset license and attribution review",
    ];
  }
  if (
    id === "browser-video-recording" ||
    id === "daily-ui-inspiration-capture"
  ) {
    return [
      "Authorized browser capture surface",
      "Local media inspection tools for the requested output",
    ];
  }
  if (availability === "dependency_review") {
    return [
      "Explicit dependency and license review before package adoption",
      "SSR/client boundary, bundle, accessibility, fallback, and cleanup proof",
    ];
  }
  return ["Existing Nexus components, tokens, and protected tools"];
}

function purposeFor(id: string, title: string, family: DesignSkillFamilyId) {
  if (SPECIAL_PURPOSES[id]) return SPECIAL_PURPOSES[id];
  const familyLabel = FAMILY_CONTRACTS[family].label.toLowerCase();
  return `Apply the ${title} ${familyLabel} procedure as a bounded, accessible, performant addition to the existing product.`;
}

export const DESIGN_SKILLS: DesignSkillDefinition[] = SEED_GROUPS.flatMap(
  (group) =>
    group.ids.map((id) => {
      const title = titleize(id);
      const availability = availabilityFor(id);
      return {
        id,
        title,
        sourceCategory: group.sourceCategory,
        family: group.family,
        familyLabel: FAMILY_CONTRACTS[group.family].label,
        purpose: purposeFor(id, title, group.family),
        availability,
        requirements: requirementsFor(id, availability),
        sourceUrl: `${DESIGN_SKILL_SOURCE.repositoryUrl}/blob/${DESIGN_SKILL_SOURCE.branch}/agent-skills/${group.sourceCategory}/${id}/SKILL.md`,
      };
    }),
);

const DESIGN_SKILLS_BY_ID = new Map(
  DESIGN_SKILLS.map((skill) => [skill.id, skill]),
);

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function clampLimit(value: number | undefined) {
  if (!Number.isFinite(value)) return 40;
  return Math.max(1, Math.min(100, Math.trunc(value ?? 40)));
}

export function listDesignSkills(
  options: {
    query?: string;
    sourceCategory?: string;
    family?: string;
    availability?: string;
    limit?: number;
  } = {},
) {
  const query = normalize(options.query);
  const sourceCategory = normalize(options.sourceCategory);
  const family = normalize(options.family);
  const availability = normalize(options.availability);
  const limit = clampLimit(options.limit);

  const matches = DESIGN_SKILLS.filter((skill) => {
    if (sourceCategory && skill.sourceCategory !== sourceCategory) return false;
    if (family && skill.family !== family) return false;
    if (availability && skill.availability !== availability) return false;
    if (!query) return true;
    return [
      skill.id,
      skill.title,
      skill.sourceCategory,
      skill.family,
      skill.familyLabel,
      skill.purpose,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  return {
    total: DESIGN_SKILLS.length,
    matched: matches.length,
    returned: Math.min(matches.length, limit),
    excludedGameCount: EXCLUDED_GAME_SKILL_IDS.length,
    skills: matches.slice(0, limit),
  };
}

export function resolveDesignSkill(
  id: string | null | undefined,
): ResolvedDesignSkill | null {
  const skill = DESIGN_SKILLS_BY_ID.get(normalize(id));
  if (!skill) return null;
  const contract = FAMILY_CONTRACTS[skill.family];
  return {
    ...skill,
    inputs: [...contract.inputs],
    workflow: [
      `Use “${skill.title}” only for this bounded purpose: ${skill.purpose}`,
      ...contract.workflow,
    ],
    guardrails: [...contract.guardrails],
    acceptanceChecks: [...contract.acceptanceChecks],
  };
}

export function formatDesignSkillList(
  options: Parameters<typeof listDesignSkills>[0] = {},
) {
  const result = listDesignSkills(options);
  const lines = [
    `Design skill atlas: ${result.returned} of ${result.matched} matching; ${result.total} active non-game; ${result.excludedGameCount} game capabilities excluded.`,
  ];
  for (const skill of result.skills) {
    lines.push(
      `- ${skill.id} | ${skill.family} | ${skill.availability} | ${skill.purpose}`,
    );
  }
  if (result.returned < result.matched) {
    lines.push(
      `- More matches are available. Narrow query/category/family/availability or raise limit up to 100.`,
    );
  }
  lines.push(
    `Use resolve_design_skill with one exact ID before executing the capability.`,
  );
  return lines.join("\n");
}

function formatSection(label: string, values: readonly string[]) {
  return [
    label,
    ...values.map((value, index) => `${index + 1}. ${value}`),
  ].join("\n");
}

export function formatDesignSkillContract(
  id: string | null | undefined,
): string {
  const skill = resolveDesignSkill(id);
  if (!skill) {
    return `Unknown design skill "${(id ?? "").trim()}". Use list_design_skills to find an exact active non-game ID.`;
  }
  return [
    `${skill.title} (${skill.id})`,
    `Source category: ${skill.sourceCategory}`,
    `Family: ${skill.familyLabel} (${skill.family})`,
    `Availability: ${skill.availability}`,
    `Purpose: ${skill.purpose}`,
    `Source: ${skill.sourceUrl}`,
    formatSection("Requirements:", skill.requirements),
    formatSection("Inputs:", skill.inputs),
    formatSection("Workflow:", skill.workflow),
    formatSection("Guardrails:", skill.guardrails),
    formatSection("Acceptance checks:", skill.acceptanceChecks),
    "Execution boundary: this read-only contract does not authorize installs, files, browsers, deployments, provider calls, messages, posts, billing, account actions, or external media generation. Use the existing protected tool and approval path for each actual action.",
  ].join("\n\n");
}
