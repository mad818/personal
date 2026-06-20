export interface FeynmanDirectTool {
  id: string;
  label: string;
  commandHint: string;
  approvalNote: string;
}

export const FEYNMAN_DIRECT_TOOLS: FeynmanDirectTool[] = [
  {
    id: "paper_inspect",
    label: "Paper Inspect",
    commandHint: "@nova: inspect paper <arxiv_id_or_title>",
    approvalNote: "Read-only. Fetches abstract, sections, and figures from Arxiv. No approval needed.",
  },
  {
    id: "paper_code_audit",
    label: "Paper Code Audit",
    commandHint: "@orbit: audit paper code <arxiv_id_or_title>",
    approvalNote: "Read-only audit of supplemental code and repo links. No approval needed.",
  },
  {
    id: "feynman_replicate_run",
    label: "Feynman Replicate",
    commandHint: "@orbit: replicate <paper_title> locally",
    approvalNote: "Local replication attempt. Requires approval before any disk writes.",
  },
  {
    id: "feynman_docker_experiment",
    label: "Docker Experiment",
    commandHint: "@orbit: run docker experiment for <paper_title>",
    approvalNote: "Sandboxed Docker container. Explicit approval required before launch.",
  },
  {
    id: "feynman_autoresearch",
    label: "Autoresearch Loop",
    commandHint: "@nova: autoresearch <topic_or_paper>",
    approvalNote: "Autonomous multi-step research loop. Approval required before starting.",
  },
  {
    id: "feynman_watch",
    label: "Feynman Watch",
    commandHint: "@nova: watch <arxiv_id_or_topic>",
    approvalNote: "Subscribes to new papers on a topic. Low-risk. Recommend approval for long-running loops.",
  },
];
