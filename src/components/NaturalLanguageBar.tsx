import React, { useState } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { NaturalQueryMessage } from '../types';
import { useTheme } from '../context/ThemeContext';

interface NaturalLanguageBarProps {
  language: 'ar' | 'en';
  onSendMessage: (query: string) => Promise<void>;
  chatHistory: NaturalQueryMessage[];
  isProcessing: boolean;
}

export const NaturalLanguageBar: React.FC<NaturalLanguageBarProps> = ({
  language,
  onSendMessage,
  chatHistory,
  isProcessing,
}) => {
  const { theme } = useTheme();
  const isAr = language === 'ar';
  const [inputText, setInputText] = useState('');

  // Sample prompt chips matching prompt instructions exactly
  const suggestedChips = isAr
    ? [
        'إيه أكتر مدينة بتبيع؟',
        'عايزة أعرف الأرباح',
        'خلي شكل الداشبورد أبسط',
        'ضيف مقارنة بين الشهور',
        'ظبط البيانات دي',
      ]
    : [
        'What is the most important thing I should notice?',
        'Show me monthly sales',
        'Compare the cities',
        'Add profit',
        'Make the dashboard simpler',
      ];

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isProcessing) return;
    setInputText('');
    await onSendMessage(text);
  };

  const lastMessage = chatHistory[chatHistory.length - 1];

  return (
    <div
      className="rounded-2xl border p-6 sm:p-7 space-y-4.5 shadow-xs"
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        boxShadow: `0 2px 12px ${theme.colors.primary}0D`,
      }}
    >
      {/* Title & prompt hint */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
            style={{
              backgroundColor: theme.colors.primary,
              color: '#FFF9F2',
            }}
          >
            <MessageSquare className="w-5 h-5" style={{ color: theme.colors.secondary }} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold" style={{ color: theme.colors.primary }}>
              {isAr ? 'اسأل أو اطلب تعديل بلغة عادية' : 'Ask or Request Changes in Plain Language'}
            </h3>
            <p className="text-sm sm:text-base font-medium mt-0.5" style={{ color: `${theme.colors.textPrimary}B8` }}>
              {isAr
                ? 'مش محتاج تكتب معادلات؛ اكتب اللي في بالك وDataMate هيظبط الداشبورد'
                : 'No formulas needed; speak naturally and DataMate adapts the dashboard'}
            </p>
          </div>
        </div>
      </div>

      {/* Suggested Quick Chips */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 text-base">
        <span className="text-sm sm:text-base shrink-0 font-bold" style={{ color: `${theme.colors.textPrimary}99` }}>
          {isAr ? 'اقتراحات سريعة:' : 'Quick suggestions:'}
        </span>
        {suggestedChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip)}
            disabled={isProcessing}
            className="shrink-0 px-3.5 py-2 text-sm sm:text-base font-bold rounded-xl border transition-colors cursor-pointer disabled:opacity-50"
            style={{
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
              color: theme.colors.primary,
            }}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-3"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isAr
                ? 'اكتب سؤالك هنا.. مثلاً: "إيه أكتر مدينة بتبيع؟" أو "ركز على مبيعات المنتجات"'
                : 'Type here.. e.g. "What is the top city?" or "Show monthly sales"'
            }
            disabled={isProcessing}
            className="w-full px-5 py-3.5 text-base sm:text-lg rounded-xl focus:outline-none focus:ring-2 font-medium border"
            style={{
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
              color: theme.colors.textPrimary,
            }}
          />
        </div>
        <button
          type="submit"
          disabled={isProcessing || !inputText.trim()}
          className="px-6 py-3.5 rounded-xl transition-all font-bold text-base sm:text-lg flex items-center gap-2.5 cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
          style={{
            backgroundColor: theme.colors.primary,
            color: '#FFF9F2',
          }}
        >
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>{isAr ? 'إرسال' : 'Send'}</span>
              <Send className="w-4.5 h-4.5" />
            </>
          )}
        </button>
      </form>

      {/* Latest Assistant Feedback */}
      {lastMessage && lastMessage.sender === 'assistant' && (
        <div
          className="rounded-xl p-5 text-base flex items-start gap-3.5 animate-fade-in border"
          style={{
            backgroundColor: theme.colors.background,
            borderColor: `${theme.colors.secondary}50`,
          }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold"
            style={{
              backgroundColor: theme.colors.primary,
              color: '#FFF9F2',
            }}
          >
            ✓
          </div>
          <div className="flex-1 space-y-2">
            <p className="font-semibold text-base sm:text-lg leading-relaxed" style={{ color: theme.colors.textPrimary }}>
              {lastMessage.text}
            </p>
            {lastMessage.directAnswer && (
              <div
                className="text-sm sm:text-base font-mono font-bold inline-block px-3.5 py-1.5 rounded-md border"
                style={{
                  color: theme.colors.primary,
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                }}
              >
                {lastMessage.directAnswer}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
