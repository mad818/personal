import {
  buildArticleReasoningFallback,
  enrichArticleReasoningIndex,
} from "@/lib/articleReasoning";
import { apiFetch } from "@/lib/apiFetch";
import type { CompiledMemoryPageSummary } from "@/components/vault/vaultGraphPageUtils";
import { deriveVaultArchiveLinks } from "@/lib/vaultCrossLinker";
import type { Article } from "@/store/useStore";
import { useStore } from "@/store/useStore";

const ARTICLE_INDEX_INFLIGHT = new Map<string, Promise<void>>();

async function loadCompiledPageCandidates() {
  try {
    const response = await apiFetch("/api/memory/pages?limit=48");
    if (!response.ok) return [];
    const payload = (await response.json()) as {
      pages?: CompiledMemoryPageSummary[];
    };
    return Array.isArray(payload.pages) ? payload.pages : [];
  } catch {
    return [];
  }
}

async function refreshArticleArchiveLinks(articleId: string) {
  const store = useStore.getState();
  const savedArticle = store.savedArticles.find((article) => article.id === articleId);
  if (!savedArticle) return;
  const compiledPages = await loadCompiledPageCandidates();
  const links = deriveVaultArchiveLinks({
    article: savedArticle,
    savedArticles: useStore.getState().savedArticles,
    compiledPages,
  });
  useStore.getState().updateArticleArchiveLinks(articleId, links);
}

function queueArticleReasoningIndex(article: Article) {
  if (ARTICLE_INDEX_INFLIGHT.has(article.id)) {
    return ARTICLE_INDEX_INFLIGHT.get(article.id);
  }

  const task = (async () => {
    const index = await enrichArticleReasoningIndex(article).catch(() =>
      buildArticleReasoningFallback(article),
    );
    useStore.getState().updateArticleReasoningIndex(article.id, index);
    await refreshArticleArchiveLinks(article.id);
  })().finally(() => {
    ARTICLE_INDEX_INFLIGHT.delete(article.id);
  });

  ARTICLE_INDEX_INFLIGHT.set(article.id, task);
  return task;
}

export function toggleSavedArticleWithIndex(article: Article) {
  const store = useStore.getState();
  const alreadySaved = store.savedArticles.some((saved) => saved.id === article.id);
  store.toggleSaveArticle(article);
  if (alreadySaved) return;
  if (article.index) {
    store.updateArticleReasoningIndex(article.id, article.index);
    void refreshArticleArchiveLinks(article.id);
    return;
  }
  void queueArticleReasoningIndex(article);
}
