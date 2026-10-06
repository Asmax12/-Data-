import React, { useState } from 'react';
import { Sparkles, Send, MessageSquare, ArrowRight, ArrowLeft, Check, RefreshCw } from 'lucide-react';
import { NaturalQueryMessage } from '../types';

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
    <div className="bg-white rounded-2xl border border-[#B9A3D4]/40 p-4 sm:p-5 shadow-xs space-y-4">
      {/* Title & prompt hint */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#4B315F] text-[#FFF9F2] flex items-center justify-center">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-[#4B315F]">
              {isAr ? 'اسأل أو اطلب تعديل بلغة عادية' : 'Ask or Request Changes in Plain Language'}
            </h3>
            <p className="text-[11px] text-[#29232D]/60">
              {isAr
                ? 'مش محتاج تكتب معادلات؛ اكتب اللي في بالك وDataMate هيظبط الداشبورد'
                : 'No formulas needed; speak naturally and DataMate adapts the dashboard'}
            </p>
          </div>
        </div>
      </div>

      {/* Suggested Quick Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] text-[#29232D]/50 shrink-0 font-medium">
          {isAr ? 'اقتراحات سريعة:' : 'Quick suggestions:'}
        </span>
        {suggestedChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip)}
            disabled={isProcessing}
            className="shrink-0 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[#FFF9F2] hover:bg-[#F4A261]/20 text-[#4B315F] border border-[#B9A3D4]/30 transition-colors cursor-pointer disabled:opacity-50"
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
        className="flex items-center gap-2"
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
            className="w-full px-3.5 py-2.5 text-xs bg-[#FFF9F2]/70 border border-[#B9A3D4]/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4B315F] text-[#29232D] placeholder-[#29232D]/40"
          />
        </div>
        <button
          type="submit"
          disabled={isProcessing || !inputText.trim()}
          className="px-4 py-2.5 bg-[#4B315F] text-[#FFF9F2] rounded-xl hover:bg-[#4B315F]/90 transition-all font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
        >
          {isProcessing ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>{isAr ? 'إرسال' : 'Send'}</span>
              <Send className="w-3 h-3" />
            </>
          )}
        </button>
      </form>

      {/* Latest Assistant Feedback */}
      {lastMessage && lastMessage.sender === 'assistant' && (
        <div className="bg-[#FFF9F2] border border-[#F4A261]/40 rounded-xl p-3 text-xs flex items-start gap-2.5 animate-fade-in">
          <div className="w-5 h-5 rounded-full bg-[#4B315F] text-[#FFF9F2] flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
            ✓
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-[#29232D] font-medium leading-relaxed">
              {lastMessage.text}
            </p>
            {lastMessage.directAnswer && (
              <div className="text-[11px] font-mono font-bold text-[#4B315F] bg-white/80 inline-block px-2 py-0.5 rounded border border-[#B9A3D4]/30">
                {lastMessage.directAnswer}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
