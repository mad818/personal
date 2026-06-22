#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')

const ROOT = process.cwd()
const HISTORY_DIR = path.join(ROOT, 'docs', 'metrics')
const LATEST_FILE = path.join(HISTORY_DIR, 'agent-runtime-latest.json')
const HISTORY_FILE = path.join(HISTORY_DIR, 'agent-runtime-history.jsonl')

function read(rel) {
  try {
    return fs.readFileSync(path.join(ROOT, rel), 'utf-8')
  } catch {
    return ''
  }
}

function check(name, pass, detail, category, weight = 1) {
  return { name, pass, detail, category, weight }
}

function parseArgs() {
  const args = process.argv.slice(2)
  const has = (flag) => args.includes(flag)
  const readFlag = (flag, fallback) => {
    const idx = args.indexOf(flag)
    if (idx === -1) return fallback
    const v = Number(args[idx + 1])
    return Number.isFinite(v) ? v : fallback
  }
  const minCategory = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i] !== '--min-category') continue
    const raw = args[i + 1] || ''
    const [name, scoreRaw] = raw.split('=')
    const score = Number(scoreRaw)
    if (!name || !Number.isFinite(score)) continue
    minCategory[name.trim().toLowerCase()] = Math.max(0, Math.min(100, score))
  }
  return {
    minScore: readFlag('--min-score', 100),
    record: has('--record'),
    json: has('--json'),
    minCategory,
  }
}

function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true })
  } catch {
    // ignore
  }
}

function main() {
  const opts = parseArgs()
  const agent = read('lib/agent.ts')
  const verifyRoute = read('app/api/verify/route.ts')
  const hud = read('components/ui/TelemetryHUD.tsx')
  const statusRoute = read('app/api/status/route.ts')
  const toolsRoute = read('app/api/tools/route.ts')
  const routePolicy = read('lib/security/routePolicy.ts')
  const assistantDispatch = read('lib/assistantDispatch.ts')
  const assistantChatActions = read('lib/assistantChatActions.ts')
  const assistantTurnReceipt = read('components/assistant/AssistantTurnReceipt.tsx')
  const assistantOperatorWorkflow = read('lib/assistantOperatorWorkflow.ts')
  const assistantOperatorWorkflowPanel = read('components/assistant/AssistantOperatorWorkflowPanel.tsx')
  const homeChat = read('components/home/HomeChat.tsx')
  const commandBar = read('components/ui/CommandBar.tsx')
  const officeCommandCenter = read('components/home/office/OfficeCommandCenter.tsx')
  const hqTerminalSection = read('components/home/office/HQTerminalSection.tsx')
  const shell = read('components/ui/shell.tsx')
  const homefrontVisualParity = read('lib/homefrontVisualParity.ts')
  const homefrontSourceIntelligence = read('lib/homefrontSourceIntelligence.ts')
  const sourceIntelligenceConsole = read('components/resources/SourceIntelligenceConsole.tsx')
  const branchCleanupLedger = read('docs/repo-hygiene/branch-cleanup-decision-ledger-2026-05-08.md')
  const authDiagnosticsRoute = read('app/api/auth-diagnostics/route.ts')
  const externalBridge = read('lib/externalToolBridge.ts')
  const trustPosture = read('lib/trustPostureDescriptor.ts')
  const hasGenericMcpRoute =
    fs.existsSync(path.join(ROOT, 'app', 'api', 'mcp')) ||
    fs.existsSync(path.join(ROOT, 'app', 'api', 'external-tools'))
  const hasMcpGatewayRoute = fs.existsSync(path.join(ROOT, 'app', 'api', 'mcp', 'gateway', 'route.ts'))
  const hasAgentHealthRoute = fs.existsSync(path.join(ROOT, 'app', 'api', 'agent-health', 'route.ts'))
  const hasOllamaCatalogRoute = fs.existsSync(path.join(ROOT, 'app', 'api', 'ollama', 'catalog', 'route.ts'))
  const localInferencePosture = read('lib/localInferencePosture.ts')
  const aiRoute = read('app/api/ai/route.ts')
  const ollamaOnly = process.env.OLLAMA_ONLY === '1'

  const checks = [
    check(
      'tool risk tiers',
      /const TOOL_RISK/.test(agent) && /tier2/.test(agent),
      'Agent runtime declares risk tier policy map',
      'safety',
      3,
    ),
    check(
      'verification adapters',
      /runVerificationAdapters/.test(agent) &&
        /\/api\/verify/.test(agent) &&
        /typecheck/.test(verifyRoute) &&
        /route_integrity/.test(agent) &&
        /route_integrity/.test(verifyRoute),
      'Verification flow wired to typecheck/lint/route smoke/route integrity',
      'reliability',
      3,
    ),
    check(
      'runtime status chip',
      /label="RUN"/.test(hud) && /agentRuntime\.status/.test(hud),
      'Telemetry HUD surfaces run status',
      'ux',
      2,
    ),
    check(
      'status diagnostics queue',
      /runQueueMode/.test(statusRoute) && /verifyEndpoint/.test(statusRoute),
      'Status endpoint includes queue and verification diagnostics',
      'observability',
      2,
    ),
    check(
      'external tool bridge contract',
      /ExternalToolDescriptor/.test(externalBridge) &&
        /ExternalToolResultEnvelope/.test(externalBridge) &&
        /local_mcp_gateway/.test(externalBridge) &&
        /n8n_run_workflow/.test(externalBridge),
      'External bridge defines descriptors, OAuth-aware contract metadata, and result envelopes',
      'safety',
      2,
    ),
    check(
      'external bridge diagnostics',
      /readExternalToolBridgeSummary/.test(statusRoute) &&
        /externalTools/.test(authDiagnosticsRoute) &&
        /externalTool/.test(toolsRoute) &&
        /MCP bridge/.test(trustPosture),
      'Bridge posture surfaces through existing status, auth diagnostics, tools metadata, and trust UI descriptors',
      'observability',
      2,
    ),
    check(
      'no generic mcp route',
      !hasGenericMcpRoute || hasMcpGatewayRoute,
      'No unscoped /api/mcp route exists; MCP stays behind the protected gateway route',
      'safety',
      2,
    ),
    check(
      'assistant dispatch planner',
      /resolveAssistantDispatch/.test(assistantDispatch) &&
        /answerMode/.test(assistantDispatch) &&
        /operatorChoiceNeeded/.test(assistantDispatch) &&
        /toolCatalog/.test(assistantDispatch) &&
        /actionModel/.test(assistantDispatch) &&
        /localReply/.test(assistantDispatch) &&
        /ASSISTANT_DISPATCH_CHECKS/.test(assistantDispatch),
      'Shared assistant planner returns route, mode, capability, agent, context, tool catalog, action model, and local fast reply posture',
      'reliability',
      3,
    ),
    check(
      'assistant dispatch assertion cases',
      /expectedMode: "direct"/.test(assistantDispatch) &&
        /expectedMode: "route_action"/.test(assistantDispatch) &&
        /expectedMode: "ask_route_choice"/.test(assistantDispatch) &&
        /expectedMode: "direct_with_route"/.test(assistantDispatch) &&
        /expectedLocalReply: true/.test(assistantDispatch) &&
        /Ping/.test(assistantDispatch) &&
        /Thanks/.test(assistantDispatch) &&
        /Research latest CVEs/.test(assistantDispatch) &&
        /Fix this component/.test(assistantDispatch),
      'Planner coverage includes direct, route action, route choice, direct-with-route, local fast replies, live-current, and engineering prompts',
      'reliability',
      2,
    ),
    check(
      'assistant action model',
      /AssistantChatActionModel/.test(assistantChatActions) &&
        /preparedWorkspace/.test(assistantChatActions) &&
        /routeHref/.test(assistantChatActions) &&
        /answerMode/.test(assistantChatActions) &&
        /recoveryAction/.test(assistantChatActions) &&
        /diagnostic/.test(assistantChatActions) &&
        /Answer here/.test(assistantChatActions) &&
        /Open workspace/.test(assistantChatActions),
      'Shared chat action contract includes workspace, route, answer mode, recovery, diagnostic, and visible action labels',
      'ux',
      3,
    ),
    check(
      'chat surfaces share dispatch',
      /resolveAssistantDispatch/.test(homeChat) &&
        /resolveAssistantDispatch/.test(commandBar) &&
        /resolveAssistantDispatch/.test(officeCommandCenter) &&
        /localReply/.test(homeChat) &&
        /localReply/.test(commandBar) &&
        /localReply/.test(officeCommandCenter) &&
        /normalizeAssistantFailureMessage/.test(homeChat) &&
        /normalizeAssistantFailureMessage/.test(commandBar) &&
        /normalizeAssistantFailureMessage/.test(officeCommandCenter),
      'Home chat, CommandBar, and HQ chronicle use the same dispatch, local fast reply, and recovery layer',
      'ux',
      3,
    ),
    check(
      'chat action affordances',
      /actionModel/.test(homeChat) &&
        /handleChatAction/.test(homeChat) &&
        /actionModel/.test(commandBar) &&
        /handleChatAction/.test(commandBar) &&
        /actionModel/.test(officeCommandCenter) &&
        /onAssistantAction/.test(hqTerminalSection) &&
        /nexus-hq-chronicle__assistantAction/.test(hqTerminalSection),
      'Home chat, CommandBar, and HQ chronicle render shared route/recovery action buttons',
      'ux',
      3,
    ),
    check(
      'command route store sync',
      /setTab\(getTabFromHref\(dispatchPlan\.routeHref\)\)/.test(commandBar) &&
        /setTab\(getTabFromHref\(action\.href\)\)/.test(commandBar),
      'CommandBar route actions update the shell tab store before navigation',
      'reliability',
      2,
    ),
    check(
      'assistant readiness strip',
      /nexus-hq-assistant-readiness/.test(hqTerminalSection) &&
        /resolveAssistantDispatch/.test(hqTerminalSection) &&
        /\/api\/ollama\/catalog/.test(hqTerminalSection) &&
        /\/api\/agent-health/.test(hqTerminalSection) &&
        /\/api\/auth-diagnostics/.test(hqTerminalSection) &&
        /session required/.test(hqTerminalSection),
      'HQ chronicle merges planner readiness with provider, model, auth, network, and agent-health diagnostics',
      'observability',
      3,
    ),
    check(
      'assistant live execution watchdog',
      /hq-live-execution-watchdog/.test(hqTerminalSection) &&
        /agentRuntime\.startedAt/.test(hqTerminalSection) &&
        /local model\|ollama\|runtime model/i.test(hqTerminalSection) &&
        /provider-health/.test(hqTerminalSection),
      'HQ chronicle surfaces a slow local-runtime watchdog with a provider-health recovery lane',
      'observability',
      2,
    ),
    check(
      'structured assistant recovery',
      /resolveAssistantFailure/.test(assistantChatActions) &&
        /Session required/.test(assistantChatActions) &&
        /Ollama is not reachable/.test(assistantChatActions) &&
        /Open provider health/.test(assistantChatActions) &&
        /Retry local/.test(assistantChatActions) &&
        /Reset session/.test(assistantChatActions),
      'Assistant failures map to session, Ollama, provider-health, retry, and reset recovery actions',
      'observability',
      2,
    ),
    check(
      'local AI and tool route policy',
      /\{ prefix: "\/api\/ai", routeClass: "local_only"/.test(routePolicy) &&
        /\{ prefix: "\/api\/tools", routeClass: "local_only"/.test(routePolicy),
      '/api/ai and /api/tools reach local handlers before handler-level provider/tool safety gates',
      'safety',
      3,
    ),
    check(
      'assistant diagnostics routes',
      hasAgentHealthRoute && hasOllamaCatalogRoute,
      '/api/agent-health and /api/ollama/catalog diagnostics routes exist',
      'observability',
      2,
    ),
    check(
      'assistant operator workflow model',
      /AssistantOperatorWorkflowState/.test(assistantOperatorWorkflow) &&
        /buildAssistantOperatorWorkflowState/.test(assistantOperatorWorkflow) &&
        /reviewRequired/.test(assistantOperatorWorkflow) &&
        /proposedEdits/.test(assistantOperatorWorkflow) &&
        /skillInvocations/.test(assistantOperatorWorkflow),
      'Shared operator workflow model exposes phase, review gate, proposed edits, task plan, change log, and skill/tool visibility',
      'reliability',
      3,
    ),
    check(
      'assistant workflow dispatch coverage',
      /operatorWorkflow/.test(assistantDispatch) &&
        /buildAssistantOperatorWorkflowState/.test(assistantDispatch) &&
        /expectedWorkflowPhase: "answer"/.test(assistantDispatch) &&
        /expectedWorkflowPhase: "review"/.test(assistantDispatch) &&
        /\[OPERATOR WORKFLOW\]/.test(assistantDispatch),
      'Dispatch attaches operator workflow state, injects workflow context, and asserts answer/review phases',
      'reliability',
      3,
    ),
    check(
      'assistant workflow action affordances',
      /operatorWorkflow/.test(assistantChatActions) &&
        /view_task_plan/.test(assistantChatActions) &&
        /review_proposed_edits/.test(assistantChatActions) &&
        /view_change_log/.test(assistantChatActions) &&
        /view_skill_invocations/.test(assistantChatActions),
      'Shared action model includes local-only workflow focus actions without navigation or mutation authority',
      'ux',
      2,
    ),
    check(
      'assistant workflow shared renderer',
      /assistant-operator-workflow/.test(assistantOperatorWorkflowPanel) &&
        /assistant-workflow-phase/.test(assistantOperatorWorkflowPanel) &&
        /assistant-workflow-task-plan/.test(assistantOperatorWorkflowPanel) &&
        /assistant-workflow-proposed-edits/.test(assistantOperatorWorkflowPanel) &&
        /assistant-workflow-skill-invocations/.test(assistantOperatorWorkflowPanel),
      'Shared workflow panel renders phase strip, task plan, proposed edit posture, and skills/tools sections',
      'ux',
      3,
    ),
    check(
      'assistant workflow surfaces',
      /AssistantOperatorWorkflowPanel/.test(homeChat) &&
        /operatorWorkflow/.test(homeChat) &&
        /AssistantOperatorWorkflowPanel/.test(commandBar) &&
        /operatorWorkflow/.test(commandBar) &&
        /AssistantOperatorWorkflowPanel/.test(hqTerminalSection) &&
        /operatorWorkflow/.test(hqTerminalSection),
      'Home chat, CommandBar, and HQ chronicle render the shared operator workflow panel',
      'ux',
      3,
    ),
    check(
      'homefront workplane summary contract',
      /workplaneSummary/.test(homefrontVisualParity) &&
        /primaryQuestion/.test(homefrontVisualParity) &&
        /nextBestAction/.test(homefrontVisualParity) &&
        /\/command\?focus=provider-health/.test(homefrontVisualParity) &&
        /\/intel\?focus=intel-world/.test(homefrontVisualParity) &&
        /\/resources\?view=sources/.test(homefrontVisualParity) &&
        /homefront-workplane-summary/.test(shell),
      'Core route specs expose compact purpose/action/proof summaries rendered by the authenticated shell',
      'ux',
      3,
    ),
    check(
      'homefront authenticated shell polish contract',
      /interiorPolish/.test(homefrontVisualParity) &&
        /leadIntent/.test(homefrontVisualParity) &&
        /staleInfoPolicy/.test(homefrontVisualParity) &&
        /mediaMoment/.test(homefrontVisualParity) &&
        /activeStateLabel/.test(homefrontVisualParity) &&
        /supportDensity/.test(homefrontVisualParity) &&
        /data-interior-polish/.test(shell) &&
        /data-support-density/.test(shell) &&
        /data-active-label/.test(shell) &&
        /data-media-moment/.test(shell),
      'Authenticated non-HQ routes carry interior polish metadata through shell primitives without adding a new layout framework',
      'ux',
      3,
    ),
    check(
      'assistant turn receipt surfaces',
      /receiptTitle/.test(assistantChatActions) &&
        /receiptItems/.test(assistantChatActions) &&
        /changedFiles/.test(assistantChatActions) &&
        /assistant-turn-receipt/.test(assistantTurnReceipt) &&
        /AssistantTurnReceipt/.test(homeChat) &&
        /AssistantTurnReceipt/.test(commandBar) &&
        /AssistantTurnReceipt/.test(hqTerminalSection),
      'Home chat, CommandBar, and HQ chronicle render shared turn receipts with mode, tools, recovery, and file-change posture',
      'observability',
      3,
    ),
    check(
      'source intelligence governed ledger',
      /HOMEFRONT_SOURCE_LEDGER/.test(homefrontSourceIntelligence) &&
        /mapped/.test(homefrontSourceIntelligence) &&
        /candidate/.test(homefrontSourceIntelligence) &&
        /blocked/.test(homefrontSourceIntelligence) &&
        /rejected/.test(homefrontSourceIntelligence) &&
        /private-lane/.test(homefrontSourceIntelligence) &&
        /resources-source-ledger/.test(sourceIntelligenceConsole) &&
        /File to VAULT/.test(sourceIntelligenceConsole),
      'External GitHub/X resources are classified into governed source statuses and shown in RESOURCES with VAULT filing actions',
      'safety',
      3,
    ),
    check(
      'branch cleanup decision ledger',
      /No automatic branch deletion/.test(branchCleanupLedger) &&
        /Delete Local After Worktree Removal/.test(branchCleanupLedger) &&
        /Delete Remote After PR Check/.test(branchCleanupLedger) &&
        /Archive Tag Candidates/.test(branchCleanupLedger) &&
        /Do Not Touch Yet/.test(branchCleanupLedger) &&
        /Do not run this whole block blindly/.test(branchCleanupLedger),
      'Repo hygiene cleanup is documented as a review-gated decision ledger with exact commands but no automatic deletion',
      'safety',
      2,
    ),
    ...(ollamaOnly
      ? [
          check(
            'local inference posture module',
            /shouldAllowCloudEscalation/.test(localInferencePosture) &&
              /validateOllamaEndpoint/.test(localInferencePosture) &&
              /resolveProviderChainForTask/.test(localInferencePosture),
            'Local inference posture centralizes cloud escalation and Ollama endpoint validation',
            'safety',
            3,
          ),
          check(
            'agent cloud escalation guard',
            /shouldAllowCloudEscalation/.test(agent) &&
              /buildLocalInferenceRecoveryMessage/.test(agent) &&
              !/Trying free cloud providers/.test(agent),
            'Agent runtime blocks silent cloud escalation under local-first posture',
            'safety',
            3,
          ),
          check(
            'ai route local chain',
            /resolveProviderChainForTask/.test(aiRoute) &&
              /normalizeOllamaEndpoint/.test(aiRoute),
            'AI proxy uses local-first provider chains and validated Ollama endpoints',
            'safety',
            3,
          ),
          check(
            'intel-only degraded gate',
            /IntelOnlyAgentGate/.test(hqTerminalSection) &&
              /IntelOnlyAgentGate/.test(commandBar),
            'HQ and CommandBar surface intel-only recovery when Ollama is unavailable',
            'ux',
            2,
          ),
        ]
      : []),
  ]

  const passed = checks.filter((c) => c.pass).length
  const total = checks.length
  const weightedPassed = checks.filter((c) => c.pass).reduce((s, c) => s + (c.weight || 1), 0)
  const weightedTotal = checks.reduce((s, c) => s + (c.weight || 1), 0)
  const score = Math.round((weightedPassed / Math.max(1, weightedTotal)) * 100)
  const categories = {}
  for (const c of checks) {
    const k = c.category || 'other'
    if (!categories[k]) categories[k] = { passedWeight: 0, totalWeight: 0, score: 0 }
    categories[k].totalWeight += c.weight || 1
    if (c.pass) categories[k].passedWeight += c.weight || 1
  }
  for (const k of Object.keys(categories)) {
    const v = categories[k]
    v.score = Math.round((v.passedWeight / Math.max(1, v.totalWeight)) * 100)
  }
  const report = {
    ts: new Date().toISOString(),
    score,
    weightedPassed,
    weightedTotal,
    passed,
    total,
    minScore: opts.minScore,
    ok: score >= opts.minScore,
    categoryThresholds: opts.minCategory,
    categories,
    checks,
  }

  if (!opts.json) {
    console.log(`Agent runtime eval score: ${score} weighted (${weightedPassed}/${weightedTotal}) [min=${opts.minScore}]`)
    for (const c of checks) {
      console.log(`- [${c.pass ? 'PASS' : 'FAIL'}] (${c.category}, w=${c.weight}) ${c.name}: ${c.detail}`)
    }
    for (const [k, v] of Object.entries(categories)) {
      console.log(`  category:${k} => ${v.score} (${v.passedWeight}/${v.totalWeight})`)
    }

    const failedChecks = checks.filter((c) => !c.pass)
    if (failedChecks.length > 0) {
      console.log('Failed checks:')
      for (const c of failedChecks) {
        console.log(`  - ${c.name} [${c.category}]`)
      }
    }
  }

  const failedCategories = Object.entries(categories)
    .filter(([k, v]) => {
      const threshold = opts.minCategory[k]
      return typeof threshold === 'number' && v.score < threshold
    })
    .map(([k, v]) => ({ name: k, score: v.score, threshold: opts.minCategory[k] }))
  if (failedCategories.length > 0 && !opts.json) {
    console.log('Category threshold failures:')
    for (const c of failedCategories) {
      console.log(`  - ${c.name}: ${c.score} < ${c.threshold}`)
    }
  }

  if (opts.record) {
    ensureDir(HISTORY_DIR)
    try {
      fs.writeFileSync(LATEST_FILE, JSON.stringify(report, null, 2))
      fs.appendFileSync(HISTORY_FILE, `${JSON.stringify(report)}\n`)
      if (!opts.json) {
        console.log(`Wrote eval report: ${path.relative(ROOT, LATEST_FILE)}`)
        console.log(`Appended eval history: ${path.relative(ROOT, HISTORY_FILE)}`)
      }
    } catch (err) {
      if (!opts.json) {
        console.log(`Could not persist eval report: ${String(err && err.message ? err.message : err)}`)
      }
    }
  }

  if (opts.json) {
    process.stdout.write(JSON.stringify(report))
  }

  if (score < opts.minScore || failedCategories.length > 0) process.exit(1)
}

main()
