"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type Ref,
} from "react";
import CompactOperatorNote from "@/components/ui/CompactOperatorNote";
import AssistantOperatorWorkflowPanel from "@/components/assistant/AssistantOperatorWorkflowPanel";
import AssistantTurnReceipt from "@/components/assistant/AssistantTurnReceipt";
import AssistantGuidanceStack from "@/components/ui/AssistantGuidanceStack";
import DictationButton from "@/components/ui/DictationButton";
import EvidencePosturePanel from "@/components/ui/EvidencePosturePanel";
import FreeLocalReadinessPanel from "@/components/ui/FreeLocalReadinessPanel";
import { SpeakButton } from "@/components/ui/SpeakButton";
import VoiceProjectButton from "@/components/ui/VoiceProjectButton";
import { FileBackButton } from "@/components/home/office/FileBackButton";
import { AskMemoryFromReplyButton } from "@/components/home/office/AskMemoryFromReplyButton";
import MissionContinuationActions from "@/components/ui/MissionContinuationActions";
import { parseInlineEvidencePosture } from "@/lib/aiStructuredEvidence";
import {
  buildInternalThinkingSummary,
  extractThinkingTrace,
} from "@/lib/aiThinkingTrace";
import { getTabFromHref } from "@/lib/missionHandoff";
import { getSurfaceModuleSpec } from "@/lib/surfaceRedesignRegistry";
import {
  resolveChronicleMotionPreset,
  type SurfaceMotionProfile,
} from "@/lib/surfaceMotion";
import { apiFetch } from "@/lib/apiFetch";
import { resolveAssistantDispatch } from "@/lib/assistantDispatch";
import type { AssistantChatActionModel } from "@/lib/assistantChatActions";
import {
  shouldShowAssistantOperatorWorkflow,
  type AssistantOperatorWorkflowFocus,
  type AssistantOperatorWorkflowState,
} from "@/lib/assistantOperatorWorkflow";
import { useStore } from "@/store/useStore";
import { AGENTS } from "./constants";
import { ToolCallBadge } from "./ToolCallBadge";
import { detectAgentDebug } from "./prompts";
import { PersonaModeBar } from "./PersonaModeBar";
import { CouncilResultsPanel } from "./CouncilResultsPanel";
import { STRATEGIUM_PROMPTS } from "./officeCommandCenterConfig";
import type { AgentId, ChatMessage, CouncilResult } from "./types";
import type { AgentStep } from "@/lib/agent";
import type { CorrectionMemoryEntry } from "@/lib/assistantSessionMemory";

const LOCAL_AI_CHECK_PROMPT =
  "Are you using local Ollama, what model, and are paid APIs blocked?";

interface HQTerminalSectionProps {
  messages: ChatMessage[];
  activeAgent: AgentId | null;
  activeColor: string;
  liveSteps: AgentStep[];
  pendingLesson: {
    text: string;
    agent: string;
  } | null;
  pendingCorrection: CorrectionMemoryEntry | null;
  input: string;
  surfaceMotionProfile: SurfaceMotionProfile;
  agentDebugMode: boolean;
  canClear: boolean;
  inputRef: Ref<HTMLTextAreaElement>;
  scrollViewportRef: Ref<HTMLDivElement>;
  onPrimePrompt: (prompt: string) => void;
  onQuickSend: (prompt: string) => void | Promise<void>;
  onInputChange: (value: string) => void;
  onDictationAppend: (value: string) => void;
  onInputKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onAskMemory: () => void;
  onSend: () => void | Promise<void>;
  onAssistantAction: (
    message: ChatMessage,
    action: AssistantChatActionModel["actions"][number],
  ) => void;
  onClear: () => void;
  onMergeCouncil: (results: CouncilResult[]) => void;
  onUseCouncilResult: (result: CouncilResult) => void;
  onLogLesson: () => void;
  onDismissLesson: () => void;
  onApproveCorrection: () => void;
  onArchiveCorrection: () => void;
}

export default function HQTerminalSection({
  messages,
  activeAgent,
  activeColor,
  liveSteps,
  pendingLesson,
  pendingCorrection,
  input,
  surfaceMotionProfile,
  agentDebugMode,
  canClear,
  inputRef,
  scrollViewportRef,
  onPrimePrompt,
  onQuickSend,
  onInputChange,
  onDictationAppend,
  onInputKeyDown,
  onAskMemory,
  onSend,
  onAssistantAction,
  onClear,
  onMergeCouncil,
  onUseCouncilResult,
  onLogLesson,
  onDismissLesson,
  onApproveCorrection,
  onArchiveCorrection,
}: HQTerminalSectionProps) {
  const chronicleMotion = resolveChronicleMotionPreset(surfaceMotionProfile);
  const debug = agentDebugMode && input.trim() ? detectAgentDebug(input) : null;
  const chronicleSpec = getSurfaceModuleSpec("hq", "command-chronicle");
  const debugScores = debug
    ? Object.entries(debug.scores).sort(([, a], [, b]) => b - a)
    : [];
  const settings = useStore((s) => s.settings);
  const agentRuntime = useStore((s) => s.agentRuntime);
  const setTab = useStore((s) => s.setTab);
  const readinessPlan = useMemo(
    () => resolveAssistantDispatch(input.trim() || "What can you do?"),
    [input],
  );
  const readinessToolGroups = readinessPlan.toolCatalog.id
    .split("+")
    .filter(Boolean)
    .slice(0, 4)
    .join(" / ");
  const providerLabel =
    settings.aiProvider === "ollama" ? "Local Ollama" : settings.aiProvider;
  const modelLabel =
    settings.aiProvider === "ollama"
      ? settings.localModel || "auto"
      : "provider default";
  const readinessStatus = settings.agentHighRiskWritesRequireApproval
    ? "writes review-gated"
    : "high-risk posture open";
  const [liveReadiness, setLiveReadiness] = useState({
    session: "checking",
    networkMode: "checking",
    ollama: "checking",
    resolvedModel: modelLabel,
    agentHealth: "checking",
    blockedReason: readinessStatus,
  });
  const [workflowFocusByMessage, setWorkflowFocusByMessage] = useState<
    Record<number, AssistantOperatorWorkflowFocus>
  >({});
  const [liveNow, setLiveNow] = useState(Date.now());

  useEffect(() => {
    if (!activeAgent) return;
    setLiveNow(Date.now());
    const interval = window.setInterval(() => setLiveNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [activeAgent]);

  const liveExecutionElapsedMs =
    activeAgent && agentRuntime.startedAt
      ? Math.max(0, liveNow - agentRuntime.startedAt)
      : 0;
  const waitingOnLocalRuntime = liveSteps.some(
    (step) =>
      step.type === "thinking" &&
      /local model|ollama|runtime model/i.test(step.content),
  );
  const showLiveWatchdog =
    Boolean(activeAgent) && waitingOnLocalRuntime && liveExecutionElapsedMs > 15000;
  const providerHealthHref = "/command?focus=provider-health";

  useEffect(() => {
    let cancelled = false;

    async function loadReadiness() {
      let session = "session unknown";
      let networkMode = "local-first";
      let ollama = "provider unknown";
      let resolvedModel = modelLabel;
      let agentHealth = "eval unknown";
      let blockedReason = readinessStatus;

      try {
        const authResponse = await apiFetch("/api/auth-diagnostics", {
          cache: "no-store",
        });
        if (authResponse.ok) {
          const auth = (await authResponse.json()) as {
            summary?: {
              authenticated?: boolean;
              networkMode?: string;
              highRiskEnabled?: boolean;
            };
          };
          session = auth.summary?.authenticated ? "session armed" : "session required";
          networkMode = auth.summary?.networkMode ?? networkMode;
          blockedReason = auth.summary?.highRiskEnabled
            ? "high-risk enabled"
            : "high-risk blocked";
        }
      } catch {
        session = "session check unavailable";
      }

      try {
        const ollamaResponse = await apiFetch(
          `/api/ollama/catalog?model=${encodeURIComponent(settings.localModel || "")}`,
          { cache: "no-store" },
        );
        if (ollamaResponse.status === 401 || ollamaResponse.status === 403) {
          session = "session required";
          ollama = "catalog locked";
        } else if (ollamaResponse.ok) {
          const catalog = (await ollamaResponse.json()) as {
            reachable?: boolean;
            resolvedModel?: string;
            resolutionReason?: string;
          };
          resolvedModel = catalog.resolvedModel || resolvedModel;
          ollama = catalog.reachable
            ? `ollama ready · ${catalog.resolutionReason ?? "resolved"}`
            : "ollama offline";
        } else {
          ollama = `catalog ${ollamaResponse.status}`;
        }
      } catch {
        ollama = "catalog unavailable";
      }

      try {
        const healthResponse = await apiFetch("/api/agent-health", {
          cache: "no-store",
        });
        if (healthResponse.status === 401 || healthResponse.status === 403) {
          session = "session required";
          agentHealth = "agent health locked";
        } else if (healthResponse.ok) {
          const health = (await healthResponse.json()) as {
            agents?: Array<{ passRate?: number; passCount?: number; failCount?: number }>;
          };
          const aggregate = health.agents?.[0];
          agentHealth =
            typeof aggregate?.passRate === "number"
              ? `eval ${Math.round(aggregate.passRate * 100)}% · ${aggregate.passCount ?? 0}/${(aggregate.passCount ?? 0) + (aggregate.failCount ?? 0)}`
              : "eval not recorded";
        } else {
          agentHealth = `agent health ${healthResponse.status}`;
        }
      } catch {
        agentHealth = "agent health unavailable";
      }

      if (!cancelled) {
        setLiveReadiness({
          session,
          networkMode,
          ollama,
          resolvedModel,
          agentHealth,
          blockedReason,
        });
      }
    }

    void loadReadiness();
    const interval = window.setInterval(loadReadiness, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [modelLabel, readinessStatus, settings.localModel]);

  return (
    <div
      className="nexus-hq-chronicle-shell"
      data-chronicle-shell={chronicleMotion.shell}
      data-sequence-state={
        activeAgent ? "executing" : messages.length > 0 ? "settled" : "ready"
      }
      style={
        {
          "--nexus-chronicle-reply-duration": `${chronicleMotion.replyDurationMs}ms`,
          "--nexus-chronicle-step-duration": `${chronicleMotion.stepDurationMs}ms`,
          "--nexus-chronicle-handoff-duration": `${chronicleMotion.handoffDurationMs}ms`,
          "--nexus-chronicle-lesson-duration": `${chronicleMotion.lessonDurationMs}ms`,
          "--nexus-chronicle-order-duration": `${chronicleMotion.orderDurationMs}ms`,
          "--nexus-chronicle-continuity-duration": `${chronicleMotion.continuityDurationMs}ms`,
          "--nexus-chronicle-band-interval": `${chronicleMotion.bandIntervalMs}ms`,
          "--nexus-chronicle-live-pulse": `${chronicleMotion.livePulseMs}ms`,
          "--nexus-chronicle-composer-glow": `${chronicleMotion.composerGlow}`,
          "--nexus-chronicle-live-accent": activeColor,
        } as CSSProperties
      }
    >
      <div
        data-testid="hq-chronicle-scroll"
        ref={scrollViewportRef}
        className="nexus-hq-chronicle__scroll"
      >
        {messages.length === 0 ? (
          <div className="nexus-hq-chronicle__empty">
            <CompactOperatorNote
              label={chronicleSpec?.title ?? "Issue the next move"}
              summary={
                chronicleSpec?.summary ??
                "Prime the chamber with a command. Live signals stay mounted elsewhere so this lane can stay focused on dispatch, evidence, and final recommendations."
              }
              detail={
                chronicleSpec?.strongestAction?.note ??
                "Open the prompt chips when you want a fast starting point instead of a long wall of guidance."
              }
              tone="neutral"
            >
              <div className="nexus-hq-chronicle__prompts">
                {STRATEGIUM_PROMPTS.map((prompt) => (
                  <button
                    key={prompt.label}
                    type="button"
                    className="nexus-hq-composer__preset"
                    onClick={() => onPrimePrompt(prompt.prompt)}
                  >
                    {prompt.label}
                  </button>
                ))}
              </div>
            </CompactOperatorNote>
          </div>
        ) : (
          <div className="nexus-hq-chronicle__list">
            {messages.map((message, index) => {
              const cfgColor = message.agent
                ? (AGENTS[message.agent]?.color ?? activeColor)
                : activeColor;
              const operatorWorkflow =
                message.actionModel?.operatorWorkflow ?? message.operatorWorkflow;
              const thinkingTrace =
                message.role === "agent"
                  ? extractThinkingTrace(message.text)
                  : null;
              const safeMessageText = thinkingTrace?.visibleText ?? message.text;
              const parsedEvidence =
                message.role === "agent"
                  ? parseInlineEvidencePosture(safeMessageText)
                  : null;
              const inlineEvidence =
                message.role === "agent" &&
                message.showEvidencePosture !== false
                  ? parsedEvidence
                  : null;
              const operatorVisibleText = (
                parsedEvidence?.mainText?.trim() ||
                safeMessageText ||
                "No operator-visible answer was returned after internal reasoning. Review the runtime trace and retry."
              ).trim();
              const hasThinkingStep = Boolean(
                message.steps?.some((step) => step.type === "thinking"),
              );
              const displaySteps =
                message.role === "agent" &&
                thinkingTrace?.hasThinking &&
                !hasThinkingStep
                  ? [
                      {
                        type: "thinking" as const,
                        content: buildInternalThinkingSummary(
                          thinkingTrace.thinkingBlocks,
                        ),
                      },
                      ...(message.steps ?? []),
                    ]
                  : (message.steps ?? []);
              const showPersistedSteps =
                message.role === "agent" &&
                message.responseKind !== "assistant" &&
                displaySteps.length > 0;
              const entryKind =
                message.role === "user"
                  ? "order"
                  : message.preparedWorkspace
                    ? "handoff"
                    : message.responseKind === "workflow"
                      ? "workflow"
                      : "dispatch";

              return (
                <div
                  key={index}
                  className="nexus-hq-chronicle__entry"
                  data-role={message.role}
                  data-entry-kind={entryKind}
                  style={
                    {
                      "--nexus-chronicle-accent": cfgColor,
                      "--nexus-chronicle-entry-index": index,
                    } as CSSProperties
                  }
                >
                  {message.role === "agent" && message.agent ? (
                    <div className="nexus-hq-chronicle__origin">
                      <span className="nexus-hq-chronicle__originName">
                        {AGENTS[message.agent].name}
                      </span>
                      <span className="nexus-hq-chronicle__originRole">
                        {AGENTS[message.agent].role}
                      </span>
                    </div>
                  ) : null}
                  {showPersistedSteps ? (
                    <div className="nexus-hq-chronicle__stepRail">
                      <div className="nexus-hq-chronicle__stepLabel">
                        Run trace
                      </div>
                      <div className="nexus-hq-chronicle__stepStack">
                        {displaySteps.slice(-18).map((step, stepIndex) => (
                          <ToolCallBadge key={stepIndex} step={step} />
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div
                    className="nexus-hq-chronicle__bubble"
                    data-role={message.role}
                    data-response-kind={message.responseKind ?? "assistant"}
                    data-entry-kind={entryKind}
                  >
                    {operatorVisibleText}
                  </div>
                  {message.role === "agent" && inlineEvidence ? (
                    <div className="nexus-hq-chronicle__evidence">
                      <EvidencePosturePanel
                        title="Evidence posture"
                        summary="Observed facts, inferred reasoning, and verify-next checks were extracted from the chronicle reply."
                        observed={inlineEvidence.observed}
                        inferred={inlineEvidence.inferred}
                        verifyNext={inlineEvidence.verifyNext}
                        compact
                      />
                    </div>
                  ) : null}
                  {message.role === "agent" && message.assistantGuidance?.length ? (
                    <AssistantGuidanceStack items={message.assistantGuidance} />
                  ) : null}
                  {message.role === "agent" && operatorVisibleText ? (
                    <div className="nexus-hq-chronicle__actions">
                      <SpeakButton text={operatorVisibleText} size="sm" />
                      <VoiceProjectButton
                        text={operatorVisibleText}
                        title={`${message.agent ? AGENTS[message.agent].name : "HQ"} briefing`}
                        sourceKey={`hq-message-${index}`}
                        sourceRoute="/hq"
                      />
                      <AskMemoryFromReplyButton
                        query={message.sourceQuery}
                        promptText={message.sourceQuery ?? operatorVisibleText}
                      />
                    </div>
                  ) : null}
                  {message.role === "agent" &&
                  message.actionModel?.actions.length ? (
                    <div className="nexus-hq-chronicle__assistantActions">
                      {message.actionModel.actions.map((action) => (
                        <button
                          key={`${action.kind}-${action.href ?? action.label}`}
                          type="button"
                          className="nexus-hq-chronicle__assistantAction"
                          title={action.detail}
                          onClick={() => {
                            if (action.workflowFocus) {
                              const workflowFocus = action.workflowFocus;
                              setWorkflowFocusByMessage((current) => ({
                                ...current,
                                [index]: workflowFocus,
                              }));
                              return;
                            }
                            onAssistantAction(message, action);
                          }}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {message.role === "agent" ? (
                    <AssistantTurnReceipt
                      actionModel={message.actionModel}
                      compact
                    />
                  ) : null}
                  {message.role === "agent" &&
                  shouldShowAssistantOperatorWorkflow(operatorWorkflow) ? (
                    <AssistantOperatorWorkflowPanel
                      workflow={operatorWorkflow as AssistantOperatorWorkflowState}
                      focus={workflowFocusByMessage[index]}
                      compact
                    />
                  ) : null}
                  {message.role === "agent" && message.agent ? (
                    <div className="nexus-hq-chronicle__fileBack">
                      <FileBackButton
                        text={safeMessageText || operatorVisibleText}
                        agentId={message.agent}
                        suggestion={message.vaultCaptureSuggestion}
                      />
                    </div>
                  ) : null}
                  {message.role === "agent" && message.preparedWorkspace ? (
                    <div className="nexus-hq-chronicle__handoff">
                      <div className="nexus-hq-chronicle__handoffHeader">
                        <span className="nexus-hq-chronicle__handoffEyebrow">
                          Workspace prepared
                        </span>
                        <span className="nexus-hq-chronicle__handoffState">
                          Exact session
                        </span>
                      </div>
                      <div className="nexus-hq-chronicle__handoffDetail">
                        {message.preparedWorkspace.detail}
                      </div>
                      <MissionContinuationActions
                        extraTargets={[
                          {
                            href: message.preparedWorkspace.href,
                            label: message.preparedWorkspace.label,
                            tab: getTabFromHref(message.preparedWorkspace.href),
                          },
                        ]}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}

            {activeAgent && liveSteps.length > 0 ? (
              <div
                className="nexus-hq-chronicle__liveRail"
                data-live-state="active"
                style={
                  {
                    "--nexus-chronicle-accent": activeColor,
                  } as CSSProperties
                }
              >
                <div className="nexus-hq-chronicle__stepLabel">
                  Live execution
                </div>
                <div className="nexus-hq-chronicle__stepStack">
                  {liveSteps.slice(-12).map((step, index) => (
                    <ToolCallBadge key={index} step={step} />
                  ))}
                </div>
                {showLiveWatchdog ? (
                  <div
                    className="nexus-hq-chronicle__liveRecovery"
                    data-testid="hq-live-execution-watchdog"
                  >
                    <div>
                      <strong>Local model is still responding.</strong>
                      <span>
                        This is usually Ollama loading or a slow model turn. Short
                        pings now answer locally; real tasks stay in the runtime.
                      </span>
                    </div>
                    <a
                      href={providerHealthHref}
                      onClick={() => setTab(getTabFromHref(providerHealthHref))}
                    >
                      Provider health
                    </a>
                  </div>
                ) : null}
              </div>
            ) : null}
            {activeAgent && liveSteps.length === 0 ? (
              <div className="nexus-hq-chronicle__typing">
                <span />
                <span />
                <span />
              </div>
            ) : null}
          </div>
        )}
      </div>

      {pendingLesson ? (
        <div className="nexus-hq-lesson-bar">
          <div className="nexus-hq-lesson-bar__copy">
            <div className="nexus-hq-lesson-bar__eyebrow">
              Lesson proposal
              <span className="nexus-hq-lesson-bar__agent">
                {pendingLesson.agent}
              </span>
            </div>
            <div className="nexus-hq-lesson-bar__text">
              {pendingLesson.text.slice(0, 200)}
              {pendingLesson.text.length > 200 ? "…" : ""}
            </div>
          </div>
          <div className="nexus-hq-lesson-bar__actions">
            <button
              type="button"
              onClick={onLogLesson}
              className="nexus-hq-composer__action is-send"
            >
              Log lesson
            </button>
            <button
              type="button"
              onClick={onDismissLesson}
              className="nexus-hq-composer__action"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {pendingCorrection ? (
        <div className="nexus-hq-lesson-bar">
          <div className="nexus-hq-lesson-bar__copy">
            <div className="nexus-hq-lesson-bar__eyebrow">
              Correction proposal
              <span className="nexus-hq-lesson-bar__agent">
                {pendingCorrection.scope.agent?.toUpperCase() ?? "LOCAL"}
              </span>
            </div>
            <div className="nexus-hq-lesson-bar__text">
              {pendingCorrection.content.rule}
            </div>
            <div className="mt-1 text-[10px] text-[var(--text3)]">
              {pendingCorrection.content.preferredBehavior}
            </div>
          </div>
          <div className="nexus-hq-lesson-bar__actions">
            <button
              type="button"
              onClick={onApproveCorrection}
              className="nexus-hq-composer__action is-send"
            >
              Approve correction
            </button>
            <button
              type="button"
              onClick={onArchiveCorrection}
              className="nexus-hq-composer__action"
            >
              Archive
            </button>
          </div>
        </div>
      ) : null}

      <div
        data-testid="hq-composer"
        className="nexus-hq-composer"
        data-active={Boolean(activeAgent)}
        data-composer-state={
          activeAgent ? "locked" : input.trim() ? "armed" : "ready"
        }
      >
        {!activeAgent && messages.length === 0 ? (
          <div className="nexus-hq-chronicle__prompts">
            {STRATEGIUM_PROMPTS.map((prompt) => (
              <button
                key={prompt.label}
                type="button"
                className="nexus-hq-composer__preset"
                onClick={() => onPrimePrompt(prompt.prompt)}
              >
                {prompt.label}
              </button>
            ))}
          </div>
        ) : null}
        <div className="nexus-hq-composer__localCheck">
          <button
            type="button"
            onClick={() => {
              void onQuickSend(LOCAL_AI_CHECK_PROMPT);
            }}
            disabled={Boolean(activeAgent)}
            className="nexus-hq-composer__preset is-local-check"
            data-testid="hq-check-local-ai"
          >
            Check local AI
          </button>
          <span>Provider, model, free posture, and file-change proof</span>
        </div>
        {debug ? (
          <div className="nexus-hq-composer__routeDebug">
            <span className="nexus-hq-composer__routeLabel">Route</span>
            {debugScores.map(([agent, score]) => (
              <span
                key={agent}
                className="nexus-hq-composer__routeScore"
                data-active={agent === debug.winner}
              >
                {agent.toUpperCase()} {score}
              </span>
            ))}
            {debug.phrases.length > 0 ? (
              <span className="nexus-hq-composer__routeHint">
                [{debug.phrases.slice(0, 2).join(", ")}]
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="nexus-hq-free-local-readiness">
          <FreeLocalReadinessPanel surface="hq" compact />
        </div>
        <div className="nexus-hq-assistant-readiness">
          <span className="nexus-hq-assistant-readiness__label">
            Assistant readiness
          </span>
          <span>{liveReadiness.session}</span>
          <span>{providerLabel}</span>
          <span>{liveReadiness.resolvedModel}</span>
          <span>{liveReadiness.ollama}</span>
          <span>{liveReadiness.agentHealth}</span>
          <span>{liveReadiness.networkMode}</span>
          <span>
            {readinessPlan.agent.toUpperCase()} ·{" "}
            {readinessPlan.answerMode.replace(/_/g, " ")}
          </span>
          <span>{readinessToolGroups || "base tools"}</span>
          <span>{liveReadiness.blockedReason}</span>
        </div>
        <div className="nexus-hq-composer__topline">
          <PersonaModeBar />
        </div>
        <div className="nexus-hq-composer__council">
          <CouncilResultsPanel
            onMerge={onMergeCouncil}
            onUse={onUseCouncilResult}
          />
        </div>
        <div className="nexus-hq-composer__dock">
          <textarea
            aria-label="HQ command input"
            data-testid="hq-command-input"
            ref={inputRef}
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder={
              activeAgent
                ? "Agent running..."
                : "Issue a briefing, dispatch, or /deepresearch…"
            }
            disabled={Boolean(activeAgent)}
            rows={1}
            className="nexus-hq-composer__field"
          />
          <div className="nexus-hq-composer__actions">
            <DictationButton
              onTranscript={(transcript) => onDictationAppend(transcript)}
              title="Dictate into HQ"
            />
            <button
              type="button"
              onClick={onAskMemory}
              disabled={!input.trim() || Boolean(activeAgent)}
              className="nexus-hq-composer__action"
              title="Open this prompt in the local memory lane"
            >
              Ask memory
            </button>
            <button
              type="button"
              onClick={() => {
                void onSend();
              }}
              data-testid="hq-send"
              disabled={!input.trim() || Boolean(activeAgent)}
              className="nexus-hq-composer__action nexus-hq-composer__action--icon is-send"
              title="Send"
            >
              {activeAgent ? "…" : "▶"}
            </button>
            <button
              type="button"
              onClick={onClear}
              disabled={!canClear}
              className="nexus-hq-composer__action"
              title="Clear chat"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
