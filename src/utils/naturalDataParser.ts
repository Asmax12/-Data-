import { ColumnType } from '../types';
import { cleanNumericValue } from './dataParser';

export interface InferredColumnInfo {
  name: string;
  type: 'Text' | 'Number' | 'Date' | 'Currency' | 'Percentage' | 'Category' | 'Location' | 'ID';
  confidence: number;
}

export interface SmartParseResult {
  headers: string[];
  rows: Record<string, any>[];
  columnTypes: Record<string, InferredColumnInfo['type']>;
  isConfident: boolean; // true -> auto proceed, false -> prompt confirmation modal
  confidenceScore: number; // 0 to 1
  confidenceReason?: string;
  cleaningNotes: string[];
  delimiterUsed?: string;
  detectedDatasetType?: string; // e.g. "sales", "students", "employees", "generic"
}

/**
 * Strips markdown formatting characters:
 * - Bold: **text** or __text__ -> text
 * - Italic: *text* or _text_ -> text
 * - Code ticks: `text` -> text
 * - Strikethrough: ~~text~~ -> text
 * - Markdown table borders: leading / trailing pipes
 */
export function cleanMarkdownFormatting(text: string): string {
  let cleaned = text;

  // Remove bold / italic markdown syntax
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
  cleaned = cleaned.replace(/~~([^~]+)~~/g, '$1');

  return cleaned;
}

/**
 * Checks if a line is a markdown separator row, e.g. |---|:---:|---| or ---|--- or :--:
 */
export function isMarkdownSeparator(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  // Match patterns like |---|---| or |:---|---:| or --- | ---
  const stripped = trimmed.replace(/[\|\:\-\s]/g, '');
  if (stripped.length === 0 && (trimmed.includes('-') || trimmed.includes('|'))) {
    return true;
  }
  return false;
}

/**
 * Detects common currency symbols or keywords
 */
export function isCurrencyValue(str: string): boolean {
  if (!str) return false;
  return /[$€£¥₹\u062C\u0645\u0631\u064A\u0627\u0644]|EGP|USD|SAR|EUR|AED|KWD|LE/i.test(str);
}

/**
 * Detects percentage values
 */
export function isPercentageValue(str: string): boolean {
  if (!str) return false;
  return /%|٪/.test(str);
}

/**
 * Detects date-like strings
 */
export function isDateValue(str: string): boolean {
  if (!str) return false;
  const s = str.trim();
  if (s.length < 4) return false;
  if (/^\d{4}[-/.]\d{1,2}([-/.]\d{1,2})?$/.test(s)) return true;
  if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(s)) return true;
  const monthKeywords = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
    'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
  ];
  const lower = s.toLowerCase();
  return monthKeywords.some((m) => lower.includes(m));
}

/**
 * Detects ID-like patterns (e.g., #123, ID-094, ORD_884, كود_20)
 */
export function isIdValue(str: string, header: string): boolean {
  const lowerH = header.toLowerCase();
  if (/id|كود|رمز|رقم|مسلسل|serial|sku|code/i.test(lowerH)) return true;
  const s = str.trim();
  if (/^#?\d{4,}$/.test(s)) return true;
  if (/^[A-Za-z0-9_-]{3,}$/.test(s) && /\d/.test(s) && /[A-Za-z]/.test(s)) return true;
  return false;
}

/**
 * Detects location names or keywords
 */
export function isLocationHeaderOrValue(header: string, sampleVals: string[]): boolean {
  const lowerH = header.toLowerCase();
  if (/مدينة|محافظة|دولة|بلد|عنوان|منطقة|city|country|location|state|region|province|governorate|address/i.test(lowerH)) {
    return true;
  }
  const knownLocations = [
    'القاهرة', 'الإسكندرية', 'الجيزة', 'الرياض', 'جدة', 'دبي', 'عمان', 'بيروت',
    'المنصورة', 'طنطا', 'أسوان', 'الأقصر', 'الدمام', 'مكة', 'المدينة',
    'cairo', 'alexandria', 'giza', 'riyadh', 'jeddah', 'dubai', 'london', 'paris', 'new york'
  ];
  return sampleVals.some((v) => knownLocations.some((loc) => v.toLowerCase().includes(loc.toLowerCase())));
}

/**
 * Infer high-level column type from sample values and header name
 */
export function inferColumnType(
  header: string,
  values: any[]
): 'Text' | 'Number' | 'Date' | 'Currency' | 'Percentage' | 'Category' | 'Location' | 'ID' {
  const nonNullVals = values.filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
  if (nonNullVals.length === 0) return 'Text';

  const stringVals = nonNullVals.map((v) => String(v).trim());

  // Check currency
  const currencyCount = stringVals.filter((v) => isCurrencyValue(v)).length;
  if (currencyCount / nonNullVals.length > 0.4 || /سعر|تكلفة|راتب|إيراد|مبيعات|أرباح|مصروف|price|cost|salary|revenue|sales|profit|expense/i.test(header)) {
    // If numbers exist
    const hasNumbers = stringVals.some((v) => cleanNumericValue(v).isNum);
    if (hasNumbers) return 'Currency';
  }

  // Check percentage
  const percentCount = stringVals.filter((v) => isPercentageValue(v)).length;
  if (percentCount / nonNullVals.length > 0.4 || /نسبة|معدل|percentage|rate|discount|خصم/i.test(header)) {
    const hasNumbers = stringVals.some((v) => cleanNumericValue(v).isNum);
    if (hasNumbers) return 'Percentage';
  }

  // Check Date
  const dateCount = stringVals.filter((v) => isDateValue(v)).length;
  if (dateCount / nonNullVals.length > 0.5 || /تاريخ|وقت|date|time|day|month|year|سنة|شهر|يوم/i.test(header)) {
    return 'Date';
  }

  // Check Location
  if (isLocationHeaderOrValue(header, stringVals)) {
    return 'Location';
  }

  // Check ID
  const isId = stringVals.every((v) => isIdValue(v, header));
  if (isId || /^(id|كود|رمز|رقم|مسلسل)$/i.test(header.trim())) {
    return 'ID';
  }

  // Check Number
  let numCount = 0;
  stringVals.forEach((v) => {
    if (cleanNumericValue(v).isNum) numCount++;
  });
  if (numCount / nonNullVals.length > 0.7) {
    return 'Number';
  }

  // Category vs Text: distinct count
  const uniqueCount = new Set(stringVals).size;
  if (uniqueCount <= Math.max(12, Math.floor(nonNullVals.length * 0.4)) && nonNullVals.length >= 3) {
    return 'Category';
  }

  return 'Text';
}

/**
 * Intelligent Delimiter & Record Detector:
 * Supports:
 * - Markdown tables (| header | header |)
 * - Tab-separated (\t)
 * - Comma-separated (,)
 * - Semicolon-separated (;)
 * - Pipe-separated (|)
 * - Multiple spaces / tabs (2 or more spaces)
 * - Sentences / Lines describing records (e.g. "أحمد: 25 سنة، القاهرة" or "المنتج: لابتوب، السعر: 3000")
 */
export function intelligentParseRawText(rawText: string): SmartParseResult {
  const notes: string[] = [];

  // Step 1: Clean Markdown wrappers
  const cleanedText = cleanMarkdownFormatting(rawText);

  // Split lines
  const rawLines = cleanedText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (rawLines.length === 0) {
    return {
      headers: [],
      rows: [],
      columnTypes: {},
      isConfident: false,
      confidenceScore: 0,
      confidenceReason: 'النص فارغ تمامًا',
      cleaningNotes: ['لم يتم العثور على أي سطور في النص.'],
    };
  }

  // Step 2: Filter out markdown separator lines (e.g. |---|---|)
  const lines = rawLines.filter((l) => !isMarkdownSeparator(l));

  if (lines.length < rawLines.length) {
    notes.push('تم تنظيف فواصل Markdown وإزالة صفوف التنسيق تلقائيًا.');
  }

  // Step 3: Check if lines follow a "Key: Value" or natural sentence pattern
  // E.g.:
  // الاسم: أحمد, العمر: 25, المدينة: القاهرة
  // الاسم: سارة, العمر: 30, المدينة: الإسكندرية
  const isKeyValuePattern = lines.length >= 1 && lines.every((l) => {
    const colonCount = (l.match(/[:：]/g) || []).length;
    return colonCount >= 2;
  });

  if (isKeyValuePattern) {
    const parsedKV = parseKeyValueLines(lines);
    if (parsedKV.headers.length >= 2 && parsedKV.rows.length >= 1) {
      notes.push('تم التعرف على بنية الحقول تلقائيًا من العبارات والأسطر.');
      const colTypes: Record<string, InferredColumnInfo['type']> = {};
      parsedKV.headers.forEach((h) => {
        colTypes[h] = inferColumnType(
          h,
          parsedKV.rows.map((r) => r[h])
        );
      });

      return {
        headers: parsedKV.headers,
        rows: parsedKV.rows,
        columnTypes: colTypes,
        isConfident: parsedKV.rows.length >= 2,
        confidenceScore: 0.9,
        confidenceReason: 'تم استخراج الحقول والعناوين بنجاح من صياغة النص.',
        cleaningNotes: notes,
        detectedDatasetType: 'key_value_records',
      };
    }
  }

  // Step 4: Delimiter detection among standard candidates:
  // Candidates: tab, pipe (|), comma (,), semicolon (;), multiple spaces (/\s{2,}/)
  const sampleLines = lines.slice(0, Math.min(10, lines.length));

  type DelimiterCandidate = {
    name: string;
    delimiter: string | RegExp;
    splitFn: (line: string) => string[];
    variance: number;
    colCounts: number[];
    avgCols: number;
  };

  const candidates: DelimiterCandidate[] = [
    {
      name: 'tab',
      delimiter: '\t',
      splitFn: (l) => l.split('\t').map((c) => c.trim()),
      variance: 0,
      colCounts: [],
      avgCols: 0,
    },
    {
      name: 'pipe',
      delimiter: '|',
      splitFn: (l) => {
        // Remove leading and trailing pipe if table style
        let trimmed = l.trim();
        if (trimmed.startsWith('|')) trimmed = trimmed.substring(1);
        if (trimmed.endsWith('|')) trimmed = trimmed.substring(0, trimmed.length - 1);
        return trimmed.split('|').map((c) => c.trim());
      },
      variance: 0,
      colCounts: [],
      avgCols: 0,
    },
    {
      name: 'comma',
      delimiter: ',',
      splitFn: (l) => splitCSVLine(l, ','),
      variance: 0,
      colCounts: [],
      avgCols: 0,
    },
    {
      name: 'semicolon',
      delimiter: ';',
      splitFn: (l) => splitCSVLine(l, ';'),
      variance: 0,
      colCounts: [],
      avgCols: 0,
    },
    {
      name: 'multispace',
      delimiter: /\s{2,}/,
      splitFn: (l) => l.trim().split(/\s{2,}/).map((c) => c.trim()),
      variance: 0,
      colCounts: [],
      avgCols: 0,
    },
  ];

  // Evaluate candidate delimiters
  let bestCandidate: DelimiterCandidate | null = null;
  let highestScore = -1;

  for (const cand of candidates) {
    const counts = sampleLines.map((l) => cand.splitFn(l).filter((c) => c.length > 0).length);
    cand.colCounts = counts;
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    cand.avgCols = avg;

    if (avg <= 1) continue; // Only one item per line -> not a valid multi-column delimiter

    // Calculate variance
    const variance = counts.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / counts.length;
    cand.variance = variance;

    // Consistency score: low variance and >= 2 columns
    // Perfect consistency (variance 0) is ideal
    const consistencyScore = 1 / (1 + variance) * (avg >= 2 ? 1 : 0.5);

    if (consistencyScore > highestScore) {
      highestScore = consistencyScore;
      bestCandidate = cand;
    }
  }

  // If no standard multi-column delimiter matched, check single space delimiter fallback
  // if all lines have identical word count (e.g. "أحمد القاهرة 3000")
  if (!bestCandidate || bestCandidate.avgCols < 2) {
    const spaceCounts = sampleLines.map((l) => l.trim().split(/\s+/).length);
    const avgSpaceCols = spaceCounts.reduce((a, b) => a + b, 0) / spaceCounts.length;
    const spaceVariance = spaceCounts.reduce((sum, c) => sum + Math.pow(c - avgSpaceCols, 2), 0) / spaceCounts.length;

    if (avgSpaceCols >= 2 && spaceVariance <= 0.8) {
      bestCandidate = {
        name: 'singlespace',
        delimiter: /\s+/,
        splitFn: (l) => l.trim().split(/\s+/),
        variance: spaceVariance,
        colCounts: spaceCounts,
        avgCols: avgSpaceCols,
      };
      highestScore = 1 / (1 + spaceVariance);
    }
  }

  // If still no delimiter or only 1 line with 1 column
  if (!bestCandidate || bestCandidate.avgCols < 2) {
    // Check if user entered simple list or unseparated items
    const rawHeaders = ['البند'];
    const rows = lines.map((l) => ({ البند: l }));
    return {
      headers: rawHeaders,
      rows,
      columnTypes: { البند: 'Text' },
      isConfident: false,
      confidenceScore: 0.2,
      confidenceReason: 'تم قراءة البيانات كقائمة عناصر لعدم وجود فواصل واضحة بين الأعمدة.',
      cleaningNotes: ['النص تم تنسيقه كعمود واحد.'],
    };
  }

  notes.push(`تم التعرف على الفواصل (${bestCandidate.name}) وتنظيم السطور.`);

  // Split all lines
  const parsedGrid: string[][] = lines.map((l) =>
    bestCandidate!.splitFn(l).map((cell) => cell.replace(/^["']|["']$/g, '').trim())
  );

  // Normalize column count to max length
  const targetColCount = Math.round(bestCandidate.avgCols);
  const filteredGrid = parsedGrid.filter((row) => row.length > 0 && row.some((cell) => cell.length > 0));

  if (filteredGrid.length === 0) {
    return {
      headers: [],
      rows: [],
      columnTypes: {},
      isConfident: false,
      confidenceScore: 0,
      confidenceReason: 'لا توجد بيانات صالحة',
      cleaningNotes: notes,
    };
  }

  // Detect whether the first line is headers or data
  const firstRow = filteredGrid[0];
  const secondRow = filteredGrid[1];

  let hasHeaders = false;
  if (filteredGrid.length >= 2) {
    hasHeaders = checkIfRowIsHeader(firstRow, secondRow);
  }

  let headers: string[] = [];
  let dataRows: string[][] = [];

  if (hasHeaders) {
    headers = firstRow.map((h, i) => (h && h.trim().length > 0 ? h.trim() : `عمود_${i + 1}`));
    dataRows = filteredGrid.slice(1);
    notes.push('تم استخراج أسماء الأعمدة من الصف الأول تلقائيًا.');
  } else {
    // Generate clean descriptive generic headers based on inferred types
    // e.g. "الاسم / النص", "القيمة / الرقم", "التاريخ"
    headers = firstRow.map((_, i) => `عمود_${i + 1}`);
    dataRows = filteredGrid;
    notes.push('تم تعيين أسماء افتراضية للأعمدة لعدم وجود صف عناوين صريح.');
  }

  // Deduplicate header names if duplicate
  const seenHeaders = new Set<string>();
  headers = headers.map((h, i) => {
    let name = h;
    let counter = 1;
    while (seenHeaders.has(name)) {
      name = `${h}_${counter++}`;
    }
    seenHeaders.add(name);
    return name;
  });

  // Construct row objects
  const finalRows: Record<string, any>[] = [];
  dataRows.forEach((rowCells) => {
    if (rowCells.every((c) => !c)) return; // skip empty rows
    const rowObj: Record<string, any> = {};
    headers.forEach((h, idx) => {
      const cellVal = rowCells[idx] !== undefined ? rowCells[idx] : null;
      rowObj[h] = cellVal;
    });
    finalRows.push(rowObj);
  });

  // Infer column types
  const columnTypes: Record<string, InferredColumnInfo['type']> = {};
  headers.forEach((h) => {
    columnTypes[h] = inferColumnType(
      h,
      finalRows.map((r) => r[h])
    );
  });

  // Calculate confidence
  // Confident if:
  // - variance is low (< 0.5)
  // - has at least 2 rows of data
  // - headers were clear or nicely aligned
  // - no columns are 100% missing
  const isVarianceGood = bestCandidate.variance <= 0.6;
  const hasMultipleRows = finalRows.length >= 2;
  const isConfidenceHigh = isVarianceGood && hasMultipleRows;

  let confidenceScore = 0.5;
  if (isVarianceGood) confidenceScore += 0.3;
  if (hasHeaders) confidenceScore += 0.15;
  if (finalRows.length >= 3) confidenceScore += 0.05;

  return {
    headers,
    rows: finalRows,
    columnTypes,
    isConfident: isConfidenceHigh && confidenceScore >= 0.75,
    confidenceScore: Math.min(1, confidenceScore),
    confidenceReason: isConfidenceHigh
      ? 'تم تنظيم الأعمدة والصفوف بنسبة ثقة عالية.'
      : 'الهيكل يبدو متناسقًا ولكن يرجى مراجعة الأعمدة للتأكد.',
    cleaningNotes: notes,
    delimiterUsed: bestCandidate.name,
  };
}

/**
 * Splits CSV line taking care of quotes
 */
function splitCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Check if the first row is likely a header row compared to the second row
 */
function checkIfRowIsHeader(row1: string[], row2: string[]): boolean {
  if (row1.length === 0 || !row2 || row2.length === 0) return false;

  // If row1 has any numbers, but row2 has same numbers -> row1 is probably data
  const row1Numbers = row1.filter((c) => cleanNumericValue(c).isNum).length;
  const row2Numbers = row2.filter((c) => cleanNumericValue(c).isNum).length;

  if (row1Numbers === 0 && row2Numbers > 0) {
    return true; // Row1 pure text, row2 contains numbers -> definite header
  }

  // Check typical header keywords in Arabic / English
  const commonHeaderKeywords = [
    'اسم', 'عميل', 'منتج', 'مدينة', 'سعر', 'كمية', 'تاريخ', 'كود', 'إجمالي', 'ملاحظات',
    'قسم', 'فئة', 'حالة', 'موظف', 'طالب', 'درجة', 'مادة', 'شهر', 'سنة', 'فرع',
    'name', 'client', 'customer', 'item', 'product', 'price', 'quantity', 'date', 'total',
    'id', 'category', 'status', 'city', 'department', 'student', 'grade', 'score'
  ];

  const row1HasKeyword = row1.some((c) =>
    commonHeaderKeywords.some((kw) => c.toLowerCase().includes(kw))
  );

  if (row1HasKeyword) return true;

  // If row1 has no dates or currencies, but row2 has dates or currencies
  const row2HasDateOrCurr = row2.some((c) => isDateValue(c) || isCurrencyValue(c));
  const row1HasDateOrCurr = row1.some((c) => isDateValue(c) || isCurrencyValue(c));

  if (!row1HasDateOrCurr && row2HasDateOrCurr) return true;

  // Default: if row1 is all strings with moderate length, treat as headers
  return row1Numbers < row1.length * 0.4;
}

/**
 * Parses lines formatted as "Key: Value, Key: Value"
 */
function parseKeyValueLines(lines: string[]): { headers: string[]; rows: Record<string, any>[] } {
  const allKeys = new Set<string>();
  const rawRows: Record<string, any>[] = [];

  for (const line of lines) {
    const rowObj: Record<string, any> = {};
    // Split by comma or semicolon or newline
    const pairs = line.split(/[,;\n]/).map((p) => p.trim()).filter((p) => p.includes(':') || p.includes('：'));

    for (const pair of pairs) {
      const colonIdx = pair.indexOf(':') !== -1 ? pair.indexOf(':') : pair.indexOf('：');
      if (colonIdx === -1) continue;
      const key = pair.substring(0, colonIdx).trim();
      const val = pair.substring(colonIdx + 1).trim();
      if (key) {
        allKeys.add(key);
        rowObj[key] = val;
      }
    }

    if (Object.keys(rowObj).length > 0) {
      rawRows.push(rowObj);
    }
  }

  const headers = Array.from(allKeys);
  const rows = rawRows.map((r) => {
    const cleanR: Record<string, any> = {};
    headers.forEach((h) => {
      cleanR[h] = r[h] !== undefined ? r[h] : null;
    });
    return cleanR;
  });

  return { headers, rows };
}
