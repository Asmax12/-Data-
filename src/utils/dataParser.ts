import * as XLSX from 'xlsx';
import { CleanedDataset, ColumnMeta, ColumnType, DataRow } from '../types';

/**
 * Strips currency marks, commas, and formatting from a string
 */
export function cleanNumericValue(val: any): { isNum: boolean; num: number } {
  if (val === null || val === undefined || val === '') {
    return { isNum: false, num: 0 };
  }
  if (typeof val === 'number') {
    return { isNum: !isNaN(val), num: val };
  }
  let str = String(val).trim();
  // Remove common currency symbols and labels
  str = str.replace(/[$,€£¥\u062C\u0645\u0631\u064A\u0627\u0644]/g, '').trim();
  str = str.replace(/EGP|USD|SAR|EUR|LE/gi, '').trim();
  // Handle Arabic/Persian digits
  str = str.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  // Replace thousand commas: "1,200.50" -> "1200.50"
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(str)) {
    str = str.replace(/,/g, '');
  } else if (/^\d+(,\d+)$/.test(str)) {
    // European decimal comma: "12,5" -> "12.5"
    str = str.replace(',', '.');
  }

  const parsed = Number(str);
  if (!isNaN(parsed) && isFinite(parsed) && str.length > 0) {
    return { isNum: true, num: parsed };
  }
  return { isNum: false, num: 0 };
}

/**
 * Checks if a string looks like a date
 */
function isDateString(val: any): boolean {
  if (!val) return false;
  const str = String(val).trim();
  if (str.length < 4) return false;
  // Year-Month or Date pattern
  if (/^\d{4}[-/.]\d{1,2}([-/.]\d{1,2})?$/.test(str)) return true;
  if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(str)) return true;
  // Month names in Arabic or English
  const monthKeywords = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
    'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
  ];
  const lower = str.toLowerCase();
  return monthKeywords.some((m) => lower.includes(m));
}

/**
 * Parses raw text or table into structured records
 */
export function parseRawTextTable(text: string): { headers: string[]; rows: any[] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Detect delimiter: tab, comma, semicolon, pipe
  const firstFew = lines.slice(0, Math.min(5, lines.length)).join('\n');
  let delimiter = ',';
  if (firstFew.includes('\t')) delimiter = '\t';
  else if (firstFew.includes(';') && !firstFew.includes(',')) delimiter = ';';
  else if (firstFew.includes('|')) delimiter = '|';

  // Helper to split row handling quotes
  const splitLine = (line: string): string[] => {
    if (delimiter === '\t' || delimiter === '|') {
      return line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));
    }
    // CSV regex
    const re = /(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|([^\",]+)|(?=,,)|$)/g;
    const matches: string[] = [];
    let match;
    while ((match = re.exec(line)) !== null) {
      if (match.index === line.length) break;
      const val = match[1] ? match[1].replace(/""/g, '"') : match[2] ? match[2] : '';
      matches.push(val.trim());
    }
    return matches.length > 0 ? matches : line.split(delimiter).map((s) => s.trim());
  };

  const rawHeaders = splitLine(lines[0]);
  const headers = rawHeaders.map((h, i) => h || `عمود_${i + 1}`);

  const rows: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitLine(lines[i]);
    if (values.length === 0 || values.every((v) => !v)) continue;
    const rowObj: any = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] !== undefined ? values[idx] : null;
    });
    rows.push(rowObj);
  }

  return { headers, rows };
}

/**
 * Parses an ArrayBuffer (from file upload .xlsx, .xls, .csv)
 */
export function parseSpreadsheetBuffer(buffer: ArrayBuffer, fileName: string): { headers: string[]; rows: any[] } {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('الملف فارغ ولا يحتوي على جداول');
  }
  const worksheet = workbook.Sheets[sheetName];
  const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

  if (rawJson.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = Object.keys(rawJson[0]);
  return { headers, rows: rawJson };
}

/**
 * Organizes, cleans, detects types, fills missing values, and calculates metadata
 */
export function processAndCleanData(
  rawHeaders: string[],
  rawRows: any[],
  datasetName: string = 'البيانات المستوردة'
): CleanedDataset {
  let missingValuesFound = 0;
  let missingValuesFixed = 0;
  let anomaliesFound = 0;
  const notes: string[] = [];

  // 1. Identify types for each column
  const columnMetas: ColumnMeta[] = rawHeaders.map((header) => {
    let numericCount = 0;
    let dateCount = 0;
    let missingCount = 0;
    const sampleValues: (string | number)[] = [];
    const uniqueSet = new Set<string>();

    rawRows.forEach((row) => {
      const val = row[header];
      if (val === null || val === undefined || String(val).trim() === '' || String(val).toLowerCase() === 'n/a') {
        missingCount++;
        return;
      }
      uniqueSet.add(String(val));
      if (sampleValues.length < 5) {
        sampleValues.push(val);
      }

      const { isNum } = cleanNumericValue(val);
      if (isNum) numericCount++;
      if (isDateString(val)) dateCount++;
    });

    const validCount = rawRows.length - missingCount;
    const numRatio = validCount > 0 ? numericCount / validCount : 0;
    const dateRatio = validCount > 0 ? dateCount / validCount : 0;

    let colType: ColumnType = 'category';
    const lowerHeader = header.toLowerCase();

    // Check for ID column
    const isIdHeader =
      lowerHeader.includes('id') ||
      lowerHeader.includes('كود') ||
      lowerHeader.includes('رقم') ||
      lowerHeader.includes('مسلسل');

    if (dateRatio > 0.6 || lowerHeader.includes('تاريخ') || lowerHeader.includes('date') || lowerHeader.includes('شهر') || lowerHeader.includes('month')) {
      colType = 'date';
    } else if (numRatio > 0.7 && (!isIdHeader || uniqueSet.size < rawRows.length * 0.9)) {
      colType = 'numeric';
    } else if (isIdHeader && uniqueSet.size > rawRows.length * 0.8) {
      colType = 'id';
    } else if (uniqueSet.size > 50 && rawRows.length > 50 && numRatio < 0.2) {
      colType = 'text';
    } else {
      colType = 'category';
    }

    // Inferred business role
    let inferredRole: 'metric' | 'dimension' | 'time' | 'identifier' | 'attribute' = 'dimension';
    if (colType === 'numeric') inferredRole = 'metric';
    else if (colType === 'date') inferredRole = 'time';
    else if (colType === 'id') inferredRole = 'identifier';
    else inferredRole = 'dimension';

    return {
      key: header,
      label: header,
      type: colType,
      inferredRole,
      sampleValues,
      missingCount,
      uniqueCount: uniqueSet.size,
    };
  });

  // 2. Clean values & compute stats
  const cleanedRows: DataRow[] = [];

  rawRows.forEach((row) => {
    const cleanRow: DataRow = {};
    columnMetas.forEach((col) => {
      const rawVal = row[col.key];

      if (rawVal === null || rawVal === undefined || String(rawVal).trim() === '' || String(rawVal).toLowerCase() === 'n/a') {
        missingValuesFound++;
        if (col.type === 'numeric') {
          cleanRow[col.key] = 0;
          missingValuesFixed++;
        } else {
          cleanRow[col.key] = null;
        }
        return;
      }

      if (col.type === 'numeric') {
        const { isNum, num } = cleanNumericValue(rawVal);
        if (isNum) {
          cleanRow[col.key] = num;
        } else {
          cleanRow[col.key] = 0;
          anomaliesFound++;
          missingValuesFixed++;
        }
      } else {
        cleanRow[col.key] = String(rawVal).trim();
      }
    });
    cleanedRows.push(cleanRow);
  });

  // 3. Auto-calculate Total Sales if Quantity and Price exist and Total is not present
  const hasPrice = columnMetas.find((c) => /سعر|price|unit_price/i.test(c.key));
  const hasQty = columnMetas.find((c) => /كمية|qty|quantity/i.test(c.key));
  const hasTotal = columnMetas.find((c) => /إجمالي|total|مجموع|sales|مبيعات/i.test(c.key));

  if (hasPrice && hasQty && !hasTotal) {
    const totalKey = 'إجمالي المبيعات';
    cleanedRows.forEach((r) => {
      const p = Number(r[hasPrice.key]) || 0;
      const q = Number(r[hasQty.key]) || 0;
      r[totalKey] = p * q;
    });

    columnMetas.push({
      key: totalKey,
      label: totalKey,
      type: 'numeric',
      inferredRole: 'metric',
      sampleValues: cleanedRows.slice(0, 5).map((r) => r[totalKey] as number),
      missingCount: 0,
      uniqueCount: new Set(cleanedRows.map((r) => r[totalKey])).size,
    });
    notes.push('تم حساب إجمالي المبيعات تلقائيًا بضرب السعر في الكمية.');
  }

  // 4. Update numerical summaries
  columnMetas.forEach((col) => {
    if (col.type === 'numeric') {
      const nums = cleanedRows.map((r) => Number(r[col.key]) || 0);
      col.sum = nums.reduce((a, b) => a + b, 0);
      col.min = Math.min(...nums);
      col.max = Math.max(...nums);
      col.avg = nums.length > 0 ? col.sum / nums.length : 0;
    }
  });

  if (missingValuesFixed > 0) {
    notes.push(`تم تصحيح وتعبئة ${missingValuesFixed} قيمة مفقودة أو غير منتظمة.`);
  }
  if (notes.length === 0) {
    notes.push('البيانات منظمة ونظيفة بالكامل وجاهزة للتحليل الفوري.');
  }

  return {
    id: 'dataset_' + Date.now(),
    name: datasetName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    columns: columnMetas,
    rows: cleanedRows,
    totalRows: cleanedRows.length,
    totalColumns: columnMetas.length,
    cleaningSummary: {
      missingValuesFound,
      missingValuesFixed,
      anomaliesFound,
      notes,
    },
  };
}
