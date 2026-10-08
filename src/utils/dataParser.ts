import * as XLSX from 'xlsx';
import { CleanedDataset, ColumnMeta, ColumnType, DataRow, IgnoredRowRecord, SemanticRole } from '../types';

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
 * Organizes, cleans, detects types, detects semantic roles, filters outliers, and calculates metadata
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
  const outlierNotes: string[] = [];
  const ignoredRows: IgnoredRowRecord[] = [];

  // 1. First pass: Inspect sample values and raw stats for each column
  interface RawColStats {
    header: string;
    missingCount: number;
    sampleValues: (string | number)[];
    uniqueSet: Set<string>;
    numCount: number;
    dateCount: number;
    numericVals: number[];
  }

  const rawStatsMap: Map<string, RawColStats> = new Map();

  rawHeaders.forEach((header) => {
    let missingCount = 0;
    let numCount = 0;
    let dateCount = 0;
    const sampleValues: (string | number)[] = [];
    const uniqueSet = new Set<string>();
    const numericVals: number[] = [];

    rawRows.forEach((row) => {
      const val = row[header];
      if (val === null || val === undefined || String(val).trim() === '' || String(val).toLowerCase() === 'n/a') {
        missingCount++;
        return;
      }
      const strVal = String(val).trim();
      uniqueSet.add(strVal);
      if (sampleValues.length < 6) {
        sampleValues.push(val);
      }

      const { isNum, num } = cleanNumericValue(val);
      if (isNum) {
        numCount++;
        numericVals.push(num);
      }
      if (isDateString(val)) {
        dateCount++;
      }
    });

    rawStatsMap.set(header, {
      header,
      missingCount,
      sampleValues,
      uniqueSet,
      numCount,
      dateCount,
      numericVals,
    });
  });

  // 2. Identify Semantic Role & Column Type for each column
  const columnMetas: ColumnMeta[] = rawHeaders.map((header) => {
    const stats = rawStatsMap.get(header)!;
    const validCount = rawRows.length - stats.missingCount;
    const numRatio = validCount > 0 ? stats.numCount / validCount : 0;
    const dateRatio = validCount > 0 ? stats.dateCount / validCount : 0;
    const lowerHeader = header.toLowerCase();

    // Semantic patterns
    const isIdHeader =
      /^(id|كود|رمز|رقم|مسلسل|serial|sku|code|customer_id|order_id|client_id|user_id|ref|reference|uuid)$/i.test(lowerHeader) ||
      /(_id|\bid\b|كود|مسلسل|رقم_العميل|رقم_الطلب|رقم_الفاتورة|رقم_المستخدم)/i.test(lowerHeader);

    const isDateHeader =
      /تاريخ|وقت|date|time|timestamp|created_at|updated_at|day|month|year|سنة|شهر|يوم|فترة/i.test(lowerHeader);

    const isRatingHeader =
      /تقييم|rating|rate|stars|نجوم|score|رضا|satisfaction|درجة|مستوى|جودة|quality|feedback/i.test(lowerHeader);

    const isAgeHeader =
      /عمر|age|سن|أعمار|سنوات_العمر/i.test(lowerHeader);

    const isFinancialHeader =
      /سعر|price|cost|تكلفة|مبيعات|sales|إجمالي|total|مبلغ|amount|revenue|إيرادات|أرباح|profit|كمية|qty|quantity|عدد|شحن|shipping|رسوم|fees|راتب|salary|مصروف|expense|خصم|discount|قيمة/i.test(lowerHeader);

    let colType: ColumnType = 'category';
    let semanticRole: SemanticRole = 'categorical';
    let semanticRoleLabelAr = 'تصنيف (Categorical)';
    let semanticRoleLabelEn = 'Categorical';
    let allowedOperations: ColumnMeta['allowedOperations'] = ['count', 'distribution', 'unique_count'];

    // Classification Decision Tree
    if (dateRatio > 0.6 || (isDateHeader && stats.dateCount > 0)) {
      colType = 'date';
      semanticRole = 'timestamp';
      semanticRoleLabelAr = 'تسلسل زمني / تاريخ (Timestamp)';
      semanticRoleLabelEn = 'Timestamp / Date';
      allowedOperations = ['timeline', 'count'];
    } else if (isIdHeader || (numRatio > 0.8 && stats.uniqueSet.size >= Math.max(3, rawRows.length * 0.85) && /id|كود|مسلسل|رمز/i.test(lowerHeader))) {
      colType = 'id';
      semanticRole = 'identifier';
      semanticRoleLabelAr = 'معرّف فريد (Unique Identifier)';
      semanticRoleLabelEn = 'Identifier';
      allowedOperations = ['unique_count'];
    } else if (isRatingHeader && numRatio > 0.5) {
      colType = 'rating';
      semanticRole = 'numeric_discrete';
      semanticRoleLabelAr = 'رقمي منفصل - تقييم (Rating)';
      semanticRoleLabelEn = 'Discrete Rating';
      allowedOperations = ['avg', 'median', 'distribution'];
    } else if (isAgeHeader && numRatio > 0.5) {
      colType = 'age';
      semanticRole = 'numeric_discrete';
      semanticRoleLabelAr = 'رقمي منفصل - عمر (Age)';
      semanticRoleLabelEn = 'Discrete Age';
      allowedOperations = ['avg', 'median', 'distribution'];
    } else if (numRatio > 0.7) {
      // Check if values behave as discrete 1-5 ratings despite generic header
      const minVal = stats.numericVals.length > 0 ? Math.min(...stats.numericVals) : 0;
      const maxVal = stats.numericVals.length > 0 ? Math.max(...stats.numericVals) : 0;
      const isDiscrete1To5 = minVal >= 1 && maxVal <= 5 && stats.numericVals.every((v) => Number.isInteger(v * 2));

      if (isDiscrete1To5 && !isFinancialHeader) {
        colType = 'rating';
        semanticRole = 'numeric_discrete';
        semanticRoleLabelAr = 'رقمي منفصل - مقياس (Discrete Score)';
        semanticRoleLabelEn = 'Discrete Score (1-5)';
        allowedOperations = ['avg', 'median', 'distribution'];
      } else {
        colType = 'numeric';
        semanticRole = 'numeric_financial';
        semanticRoleLabelAr = isFinancialHeader ? 'مالي / كمية (Financial/Quantity)' : 'رقمي متصل (Continuous Metric)';
        semanticRoleLabelEn = 'Numeric Financial / Quantity';
        allowedOperations = ['sum', 'avg', 'min', 'max'];
      }
    } else if (stats.uniqueSet.size > 50 && rawRows.length > 50 && numRatio < 0.2) {
      colType = 'text';
      semanticRole = 'categorical';
      semanticRoleLabelAr = 'نص وصفي (Descriptive Text)';
      semanticRoleLabelEn = 'Text';
      allowedOperations = ['count', 'unique_count'];
    } else {
      colType = 'category';
      semanticRole = 'categorical';
      semanticRoleLabelAr = 'تصنيف (Categorical)';
      semanticRoleLabelEn = 'Categorical';
      allowedOperations = ['count', 'distribution', 'unique_count'];
    }

    // Inferred role for backward compatibility
    let inferredRole: ColumnMeta['inferredRole'] = 'dimension';
    if (semanticRole === 'numeric_financial' || semanticRole === 'numeric_discrete') {
      inferredRole = 'metric';
    } else if (semanticRole === 'timestamp') {
      inferredRole = 'time';
    } else if (semanticRole === 'identifier') {
      inferredRole = 'identifier';
    }

    return {
      key: header,
      label: header,
      type: colType,
      inferredRole,
      semanticRole,
      semanticRoleLabelAr,
      semanticRoleLabelEn,
      allowedOperations,
      sampleValues: stats.sampleValues,
      missingCount: stats.missingCount,
      uniqueCount: stats.uniqueSet.size,
    };
  });

  // 3. Outlier and Preprocessing Filter: Inspect each row and separate corrupted/extreme outliers
  const cleanedRows: DataRow[] = [];
  const validRowIndices = new Set<number>();

  rawRows.forEach((row, rowIdx) => {
    let rowHasOutlier = false;
    const cleanRow: DataRow = {};

    columnMetas.forEach((col) => {
      const rawVal = row[col.key];

      if (rawVal === null || rawVal === undefined || String(rawVal).trim() === '' || String(rawVal).toLowerCase() === 'n/a') {
        missingValuesFound++;
        cleanRow[col.key] = null;
        return;
      }

      // Check numeric/discrete/timestamp consistency
      if (col.type === 'rating' || (col.semanticRole === 'numeric_discrete' && /تقييم|rating|stars|نجوم|رضا/i.test(col.key))) {
        const { isNum, num } = cleanNumericValue(rawVal);
        if (!isNum) {
          rowHasOutlier = true;
          anomaliesFound++;
          ignoredRows.push({
            rowIndex: rowIdx + 1,
            columnKey: col.key,
            columnLabel: col.label,
            value: rawVal,
            reason: `Invalid non-numeric rating entry: "${rawVal}"`,
            reasonAr: `قيمة التقييم غير صالحة ("${rawVal}") في حقل "${col.label}"`,
          });
          cleanRow[col.key] = null;
        } else if (num < 1 || num > 5) {
          // Outlier detected: Rating outside valid Likert range 1-5
          rowHasOutlier = true;
          anomaliesFound++;
          ignoredRows.push({
            rowIndex: rowIdx + 1,
            columnKey: col.key,
            columnLabel: col.label,
            value: num,
            reason: `Rating ${num} is outside acceptable 1-5 scale`,
            reasonAr: `التقييم (${num}) خارج النطاق المقبول (1 إلى 5) في حقل "${col.label}"`,
          });
          cleanRow[col.key] = num;
        } else {
          cleanRow[col.key] = num;
        }
      } else if (col.type === 'age' || (col.semanticRole === 'numeric_discrete' && /عمر|age|سن/i.test(col.key))) {
        const { isNum, num } = cleanNumericValue(rawVal);
        if (!isNum || num < 0 || num > 120) {
          rowHasOutlier = true;
          anomaliesFound++;
          ignoredRows.push({
            rowIndex: rowIdx + 1,
            columnKey: col.key,
            columnLabel: col.label,
            value: rawVal,
            reason: `Unrealistic or corrupted age value: "${rawVal}" (expected 0-120)`,
            reasonAr: `عمر غير واقعي أو شاذ ("${rawVal}") في حقل "${col.label}"`,
          });
          cleanRow[col.key] = isNum ? num : null;
        } else {
          cleanRow[col.key] = num;
        }
      } else if (col.semanticRole === 'numeric_financial') {
        const { isNum, num } = cleanNumericValue(rawVal);
        if (!isNum) {
          rowHasOutlier = true;
          anomaliesFound++;
          ignoredRows.push({
            rowIndex: rowIdx + 1,
            columnKey: col.key,
            columnLabel: col.label,
            value: rawVal,
            reason: `Corrupted non-numeric value: "${rawVal}" in numeric field`,
            reasonAr: `قيمة رقمية تالفة ("${rawVal}") في حقل "${col.label}"`,
          });
          cleanRow[col.key] = 0;
        } else {
          // In financial fields like price or quantity, check for negative corruption
          if (num < 0 && /سعر|كمية|qty|price|شحن/i.test(col.key) && !/خصم|discount|مرتجع/i.test(col.key)) {
            rowHasOutlier = true;
            anomaliesFound++;
            ignoredRows.push({
              rowIndex: rowIdx + 1,
              columnKey: col.key,
              columnLabel: col.label,
              value: num,
              reason: `Unexpected negative value (${num}) in non-negative column`,
              reasonAr: `قيمة سالبة غير مقبولة (${num}) في حقل "${col.label}"`,
            });
          }
          cleanRow[col.key] = num;
        }
      } else {
        cleanRow[col.key] = String(rawVal).trim();
      }
    });

    cleanedRows.push(cleanRow);
    if (!rowHasOutlier) {
      validRowIndices.add(rowIdx);
    }
  });

  // 4. Form separate analytical view (pure valid rows without outliers)
  const analyticalRows = cleanedRows.filter((_, idx) => validRowIndices.has(idx));
  const validRowsCount = analyticalRows.length;
  const ignoredRowsCount = cleanedRows.length - validRowsCount;

  // 5. Auto-calculate Total Sales if Quantity and Price exist and Total is not present
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
      semanticRole: 'numeric_financial',
      semanticRoleLabelAr: 'مالي / إجمالي مبيعات (Sales)',
      semanticRoleLabelEn: 'Sales Metric',
      allowedOperations: ['sum', 'avg', 'min', 'max'],
      sampleValues: cleanedRows.slice(0, 5).map((r) => r[totalKey] as number),
      missingCount: 0,
      uniqueCount: new Set(cleanedRows.map((r) => r[totalKey])).size,
    });
    notes.push('تم حساب إجمالي المبيعات تلقائيًا بضرب السعر في الكمية.');
  }

  // 6. Calculate accurate, role-specific metrics strictly from analyticalRows
  columnMetas.forEach((col) => {
    // Only use rows where value is valid and not excluded
    const analyticalValues = analyticalRows
      .map((r) => r[col.key])
      .filter((v) => v !== null && v !== undefined);

    col.validCount = analyticalValues.length;
    col.ignoredCount = rawRows.length - analyticalValues.length;

    if (col.semanticRole === 'numeric_financial') {
      const nums = analyticalValues.map((v) => Number(v) || 0);
      col.sum = nums.reduce((a, b) => a + b, 0);
      col.min = nums.length > 0 ? Math.min(...nums) : 0;
      col.max = nums.length > 0 ? Math.max(...nums) : 0;
      col.avg = nums.length > 0 ? col.sum / nums.length : 0;
    } else if (col.semanticRole === 'numeric_discrete') {
      // Discrete metric (Ratings, Ages) -> NEVER compute sum! Calculate Mean, Median, and Distribution
      const nums = analyticalValues.map((v) => Number(v) || 0).sort((a, b) => a - b);
      if (nums.length > 0) {
        col.min = Math.min(...nums);
        col.max = Math.max(...nums);
        const total = nums.reduce((a, b) => a + b, 0);
        col.avg = Number((total / nums.length).toFixed(2));

        // Median
        const mid = Math.floor(nums.length / 2);
        col.median = nums.length % 2 !== 0 ? nums[mid] : Number(((nums[mid - 1] + nums[mid]) / 2).toFixed(2));

        // Distribution frequency
        const freqMap = new Map<string, number>();
        nums.forEach((n) => {
          const key = col.type === 'rating' ? `${n} نجوم` : String(n);
          freqMap.set(key, (freqMap.get(key) || 0) + 1);
        });

        col.distribution = Array.from(freqMap.entries()).map(([label, count]) => ({
          label,
          count,
          percentage: Math.round((count / nums.length) * 100),
        }));
      }
      // Explicitly delete/omit sum to prevent accidental blind usage
      delete col.sum;
    } else if (col.semanticRole === 'identifier') {
      // ID columns -> ONLY uniqueCount, NEVER sum or avg
      delete col.sum;
      delete col.avg;
    } else if (col.semanticRole === 'timestamp') {
      // Timestamp -> NEVER sum
      delete col.sum;
      delete col.avg;
    } else if (col.semanticRole === 'categorical') {
      // Distribution breakdown
      const freqMap = new Map<string, number>();
      analyticalValues.forEach((v) => {
        const str = String(v);
        freqMap.set(str, (freqMap.get(str) || 0) + 1);
      });
      const total = analyticalValues.length;
      col.distribution = Array.from(freqMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([label, count]) => ({
          label,
          count,
          percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        }));
      delete col.sum;
      delete col.avg;
    }
  });

  // 7. Compose transparency notes
  if (ignoredRowsCount > 0) {
    const summaryMsg = `تم استبعاد ${ignoredRowsCount} سجل شاذ أو غير صالح من الحسابات الإحصائية لضمان نزاهة التحليل.`;
    outlierNotes.push(summaryMsg);
    notes.push(summaryMsg);
  }
  if (missingValuesFixed > 0) {
    notes.push(`تم تصحيح وتعبئة ${missingValuesFixed} قيمة مفقودة أو غير منتظمة.`);
  }
  if (notes.length === 0) {
    notes.push('البيانات منظمة ونظيفة بالكامل وخالية من القيم الشاذة، وجاهزة للتحليل الفوري.');
  }

  return {
    id: 'dataset_' + Date.now(),
    name: datasetName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    columns: columnMetas,
    rows: cleanedRows,
    analyticalRows,
    totalRows: cleanedRows.length,
    validRowsCount,
    ignoredRowsCount,
    ignoredRows,
    totalColumns: columnMetas.length,
    cleaningSummary: {
      missingValuesFound,
      missingValuesFixed,
      anomaliesFound,
      validRowsCount,
      ignoredRowsCount,
      outlierDetails: ignoredRows.map((r) => `صف #${r.rowIndex}: ${r.reasonAr}`),
      notes,
    },
  };
}
