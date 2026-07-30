export const GO_TO_MARKET_SKILL_SOURCE = {
  id: "varnan-tech-opendirectory",
  label: "Varnan-Tech/OpenDirectory",
  repositoryUrl: "https://github.com/Varnan-Tech/OpenDirectory",
  branch: "main",
  reviewedAt: "2026-07-26",
  license: "MIT",
  packageVersion: "1.0.1",
  readmeBlobSha: "f5101cf2b986f13172b15a5280c947e13f1d2bf2",
} as const;

export const GO_TO_MARKET_SOURCE_CATEGORIES = [
  "visual-media",
  "content",
  "launch",
  "gtm-intelligence",
  "outreach",
  "research",
  "developer-tools",
  "other",
] as const;

export type GoToMarketSourceCategory =
  (typeof GO_TO_MARKET_SOURCE_CATEGORIES)[number];

export const GO_TO_MARKET_FAMILY_IDS = [
  "visual-production",
  "content-packaging",
  "launch-communications",
  "market-intelligence",
  "outreach-drafting",
  "buyer-research",
  "developer-communications",
  "opportunity-research",
] as const;

export type GoToMarketFamilyId = (typeof GO_TO_MARKET_FAMILY_IDS)[number];

export const GO_TO_MARKET_AVAILABILITY = [
  "native",
  "source_required",
  "connector_required",
  "host_required",
  "dependency_review",
] as const;

export type GoToMarketAvailability = (typeof GO_TO_MARKET_AVAILABILITY)[number];

interface GoToMarketSeedGroup {
  sourceCategory: GoToMarketSourceCategory;
  family: GoToMarketFamilyId;
  ids: readonly string[];
}

interface GoToMarketFamilyContract {
  label: string;
  summary: string;
  inputs: readonly string[];
  workflow: readonly string[];
  guardrails: readonly string[];
  acceptanceChecks: readonly string[];
}

export interface GoToMarketSkillDefinition {
  id: string;
  title: string;
  sourceCategory: GoToMarketSourceCategory;
  family: GoToMarketFamilyId;
  familyLabel: string;
  purpose: string;
  availability: GoToMarketAvailability;
  requirements: string[];
  sourceUrl: string;
}

export interface ResolvedGoToMarketSkill extends GoToMarketSkillDefinition {
  inputs: string[];
  workflow: string[];
  guardrails: string[];
  acceptanceChecks: string[];
}

export const EXCLUDED_GO_TO_MARKET_SKILLS = [
  {
    id: "claude-md-generator",
    conflict: "product_purpose",
    reason:
      "Nexus uses AGENTS.md and its file-first context spine as current authority; generating a competing CLAUDE.md would revive a legacy authority path.",
  },
  {
    id: "cold-email-verifier",
    conflict: "security",
    reason:
      "Autonomous address guessing, enrichment, and verification would create a personal-data harvesting and unsolicited-outreach surface.",
  },
  {
    id: "npm-downloads-to-leads",
    conflict: "product_purpose",
    reason:
      "Turning maintainers into contactable leads conflicts with Nexus's research-first, non-harvesting product boundary.",
  },
  {
    id: "yc-intent-radar-skill",
    conflict: "security",
    reason:
      "The defining authenticated-session login-bypass scraper is not an acceptable Nexus capability.",
  },
] as const;

const FAMILY_CONTRACTS: Record<GoToMarketFamilyId, GoToMarketFamilyContract> = {
  "visual-production": {
    label: "Visual production",
    summary:
      "Turn an approved brief into a reviewable visual or motion artifact with explicit output and tool requirements.",
    inputs: [
      "Approved audience, message, brand constraints, source facts, and assets.",
      "Required dimensions, format, duration, delivery surface, and accessibility constraints.",
      "Available local renderer, browser, media tools, or authorized generation connector.",
    ],
    workflow: [
      "Lock the brief, factual claims, asset rights, format, and acceptance criteria.",
      "Choose the smallest project-native production path and name every unavailable prerequisite.",
      "Build a structured draft with deliberate hierarchy, pacing, typography, and fallbacks.",
      "Render or preview representative states with reduced-motion and content-overflow behavior where relevant.",
      "Inspect the actual artifact for dimensions, legibility, seams, claims, licensing, and requested format before handoff.",
    ],
    guardrails: [
      "Do not copy source templates, brand identity, assets, or prompt bodies.",
      "Do not call a generated preview finished without opening or probing the output.",
      "Do not invoke paid generation, upload assets, or publish without explicit authority.",
      "Keep factual claims traceable and disclose synthetic imagery or media when required.",
    ],
    acceptanceChecks: [
      "The artifact matches the approved brief, dimensions, format, and audience.",
      "Claims, logos, imagery, fonts, music, and other assets have a valid source or license.",
      "The final rendered output was inspected, not inferred from source code.",
      "Unavailable tools or unverified output properties are stated plainly.",
    ],
  },
  "content-packaging": {
    label: "Content packaging",
    summary:
      "Transform user-owned evidence into a channel-ready draft while preserving facts, voice, attribution, and approval boundaries.",
    inputs: [
      "User-owned notes, source material, links, product facts, and target audience.",
      "Target channel, format, length, voice, call to action, and disclosure needs.",
      "Any connected source or publishing account required by the requested workflow.",
    ],
    workflow: [
      "Read the complete supplied source and separate verified facts from positioning choices.",
      "Select one channel-specific structure and preserve links, attribution, and the user's actual viewpoint.",
      "Draft the full artifact, including headline or hook, body, proof, transition, and call to action.",
      "Run a truth, tone, repetition, formatting, accessibility, and platform-constraint review.",
      "Return a reviewable draft; send, upload, schedule, or publish only through a separately authorized protected action.",
    ],
    guardrails: [
      "Do not fabricate customers, results, testimonials, quotations, metrics, or product behavior.",
      "Do not imitate a living person's voice or hide AI involvement where disclosure is required.",
      "Do not upload, post, email, or mutate a repository from this read-only procedure.",
      "Do not turn public discussion excerpts into unattributed or decontextualized claims.",
    ],
    acceptanceChecks: [
      "Every factual statement traces to supplied or cited evidence.",
      "The output fits the target channel without generic filler or repeated slogans.",
      "Links, attribution, formatting, and call to action are complete.",
      "Draft state and any unperformed external action are unambiguous.",
    ],
  },
  "launch-communications": {
    label: "Launch communications",
    summary:
      "Build an evidence-backed launch package with channel-specific messages and a human-controlled publication sequence.",
    inputs: [
      "Product truth: audience, problem, differentiators, proof, limitations, and current release state.",
      "Launch objective, channels, timing, brand constraints, and success measures.",
      "Repository, website, domain, or community evidence needed by the selected launch flow.",
    ],
    workflow: [
      "Interrogate the brief until audience, promise, proof, differentiation, and non-goals are concrete.",
      "Research only the approved public sources and retain direct evidence for every market or community claim.",
      "Create the required launch artifacts with channel-specific length, tone, and disclosure.",
      "Run honesty, specificity, platform-norm, link, claim, and sequencing reviews.",
      "Package drafts with an approval checklist and leave all account, domain, and publishing actions unperformed.",
    ],
    guardrails: [
      "Do not present an unreleased or unverified capability as available.",
      "Do not automate domain purchase, community posting, email, or social publication.",
      "Do not use fake scarcity, manufactured social proof, or unsupported comparison claims.",
      "Do not let a model review substitute for operator approval or source verification.",
    ],
    acceptanceChecks: [
      "The launch promise matches current product behavior and evidence.",
      "Each channel artifact respects its community or platform conventions.",
      "Timing, ownership, links, dependencies, and success measures are explicit.",
      "The package is ready for human review without implying it was published.",
    ],
  },
  "market-intelligence": {
    label: "Market intelligence",
    summary:
      "Collect bounded public market signals, retain provenance, and turn them into a cautious positioning or demand brief.",
    inputs: [
      "Approved product, company, competitor, keyword, repository, or community scope.",
      "Allowed public sources, time window, geography, language, and evidence threshold.",
      "Available connector credentials and explicit permission for any live collection.",
    ],
    workflow: [
      "Define the decision, source allowlist, time window, collection caps, and stopping rule.",
      "Collect only authorized public evidence with timestamps, URLs, platform terms, and failure receipts.",
      "Normalize and cluster signals without converting absence, popularity, or model output into ground truth.",
      "Score or rank using disclosed factors and keep raw evidence beside every synthesized conclusion.",
      "Deliver a bounded market, demand, channel, or positioning brief with limitations and a next manual decision.",
    ],
    guardrails: [
      "Do not bypass login, reuse sessions, evade rate limits, scrape private data, or monitor people covertly.",
      "Do not harvest personal contact details or convert maintainers and users into unsolicited leads.",
      "Do not post replies, launch ads, alert external channels, or schedule monitoring from this procedure.",
      "Treat AI scores and clusters as review aids, not objective facts.",
    ],
    acceptanceChecks: [
      "Every material conclusion links to dated source evidence.",
      "Collection scope, caps, failures, and unavailable sources are visible.",
      "Ranking factors and uncertainty are understandable to the operator.",
      "The output ends in a human decision, not an autonomous outreach or ad action.",
    ],
  },
  "outreach-drafting": {
    label: "Outreach drafting",
    summary:
      "Turn an operator-supplied relationship and buying signal into a respectful review-only sequence.",
    inputs: [
      "A lawfully obtained contact relationship and operator-supplied signal.",
      "The recipient's role, relevant problem, legitimate offer, channel constraints, and opt-out posture.",
      "Sequence length, timing assumptions, voice, evidence, and approval owner.",
    ],
    workflow: [
      "Verify the contact and signal were supplied legitimately and define the respectful stop condition.",
      "Map the signal to one relevant problem, proof point, and honest offer.",
      "Draft a short multi-touch sequence with channel-specific wording and objection handling.",
      "Review personalization, claims, pressure, duplication, privacy, and opt-out language.",
      "Return the sequence as drafts with explicit send order and leave all delivery actions unperformed.",
    ],
    guardrails: [
      "Do not guess addresses, enrich personal data, scrape contacts, or manufacture familiarity.",
      "Do not produce deceptive subject lines, false urgency, harassment, or spam volume.",
      "Do not send messages or update a CRM without explicit authority and a connected surface.",
      "Stop when the relationship, lawful basis, or claimed buying signal cannot be established.",
    ],
    acceptanceChecks: [
      "Every personalization detail came from operator-supplied or cited lawful evidence.",
      "The sequence is relevant, concise, pressure-aware, and easy to decline.",
      "Channel order, timing, stop conditions, and unperformed sends are explicit.",
      "No guessed contact data or covert enrichment appears in the output.",
    ],
  },
  "buyer-research": {
    label: "Buyer research",
    summary:
      "Build a sourced buyer, pricing, meeting, community, or funding brief from bounded public evidence.",
    inputs: [
      "Approved company, product, market, job post, podcast, investor, pricing, or community scope.",
      "Decision to support, source allowlist, time window, and required citations.",
      "Any authorized connector or user-supplied document needed to obtain evidence.",
    ],
    workflow: [
      "Define the decision and the minimum evidence needed to support it.",
      "Collect the approved sources, retaining URLs, dates, direct excerpts, and unavailable-source receipts.",
      "Normalize facts into comparable needs, prices, themes, risks, or fit signals.",
      "Synthesize a concise brief that separates verified evidence, interpretation, and unknowns.",
      "Recommend one bounded next action and keep Notion, CRM, email, investment, or purchase actions outside the procedure.",
    ],
    guardrails: [
      "Do not infer private intent, protected traits, funding certainty, or willingness to buy.",
      "Do not transcribe or reuse copyrighted media beyond authorized, necessary evidence.",
      "Do not save to external systems, contact people, or make financial commitments automatically.",
      "Mark inaccessible pricing, deleted posts, paywalls, and model-only claims as unavailable.",
    ],
    acceptanceChecks: [
      "The brief answers the stated decision with direct citations.",
      "Facts, interpretation, fit signals, and unknowns are visibly separated.",
      "Comparisons use consistent fields and dates.",
      "The next action is specific, reversible, and still under human control.",
    ],
  },
  "developer-communications": {
    label: "Developer communications",
    summary:
      "Convert repository and web evidence into reviewable documentation, release, PR, DX, or structured-data artifacts.",
    inputs: [
      "Authorized repository, branch, diff, website, issue, documentation, or dependency evidence.",
      "Target audience, artifact type, current project rules, and acceptance criteria.",
      "Explicit authority for any external comment, PR, Slack post, dependency change, or file write.",
    ],
    workflow: [
      "Read the authoritative repository or website context before drafting.",
      "Extract the exact behavior, change, dependency, audience, and evidence relevant to the artifact.",
      "Create the requested documentation, review, update, PR narrative, standup, or structured-data draft.",
      "Validate claims, links, schema, commands, compatibility, tests, and current project conventions.",
      "Return the artifact for review; apply, comment, post, open a PR, or update dependencies only through a separately authorized path.",
    ],
    guardrails: [
      "Do not generate a competing project authority file or overwrite human-owned context.",
      "Do not fabricate tests, changelog entries, issue status, dependency safety, or runtime behavior.",
      "Do not post comments, Slack updates, PRs, or dependency changes automatically.",
      "Do not crawl private or disallowed pages or inject structured data without page-owner authorization.",
    ],
    acceptanceChecks: [
      "The artifact is grounded in the actual repository, diff, site, or dependency evidence.",
      "Commands, links, schema, change descriptions, and tests are accurate.",
      "Project conventions and human-owned authority remain intact.",
      "Drafted content is clearly separated from unperformed external or mutating actions.",
    ],
  },
  "opportunity-research": {
    label: "Opportunity research",
    summary:
      "Evaluate a bounded public opportunity with conservative evidence and no automatic financial action.",
    inputs: [
      "Approved candidate list, niche, budget assumptions, and risk tolerance.",
      "Allowed registration, archive, reputation, backlink, trademark, and history sources.",
      "Decision criteria, disqualifiers, and evidence freshness threshold.",
    ],
    workflow: [
      "Define the opportunity thesis, budget, disqualifiers, and source allowlist.",
      "Collect current public evidence for status, history, reputation, fit, and legal risk.",
      "Score candidates with disclosed weights and reject missing or contradictory evidence.",
      "Present a conservative shortlist with source links, risks, and unknowns.",
      "Leave purchase, bidding, registration, outreach, and account actions to the operator.",
    ],
    guardrails: [
      "Do not auto-purchase, bid, register, contact owners, or imply guaranteed resale or SEO value.",
      "Do not ignore trademark, reputation, malware, spam, or historical-content risk.",
      "Do not treat a single API result as definitive ownership or availability proof.",
      "Do not use private credentials or evade registrar controls.",
    ],
    acceptanceChecks: [
      "Each candidate has current evidence, risks, unknowns, and a disclosed score.",
      "Trademark, reputation, historical-content, and availability checks are present.",
      "Financial upside is framed as uncertainty, not a promise.",
      "No purchase or external action occurred.",
    ],
  },
};

const SEED_GROUPS: readonly GoToMarketSeedGroup[] = [
  {
    sourceCategory: "visual-media",
    family: "visual-production",
    ids: [
      "blog-cover-image-cli",
      "graphic-case-study",
      "graphic-chart",
      "graphic-ebook",
      "graphic-gif",
      "graphic-slide-deck",
      "hyperframes-product-launch-video",
      "vid-motion-graphics",
      "vid-product-launch",
      "vid-sizzle-reel",
    ],
  },
  {
    sourceCategory: "content",
    family: "content-packaging",
    ids: [
      "cook-the-blog",
      "email-newsletter",
      "github-discussion-to-devrel-content",
      "human-tone",
      "linkedin-post-generator",
      "newsletter-digest",
      "noise-to-linkedin-carousel",
      "noise2blog",
      "store-listing-optimizer",
      "tweet-thread-from-blog",
    ],
  },
  {
    sourceCategory: "launch",
    family: "launch-communications",
    ids: [
      "brand-alchemy",
      "oss-launch-kit",
      "product-update-logger",
      "producthunt-launch-kit",
      "show-hn-writer",
    ],
  },
  {
    sourceCategory: "gtm-intelligence",
    family: "market-intelligence",
    ids: [
      "app-store-review-arbitrage",
      "company-radar",
      "competitor-pr-finder",
      "geo-gap-fixer",
      "gh-issue-to-demand-signal",
      "google-trends-api-skills",
      "hackernews-intel",
      "map-your-market",
      "meta-ads-skill",
      "meta-tribeV2-skill",
      "reddit-icp-monitor",
      "reddit-post-engine",
      "sdk-adoption-tracker",
      "twitter-GTM-find-skill",
    ],
  },
  {
    sourceCategory: "outreach",
    family: "outreach-drafting",
    ids: ["outreach-sequence-builder"],
  },
  {
    sourceCategory: "research",
    family: "buyer-research",
    ids: [
      "linkedin-job-post-to-buyer-pain-map",
      "meeting-brief-generator",
      "podcast-transcript-fetcher",
      "position-me",
      "pricing-finder",
      "pricing-page-psychology-audit",
      "vc-curated-match",
      "vc-finder",
      "where-your-customer-lives",
    ],
  },
  {
    sourceCategory: "developer-tools",
    family: "developer-communications",
    ids: [
      "dependency-update-bot",
      "docs-from-code",
      "dx-roaster",
      "explain-this-pr",
      "kill-the-standup",
      "llms-txt-generator",
      "pr-description-writer",
      "schema-markup-generator",
    ],
  },
  {
    sourceCategory: "other",
    family: "opportunity-research",
    ids: ["domain-expired-opportunity-finder"],
  },
];

const SPECIAL_TITLES: Record<string, string> = {
  "blog-cover-image-cli": "Blog Cover Image",
  "geo-gap-fixer": "Generative Search Visibility Gap",
  "gh-issue-to-demand-signal": "GitHub Issue to Demand Signal",
  "google-trends-api-skills": "Google Trends Research",
  "hackernews-intel": "Hacker News Intelligence",
  "llms-txt-generator": "llms.txt Generator",
  "meta-ads-skill": "Meta Ads Planning",
  "meta-tribeV2-skill": "TRIBE v2 Video Hook Review",
  "oss-launch-kit": "Open-Source Launch Kit",
  "pr-description-writer": "Pull Request Description Writer",
  "producthunt-launch-kit": "Product Hunt Launch Kit",
  "sdk-adoption-tracker": "SDK Adoption Tracker",
  "show-hn-writer": "Show HN Writer",
  "twitter-GTM-find-skill": "X/Twitter GTM Signal Research",
  "vc-curated-match": "Curated VC Match",
  "vc-finder": "VC Finder",
};

const PURPOSES: Record<string, string> = {
  "blog-cover-image-cli":
    "Create and quality-check a 1200×630 blog cover from an approved brief using an authorized image-generation path.",
  "graphic-case-study":
    "Package verified challenge, solution, results, and testimonial evidence into a browser and print-ready case study.",
  "graphic-chart":
    "Turn verified tabular data into an annotated publication-quality chart with disclosed scales and sources.",
  "graphic-ebook":
    "Structure verified B2B material into a short accessible HTML and print-ready ebook.",
  "graphic-gif":
    "Produce a short looping visual explanation from an approved storyboard and inspect timing, seams, and size.",
  "graphic-slide-deck":
    "Turn an approved brief or source document into a structured HTML presentation with optional print output.",
  "hyperframes-product-launch-video":
    "Plan and produce a premium launch-video sequence while retaining brand, asset, and render-tool boundaries.",
  "vid-motion-graphics":
    "Render a multi-scene motion-graphics brief through an approved browser and FFmpeg toolchain.",
  "vid-product-launch":
    "Build a five-part launch narrative from anticipation through evidence and a truthful call to action.",
  "vid-sizzle-reel":
    "Assemble a paced highlight reel from licensed brand assets, verified claims, and an approved soundtrack.",
  "cook-the-blog":
    "Build a source-backed case-study article package while separating research, image, storage, and repository actions.",
  "email-newsletter":
    "Draft a complete portable HTML email newsletter from verified source material.",
  "github-discussion-to-devrel-content":
    "Cluster recurring public discussion questions into cited documentation fixes, FAQs, and content opportunities.",
  "human-tone":
    "Rewrite marketing copy to remove generic AI filler while preserving facts and the user's own voice.",
  "linkedin-post-generator":
    "Transform approved source material into a review-ready LinkedIn post with a clear hook and accurate links.",
  "newsletter-digest":
    "Synthesize an approved RSS set into a cited weekly digest without automatically publishing it.",
  "noise-to-linkedin-carousel":
    "Turn rough user-owned notes into a concise slide-by-slide LinkedIn carousel content pack.",
  noise2blog:
    "Transform rough notes or a transcript into a sourced, structured, publication-ready blog draft.",
  "store-listing-optimizer":
    "Convert cited competitor-review pain points into truthful store-listing positioning opportunities.",
  "tweet-thread-from-blog":
    "Turn an approved article into a review-ready X/Twitter thread without posting it.",
  "brand-alchemy":
    "Interrogate an approved product brief and generate evidence-backed brand and naming directions with domain checks kept separate.",
  "oss-launch-kit":
    "Build a multi-channel open-source launch plan from current repository and audience evidence.",
  "product-update-logger":
    "Turn verified shipped changes into a changelog entry and coordinated review-ready content package.",
  "producthunt-launch-kit":
    "Package truthful product facts into Product Hunt listing, maker comment, social, and email drafts.",
  "show-hn-writer":
    "Draft a specific, candid Show HN title and body that follow community norms and current product truth.",
  "app-store-review-arbitrage":
    "Cluster cited low-star app reviews into broken-promise evidence and ethical positioning opportunities.",
  "company-radar":
    "Build a bounded multi-source company signal brief with disclosed scoring and source failures.",
  "competitor-pr-finder":
    "Map cited competitor press and community coverage into a reviewable channel and pitch-angle brief.",
  "geo-gap-fixer":
    "Audit cited generative-search visibility evidence and propose concrete content corrections without claiming deterministic ranking.",
  "gh-issue-to-demand-signal":
    "Cluster public repository issues into cited demand themes and neglected-request signals.",
  "google-trends-api-skills":
    "Collect bounded Google Trends evidence for keyword direction while exposing provider and sampling limits.",
  "hackernews-intel":
    "Review bounded Hacker News keyword matches and draft local signal summaries without starting alerts.",
  "map-your-market":
    "Synthesize approved public community and search evidence into an ICP and positioning map.",
  "meta-ads-skill":
    "Prepare a review-only Meta advertising plan and command checklist without launching or changing campaigns.",
  "meta-tribeV2-skill":
    "Review video-hook evidence through an explicitly available model while labeling neuroscience inference limits.",
  "reddit-icp-monitor":
    "Review bounded public subreddit evidence for problem signals and draft respectful replies without monitoring or posting.",
  "reddit-post-engine":
    "Research subreddit norms and draft a culture-aware contribution without posting it.",
  "sdk-adoption-tracker":
    "Map public repositories that import an SDK into a cited adoption brief without harvesting maintainer contacts.",
  "twitter-GTM-find-skill":
    "Research public X/Twitter hiring and company signals within approved connector and privacy boundaries.",
  "outreach-sequence-builder":
    "Turn an operator-supplied lawful buying signal into a respectful review-only multi-channel sequence.",
  "linkedin-job-post-to-buyer-pain-map":
    "Translate a supplied or authorized job post into cited buyer-pain, urgency, and fit hypotheses.",
  "meeting-brief-generator":
    "Build a one-page cited meeting brief and leave any external save or CRM action unperformed.",
  "podcast-transcript-fetcher":
    "Obtain or process authorized podcast transcripts with source, copyright, provider, and transcription-quality boundaries.",
  "position-me":
    "Audit a supplied website across discoverability, usability, positioning, and copy with cited evidence.",
  "pricing-finder":
    "Build a dated competitor-pricing comparison with consistent fields, missing-data receipts, and cautious recommendations.",
  "pricing-page-psychology-audit":
    "Review a pricing page against explicit decision-friction and communication principles without inventing conversion impact.",
  "vc-curated-match":
    "Match an approved company profile to a supplied investor dataset using disclosed industry, stage, and geography criteria.",
  "vc-finder":
    "Research cited comparable-company and public-thesis evidence into a cautious investor-fit shortlist.",
  "where-your-customer-lives":
    "Map cited public communities to an evidence-backed entry and content playbook.",
  "dependency-update-bot":
    "Audit outdated dependencies, read primary changelogs, and propose risk-grouped updates without opening PRs automatically.",
  "docs-from-code":
    "Generate repository documentation from reachable source evidence and current project authority.",
  "dx-roaster":
    "Score developer experience across explicit evidence-backed dimensions and return a prioritized fix list.",
  "explain-this-pr":
    "Explain an authorized pull request in plain language and return a draft comment without posting it.",
  "kill-the-standup":
    "Synthesize authorized issue and commit evidence into a done, doing, and blockers update without posting to Slack.",
  "llms-txt-generator":
    "Generate a review-ready llms.txt draft from an authorized public website and current content structure.",
  "pr-description-writer":
    "Turn the current authorized branch diff into an accurate pull-request description and testing summary.",
  "schema-markup-generator":
    "Generate validated JSON-LD from an authorized webpage without injecting it or opening a PR automatically.",
  "domain-expired-opportunity-finder":
    "Evaluate approved expired-domain candidates conservatively across fit, history, reputation, trademark, and availability evidence.",
};

const CONNECTOR_REQUIRED = new Set([
  "blog-cover-image-cli",
  "cook-the-blog",
  "github-discussion-to-devrel-content",
  "newsletter-digest",
  "brand-alchemy",
  "oss-launch-kit",
  "app-store-review-arbitrage",
  "company-radar",
  "competitor-pr-finder",
  "geo-gap-fixer",
  "gh-issue-to-demand-signal",
  "google-trends-api-skills",
  "hackernews-intel",
  "map-your-market",
  "meta-ads-skill",
  "meta-tribeV2-skill",
  "reddit-icp-monitor",
  "reddit-post-engine",
  "sdk-adoption-tracker",
  "twitter-GTM-find-skill",
  "linkedin-job-post-to-buyer-pain-map",
  "meeting-brief-generator",
  "pricing-finder",
  "vc-finder",
  "where-your-customer-lives",
  "dependency-update-bot",
  "explain-this-pr",
  "kill-the-standup",
]);

const HOST_REQUIRED = new Set([
  "graphic-gif",
  "hyperframes-product-launch-video",
  "vid-motion-graphics",
  "vid-product-launch",
  "vid-sizzle-reel",
  "podcast-transcript-fetcher",
]);

const SOURCE_REQUIRED = new Set([
  "store-listing-optimizer",
  "position-me",
  "vc-curated-match",
  "llms-txt-generator",
  "schema-markup-generator",
  "domain-expired-opportunity-finder",
]);

const DEPENDENCY_REVIEW = new Set(["graphic-chart"]);

function titleize(id: string) {
  if (SPECIAL_TITLES[id]) return SPECIAL_TITLES[id];
  return id
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function availabilityFor(id: string): GoToMarketAvailability {
  if (DEPENDENCY_REVIEW.has(id)) return "dependency_review";
  if (HOST_REQUIRED.has(id)) return "host_required";
  if (CONNECTOR_REQUIRED.has(id)) return "connector_required";
  if (SOURCE_REQUIRED.has(id)) return "source_required";
  return "native";
}

function requirementsFor(
  id: string,
  availability: GoToMarketAvailability,
): string[] {
  const requirements = [
    "Explicit operator intent, approved source scope, and project-owned output",
  ];
  if (availability === "connector_required") {
    requirements.push(
      "Available authorized connector or user-supplied evidence; no credential or account access is inferred",
    );
  } else if (availability === "host_required") {
    requirements.push(
      "Available local browser, media, transcription, or rendering tools with output inspection",
    );
  } else if (availability === "dependency_review") {
    requirements.push(
      "Explicit dependency, license, bundle, security, accessibility, and fallback review before adoption",
    );
  } else if (availability === "source_required") {
    requirements.push(
      "Complete user-supplied or separately authorized source evidence",
    );
  } else {
    requirements.push("Existing Nexus local files and protected tools");
  }
  if (
    id === "meta-ads-skill" ||
    id === "reddit-post-engine" ||
    id === "explain-this-pr" ||
    id === "kill-the-standup"
  ) {
    requirements.push(
      "Separate explicit approval before any advertising, post, comment, or message action",
    );
  }
  return requirements;
}

export const GO_TO_MARKET_SKILLS: GoToMarketSkillDefinition[] =
  SEED_GROUPS.flatMap((group) =>
    group.ids.map((id) => {
      const availability = availabilityFor(id);
      return {
        id,
        title: titleize(id),
        sourceCategory: group.sourceCategory,
        family: group.family,
        familyLabel: FAMILY_CONTRACTS[group.family].label,
        purpose:
          PURPOSES[id] ??
          `Apply ${titleize(id)} as a bounded project-owned procedure.`,
        availability,
        requirements: requirementsFor(id, availability),
        sourceUrl: `${GO_TO_MARKET_SKILL_SOURCE.repositoryUrl}/blob/${GO_TO_MARKET_SKILL_SOURCE.branch}/skills/${id}/SKILL.md`,
      };
    }),
  );

const GO_TO_MARKET_SKILLS_BY_ID = new Map(
  GO_TO_MARKET_SKILLS.map((skill) => [skill.id.toLowerCase(), skill]),
);

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function clampLimit(value: number | undefined) {
  if (!Number.isFinite(value)) return 40;
  return Math.max(1, Math.min(62, Math.trunc(value ?? 40)));
}

export function listGoToMarketSkills(
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

  const matches = GO_TO_MARKET_SKILLS.filter((skill) => {
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
    total: GO_TO_MARKET_SKILLS.length,
    matched: matches.length,
    returned: Math.min(matches.length, limit),
    excludedCount: EXCLUDED_GO_TO_MARKET_SKILLS.length,
    skills: matches.slice(0, limit),
  };
}

export function resolveGoToMarketSkill(
  id: string | null | undefined,
): ResolvedGoToMarketSkill | null {
  const skill = GO_TO_MARKET_SKILLS_BY_ID.get(normalize(id));
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

export function formatGoToMarketSkillList(
  options: Parameters<typeof listGoToMarketSkills>[0] = {},
) {
  const result = listGoToMarketSkills(options);
  const lines = [
    `Go-to-market skill atlas: ${result.returned} of ${result.matched} matching; ${result.total} active; ${result.excludedCount} boundary exclusions.`,
  ];
  for (const skill of result.skills) {
    lines.push(
      `- ${skill.id} | ${skill.family} | ${skill.availability} | ${skill.purpose}`,
    );
  }
  if (result.returned < result.matched) {
    lines.push(
      "More matches are available. Narrow query/category/family/availability or raise limit up to 62.",
    );
  }
  lines.push(
    "Use resolve_go_to_market_skill with one exact ID before executing the capability.",
  );
  return lines.join("\n");
}

function formatSection(label: string, values: readonly string[]) {
  return [
    label,
    ...values.map((value, index) => `${index + 1}. ${value}`),
  ].join("\n");
}

export function formatGoToMarketSkillContract(
  id: string | null | undefined,
): string {
  const skill = resolveGoToMarketSkill(id);
  if (!skill) {
    return `Unknown go-to-market skill "${(id ?? "").trim()}". Use list_go_to_market_skills to find an exact active ID.`;
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
    "Execution boundary: this read-only contract does not authorize installs, files, browser collection, provider calls, media generation, cloud uploads, messages, posts, ads, account actions, PRs, dependency changes, deployments, purchases, or external publication. Use the existing protected tool and approval path for every actual action.",
  ].join("\n\n");
}
