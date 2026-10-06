import React, { useState } from 'react';
import { Send, MessageSquare } from 'lucide-react';
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
    <div className="bg-white rounded-2xl border border-[#B9A3D4]/40 p-6 sm:p-7 shadow-[0_2px_12px_rgba(75,49,95,0.04)] space-y-4.5">
      {/* Title & prompt hint */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#4B315F] text-[#FFF9F2] flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-[#F4A261]" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#4B315F]">
              {isAr ? 'اسأل أو اطلب تعديل بلغة عادية' : 'Ask or Request Changes in Plain Language'}
            </h3>
            <p className="text-sm sm:text-base text-[#29232D]/75 font-medium mt-0.5">
              {isAr
                ? 'مش محتاج تكتب معادلات؛ اكتب اللي في بالك وDataMate هيظبط الداشبورد'
                : 'No formulas needed; speak naturally and DataMate adapts the dashboard'}
            </p>
          </div>
        </div>
      </div>

      {/* Suggested Quick Chips */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 text-base">
        <span className="text-sm sm:text-base text-[#29232D]/70 shrink-0 font-bold">
          {isAr ? 'اقتراحات سريعة:' : 'Quick suggestions:'}
        </span>
        {suggestedChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip)}
            disabled={isProcessing}
            className="shrink-0 px-3.5 py-2 text-sm sm:text-base font-bold rounded-xl bg-[#FFF9F2] hover:bg-[#F4A261]/20 text-[#4B315F] border border-[#B9A3D4]/40 transition-colors cursor-pointer disabled:opacity-50"
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
            className="w-full px-5 py-3.5 text-base sm:text-lg bg-[#FFF9F2]/70 border border-[#B9A3D4]/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4B315F] text-[#29232D] placeholder-[#29232D]/45 font-medium"
          />
        </div>
        <button
          type="submit"
          disabled={isProcessing || !inputText.trim()}
          className="px-6 py-3.5 bg-[#4B315F] text-[#FFF9F2] rounded-xl hover:bg-[#4B315F]/90 transition-all font-bold text-base sm:text-lg flex items-center gap-2.5 cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
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
        <div className="bg-[#FFF9F2] border border-[#F4A261]/45 rounded-xl p-5 text-base flex items-start gap-3.5 animate-fade-in">
          <div className="w-7 h-7 rounded-full bg-[#4B315F] text-[#FFF9F2] flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
            ✓
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-[#29232D] font-semibold text-base sm:text-lg leading-relaxed">
              {lastMessage.text}
            </p>
            {lastMessage.directAnswer && (
              <div className="text-sm sm:text-base font-mono font-bold text-[#4B315F] bg-white inline-block px-3.5 py-1.5 rounded-md border border-[#B9A3D4]/30">
                {lastMessage.directAnswer}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
