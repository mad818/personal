# Token Budget Policy (Operator Draft)

## Objective
Reduce token waste without reducing answer quality.

## Default operating rules
1. **Prompt edit before follow-up**
   If an instruction is wrong, edit/regenerate rather than append corrective chatter.

2. **Conversation compaction**
   At 15–20 turns, generate a compact state summary and branch into a fresh thread.

3. **Batch related asks**
   Merge sequential micro-questions into a single structured request.

4. **Model routing by task complexity**
   - Low-cost model: formatting, extraction, short rewrites.
   - Standard model: normal coding tasks.
   - Deep model: difficult architecture/debug tasks.

5. **Tool gating**
   Keep optional tools disabled unless required for the current step.

## Product hooks to implement
- Context-length meter in the chat UI.
- "Summarize and continue in new thread" button.
- Task complexity selector to influence model routing.
- Runtime metrics for token-in / token-out per workflow stage.

## Success metrics
- 25% reduction in average token consumption per completed task.
- Fewer hard-limit interruptions in long-running sessions.
- No drop in first-pass task completion quality.
