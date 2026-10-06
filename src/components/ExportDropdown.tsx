import React, { useState, useRef, useEffect } from 'react';
import { Download, Printer, Image, FileText, ChevronDown, Check } from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

interface ExportDropdownProps {
  language: 'ar' | 'en';
  targetElementId: string;
  datasetName: string;
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({
  language,
  targetElementId,
  datasetName,
}) => {
  const isAr = language === 'ar';
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter function to clean UI buttons out of export
  const exportFilter = (element: HTMLElement) => {
    if (!element.classList) return true;
    return (
      !element.classList.contains('no-export') &&
      !element.classList.contains('no-print') &&
      !element.classList.contains('export-menu')
    );
  };

  // Export high-quality PNG
  const handleExportPNG = async () => {
    setIsOpen(false);
    setIsExporting(true);

    try {
      const node = document.getElementById(targetElementId);
      if (!node) {
        throw new Error('Dashboard container not found');
      }

      const dataUrl = await toPng(node, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: '#FFF9F2',
        filter: exportFilter,
      });

      const link = document.createElement('a');
      link.download = `${datasetName || 'DataMate'}_Dashboard.png`;
      link.href = dataUrl;
      link.click();

      setExportSuccess(isAr ? 'تم تحميل الصورة بنجاح!' : 'Image downloaded successfully!');
      setTimeout(() => setExportSuccess(null), 3000);
    } catch (err) {
      console.error('Error generating image:', err);
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  // Real client-side PDF Generation & Download
  const handleExportPDF = async () => {
    setIsOpen(false);
    setIsExporting(true);

    try {
      const node = document.getElementById(targetElementId);
      if (!node) {
        throw new Error('Dashboard container not found');
      }

      // Capture dashboard at high resolution
      const dataUrl = await toPng(node, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: '#FFF9F2',
        filter: exportFilter,
      });

      // Load image to determine exact dimensions
      const img = new window.Image();
      img.src = dataUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const imgWidth = img.naturalWidth;
      const imgHeight = img.naturalHeight;

      // Determine orientation and format
      const isLandscape = imgWidth >= imgHeight;
      const orientation = isLandscape ? 'landscape' : 'portrait';

      // Create PDF tailored precisely to the dashboard dimensions (no cutoff, no margins, vector-sharp)
      const pdf = new jsPDF({
        orientation,
        unit: 'pt',
        format: [imgWidth * 0.75, imgHeight * 0.75],
      });

      pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth * 0.75, imgHeight * 0.75, undefined, 'FAST');
      pdf.save(`${datasetName || 'DataMate'}_Dashboard.pdf`);

      setExportSuccess(isAr ? 'تم تحميل ملف PDF بنجاح!' : 'PDF downloaded successfully!');
      setTimeout(() => setExportSuccess(null), 3000);
    } catch (err) {
      console.error('Error generating PDF:', err);
      // Graceful fallback to browser print dialog
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  // Print Dashboard
  const handlePrint = () => {
    setIsOpen(false);
    window.print();
  };

  return (
    <div className="relative inline-block text-right no-print" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="flex items-center gap-2 px-4.5 py-2.5 text-base font-bold rounded-xl bg-white border border-[#B9A3D4]/50 text-[#4B315F] hover:bg-[#FFF9F2] shadow-2xs transition-all cursor-pointer disabled:opacity-50"
      >
        <Download className="w-4 h-4 text-[#F4A261]" />
        <span>
          {isExporting
            ? isAr
              ? 'جاري التصدير...'
              : 'Exporting...'
            : isAr
            ? 'تصدير'
            : 'Export'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-[#29232D]/50" />
      </button>

      {/* Success notification */}
      {exportSuccess && (
        <div className="absolute top-full mt-1.5 right-0 z-50 bg-[#4B315F] text-[#FFF9F2] text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl shadow-md whitespace-nowrap flex items-center gap-1.5 animate-fade-in">
          <Check className="w-3.5 h-3.5 text-[#F4A261]" />
          <span>{exportSuccess}</span>
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="export-menu absolute top-full mt-2 right-0 z-50 w-56 bg-white rounded-2xl border border-[#B9A3D4]/40 shadow-xl py-2 text-sm sm:text-base text-[#29232D] animate-fade-in">
          {/* 1. Download as Image (PNG) */}
          <button
            onClick={handleExportPNG}
            className="w-full px-4 py-2.5 text-right hover:bg-[#FFF9F2] flex items-center gap-2.5 cursor-pointer transition-colors"
          >
            <Image className="w-4.5 h-4.5 text-[#F4A261]" />
            <span className="font-bold">
              {isAr ? 'تحميل كصورة (PNG)' : 'Download as PNG'}
            </span>
          </button>

          {/* 2. Download as real PDF */}
          <button
            onClick={handleExportPDF}
            className="w-full px-4 py-2.5 text-right hover:bg-[#FFF9F2] flex items-center gap-2.5 cursor-pointer transition-colors"
          >
            <FileText className="w-4.5 h-4.5 text-[#E76F7A]" />
            <span className="font-bold">
              {isAr ? 'تحميل ملف PDF' : 'Download PDF'}
            </span>
          </button>

          {/* 3. Print Dashboard */}
          <button
            onClick={handlePrint}
            className="w-full px-4 py-2.5 text-right hover:bg-[#FFF9F2] flex items-center gap-2.5 cursor-pointer transition-colors border-t border-[#B9A3D4]/20"
          >
            <Printer className="w-4.5 h-4.5 text-[#4B315F]" />
            <span className="font-bold">
              {isAr ? 'طباعة لوحة التحكم' : 'Print Dashboard'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
