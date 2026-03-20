// ── lib/skillEngine.ts ─────────────────────────────────────────────────────────
// NEXUS PRIME — Skill Engine: types, default data, and utility functions
// for the autonomous learning and self-improvement subsystem.

export interface AmendmentRecord {
  id: string
  version: string
  rationale: string
  originalDesc: string
  amendedDesc: string
  status: 'proposed' | 'applied' | 'committed' | 'rolled_back'
  proposedAt: number
  evaluatedAt?: number
  metricDelta?: number
}

export type SkillTier = 'L0' | 'L1' | 'L2'

export interface Skill {
  id: string
  name: string
  category: string
  level: number          // 0-100
  experience: number     // XP points
  lastUsed: number       // timestamp
  description: string
  learned: string        // ISO date when first learned
  improvements: string[] // history of improvements
  // ── New fields (self-learning upgrade) ─────────────────────────────────
  successRate: number    // 0-1, ratio of successful runs
  totalRuns: number      // cumulative task executions
  failureCount: number   // total failure events
  version: string        // semantic version e.g. "1.0"
  abstract: string       // L0 one-liner (~15 words)
  overview: string       // L1 summary: triggers, prerequisites, workflow
  triggerPhrases: string[] // phrases that should route to this skill
  tags: string[]         // searchable tags
  relatedSkills: string[] // IDs of connected skills
  amendments: AmendmentRecord[] // self-improvement amendment history
}

export interface LearningEvent {
  id: string
  skillId: string
  skillName: string
  type: 'acquired' | 'improved' | 'error_learned' | 'pattern_detected' | 'optimization'
  description: string
  timestamp: number
  xpGained: number
}

export interface KnowledgeEntry {
  id: string
  title: string
  category: string
  content: string
  tags: string[]
  dateAdded: string
  relevanceScore: number
}

// ── XP curve: logarithmic — harder to level at higher tiers ──────────────────
export function calculateSkillLevel(xp: number): number {
  if (xp <= 0) return 0
  // Each level requires exponentially more XP
  // Level 100 ≈ 100,000 XP
  const level = Math.floor(Math.log(xp / 10 + 1) * 18)
  return Math.min(100, Math.max(0, level))
}

// ── Status thresholds ─────────────────────────────────────────────────────────
export function getSkillStatus(level: number): string {
  if (level >= 90) return 'Mastery'
  if (level >= 75) return 'Expert'
  if (level >= 50) return 'Proficient'
  if (level >= 25) return 'Developing'
  return 'Novice'
}

export function getStatusColor(level: number): string {
  if (level >= 90) return 'var(--gold)'
  if (level >= 75) return 'var(--accent)'
  if (level >= 50) return 'var(--blush)'
  if (level >= 25) return 'var(--text2)'
  return 'var(--text3)'
}

// ── Skill level bar gradient ───────────────────────────────────────────────────
export function getSkillBarGradient(level: number): string {
  if (level >= 90) return 'linear-gradient(to right, var(--burgundy), var(--rose), var(--gold))'
  if (level >= 75) return 'linear-gradient(to right, var(--burgundy), var(--accent))'
  if (level >= 50) return 'linear-gradient(to right, var(--burgundy), var(--blush))'
  if (level >= 25) return 'linear-gradient(to right, var(--surf3), var(--text2))'
  return 'linear-gradient(to right, var(--surf3), var(--text3))'
}

// ── Simulate a training event — returns a LearningEvent ──────────────────────
export function simulateLearning(skill: Skill): LearningEvent {
  const xpGained = Math.floor(Math.random() * 80) + 20
  const descriptions: Record<LearningEvent['type'], string[]> = {
    improved: [
      `Processed 1,200 additional samples — accuracy +${(Math.random() * 3 + 1).toFixed(1)}%`,
      `Reinforcement pass complete — ${Math.floor(Math.random() * 50 + 20)} edge cases resolved`,
      `Weight adjustment cycle finished — loss reduced by ${(Math.random() * 0.05 + 0.01).toFixed(3)}`,
    ],
    acquired: [
      `New capability unlocked via training corpus expansion`,
      `Module integrated from upstream knowledge transfer`,
    ],
    error_learned: [
      `False positive rate reduced after 48 failure samples analyzed`,
      `Edge case catalogued — boundary condition now handled`,
      `Misclassification pattern corrected in validation pass`,
    ],
    pattern_detected: [
      `Recurring ${skill.name.toLowerCase()} signature identified across ${Math.floor(Math.random() * 20 + 5)} instances`,
      `Temporal correlation mapped between input clusters`,
    ],
    optimization: [
      `Inference latency reduced ${Math.floor(Math.random() * 15 + 5)}ms via kernel fusion`,
      `Memory footprint trimmed ${Math.floor(Math.random() * 100 + 50)}KB after layer pruning`,
    ],
  }
  const types: LearningEvent['type'][] = ['improved', 'error_learned', 'pattern_detected', 'optimization']
  const type = types[Math.floor(Math.random() * types.length)]
  const descList = descriptions[type]
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    skillId: skill.id,
    skillName: skill.name,
    type,
    description: descList[Math.floor(Math.random() * descList.length)],
    timestamp: Date.now(),
    xpGained,
  }
}

// ── Improvement suggestions based on weakest skills ──────────────────────────
export function getImprovementSuggestions(skills: Skill[]): string[] {
  const sorted = [...skills].sort((a, b) => a.level - b.level)
  const weak = sorted.slice(0, 4)
  return weak.map(s => {
    const gap = 100 - s.level
    return `Boost ${s.name} (${s.category}) — currently level ${s.level}, ${gap} points to mastery`
  })
}

// ── Predict next milestone ────────────────────────────────────────────────────
export function predictNextMilestone(skill: Skill): { level: number; estimatedTime: string } {
  const milestones = [25, 50, 75, 90, 100]
  const next = milestones.find(m => m > skill.level) ?? 100
  // Estimate based on average XP gain per training session (~50 XP) and level curve
  const xpNeeded = Math.pow(Math.E, (next / 18)) * 10 - skill.experience
  const sessionsNeeded = Math.max(1, Math.ceil(xpNeeded / 50))
  const hours = sessionsNeeded * 2
  const days = Math.ceil(hours / 24)
  const timeStr = days < 1 ? `${hours}h` : days < 7 ? `${days}d` : `${Math.ceil(days / 7)}w`
  return { level: next, estimatedTime: timeStr }
}

// ── Overall system intelligence score ─────────────────────────────────────────
export function getSystemHealthFromSkills(skills: Skill[]): number {
  if (!skills.length) return 0
  const avg = skills.reduce((sum, s) => sum + s.level, 0) / skills.length
  // Bonus for diversity (skills across many categories)
  const categories = new Set(skills.map(s => s.category)).size
  const diversityBonus = Math.min(10, categories)
  return Math.min(100, Math.round(avg + diversityBonus))
}


// ── getSkillTier — returns only fields appropriate for the given tier ───────────
export function getSkillTier(skill: Skill, tier: SkillTier): Partial<Skill> {
  if (tier === 'L0') {
    return {
      id:       skill.id,
      name:     skill.name,
      category: skill.category,
      level:    skill.level,
      abstract: skill.abstract,
      tags:     skill.tags,
    }
  }
  if (tier === 'L1') {
    return {
      id:             skill.id,
      name:           skill.name,
      category:       skill.category,
      level:          skill.level,
      abstract:       skill.abstract,
      tags:           skill.tags,
      overview:       skill.overview,
      triggerPhrases: skill.triggerPhrases,
      relatedSkills:  skill.relatedSkills,
      successRate:    skill.successRate,
    }
  }
  // L2: everything
  return { ...skill }
}

// ── Default skills dataset ────────────────────────────────────────────────────
const NOW = Date.now()
const D = (daysAgo: number) => new Date(NOW - daysAgo * 86400000).toISOString()
const T = (hoursAgo: number) => NOW - hoursAgo * 3600000

export const DEFAULT_SKILLS: Skill[] = [
  // INTELLIGENCE & OSINT
  {
    id: 'news-analysis', name: 'News Analysis', category: 'INTELLIGENCE & OSINT', level: 85,
    experience: 12400, lastUsed: T(0.5),
    description: 'Processes 50+ sources, detects bias, extracts key signals',
    learned: D(180), improvements: ['Bias detection v2', 'Source ranking added', 'Entity extraction'],
    successRate: 0.91, totalRuns: 1240, failureCount: 112, version: '2.3',
    abstract: 'Processes 50+ news sources with bias detection and entity extraction.',
    overview: 'Triggered when the agent needs to analyze current events, media narratives, or breaking news. Aggregates Guardian, Reuters, and RSS feeds. Applies bias classifiers and entity extraction. Prerequisites: guardian API key (optional). Returns structured summaries with bias scores and named entities.',
    triggerPhrases: ['analyze news', 'what is in the news', 'latest headlines', 'media analysis', 'news summary'],
    tags: ['news', 'nlp', 'bias', 'osint', 'entity-extraction'],
    relatedSkills: ['source-verification', 'threat-assessment', 'sentiment-analysis'],
    amendments: [],
  },
  {
    id: 'threat-assessment', name: 'Threat Assessment', category: 'INTELLIGENCE & OSINT', level: 72,
    experience: 7800, lastUsed: T(2),
    description: 'Correlates geopolitical events with market/security impact',
    learned: D(150), improvements: ['Market correlation layer', 'Alert threshold tuning'],
    successRate: 0.84, totalRuns: 780, failureCount: 125, version: '1.2',
    abstract: 'Correlates geopolitical events with market and security impact scores.',
    overview: 'Triggered when monitoring geopolitical developments, security incidents, or market-moving events. Ingests news analysis and cross-references with historical event impact data. Outputs threat level (1-5) with affected domains. Prerequisites: news-analysis skill. Best used after news-analysis runs.',
    triggerPhrases: ['assess threat', 'geopolitical risk', 'security risk', 'threat level', 'risk assessment'],
    tags: ['geopolitics', 'risk', 'osint', 'security', 'correlation'],
    relatedSkills: ['news-analysis', 'source-verification', 'cve-analysis'],
    amendments: [],
  },
  {
    id: 'pattern-recognition', name: 'Pattern Recognition', category: 'INTELLIGENCE & OSINT', level: 68,
    experience: 6200, lastUsed: T(6),
    description: 'Identifies recurring patterns in data streams',
    learned: D(120), improvements: ['Time-series FFT added'],
    successRate: 0.79, totalRuns: 620, failureCount: 130, version: '1.1',
    abstract: 'Identifies recurring temporal and statistical patterns across data streams.',
    overview: 'Triggered on time-series data analysis requests or anomaly detection tasks. Applies FFT decomposition, sliding window correlation, and frequency analysis. Works on price data, sensor readings, and log streams. Prerequisites: raw numeric or text data stream. Returns detected patterns with confidence scores.',
    triggerPhrases: ['find patterns', 'anomaly detection', 'recurring events', 'time series analysis', 'detect pattern'],
    tags: ['pattern', 'time-series', 'fft', 'anomaly', 'statistics'],
    relatedSkills: ['news-analysis', 'momentum-detection', 'threat-assessment'],
    amendments: [],
  },
  {
    id: 'source-verification', name: 'Source Verification', category: 'INTELLIGENCE & OSINT', level: 55,
    experience: 3800, lastUsed: T(12),
    description: 'Cross-references claims across multiple sources',
    learned: D(90), improvements: ['Domain reputation DB integrated'],
    successRate: 0.77, totalRuns: 380, failureCount: 87, version: '1.1',
    abstract: 'Cross-references claims against multiple independent sources for credibility.',
    overview: 'Triggered when fact-checking claims, verifying breaking news, or assessing source credibility. Checks domain reputation, publication history, and cross-references against known authoritative sources. Prerequisites: news article URL or claim text. Returns credibility score with supporting evidence.',
    triggerPhrases: ['verify source', 'fact check', 'is this true', 'credibility check', 'confirm claim'],
    tags: ['fact-check', 'credibility', 'verification', 'osint', 'sources'],
    relatedSkills: ['news-analysis', 'threat-assessment'],
    amendments: [],
  },

  // CYBERSECURITY
  {
    id: 'cve-analysis', name: 'CVE Analysis', category: 'CYBERSECURITY', level: 90,
    experience: 18000, lastUsed: T(0.25),
    description: 'Monitors and prioritizes vulnerability disclosures',
    learned: D(200), improvements: ['CVSS v4 scoring', 'NVD API v2 integration', 'Exploit availability check', 'KEV correlation'],
    successRate: 0.95, totalRuns: 1800, failureCount: 90, version: '3.0',
    abstract: 'Monitors NVD for new CVEs and prioritizes them by CVSS score and exploit availability.',
    overview: 'Triggered on vulnerability monitoring tasks, security feed checks, or CVE lookup requests. Queries NVD API v2 with rate limit management (5 req/30s free, 50 req/30s with key). Applies CVSS v4 scoring, checks CISA KEV catalog for known exploits. Prerequisites: nvd API key (optional). Returns prioritized CVE list with severity and remediation guidance.',
    triggerPhrases: ['check cve', 'vulnerability scan', 'security advisory', 'exploit available', 'nvd lookup'],
    tags: ['cve', 'nvd', 'vulnerability', 'cvss', 'exploit', 'security'],
    relatedSkills: ['threat-hunting', 'incident-response', 'threat-assessment'],
    amendments: [],
  },
  {
    id: 'threat-hunting', name: 'Threat Hunting', category: 'CYBERSECURITY', level: 65,
    experience: 5600, lastUsed: T(4),
    description: 'Proactive threat detection across network indicators',
    learned: D(130), improvements: ['IOC enrichment pipeline'],
    successRate: 0.81, totalRuns: 560, failureCount: 106, version: '1.2',
    abstract: 'Proactively hunts threats by enriching IOCs and correlating network indicators.',
    overview: 'Triggered for proactive security monitoring, IOC investigation, or when anomalous network activity is detected. Enriches IP/domain/hash indicators via OTX and threat feeds. Correlates against known attack patterns. Prerequisites: OTX API key (optional). Returns IOC report with maliciousness probability and MITRE ATT&CK mappings.',
    triggerPhrases: ['threat hunt', 'ioc lookup', 'check ip reputation', 'malicious indicator', 'network anomaly'],
    tags: ['ioc', 'threat-hunting', 'otx', 'network', 'mitre-attack'],
    relatedSkills: ['cve-analysis', 'incident-response', 'malware-analysis'],
    amendments: [],
  },
  {
    id: 'incident-response', name: 'Incident Response', category: 'CYBERSECURITY', level: 45,
    experience: 2400, lastUsed: T(24),
    description: 'Automated initial triage and response playbooks',
    learned: D(60), improvements: ['Playbook v1.2'],
    successRate: 0.72, totalRuns: 240, failureCount: 67, version: '1.2',
    abstract: 'Executes automated triage playbooks for detected security incidents.',
    overview: 'Triggered when a security alert is elevated to incident status. Runs initial triage checklist: asset identification, containment options, evidence collection guidance. Generates incident report template. Prerequisites: security alert with type and severity. Works best after threat-hunting or cve-analysis provides context.',
    triggerPhrases: ['incident response', 'security incident', 'breach detected', 'respond to alert', 'containment'],
    tags: ['incident', 'response', 'triage', 'playbook', 'containment'],
    relatedSkills: ['threat-hunting', 'cve-analysis', 'malware-analysis'],
    amendments: [],
  },
  {
    id: 'malware-analysis', name: 'Malware Analysis', category: 'CYBERSECURITY', level: 30,
    experience: 900, lastUsed: T(72),
    description: 'Basic static analysis and IOC extraction',
    learned: D(30), improvements: [],
    successRate: 0.65, totalRuns: 90, failureCount: 32, version: '1.0',
    abstract: 'Performs static analysis of suspicious files and extracts IOCs.',
    overview: 'Triggered when analyzing suspicious files, hashes, or malware samples. Performs static analysis: file type detection, string extraction, entropy analysis, YARA rule matching. Extracts network IOCs (IPs, domains, URLs). Prerequisites: file hash or base64-encoded sample. Returns structured IOC list and behavior indicators.',
    triggerPhrases: ['analyze malware', 'file hash lookup', 'suspicious file', 'ioc extraction', 'static analysis'],
    tags: ['malware', 'static-analysis', 'yara', 'ioc', 'reverse-engineering'],
    relatedSkills: ['threat-hunting', 'incident-response'],
    amendments: [],
  },

  // PHYSICAL SECURITY
  {
    id: 'camera-monitoring', name: 'Camera Monitoring', category: 'PHYSICAL SECURITY', level: 40,
    experience: 1800, lastUsed: T(1),
    description: 'RTSP stream processing with motion detection',
    learned: D(45), improvements: ['Motion sensitivity tuning'],
    successRate: 0.88, totalRuns: 180, failureCount: 22, version: '1.1',
    abstract: 'Processes RTSP camera streams with motion detection and clip recording.',
    overview: 'Triggered for camera feed monitoring, motion alert configuration, or live view requests. Connects to RTSP streams (H.264/H.265), applies motion detection with configurable sensitivity zones. Records 30s clips on trigger. Prerequisites: RTSP URL with credentials. Best sensitivity setting: 3 consecutive frames for false-positive suppression.',
    triggerPhrases: ['camera feed', 'motion detected', 'monitor camera', 'rtsp stream', 'security camera'],
    tags: ['rtsp', 'camera', 'motion-detection', 'security', 'video'],
    relatedSkills: ['object-detection', 'perimeter-defense'],
    amendments: [],
  },
  {
    id: 'object-detection', name: 'Object Detection', category: 'PHYSICAL SECURITY', level: 35,
    experience: 1200, lastUsed: T(2),
    description: 'Person/vehicle/animal classification via AI',
    learned: D(40), improvements: [],
    successRate: 0.82, totalRuns: 120, failureCount: 22, version: '1.0',
    abstract: 'Classifies detected objects as person, vehicle, or animal using vision AI.',
    overview: 'Triggered by camera-monitoring motion alerts or direct image analysis requests. Runs classification inference to distinguish person/vehicle/animal with confidence scores. Prioritizes persons for alerting. Prerequisites: image frame or video clip from camera-monitoring. Reduces false positives from animals and lighting changes.',
    triggerPhrases: ['object detection', 'person detected', 'classify object', 'what is in frame', 'vision analysis'],
    tags: ['vision', 'classification', 'person-detection', 'ai', 'camera'],
    relatedSkills: ['camera-monitoring', 'perimeter-defense', 'drone-operations'],
    amendments: [],
  },
  {
    id: 'perimeter-defense', name: 'Perimeter Defense', category: 'PHYSICAL SECURITY', level: 25,
    experience: 600, lastUsed: T(48),
    description: 'Automated zone monitoring and breach alerting',
    learned: D(25), improvements: [],
    successRate: 0.75, totalRuns: 60, failureCount: 15, version: '1.0',
    abstract: 'Monitors defined perimeter zones and triggers graduated alert responses.',
    overview: 'Triggered for perimeter breach events or zone configuration requests. Implements two-zone alerting: outer zone (5-20m) triggers silent alert + camera focus; inner zone (0-5m) triggers immediate alert + lights + siren. Prerequisites: camera-monitoring + object-detection active. Logs all events with RTSP snapshots.',
    triggerPhrases: ['perimeter breach', 'zone alert', 'intruder detected', 'property security', 'boundary crossed'],
    tags: ['perimeter', 'zones', 'alerting', 'security', 'automation'],
    relatedSkills: ['camera-monitoring', 'object-detection'],
    amendments: [],
  },
  {
    id: 'drone-operations', name: 'Drone Operations', category: 'PHYSICAL SECURITY', level: 20,
    experience: 350, lastUsed: T(96),
    description: 'MAVLink communication and basic flight planning',
    learned: D(20), improvements: [],
    successRate: 0.70, totalRuns: 35, failureCount: 11, version: '1.0',
    abstract: 'Controls MAVLink drones for waypoint navigation and area patrol.',
    overview: 'Triggered for drone patrol requests, flight planning, or telemetry monitoring. Communicates via MAVLink v2 at 57600 baud (USB) or 115200 (radio). Handles GUIDED mode waypoint navigation and safe LAND fallback on telemetry loss. Prerequisites: ArduPilot drone with GPS lock (>6 sats) and battery >20%. Pre-arm checks enforced.',
    triggerPhrases: ['drone patrol', 'fly drone', 'mavlink command', 'waypoint mission', 'aerial surveillance'],
    tags: ['drone', 'mavlink', 'ardupilot', 'waypoint', 'patrol'],
    relatedSkills: ['object-detection', 'camera-monitoring'],
    amendments: [],
  },

  // AUTONOMOUS VEHICLES
  {
    id: 'sensor-fusion', name: 'Sensor Fusion', category: 'AUTONOMOUS VEHICLES', level: 15,
    experience: 180, lastUsed: T(168),
    description: 'Multi-spectrum camera data combination',
    learned: D(15), improvements: [],
    successRate: 0.68, totalRuns: 18, failureCount: 6, version: '1.0',
    abstract: 'Fuses RGB and thermal camera data for robust perception in all conditions.',
    overview: 'Triggered for DonkeyCar sensor calibration or multi-camera fusion tasks. Combines RGB and FLIR Lepton 3.5 thermal feeds via homographic transform. Calibrated at 1m, 2m, 4m with checkerboard target. Expected accuracy: ±15cm at 4m. Prerequisites: both cameras mounted and calibrated. Outputs fused tensor for path-planning.',
    triggerPhrases: ['sensor fusion', 'camera calibration', 'thermal vision', 'multi-sensor', 'fuse cameras'],
    tags: ['sensor-fusion', 'thermal', 'rgb', 'calibration', 'donkeycar'],
    relatedSkills: ['path-planning', 'object-detection'],
    amendments: [],
  },
  {
    id: 'path-planning', name: 'Path Planning', category: 'AUTONOMOUS VEHICLES', level: 10,
    experience: 90, lastUsed: T(200),
    description: 'Basic waypoint navigation and obstacle avoidance',
    learned: D(10), improvements: [],
    successRate: 0.60, totalRuns: 9, failureCount: 4, version: '1.0',
    abstract: 'Plans optimal waypoint paths with real-time obstacle avoidance.',
    overview: 'Triggered for autonomous route planning or obstacle avoidance configuration. Implements A* pathfinding over grid maps with dynamic obstacle updates from sensor-fusion. Works on indoor and outdoor environments. Prerequisites: sensor-fusion active, grid map available. Returns planned path as waypoint array for DonkeyCar or drone-operations.',
    triggerPhrases: ['plan path', 'navigate to', 'avoid obstacle', 'route planning', 'autonomous navigation'],
    tags: ['path-planning', 'a-star', 'navigation', 'obstacle-avoidance', 'autonomous'],
    relatedSkills: ['sensor-fusion', 'emergency-protocols', 'drone-operations'],
    amendments: [],
  },
  {
    id: 'emergency-protocols', name: 'Emergency Protocols', category: 'AUTONOMOUS VEHICLES', level: 8,
    experience: 60, lastUsed: T(240),
    description: 'Collision avoidance and safe stop procedures',
    learned: D(8), improvements: [],
    successRate: 0.85, totalRuns: 8, failureCount: 1, version: '1.0',
    abstract: 'Executes collision avoidance and safe-stop procedures on emergency triggers.',
    overview: 'Triggered automatically on imminent collision detection, telemetry loss, or operator emergency command. Executes graduated response: soft brake → hard stop → safe park. For drones: switches to LAND mode immediately on comms loss. Prerequisites: active vehicle with sensor-fusion running. Highest priority skill — overrides all other vehicle commands.',
    triggerPhrases: ['emergency stop', 'collision avoidance', 'safe stop', 'abort mission', 'emergency protocol'],
    tags: ['emergency', 'collision-avoidance', 'safety', 'failsafe', 'autonomous'],
    relatedSkills: ['path-planning', 'sensor-fusion', 'drone-operations'],
    amendments: [],
  },
  {
    id: 'self-diagnostics', name: 'Self-Diagnostics', category: 'AUTONOMOUS VEHICLES', level: 12,
    experience: 120, lastUsed: T(180),
    description: 'Component health monitoring and predictive maintenance',
    learned: D(12), improvements: [],
    successRate: 0.90, totalRuns: 12, failureCount: 1, version: '1.0',
    abstract: 'Monitors all system components and predicts maintenance needs from sensor trends.',
    overview: 'Triggered for system health checks, pre-mission readiness assessments, or maintenance scheduling. Monitors RTX 5070 VRAM/thermal, motor current draw, battery state of charge, and GPS lock quality. Raises warnings at configurable thresholds. Prerequisites: access to system metrics endpoints. Returns health dashboard JSON with status per component.',
    triggerPhrases: ['system health', 'diagnostics check', 'self diagnostic', 'component status', 'maintenance check'],
    tags: ['diagnostics', 'health', 'maintenance', 'monitoring', 'gpu'],
    relatedSkills: ['emergency-protocols', 'device-management'],
    amendments: [],
  },

  // IoT & AUTOMATION
  {
    id: 'device-management', name: 'Device Management', category: 'IoT & AUTOMATION', level: 50,
    experience: 3100, lastUsed: T(8),
    description: 'MQTT device discovery and monitoring',
    learned: D(80), improvements: ['Auto-discovery added', 'MQTT v5 support'],
    successRate: 0.87, totalRuns: 310, failureCount: 40, version: '1.2',
    abstract: 'Discovers and monitors MQTT IoT devices with auto-registration.',
    overview: 'Triggered for IoT device discovery, status monitoring, or configuration tasks. Subscribes to MQTT with homeassistant auto-discovery. Supports QoS 0/1/2, retained messages, and TLS on port 8883. Monitors ESP32 nodes, zigbee devices, and custom sensors. Prerequisites: Mosquitto broker accessible. Returns device inventory with last-seen and current state.',
    triggerPhrases: ['iot device', 'mqtt status', 'device discovery', 'home automation', 'sensor reading'],
    tags: ['mqtt', 'iot', 'esp32', 'home-assistant', 'discovery'],
    relatedSkills: ['automation-rules', 'energy-management', 'self-diagnostics'],
    amendments: [],
  },
  {
    id: 'automation-rules', name: 'Automation Rules', category: 'IoT & AUTOMATION', level: 45,
    experience: 2400, lastUsed: T(16),
    description: 'Event-driven if-this-then-that logic engine',
    learned: D(70), improvements: ['Conditional branching'],
    successRate: 0.83, totalRuns: 240, failureCount: 41, version: '1.1',
    abstract: 'Executes event-driven automation rules with conditional branching.',
    overview: 'Triggered when configuring home automation, creating new rules, or responding to device events. Implements IFTTT-style logic with AND/OR conditions, delays, and schedules. Supports device-management events as triggers. Prerequisites: device-management active. Rules are persisted in Zustand store with enable/disable toggles.',
    triggerPhrases: ['create automation', 'if this then that', 'automation rule', 'trigger action', 'schedule task'],
    tags: ['automation', 'ifttt', 'rules', 'events', 'scheduling'],
    relatedSkills: ['device-management', 'energy-management'],
    amendments: [],
  },
  {
    id: 'energy-management', name: 'Energy Management', category: 'IoT & AUTOMATION', level: 30,
    experience: 850, lastUsed: T(36),
    description: 'Power consumption monitoring and optimization',
    learned: D(35), improvements: [],
    successRate: 0.74, totalRuns: 85, failureCount: 22, version: '1.0',
    abstract: 'Monitors power consumption across devices and optimizes energy usage.',
    overview: 'Triggered for energy audits, solar production monitoring, or power optimization requests. Aggregates consumption data from smart plugs and solar sensors via MQTT. Calculates daily/weekly usage trends. Prerequisites: device-management with energy-monitoring capable devices. Returns consumption dashboard with optimization recommendations.',
    triggerPhrases: ['energy usage', 'power consumption', 'solar production', 'optimize energy', 'electricity monitoring'],
    tags: ['energy', 'power', 'solar', 'optimization', 'monitoring'],
    relatedSkills: ['device-management', 'automation-rules', 'predictive-maintenance'],
    amendments: [],
  },
  {
    id: 'predictive-maintenance', name: 'Predictive Maintenance', category: 'IoT & AUTOMATION', level: 20,
    experience: 380, lastUsed: T(120),
    description: 'Failure prediction based on sensor patterns',
    learned: D(22), improvements: [],
    successRate: 0.70, totalRuns: 38, failureCount: 11, version: '1.0',
    abstract: 'Predicts equipment failures from sensor trend patterns before they occur.',
    overview: 'Triggered for predictive maintenance scheduling, anomaly alerts from device-management, or manual health checks. Analyzes vibration, temperature, and runtime trends to predict failure windows. Uses rolling Z-score for anomaly detection. Prerequisites: device-management with 7+ days of sensor history. Returns failure probability with recommended maintenance window.',
    triggerPhrases: ['predictive maintenance', 'failure prediction', 'equipment health', 'sensor anomaly', 'maintenance schedule'],
    tags: ['predictive', 'maintenance', 'anomaly', 'sensors', 'failure-prediction'],
    relatedSkills: ['device-management', 'energy-management', 'self-diagnostics'],
    amendments: [],
  },

  // MARKET INTELLIGENCE
  {
    id: 'price-analysis', name: 'Price Analysis', category: 'MARKET INTELLIGENCE', level: 88,
    experience: 15200, lastUsed: T(0.1),
    description: 'Real-time crypto and market price tracking',
    learned: D(190), improvements: ['CoinGecko integration', 'Sparkline engine', 'Δ7d tracking'],
    successRate: 0.96, totalRuns: 1520, failureCount: 61, version: '3.0',
    abstract: 'Tracks real-time crypto and equity prices with sparklines and delta analysis.',
    overview: 'Triggered for price lookups, market overviews, or portfolio tracking requests. Fetches from CoinGecko (crypto) and Finnhub (equities) with 30s price cache and rate limit management. Renders sparklines with 7-day delta. Prerequisites: cgKey/finnhubKey (optional, degraded without). Returns structured price map with sparkline arrays.',
    triggerPhrases: ['price check', 'bitcoin price', 'market prices', 'crypto prices', 'stock price'],
    tags: ['crypto', 'prices', 'coingecko', 'finnhub', 'sparkline', 'market'],
    relatedSkills: ['momentum-detection', 'sentiment-analysis', 'risk-assessment-market'],
    amendments: [],
  },
  {
    id: 'momentum-detection', name: 'Momentum Detection', category: 'MARKET INTELLIGENCE', level: 75,
    experience: 9000, lastUsed: T(0.5),
    description: 'Identifies momentum shifts and breakout patterns',
    learned: D(160), improvements: ['Linear regression slope', 'Volume weighting'],
    successRate: 0.88, totalRuns: 900, failureCount: 108, version: '2.0',
    abstract: 'Detects price momentum shifts and breakout patterns using RSI and regression.',
    overview: 'Triggered for trading signal requests, breakout alerts, or momentum analysis. Calculates RSI(14), linear regression slope over 7 candles, and volume ratios. Entry signal: RSI > 55 with volume >1.5x avg and positive regression slope. Avoid during FOMC/CPI. Prerequisites: price-analysis active with 14+ candles of history. Returns signal strength (0-1) per asset.',
    triggerPhrases: ['momentum signal', 'breakout detected', 'bullish pattern', 'rsi signal', 'trend detection'],
    tags: ['momentum', 'rsi', 'breakout', 'trading', 'signals'],
    relatedSkills: ['price-analysis', 'sentiment-analysis', 'risk-assessment-market'],
    amendments: [],
  },
  {
    id: 'risk-assessment-market', name: 'Risk Assessment', category: 'MARKET INTELLIGENCE', level: 60,
    experience: 4800, lastUsed: T(3),
    description: 'Position sizing and portfolio risk calculations',
    learned: D(100), improvements: ['Kelly criterion added'],
    successRate: 0.85, totalRuns: 480, failureCount: 72, version: '1.2',
    abstract: 'Calculates position sizing and portfolio risk using Kelly criterion and volatility.',
    overview: 'Triggered for trade sizing decisions, portfolio risk reviews, or drawdown analysis. Implements Kelly criterion for optimal position sizing, ATR-based stop-loss calculation, and portfolio correlation analysis. Prerequisites: price-analysis with volatility data. Returns recommended position size (% of portfolio) with risk/reward ratio.',
    triggerPhrases: ['position sizing', 'portfolio risk', 'kelly criterion', 'stop loss', 'risk management'],
    tags: ['risk', 'kelly', 'position-sizing', 'portfolio', 'volatility'],
    relatedSkills: ['price-analysis', 'momentum-detection', 'sentiment-analysis'],
    amendments: [],
  },
  {
    id: 'sentiment-analysis', name: 'Sentiment Analysis', category: 'MARKET INTELLIGENCE', level: 50,
    experience: 3200, lastUsed: T(6),
    description: 'Market sentiment from news and social sources',
    learned: D(85), improvements: ['Fear & Greed integration'],
    successRate: 0.80, totalRuns: 320, failureCount: 64, version: '1.2',
    abstract: 'Aggregates market sentiment from news, Fear & Greed index, and social signals.',
    overview: 'Triggered for market mood analysis, contrarian signal detection, or sentiment dashboards. Integrates Fear & Greed index (Alternative.me), news sentiment scoring from news-analysis, and optional social feed analysis. Validated at 0.71 Pearson correlation with price action. Prerequisites: news-analysis active. Returns composite sentiment score (-100 to +100) with trend direction.',
    triggerPhrases: ['market sentiment', 'fear and greed', 'investor mood', 'sentiment score', 'market mood'],
    tags: ['sentiment', 'fear-greed', 'market-mood', 'social', 'contrarian'],
    relatedSkills: ['news-analysis', 'price-analysis', 'momentum-detection'],
    amendments: [],
  },
]

// ── Default learning log ───────────────────────────────────────────────────────
export const DEFAULT_LEARNING_LOG: LearningEvent[] = [
  {
    id: 'log-001', skillId: 'cve-analysis', skillName: 'CVE Analysis',
    type: 'optimization',
    description: 'NVD API response pipeline optimized — latency reduced 340ms',
    timestamp: T(0.3), xpGained: 45,
  },
  {
    id: 'log-002', skillId: 'price-analysis', skillName: 'Price Analysis',
    type: 'pattern_detected',
    description: 'BTC/ETH correlation above 0.94 — highest in 90 days, flagging as signal',
    timestamp: T(1.2), xpGained: 60,
  },
  {
    id: 'log-003', skillId: 'news-analysis', skillName: 'News Analysis',
    type: 'improved',
    description: 'Bias detection model retrained on 2,400 new labeled samples — F1 +0.07',
    timestamp: T(2.5), xpGained: 90,
  },
  {
    id: 'log-004', skillId: 'threat-hunting', skillName: 'Threat Hunting',
    type: 'error_learned',
    description: 'False positive rate on IP reputation checks was 18% — threshold recalibrated',
    timestamp: T(5), xpGained: 35,
  },
  {
    id: 'log-005', skillId: 'momentum-detection', skillName: 'Momentum Detection',
    type: 'pattern_detected',
    description: 'Identified double-bottom formation across 4 assets simultaneously',
    timestamp: T(8), xpGained: 55,
  },
  {
    id: 'log-006', skillId: 'camera-monitoring', skillName: 'Camera Monitoring',
    type: 'improved',
    description: 'Motion sensitivity tuned — false triggers from lighting changes reduced 60%',
    timestamp: T(12), xpGained: 40,
  },
  {
    id: 'log-007', skillId: 'device-management', skillName: 'Device Management',
    type: 'optimization',
    description: 'MQTT broker reconnect backoff improved — zero missed messages in last 6h',
    timestamp: T(18), xpGained: 30,
  },
  {
    id: 'log-008', skillId: 'self-diagnostics', skillName: 'Self-Diagnostics',
    type: 'acquired',
    description: 'RTX 5070 VRAM monitoring module integrated — thermal throttle detection active',
    timestamp: T(24), xpGained: 120,
  },
  {
    id: 'log-009', skillId: 'source-verification', skillName: 'Source Verification',
    type: 'error_learned',
    description: 'Reuters feed returned stale data for 4h — staleness detection added',
    timestamp: T(36), xpGained: 50,
  },
  {
    id: 'log-010', skillId: 'sentiment-analysis', skillName: 'Sentiment Analysis',
    type: 'improved',
    description: 'Fear & Greed index correlation with price action validated at 0.71 Pearson',
    timestamp: T(48), xpGained: 70,
  },
]

// ── Default knowledge base ────────────────────────────────────────────────────
export const DEFAULT_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'kb-001',
    title: 'RTSP Camera Setup Protocol',
    category: 'Security Protocols',
    content: 'Standard RTSP stream configuration for IP cameras. Use rtsp://user:pass@ip:554/stream1 format. Enable H.264 encoding at 15fps for optimal CPU/bandwidth balance. Set keyframe interval to 2s for motion detection accuracy. Recommended: Reolink, Hikvision with ONVIF profile S compliance.',
    tags: ['rtsp', 'camera', 'security', 'networking'],
    dateAdded: D(45),
    relevanceScore: 92,
  },
  {
    id: 'kb-002',
    title: 'DonkeyCar Neural Network Training',
    category: 'Vehicle Operations',
    content: 'End-to-end CNN training for autonomous RC car navigation. Collect 10k+ images at 20fps covering all track variations. Use Keras + TensorFlow 2.x with categorical cross-entropy loss. Augment: brightness ±30%, horizontal flip 50%, Gaussian noise. Best inference on Jetson Nano: ONNX + TensorRT optimization yields 45ms latency.',
    tags: ['donkeycar', 'ml', 'autonomous', 'jetson', 'tensorflow'],
    dateAdded: D(38),
    relevanceScore: 88,
  },
  {
    id: 'kb-003',
    title: 'MQTT Topic Structure Best Practices',
    category: 'IoT Configurations',
    content: 'Hierarchical topic design: home/{room}/{device}/{property}. Use retained messages for last known state. QoS 1 for sensor data, QoS 2 for critical actuator commands. Prefix with version: v2/home/... for schema migrations. Mosquitto broker with TLS on port 8883. Home Assistant auto-discovery via homeassistant/{component}/{node_id}/config.',
    tags: ['mqtt', 'iot', 'homeassistant', 'messaging'],
    dateAdded: D(32),
    relevanceScore: 85,
  },
  {
    id: 'kb-004',
    title: 'Momentum Breakout Strategy v2',
    category: 'Market Strategies',
    content: 'Entry: RSI(14) crosses above 55 with volume >1.5x 20-day avg AND linear regression slope positive over 7 candles. Exit: RSI crosses below 45 OR trailing stop 8% below entry. Best timeframe: 4H crypto, 1D equities. Avoid entries during high-impact macro events (FOMC, CPI). Backtested 2021-2025: 58% win rate, 1.9 reward/risk ratio.',
    tags: ['momentum', 'breakout', 'crypto', 'strategy', 'rsi'],
    dateAdded: D(28),
    relevanceScore: 94,
  },
  {
    id: 'kb-005',
    title: 'Ollama Model Selection Guide (RTX 5070)',
    category: 'System Architecture',
    content: 'With 12GB VRAM on RTX 5070, optimal models: Llama 3 8B (Q8_0), Qwen2.5 14B (Q4_K_M), Mistral 7B (Q8_0), Phi-3 Medium (Q4). Use vLLM for multi-request batching, Ollama for single-user interactive. Phi-3 Medium best for code. Qwen2.5 14B best for analysis. Keep 2GB VRAM headroom for stable diffusion concurrent. CUDA 12.4+ required for BF16 inference.',
    tags: ['ollama', 'rtx5070', 'llm', 'vram', 'local-ai'],
    dateAdded: D(20),
    relevanceScore: 97,
  },
  {
    id: 'kb-006',
    title: 'Thermal Camera Calibration for Night Operations',
    category: 'Vehicle Operations',
    content: 'FLIR Lepton 3.5 calibration procedure for DonkeyCar night ops. NUC (non-uniformity correction) at startup, 30s warm-up required. Map thermal range 20-40°C for human detection. Fuse with RGB camera using homographic transform — calibrate with checkerboard target at 1m, 2m, 4m distances. Store transformation matrix in config. Expected accuracy: ±15cm at 4m range.',
    tags: ['thermal', 'flir', 'calibration', 'night', 'autonomous'],
    dateAdded: D(18),
    relevanceScore: 79,
  },
  {
    id: 'kb-007',
    title: 'Automated Perimeter Defense Playbook',
    category: 'Security Protocols',
    content: 'Zone-based perimeter alerting: Inner zone (0-5m) = immediate alert + lights + siren. Outer zone (5-20m) = silent alert + camera focus. Motion above threshold triggers 30s recording clip. Classifier: person > vehicle > animal priority. Night mode activates IR floodlights on outer zone trigger. All events logged to SQLite with RTSP snapshot. False positive suppression: 3 consecutive frames required.',
    tags: ['perimeter', 'security', 'automation', 'detection'],
    dateAdded: D(15),
    relevanceScore: 86,
  },
  {
    id: 'kb-008',
    title: 'ESP32 Sensor Node Deployment Guide',
    category: 'IoT Configurations',
    content: 'ESP32-S3 with ESPHome for sensor nodes. Power: 18650 LiPo + solar panel for outdoor nodes, target 95% uptime. Deep sleep between readings: 30s cycle = ~6 month battery life. Sensors: BME280 (temp/humidity/pressure), DS18B20 (waterproof temp), PIR HC-SR501. OTA updates via ESPHome API. Watchdog timer: 60s. Partition scheme: minimal SPIFFS for larger firmware.',
    tags: ['esp32', 'esphome', 'iot', 'sensors', 'deployment'],
    dateAdded: D(12),
    relevanceScore: 82,
  },
  {
    id: 'kb-009',
    title: 'NEXUS API Rate Limit Management',
    category: 'System Architecture',
    content: 'Rate limit matrix: NVD API free tier 5 req/30s (use API key for 50/30s). CoinGecko free 10-30 req/min (Demo key 30/min). Guardian API 1 req/s. OTX 10k req/day. FRED unlimited. Implement exponential backoff: 1s, 2s, 4s, 8s max. Cache responses: prices 30s, CVEs 15min, news 5min. Queue system for burst requests. Monitor via /api/status endpoint.',
    tags: ['api', 'ratelimit', 'architecture', 'caching'],
    dateAdded: D(8),
    relevanceScore: 91,
  },
  {
    id: 'kb-010',
    title: 'MAVLink Drone Communication Protocol',
    category: 'Vehicle Operations',
    content: 'MAVLink v2 setup for ArduPilot-based drones. Serial connection: 57600 baud for USB, 115200 for radio telemetry. Heartbeat interval: 1Hz. Request data streams: ATTITUDE (10Hz), GPS (5Hz), BATTERY (2Hz). GUIDED mode for autonomous waypoints. Pre-arm checks: GPS lock >6 sats, battery >20%, compass calibrated. Emergency: set mode to LAND immediately on telemetry loss.',
    tags: ['mavlink', 'drone', 'ardupilot', 'autonomous', 'telemetry'],
    dateAdded: D(5),
    relevanceScore: 74,
  },
]
