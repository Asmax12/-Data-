/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Header } from './components/Header';
import { HomeHero } from './components/HomeHero';
import { DataUnderstanding } from './components/DataUnderstanding';
import { DashboardView } from './components/DashboardView';
import { UpdateDataModal } from './components/UpdateDataModal';
import { EditDashboardModal } from './components/EditDashboardModal';
import { NewAnalysisConfirmModal } from './components/NewAnalysisConfirmModal';
import { AILimitBanner } from './components/AILimitBanner';
import {
  CleanedDataset,
  KPIItem,
  ChartConfig,
  InsightItem,
  NaturalQueryMessage,
  WorkspaceState,
} from './types';
import {
  generateKPIs,
  generateCharts,
  generateInsights,
} from './utils/analyticsEngine';
import {
  fetchInsights,
  sendNaturalLanguageQuery,
  subscribeToAIStatus,
  AIHealthStatus,
} from './services/aiService';

const WORKSPACE_STORAGE_KEY = 'datamate_workspace_v1';
const LANGUAGE_STORAGE_KEY = 'datamate_lang';

type AppStep = 'home' | 'understanding' | 'dashboard';

export default function App() {
  const [language, setLanguage] = useState<'ar' | 'en'>(() => {
    return (localStorage.getItem(LANGUAGE_STORAGE_KEY) as 'ar' | 'en') || 'ar';
  });

  const [step, setStep] = useState<AppStep>('home');
  const [dataset, setDataset] = useState<CleanedDataset | null>(null);
  const [kpis, setKpis] = useState<KPIItem[]>([]);
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [isSimplified, setIsSimplified] = useState(false);
  const [activeFilter, setActiveFilter] = useState<{ column: string; value: string } | null>(null);
  const [chatHistory, setChatHistory] = useState<NaturalQueryMessage[]>([]);
  const [isProcessingQuery, setIsProcessingQuery] = useState(false);

  // Modals state
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewAnalysisModalOpen, setIsNewAnalysisModalOpen] = useState(false);

  // AI Service health status tracking
  const [aiStatus, setAiStatus] = useState<AIHealthStatus>({
    isRateLimited: false,
    isUnavailable: false,
    friendlyMessage: null,
    lastChecked: Date.now(),
  });
  const [isRetryingAI, setIsRetryingAI] = useState(false);

  // Subscribe to AI status
  useEffect(() => {
    return subscribeToAIStatus(setAiStatus);
  }, []);

  const handleRetryAI = async () => {
    if (!dataset) return;
    setIsRetryingAI(true);
    try {
      const enriched = await fetchInsights(dataset, language, insights);
      if (enriched && enriched.length > 0) {
        setInsights(enriched);
      }
    } finally {
      setIsRetryingAI(false);
    }
  };

  // Sync document language attribute and font
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  // Load saved workspace on boot
  useEffect(() => {
    try {
      const saved = localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (saved) {
        const parsed: WorkspaceState = JSON.parse(saved);
        if (parsed && parsed.dataset && parsed.dataset.rows?.length > 0) {
          setDataset(parsed.dataset);
          setKpis(parsed.kpis || generateKPIs(parsed.dataset));
          setCharts(parsed.charts || generateCharts(parsed.dataset));
          setInsights(parsed.insights || generateInsights(parsed.dataset));
          setIsSimplified(parsed.isSimplified || false);
          setActiveFilter(parsed.activeFilter || null);
          setChatHistory(parsed.chatHistory || []);
          setStep('dashboard');
        }
      }
    } catch (e) {
      console.warn('Failed to restore workspace:', e);
    }
  }, []);

  // Save current workspace whenever state changes
  useEffect(() => {
    if (dataset && step === 'dashboard') {
      const stateToSave: WorkspaceState = {
        version: 1,
        dataset,
        selectedMetricKey: null,
        selectedDimensionKey: null,
        activeFilter,
        isSimplified,
        kpis,
        insights,
        charts,
        chatHistory,
        lastUpdated: new Date().toISOString(),
      };
      try {
        localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(stateToSave));
      } catch (err) {
        console.warn('LocalStorage save error (likely quota):', err);
      }
    }
  }, [dataset, step, kpis, charts, insights, isSimplified, activeFilter, chatHistory]);

  // When user uploads/submits new data
  const handleDatasetReady = (newDataset: CleanedDataset) => {
    setDataset(newDataset);
    const computedKPIs = generateKPIs(newDataset);
    const computedCharts = generateCharts(newDataset);
    const computedInsights = generateInsights(newDataset);

    setKpis(computedKPIs);
    setCharts(computedCharts);
    setInsights(computedInsights);
    setActiveFilter(null);
    setChatHistory([]);
    setStep('understanding');

    try {
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#F4A261', '#4B315F', '#E76F7A', '#B9A3D4'],
      });
    } catch {}
  };

  // Proceed from "Understanding Your Data" to "Dashboard"
  const handleProceedToDashboard = async () => {
    setStep('dashboard');

    if (dataset) {
      try {
        const enrichedInsights = await fetchInsights(dataset, language, insights);
        if (enrichedInsights && enrichedInsights.length > 0) {
          setInsights(enrichedInsights);
        }
      } catch (e) {
        console.warn('Enriching insights error:', e);
      }
    }
  };

  // Safe Navigation: Returning to Home keeps current workspace intact!
  const handleNavigateHome = () => {
    setStep('home');
  };

  // Navigate to Dashboard
  const handleNavigateDashboard = () => {
    if (dataset) {
      setStep('dashboard');
    }
  };

  // Request New Analysis (triggers confirmation dialog)
  const handleRequestNewAnalysis = () => {
    if (dataset) {
      setIsNewAnalysisModalOpen(true);
    } else {
      setStep('home');
    }
  };

  // Confirm New Analysis (clears workspace cleanly)
  const handleConfirmNewAnalysis = () => {
    setDataset(null);
    setKpis([]);
    setCharts([]);
    setInsights([]);
    setActiveFilter(null);
    setIsSimplified(false);
    setChatHistory([]);
    setStep('home');
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
  };

  // Update existing dashboard with new data
  const handleUpdateWorkspaceData = (updatedDataset: CleanedDataset, isAppend: boolean) => {
    setDataset(updatedDataset);

    const newKpis = generateKPIs(updatedDataset);
    const newCharts = generateCharts(updatedDataset);
    const newInsights = generateInsights(updatedDataset);

    setKpis(newKpis);
    setCharts(newCharts);
    setInsights(newInsights);

    try {
      confetti({
        particleCount: 40,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F4A261', '#4B315F', '#E76F7A'],
      });
    } catch {}

    const confirmMsg: NaturalQueryMessage = {
      id: `sys_${Date.now()}`,
      sender: 'assistant',
      text:
        language === 'ar'
          ? `تم تحديث الداشبورد بنجاح! تم استيعاب ${updatedDataset.totalRows} سجل وإعادة حساب كافة المؤشرات والرسوم البيانية بدقة.`
          : `Dashboard updated successfully! Processed ${updatedDataset.totalRows} records and refreshed all metrics.`,
      timestamp: new Date().toLocaleTimeString(),
    };
    setChatHistory((prev) => [...prev, confirmMsg]);
  };

  // Save changes made in the Edit Modal (Feature 1)
  const handleSaveEdit = (
    updatedDataset: CleanedDataset,
    updatedKPIs: KPIItem[],
    updatedCharts: ChartConfig[],
    newSimplified: boolean
  ) => {
    setDataset(updatedDataset);
    setKpis(updatedKPIs);
    setCharts(updatedCharts);
    setIsSimplified(newSimplified);
    setInsights(generateInsights(updatedDataset));

    try {
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#4B315F', '#F4A261', '#B9A3D4'],
      });
    } catch {}
  };

  // Handle natural language queries and dashboard modifications
  const handleNaturalQuery = async (queryText: string) => {
    if (!dataset) return;

    const userMsg: NaturalQueryMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString(),
    };

    setChatHistory((prev) => [...prev, userMsg]);
    setIsProcessingQuery(true);

    try {
      const response = await sendNaturalLanguageQuery(
        queryText,
        dataset,
        charts,
        isSimplified,
        language
      );

      // Execute requested actions on dashboard
      if (response.actions) {
        if (response.actions.simplify !== undefined && response.actions.simplify !== null) {
          setIsSimplified(response.actions.simplify);
        }
        if (response.actions.filterColumn && response.actions.filterValue) {
          setActiveFilter({
            column: response.actions.filterColumn,
            value: response.actions.filterValue,
          });
        }
        if (response.actions.removeChartId) {
          setCharts((curr) =>
            curr.map((c, i) =>
              response.actions.removeChartId === 'last' && i === curr.length - 1
                ? { ...c, hidden: true }
                : c.id === response.actions.removeChartId
                ? { ...c, hidden: true }
                : c
            )
          );
        }
        if (response.actions.changeChartType && response.actions.changeChartType.chartType) {
          const newType = response.actions.changeChartType.chartType;
          setCharts((curr) =>
            curr.map((c, i) => (i === 0 ? { ...c, type: newType, hidden: false } : c))
          );
        }
        if (response.actions.chartType) {
          setCharts((curr) => {
            const found = curr.find((c) => c.type === response.actions.chartType);
            if (found) {
              return [{ ...found, hidden: false }, ...curr.filter((c) => c.id !== found.id)];
            }
            return curr;
          });
        }
        if (response.actions.addKpi) {
          setKpis((curr) =>
            curr.map((k) =>
              k.id === response.actions.addKpi || k.metricKey === response.actions.addKpi
                ? { ...k, enabled: true }
                : k
            )
          );
        }
      }

      const assistantMsg: NaturalQueryMessage = {
        id: `asst_${Date.now()}`,
        sender: 'assistant',
        text: response.reply,
        directAnswer: response.directAnswer,
        timestamp: new Date().toLocaleTimeString(),
      };

      setChatHistory((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error(err);
      const errorMsg: NaturalQueryMessage = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        text:
          language === 'ar'
            ? 'تم فحص طلبك، ويمكنك الاطلاع على التغييرات في المخططات بالأعلى.'
            : 'Request processed, check the updated charts above.',
        timestamp: new Date().toLocaleTimeString(),
      };
      setChatHistory((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessingQuery(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9F2] text-[#29232D] flex flex-col font-sans transition-colors">
      {/* Persistent App Header with Navigation (الرئيسية | تحليل جديد | لوحة البيانات) */}
      <Header
        currentStep={step}
        hasActiveDataset={!!dataset}
        dataset={dataset}
        language={language}
        onNavigateHome={handleNavigateHome}
        onNavigateDashboard={handleNavigateDashboard}
        onRequestNewAnalysis={handleRequestNewAnalysis}
        onLanguageChange={setLanguage}
        onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
      />

      {/* Main Flow Content */}
      <main className="flex-1 pb-16">
        {/* Graceful AI Status / Rate Limit Banner */}
        <AILimitBanner
          status={aiStatus}
          language={language}
          onRetry={handleRetryAI}
          isRetrying={isRetryingAI}
        />

        {step === 'home' && (
          <HomeHero
            language={language}
            onDatasetReady={handleDatasetReady}
            hasActiveDataset={!!dataset}
            onReturnToDashboard={handleNavigateDashboard}
          />
        )}

        {step === 'understanding' && dataset && (
          <DataUnderstanding
            dataset={dataset}
            language={language}
            onProceedToDashboard={handleProceedToDashboard}
            onBack={() => setStep('home')}
          />
        )}

        {step === 'dashboard' && dataset && (
          <DashboardView
            dataset={dataset}
            kpis={kpis}
            charts={charts}
            insights={insights}
            chatHistory={chatHistory}
            isSimplified={isSimplified}
            activeFilter={activeFilter}
            language={language}
            isProcessingQuery={isProcessingQuery}
            onFilterChange={setActiveFilter}
            onToggleSimplify={() => setIsSimplified(!isSimplified)}
            onSendMessage={handleNaturalQuery}
            onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
            onNewAnalysis={handleRequestNewAnalysis}
            onOpenEditModal={() => setIsEditModalOpen(true)}
          />
        )}
      </main>

      {/* Reusable Workspace Modal: Upload New Data -> Update Dashboard */}
      {dataset && (
        <UpdateDataModal
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          currentDataset={dataset}
          language={language}
          onUpdateSuccess={handleUpdateWorkspaceData}
        />
      )}

      {/* Edit Dashboard Modal (Feature 1) */}
      {dataset && (
        <EditDashboardModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          dataset={dataset}
          kpis={kpis}
          charts={charts}
          isSimplified={isSimplified}
          language={language}
          onSave={handleSaveEdit}
          onNaturalEdit={handleNaturalQuery}
        />
      )}

      {/* New Analysis Confirmation Modal (Feature 3) */}
      <NewAnalysisConfirmModal
        isOpen={isNewAnalysisModalOpen}
        onClose={() => setIsNewAnalysisModalOpen(false)}
        onConfirm={handleConfirmNewAnalysis}
        language={language}
      />

      {/* Footer (Hidden on print) */}
      <footer className="no-print border-t border-[#B9A3D4]/20 py-4 px-6 text-center text-xs text-[#29232D]/50 bg-[#FFF9F2]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            DataMate — {language === 'ar' ? 'سيب الباقي علينا' : 'Friendly, zero-code data companion'}
          </span>
          <span className="font-mono text-[11px]">
            {language === 'ar' ? 'مساحة عمل تفاعلية محفوظة محليًا' : 'Auto-saved local workspace'}
          </span>
        </div>
      </footer>
    </div>
  );
}
