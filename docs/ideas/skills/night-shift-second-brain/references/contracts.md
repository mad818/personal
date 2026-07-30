# Proposal contract

Use source IDs supplied by the runtime. Never invent paths.

```json
{
  "sourceIds": ["raw-example"],
  "atoms": [
    {
      "id": "short-safe-slug",
      "title": "Atomic claim title",
      "certainty": "tentative",
      "sourceIds": ["raw-example"],
      "claim": "One claim supported by the selected material.",
      "whyItMatters": "Why this claim changes a decision or existing view.",
      "links": ["existing-or-proposed-atom-id"],
      "friction": [
        { "noteId": "conflicting-atom-id", "reason": "Exact conflict." }
      ],
      "openThreads": ["Question still requiring evidence."]
    }
  ],
  "threads": [
    {
      "id": "thread-slug",
      "title": "Synthesis title",
      "summary": "Bounded synthesis of cited atoms.",
      "atomIds": ["short-safe-slug"]
    }
  ],
  "briefing": {
    "attention": "One operator decision worth attention.",
    "contradictions": ["Linked friction summary."],
    "threadsChanged": ["thread-slug"]
  }
}
```

Limits are enforced by the Nexus runtime. A proposal is scratch work until the operator approves it.
