import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '15mb' }));

// Helper to get GoogleGenAI client if API key is present
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

// Graceful, sanitized AI error handler - Never exposes keys or stack traces!
function handleAIError(err: any, res: express.Response) {
  const errMsg = String(err?.message || err || '').toLowerCase();
  const isRateLimit =
    errMsg.includes('429') ||
    errMsg.includes('quota') ||
    errMsg.includes('resource_exhausted') ||
    errMsg.includes('rate limit') ||
    errMsg.includes('too many requests');

  const isUnavailable =
    errMsg.includes('503') ||
    errMsg.includes('unavailable') ||
    errMsg.includes('timeout') ||
    errMsg.includes('network');

  console.warn(`[DataMate AI] Gracefully handled error: ${isRateLimit ? 'Rate limit / Quota reached' : 'Service unavailable'}`);

  return res.status(isRateLimit ? 429 : 503).json({
    success: false,
    isRateLimit,
    isUnavailable,
    fallback: true,
    friendlyMessage:
      'التحليل الذكي غير متاح مؤقتًا، لكن بياناتك ولوحة التحكم محفوظين ويمكنك الاستمرار في استخدام الأدوات الأساسية.',
    friendlyMessageEn:
      'Smart AI is temporarily unavailable, but your data and dashboard are safely preserved, and you can continue using all core tools.',
  });
}

// API Route: Check AI status and provider info (Scalable Architecture)
app.get('/api/ai/status', (_req, res) => {
  const ai = getGeminiClient();
  res.json({
    provider: 'gemini',
    model: 'gemini-3.8-flash',
    isAvailable: !!ai,
    dataProcessingIndependent: true,
  });
});

// API Route: Parse unstructured text or messy notes into clean tabular JSON
app.post('/api/ai/parse-text', async (req, res) => {
  try {
    const { text, language = 'ar' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text input is required' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ 
        success: false,
        fallback: true,
        friendlyMessage: 'التحليل الذكي غير متاح مؤقتًا، لكن يمكنك استخدام الإدخال المباشر للجدول.',
      });
    }

    const prompt = `You are DataMate, an intelligent, friendly data assistant.
A user provided unstructured or semi-structured raw text that contains records or information.
Convert this into clean tabular data with consistent columns and rows.
Normalize headers into standard, clear names (e.g. "Customer", "City", "Product", "Price", "Quantity", "Total", "Date").
Fix typos, missing fields (use null or 0), and detect proper numeric values.

Language preference: ${language === 'ar' ? 'Arabic headers if the text is in Arabic, or clean standard names' : 'English headers'}.

Return ONLY valid JSON matching this schema:
{
  "tableName": "string",
  "columns": ["col1", "col2", ...],
  "rows": [
    { "col1": value1, "col2": value2, ... }
  ],
  "cleaningNotes": ["note1", "note2"]
}

Raw text:
"""
${text.slice(0, 10000)}
"""`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, ...parsed });
  } catch (err: any) {
    return handleAIError(err, res);
  }
});

// API Route: Generate simple natural-language insights and takeaways ("What should I know?")
app.post('/api/ai/insights', async (req, res) => {
  try {
    const { summary, language = 'ar' } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(503).json({ 
        success: false,
        fallback: true,
        friendlyMessage: 'التحليل الذكي غير متاح مؤقتًا، لكن بياناتك ولوحة التحكم محفوظين ويمكنك الاستمرار في استخدام الأدوات الأساسية.' 
      });
    }

    const prompt = `You are DataMate, a friendly data companion for everyday business owners and non-technical people.
Analyze this data summary and provide 3 to 5 simple, high-value insights under the section "What should I know?" ("إيه المهم اللي لازم تعرفه؟").

Language: ${language === 'ar' ? 'Warm, natural Egyptian/Standard Arabic. No complex statistical jargon. Friendly and practical.' : 'Warm, clear English. No complex statistics jargon.'}

Requirements:
- Exactly 3 to 5 bullet points.
- Highlight the best performers, top city/product, trends over time, or important anomalies.
- Format strictly as a JSON array of objects:
[
  {
    "type": "positive" | "warning" | "neutral" | "highlight",
    "text": "insight statement",
    "metric": "optional key metric label",
    "value": "optional key metric value"
  }
]

Data summary:
${JSON.stringify(summary, null, 2)}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const insights = JSON.parse(response.text || '[]');
    return res.json({ success: true, insights });
  } catch (err: any) {
    return handleAIError(err, res);
  }
});

// API Route: Natural language interaction / dashboard modifications
app.post('/api/ai/modify', async (req, res) => {
  try {
    const { message, currentDashboard, dataSummary, language = 'ar' } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(503).json({
        success: false,
        fallback: true,
        friendlyMessage: 'التحليل الذكي غير متاح مؤقتًا، لكن بياناتك ولوحة التحكم محفوظين ويمكنك الاستمرار في استخدام الأدوات الأساسية.',
      });
    }

    const prompt = `You are DataMate, a friendly data assistant for everyday non-technical users.
The user is requesting a modification or asking a question in natural language:
User request: "${message}"

Current Dashboard context:
${JSON.stringify(currentDashboard, null, 2)}

Data context:
${JSON.stringify(dataSummary, null, 2)}

Language preference: ${language}

Analyze the user's intent:
1. Is it a chart modification? (e.g. "شيل الرسم البياني ده" -> removeChartId, "بدل الرسم ده بمخطط دائري" -> changeChartType: "donut", "عايزة المبيعات حسب الشهر" -> chartType: "line")
2. Is it a data/column modification? (e.g. "ضيفي عمود الأرباح" -> addColumn, "الرقم ده غلط، عدله" -> correctRowValue)
3. Is it adding or changing KPIs? (e.g. "ضيفي عدد الطلبات للـDashboard" -> addKpi)
4. Is it a layout simplification? (e.g. "خلي شكل الداشبورد أبسط" -> simplify: true)
5. Is it a filter? (e.g. "اعرض القاهرة بس" -> filterColumn & filterValue)
6. Is it an analytical question? (e.g. "إيه أكتر مدينة بتبيع؟")

Return strictly JSON matching this structure:
{
  "reply": "Warm friendly sentence in ${language === 'ar' ? 'Arabic' : 'English'} explaining the action taken or the direct answer",
  "actions": {
    "simplify": boolean or null,
    "selectedMetric": string or null,
    "filterColumn": string or null,
    "filterValue": string or null,
    "chartType": "bar" | "line" | "donut" | null,
    "addKpi": string or null,
    "removeChartId": string or null,
    "changeChartType": { "chartType": "bar" | "line" | "donut" } or null,
    "addColumn": { "name": string, "defaultVal": any } or null,
    "correctRowValue": { "columnKey": string, "newValue": any } or null
  },
  "directAnswer": "Clear direct short answer if this was a question"
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const result = JSON.parse(response.text || '{}');
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return handleAIError(err, res);
  }
});

// API Route: DataMate Investigator ("افهم الرقم" / "اسألني ليه؟")
app.post('/api/ai/investigate', async (req, res) => {
  try {
    const { subject, localAnalysis, dataSummary, language = 'ar' } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(503).json({
        success: false,
        fallback: true,
        friendlyMessage: 'التحليل الذكي غير متاح مؤقتًا، وتم عرض التحليل الإحصائي القائم على بياناتك بدقة.',
      });
    }

    const prompt = `You are DataMate Investigator ("محقق الأرقام").
Your mission is to explain WHY this specific number or metric exists, not just state what it is.
The user clicked "افهم الرقم" (Understand the number) for:
Subject: "${subject.title}" (Type: ${subject.type}, Value: ${subject.formattedValue || subject.currentValue})

Statistical evidence discovered by local analytics:
- What is happening: ${localAnalysis.summaryWhat}
- Key drivers: ${JSON.stringify(localAnalysis.summaryWhy, null, 2)}
- Evidence breakdown: ${JSON.stringify(localAnalysis.evidence, null, 2)}
- Recommendation: ${localAnalysis.recommendation}

Dataset context:
${JSON.stringify(dataSummary, null, 2)}

Provide a sharp, natural, evidence-based business investigation in ${language === 'ar' ? 'warm, professional Arabic (no complex statistical jargon, practical and friendly)' : 'clear, insightful English'}.

Strictly return JSON:
{
  "summaryWhat": "1-2 sentences clearly describing what is observed in this number",
  "summaryWhy": [
    "Cause 1 with real numbers/evidence from the data",
    "Cause 2 with comparison or concentration factor",
    "Cause 3 (e.g. basket size, trend, or customer behavior)"
  ],
  "recommendation": "1-2 sentences giving practical, high-value advice on what the owner should do next",
  "keyTakeaway": "Short memorable punchline"
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const result = JSON.parse(response.text || '{}');
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return handleAIError(err, res);
  }
});

// Vite or Static file serving
async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DataMate server running on http://0.0.0.0:${PORT}`);
  });
}

setupServer();
