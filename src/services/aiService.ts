import {
  CleanedDataset,
  ChartConfig,
  InsightItem,
  AIQueryActions,
  InvestigationSubject,
  InvestigationResult,
} from '../types';
import {
  generateInsights as generateLocalInsights,
  processLocalNaturalQuery,
  investigateSubjectLocally,
} from '../utils/analyticsEngine';

// AI Service Status state for graceful limits management
export interface AIHealthStatus {
  isRateLimited: boolean;
  isUnavailable: boolean;
  friendlyMessage: string | null;
  lastChecked: number;
}

let currentAIStatus: AIHealthStatus = {
  isRateLimited: false,
  isUnavailable: false,
  friendlyMessage: null,
  lastChecked: Date.now(),
};

type StatusListener = (status: AIHealthStatus) => void;
const statusListeners = new Set<StatusListener>();

export function subscribeToAIStatus(listener: StatusListener): () => void {
  statusListeners.add(listener);
  listener(currentAIStatus);
  return () => statusListeners.delete(listener);
}

function updateAIStatus(partial: Partial<AIHealthStatus>) {
  currentAIStatus = { ...currentAIStatus, ...partial, lastChecked: Date.now() };
  statusListeners.forEach((l) => l(currentAIStatus));
}

export function clearAIStatusNotice() {
  updateAIStatus({
    isRateLimited: false,
    isUnavailable: false,
    friendlyMessage: null,
  });
}

/**
 * Standard friendly message when AI limits or network errors occur
 */
export const AI_FALLBACK_NOTICE_AR =
  'التحليل الذكي غير متاح مؤقتًا، لكن بياناتك ولوحة التحكم محفوظين ويمكنك الاستمرار في استخدام الأدوات الأساسية.';
export const AI_FALLBACK_NOTICE_EN =
  'Smart AI is temporarily unavailable, but your data and dashboard are safely preserved, and you can continue using all core tools.';

/**
 * Parses raw text: Uses smart local parser first, only calls AI for unstructured sentences or ambiguous notes
 */
export async function parseUnstructuredTextWithAI(
  text: string,
  language: 'ar' | 'en' = 'ar'
): Promise<{
  headers: string[];
  rows: any[];
  columnTypes?: Record<string, any>;
  isConfident?: boolean;
  confidenceScore?: number;
  confidenceReason?: string;
  notes?: string[];
} | null> {
  try {
    const res = await fetch('/api/ai/parse-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language }),
    });

    if (res.status === 429) {
      updateAIStatus({
        isRateLimited: true,
        friendlyMessage: language === 'ar' ? AI_FALLBACK_NOTICE_AR : AI_FALLBACK_NOTICE_EN,
      });
      return null;
    }

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (data.success && data.columns && data.rows) {
      clearAIStatusNotice();
      return {
        headers: data.columns,
        rows: data.rows,
        columnTypes: data.columnTypes,
        isConfident: data.isConfident,
        confidenceScore: data.confidenceScore,
        confidenceReason: data.confidenceReason,
        notes: data.cleaningNotes,
      };
    }
  } catch (err) {
    console.warn('[DataMate] AI parse unavailable, using deterministic local parser:', err);
  }
  return null;
}

/**
 * Fetches AI-generated insights or uses local engine
 * Keeps previous valid insights if AI request fails!
 */
export async function fetchInsights(
  dataset: CleanedDataset,
  language: 'ar' | 'en' = 'ar',
  previousInsights?: InsightItem[]
): Promise<InsightItem[]> {
  const localInsights = generateLocalInsights(dataset);

  try {
    const summary = {
      name: dataset.name,
      rowCount: dataset.totalRows,
      columns: dataset.columns.map((c) => ({
        key: c.key,
        type: c.type,
        role: c.inferredRole,
        sum: c.sum,
        avg: c.avg,
      })),
      cleaningSummary: dataset.cleaningSummary,
    };

    const res = await fetch('/api/ai/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary, language }),
    });

    if (res.status === 429) {
      updateAIStatus({
        isRateLimited: true,
        friendlyMessage: language === 'ar' ? AI_FALLBACK_NOTICE_AR : AI_FALLBACK_NOTICE_EN,
      });
      // Keep previous valid insights if present, otherwise local
      return previousInsights && previousInsights.length > 0 ? previousInsights : localInsights;
    }

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.insights) && data.insights.length > 0) {
        clearAIStatusNotice();
        return data.insights.map((item: any, idx: number) => ({
          id: `ai_ins_${idx}`,
          type: item.type || 'neutral',
          textAr: language === 'ar' ? item.text : localInsights[idx]?.textAr || item.text,
          textEn: language === 'en' ? item.text : localInsights[idx]?.textEn || item.text,
          metricLabel: item.metric,
          metricValue: item.value,
        }));
      }
    }
  } catch (err) {
    console.warn('[DataMate] AI insights service unavailable, smoothly using local analytics:', err);
    updateAIStatus({
      isUnavailable: true,
      friendlyMessage: language === 'ar' ? AI_FALLBACK_NOTICE_AR : AI_FALLBACK_NOTICE_EN,
    });
  }

  // Graceful fallback: return previous insights or deterministic local calculation
  return previousInsights && previousInsights.length > 0 ? previousInsights : localInsights;
}

/**
 * Modifies dashboard or answers questions using AI / local engine
 * Never throws or leaves user without an answer!
 */
export async function sendNaturalLanguageQuery(
  query: string,
  dataset: CleanedDataset,
  currentCharts: ChartConfig[],
  isSimplified: boolean,
  language: 'ar' | 'en' = 'ar'
): Promise<{
  reply: string;
  directAnswer?: string;
  actions: AIQueryActions;
}> {
  // Always prepare local deterministic response first
  const localResult = processLocalNaturalQuery(query, dataset, currentCharts, isSimplified);

  try {
    const res = await fetch('/api/ai/modify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: query,
        currentDashboard: {
          isSimplified,
          chartCount: currentCharts.length,
        },
        dataSummary: {
          columns: dataset.columns.map((c) => c.key),
          totalRows: dataset.totalRows,
        },
        language,
      }),
    });

    if (res.status === 429) {
      updateAIStatus({
        isRateLimited: true,
        friendlyMessage: language === 'ar' ? AI_FALLBACK_NOTICE_AR : AI_FALLBACK_NOTICE_EN,
      });
      // Fallback to local rule engine so user's query is STILL executed!
      return {
        ...localResult,
        reply: `${localResult.reply} (${language === 'ar' ? 'تمت المعالجة محليًا' : 'processed locally'})`,
      };
    }

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.reply) {
        clearAIStatusNotice();
        return {
          reply: data.reply,
          directAnswer: data.directAnswer,
          actions: data.actions || {},
        };
      }
    }
  } catch (err) {
    console.warn('[DataMate] AI modify endpoint unavailable, smoothly executing query locally:', err);
    updateAIStatus({
      isUnavailable: true,
      friendlyMessage: language === 'ar' ? AI_FALLBACK_NOTICE_AR : AI_FALLBACK_NOTICE_EN,
    });
  }

  // Local fallback (100% reliable, zero downtime)
  return localResult;
}

/**
 * DataMate Investigator: Understand WHY a number or chart behaves the way it does
 * Integrates evidence-based local statistics with Gemini business narrative.
 */
export async function investigateSubject(
  subject: InvestigationSubject,
  dataset: CleanedDataset,
  language: 'ar' | 'en' = 'ar'
): Promise<InvestigationResult> {
  // 1. Immediately calculate deterministic math & evidence locally
  const localResult = investigateSubjectLocally(subject, dataset, language);

  // 2. Try enriching with Gemini AI for deeper business causality
  try {
    const res = await fetch('/api/ai/investigate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject,
        localAnalysis: {
          summaryWhat: localResult.summaryWhat,
          summaryWhy: localResult.summaryWhy,
          evidence: localResult.evidence,
          recommendation: localResult.recommendation,
        },
        dataSummary: {
          name: dataset.name,
          totalRows: dataset.totalRows,
          columns: dataset.columns.map((c) => ({ key: c.key, role: c.inferredRole, type: c.type })),
        },
        language,
      }),
    });

    if (res.status === 429) {
      updateAIStatus({
        isRateLimited: true,
        friendlyMessage: language === 'ar' ? AI_FALLBACK_NOTICE_AR : AI_FALLBACK_NOTICE_EN,
      });
      return { ...localResult, isAiEnriched: false };
    }

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        clearAIStatusNotice();
        return {
          ...localResult,
          summaryWhat: data.summaryWhat || localResult.summaryWhat,
          summaryWhy:
            Array.isArray(data.summaryWhy) && data.summaryWhy.length > 0
              ? data.summaryWhy
              : localResult.summaryWhy,
          recommendation: data.recommendation || localResult.recommendation,
          isAiEnriched: true,
        };
      }
    }
  } catch (err) {
    console.warn('[DataMate] AI Investigator service unavailable, serving evidence locally:', err);
    updateAIStatus({
      isUnavailable: true,
      friendlyMessage: language === 'ar' ? AI_FALLBACK_NOTICE_AR : AI_FALLBACK_NOTICE_EN,
    });
  }

  // Always return verified local statistical result
  return { ...localResult, isAiEnriched: false };
}
