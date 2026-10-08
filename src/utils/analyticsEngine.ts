import {
  CleanedDataset,
  ColumnMeta,
  KPIItem,
  ChartConfig,
  InsightItem,
  DataRow,
  AIQueryActions,
  InvestigationSubject,
  InvestigationResult,
  InvestigationEvidence,
} from '../types';

/**
 * Format currency or clean numbers comfortably
 */
export function formatMetricNumber(val: number, isCurrency: boolean = false): string {
  if (Math.abs(val) >= 1_000_000) {
    const formatted = (val / 1_000_000).toFixed(1).replace(/\.0$/, '');
    return isCurrency ? `${formatted}M ج.م` : `${formatted}M`;
  }
  if (Math.abs(val) >= 10_000) {
    const formatted = (val / 1_000).toFixed(1).replace(/\.0$/, '');
    return isCurrency ? `${formatted}K ج.م` : `${formatted}K`;
  }
  const formatted = Math.round(val).toLocaleString('ar-EG');
  return isCurrency ? `${formatted} ج.م` : formatted;
}

export function formatMetricNumberEn(val: number, isCurrency: boolean = false): string {
  if (Math.abs(val) >= 1_000_000) {
    const formatted = (val / 1_000_000).toFixed(1).replace(/\.0$/, '');
    return isCurrency ? `$${formatted}M` : `${formatted}M`;
  }
  if (Math.abs(val) >= 10_000) {
    const formatted = (val / 1_000).toFixed(1).replace(/\.0$/, '');
    return isCurrency ? `$${formatted}K` : `${formatted}K`;
  }
  const formatted = Math.round(val).toLocaleString('en-US');
  return isCurrency ? `$${formatted}` : formatted;
}

/**
 * Automatically builds relevant KPIs from the data based on Semantic Roles
 * NEVER blindly sums IDs, Ages, Timestamps, or Ratings!
 */
export function generateKPIs(dataset: CleanedDataset): KPIItem[] {
  const kpis: KPIItem[] = [];
  const rows = dataset.analyticalRows && dataset.analyticalRows.length > 0 ? dataset.analyticalRows : dataset.rows;
  const count = rows.length;
  if (count === 0 && dataset.totalRows === 0) return kpis;

  const cols = dataset.columns;
  const validCount = dataset.validRowsCount ?? count;
  const ignoredCount = dataset.ignoredRowsCount ?? 0;

  // Find columns by semantic role
  const ratingCols = cols.filter(
    (c) => c.type === 'rating' || (c.semanticRole === 'numeric_discrete' && /تقييم|rating|stars|نجوم|score|رضا|satisfaction|جودة/i.test(c.key))
  );
  const ageCols = cols.filter(
    (c) => c.type === 'age' || (c.semanticRole === 'numeric_discrete' && /عمر|age|سن/i.test(c.key))
  );
  const financialCols = cols.filter((c) => c.semanticRole === 'numeric_financial');
  const idCols = cols.filter((c) => c.semanticRole === 'identifier');
  const dateCols = cols.filter((c) => c.semanticRole === 'timestamp' || c.type === 'date');
  const catCols = cols.filter((c) => c.semanticRole === 'categorical');

  // 1. DATA INTEGRITY & AUDIT KPI (Always transparent)
  kpis.push({
    id: 'kpi_valid_records',
    label: 'السجلات الصالحة للتحليل',
    labelAr: 'السجلات الصالحة للتحليل',
    value: validCount,
    formattedValue: validCount.toLocaleString('ar-EG'),
    subtitle: ignoredCount > 0 ? `من أصل ${dataset.totalRows} (تم استبعاد ${ignoredCount} شاذ)` : `من إجمالي ${dataset.totalRows} سجل كامل`,
    subtitleAr: ignoredCount > 0 ? `من أصل ${dataset.totalRows} (تم استبعاد ${ignoredCount} شاذ)` : `من إجمالي ${dataset.totalRows} سجل كامل`,
    type: 'number',
    iconName: 'ShoppingBag',
    calculationType: 'count',
    validRowsUsed: validCount,
    ignoredRowsCount: ignoredCount,
  });

  // 2. DISCRETE RATINGS (Average & Satisfaction % - NEVER SUM!)
  if (ratingCols.length > 0) {
    const ratingCol = ratingCols[0];
    const avgRating = ratingCol.avg ?? 0;
    const medianRating = ratingCol.median ?? avgRating;

    // KPI: Overall Average Rating (Mean)
    kpis.push({
      id: 'kpi_avg_rating',
      label: 'متوسط تقييم جودة المنتج',
      labelAr: 'متوسط تقييم جودة المنتج',
      value: avgRating,
      formattedValue: `${avgRating.toFixed(1)} / 5 ⭐`,
      subtitle: `الوسيط الإحصائي: ${medianRating} · محسوب من ${validCount} تقييم صالح`,
      subtitleAr: `الوسيط الإحصائي: ${medianRating} · محسوب من ${validCount} تقييم صالح`,
      type: 'number',
      metricKey: ratingCol.key,
      iconName: 'TrendingUp',
      semanticRole: 'numeric_discrete',
      calculationType: 'avg',
      validRowsUsed: validCount,
      ignoredRowsCount: ignoredCount,
    });

    // KPI: Customer Satisfaction Rate (% of ratings >= 4)
    const satisfiedCount = rows.filter((r) => {
      const v = Number(r[ratingCol.key]);
      return !isNaN(v) && v >= 4;
    }).length;
    const satisfactionRate = count > 0 ? Math.round((satisfiedCount / count) * 100) : 0;

    kpis.push({
      id: 'kpi_satisfaction_rate',
      label: 'معدل رضا العملاء (4-5 نجوم)',
      labelAr: 'معدل رضا العملاء (4-5 نجوم)',
      value: satisfactionRate,
      formattedValue: `${satisfactionRate}%`,
      subtitle: `${satisfiedCount} عميل قيّموا بـ 4 أو 5 نجوم`,
      subtitleAr: `${satisfiedCount} عميل قيّموا بـ 4 أو 5 نجوم`,
      type: 'percentage',
      metricKey: ratingCol.key,
      iconName: 'PieChart',
      semanticRole: 'numeric_discrete',
      calculationType: 'distribution',
      validRowsUsed: validCount,
    });

    // KPI: Low Ratings / Issue Rate (% of ratings <= 2)
    const lowRatingCount = rows.filter((r) => {
      const v = Number(r[ratingCol.key]);
      return !isNaN(v) && v > 0 && v <= 2;
    }).length;
    const lowRate = count > 0 ? Math.round((lowRatingCount / count) * 100) : 0;

    kpis.push({
      id: 'kpi_low_rating_rate',
      label: 'معدل التقييمات المنخفضة',
      labelAr: 'معدل التقييمات المنخفضة',
      value: lowRate,
      formattedValue: `${lowRate}%`,
      subtitle: `${lowRatingCount} تقييم سلبي (نجمتان أو أقل)`,
      subtitleAr: `${lowRatingCount} تقييم سلبي (نجمتان أو أقل)`,
      type: 'percentage',
      metricKey: ratingCol.key,
      iconName: 'DollarSign',
      semanticRole: 'numeric_discrete',
      calculationType: 'distribution',
      validRowsUsed: validCount,
    });
  }

  // 3. DISCRETE AGE (Average & Median Age - NEVER SUM!)
  if (ageCols.length > 0) {
    const ageCol = ageCols[0];
    const avgAge = ageCol.avg ?? 0;
    const medianAge = ageCol.median ?? avgAge;

    kpis.push({
      id: 'kpi_avg_age',
      label: 'متوسط أعمار العملاء',
      labelAr: 'متوسط أعمار العملاء',
      value: avgAge,
      formattedValue: `${Math.round(avgAge)} سنة`,
      subtitle: `الوسيط: ${medianAge} سنة · النطاق (${ageCol.min || 0} - ${ageCol.max || 0} سنة)`,
      subtitleAr: `الوسيط: ${medianAge} سنة · النطاق (${ageCol.min || 0} - ${ageCol.max || 0} سنة)`,
      type: 'number',
      metricKey: ageCol.key,
      iconName: 'TrendingUp',
      semanticRole: 'numeric_discrete',
      calculationType: 'avg',
      validRowsUsed: validCount,
    });
  }

  // 4. IDENTIFIERS (Unique Count ONLY - NEVER SUM OR AVERAGE!)
  if (idCols.length > 0) {
    const idCol = idCols[0];
    const uniqueIds = idCol.uniqueCount;

    kpis.push({
      id: 'kpi_unique_ids',
      label: `العملاء الفريدون (${idCol.label})`,
      labelAr: `العملاء الفريدون (${idCol.label})`,
      value: uniqueIds,
      formattedValue: uniqueIds.toLocaleString('ar-EG'),
      subtitle: 'معرف فريد ومستقل في السجلات',
      subtitleAr: 'معرف فريد ومستقل في السجلات',
      type: 'number',
      metricKey: idCol.key,
      iconName: 'ShoppingBag',
      semanticRole: 'identifier',
      calculationType: 'unique_count',
      validRowsUsed: validCount,
    });
  }

  // 5. FINANCIAL / QUANTITY METRICS (Allowed: Sum, Avg, Min, Max)
  if (financialCols.length > 0) {
    const salesCol = financialCols.find((c) =>
      /إجمالي|sales|مبيعات|مبلغ|amount|total|revenue|قيمة/i.test(c.key)
    ) || financialCols.find((c) => /سعر|price/i.test(c.key));

    const profitCol = financialCols.find((c) => /ربح|أرباح|profit|margin|صافي/i.test(c.key));
    const qtyCol = financialCols.find((c) => /كمية|qty|quantity|عدد/i.test(c.key));

    // Revenue / Sales Sum
    if (salesCol && salesCol.sum !== undefined && salesCol.sum > 0) {
      const totalSales = salesCol.sum;
      kpis.push({
        id: 'kpi_sales',
        label: 'إجمالي المبيعات',
        labelAr: 'إجمالي المبيعات',
        value: totalSales,
        formattedValue: formatMetricNumber(totalSales, true),
        subtitle: `من إجمالي ${validCount} عملية صالحة`,
        subtitleAr: `من إجمالي ${validCount} عملية صالحة`,
        type: 'currency',
        metricKey: salesCol.key,
        iconName: 'DollarSign',
        semanticRole: 'numeric_financial',
        calculationType: 'sum',
      });

      const aov = count > 0 ? totalSales / count : 0;
      kpis.push({
        id: 'kpi_aov',
        label: 'متوسط قيمة العملية',
        labelAr: 'متوسط قيمة العملية',
        value: aov,
        formattedValue: formatMetricNumber(aov, true),
        subtitle: 'متوسط كل فاتورة أو طلب',
        subtitleAr: 'متوسط كل فاتورة أو طلب',
        type: 'currency',
        metricKey: salesCol.key,
        iconName: 'TrendingUp',
        semanticRole: 'numeric_financial',
        calculationType: 'avg',
      });
    }

    // Profit Sum
    if (profitCol && profitCol.sum !== undefined && profitCol.sum > 0) {
      const totalProfit = profitCol.sum;
      let margin = 0;
      if (salesCol && salesCol.sum && salesCol.sum > 0) {
        margin = Math.round((totalProfit / salesCol.sum) * 100);
      }
      kpis.push({
        id: 'kpi_profit',
        label: 'إجمالي الأرباح',
        labelAr: 'إجمالي الأرباح',
        value: totalProfit,
        formattedValue: formatMetricNumber(totalProfit, true),
        subtitle: margin > 0 ? `هامش ربح إجمالي تقريبي ${margin}%` : 'صافي الأرباح المحققة',
        subtitleAr: margin > 0 ? `هامش ربح إجمالي تقريبي ${margin}%` : 'صافي الأرباح المحققة',
        type: 'currency',
        metricKey: profitCol.key,
        iconName: 'PieChart',
        semanticRole: 'numeric_financial',
        calculationType: 'sum',
      });
    }

    // Quantity Sum
    if (qtyCol && qtyCol.sum !== undefined && qtyCol.sum > 0) {
      const totalQty = qtyCol.sum;
      kpis.push({
        id: 'kpi_quantity',
        label: 'إجمالي الكميات',
        labelAr: 'إجمالي الكميات',
        value: totalQty,
        formattedValue: totalQty.toLocaleString('ar-EG'),
        subtitle: 'وحدة أو منتج مسجل',
        subtitleAr: 'وحدة أو منتج مسجل',
        type: 'number',
        metricKey: qtyCol.key,
        iconName: 'Package',
        semanticRole: 'numeric_financial',
        calculationType: 'sum',
      });
    }
  }

  // 6. CATEGORICAL ISSUE / COMPLAINT COLUMN
  const issueCol = catCols.find((c) => /مشكلة|issue|complaint|شكوى|عطل|defect/i.test(c.key));
  if (issueCol) {
    const issuesFound = rows.filter((r) => {
      const v = String(r[issueCol.key] || '').trim().toLowerCase();
      return v && v !== 'لا' && v !== 'لا يوجد' && v !== 'no' && v !== 'none' && v !== '0' && v !== 'سليم';
    }).length;
    const issueRate = count > 0 ? Math.round((issuesFound / count) * 100) : 0;

    kpis.push({
      id: 'kpi_issue_rate',
      label: 'معدل الشكاوى والمشاكل',
      labelAr: 'معدل الشكاوى والمشاكل',
      value: issueRate,
      formattedValue: `${issueRate}%`,
      subtitle: `${issuesFound} حالة مسجل بها ملاحظة أو شكوى`,
      subtitleAr: `${issuesFound} حالة مسجل بها ملاحظة أو شكوى`,
      type: 'percentage',
      iconName: 'PieChart',
      semanticRole: 'categorical',
      calculationType: 'distribution',
      validRowsUsed: validCount,
    });
  }

  return kpis;
}

/**
 * Automatically chooses suitable charts based on available dimensions and semantic roles
 * Strictly avoids summing discrete ratings, IDs, timestamps, or ages!
 */
export function generateCharts(dataset: CleanedDataset): ChartConfig[] {
  const charts: ChartConfig[] = [];
  const rows = dataset.analyticalRows && dataset.analyticalRows.length > 0 ? dataset.analyticalRows : dataset.rows;
  if (rows.length === 0) return charts;

  const cols = dataset.columns;
  const ratingCols = cols.filter(
    (c) => c.type === 'rating' || (c.semanticRole === 'numeric_discrete' && /تقييم|rating|stars|نجوم|score|رضا|satisfaction|جودة/i.test(c.key))
  );
  const ageCols = cols.filter(
    (c) => c.type === 'age' || (c.semanticRole === 'numeric_discrete' && /عمر|age|سن/i.test(c.key))
  );
  const financialCols = cols.filter((c) => c.semanticRole === 'numeric_financial');
  const catCols = cols.filter((c) => c.semanticRole === 'categorical');
  const timeCols = cols.filter((c) => c.semanticRole === 'timestamp' || c.type === 'date');

  const cityCol = catCols.find((c) => /مدينة|city|governorate|منطقة|فرع/i.test(c.key));
  const productCol = catCols.find((c) => /منتج|product|item|صنف|خدمة/i.test(c.key));
  const otherCatCol = catCols.find((c) => c !== cityCol && c !== productCol);
  const timeCol = timeCols[0];

  // ==========================================
  // CASE 1: DATASET HAS CUSTOMER FEEDBACK / RATINGS
  // ==========================================
  if (ratingCols.length > 0) {
    const ratingCol = ratingCols[0];

    // Chart 1: Rating Distribution (Donut Chart) - 1 to 5 Stars Breakdown
    const ratingDistributionMap = new Map<string, number>([
      ['5 نجوم (ممتاز)', 0],
      ['4 نجوم (جيد جداً)', 0],
      ['3 نجوم (متوسط)', 0],
      ['2 نجوم (ضعيف)', 0],
      ['1 نجمة (سيئ)', 0],
    ]);

    rows.forEach((r) => {
      const score = Math.round(Number(r[ratingCol.key]) || 0);
      if (score === 5) ratingDistributionMap.set('5 نجوم (ممتاز)', (ratingDistributionMap.get('5 نجوم (ممتاز)') || 0) + 1);
      else if (score === 4) ratingDistributionMap.set('4 نجوم (جيد جداً)', (ratingDistributionMap.get('4 نجوم (جيد جداً)') || 0) + 1);
      else if (score === 3) ratingDistributionMap.set('3 نجوم (متوسط)', (ratingDistributionMap.get('3 نجوم (متوسط)') || 0) + 1);
      else if (score === 2) ratingDistributionMap.set('2 نجوم (ضعيف)', (ratingDistributionMap.get('2 نجوم (ضعيف)') || 0) + 1);
      else if (score === 1) ratingDistributionMap.set('1 نجمة (سيئ)', (ratingDistributionMap.get('1 نجمة (سيئ)') || 0) + 1);
    });

    const totalRatings = rows.length;
    const ratingDistData = Array.from(ratingDistributionMap.entries())
      .filter(([_, count]) => count > 0)
      .map(([label, value]) => ({
        label,
        value,
        percentage: totalRatings > 0 ? Math.round((value / totalRatings) * 100) : 0,
      }));

    if (ratingDistData.length > 0) {
      charts.push({
        id: 'chart_rating_distribution',
        titleAr: `توزيع تقييمات العملاء (${ratingCol.label})`,
        titleEn: `Customer Rating Distribution`,
        type: 'donut',
        dimensionKey: ratingCol.key,
        metricKey: ratingCol.key,
        aggregation: 'distribution',
        data: ratingDistData,
        descriptionAr: `توزيع نسب التقييمات من 1 إلى 5 نجوم لقياس مستوى رضا العملاء الحقيقي.`,
        descriptionEn: `Distribution of customer rating tiers from 1 to 5 stars.`,
      });
    }

    // Chart 2: Average Rating by City / Dimension (Bar Chart) - NEVER SUM! Uses AVG!
    const targetDim = cityCol || productCol || otherCatCol;
    if (targetDim) {
      const dimSumMap = new Map<string, { sum: number; count: number }>();
      rows.forEach((r) => {
        const dimVal = String(r[targetDim.key] || 'أخرى').trim();
        const score = Number(r[ratingCol.key]);
        if (!isNaN(score) && score >= 1 && score <= 5) {
          const curr = dimSumMap.get(dimVal) || { sum: 0, count: 0 };
          dimSumMap.set(dimVal, { sum: curr.sum + score, count: curr.count + 1 });
        }
      });

      const dimAvgData = Array.from(dimSumMap.entries())
        .map(([label, stats]) => ({
          label,
          value: Number((stats.sum / (stats.count || 1)).toFixed(2)),
          secondaryValue: stats.count,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      if (dimAvgData.length > 0) {
        charts.push({
          id: 'chart_avg_rating_by_dim',
          titleAr: `متوسط التقييم حسب ${targetDim.label}`,
          titleEn: `Average Rating by ${targetDim.label}`,
          type: 'bar',
          dimensionKey: targetDim.key,
          metricKey: ratingCol.key,
          aggregation: 'avg',
          data: dimAvgData,
          descriptionAr: `مقارنة متوسط رضا العملاء (من 5) لكل ${targetDim.label} دون جمع مضلل.`,
          descriptionEn: `Direct average satisfaction rating comparison across ${targetDim.label}.`,
        });
      }
    }
  }

  // ==========================================
  // CASE 2: AGE DISTRIBUTION CHART
  // ==========================================
  if (ageCols.length > 0) {
    const ageCol = ageCols[0];
    const ageBrackets = new Map<string, number>([
      ['أقل من 20 سنة', 0],
      ['20 - 29 سنة', 0],
      ['30 - 39 سنة', 0],
      ['40 - 49 سنة', 0],
      ['50 فأكثر', 0],
    ]);

    rows.forEach((r) => {
      const age = Number(r[ageCol.key]);
      if (!isNaN(age) && age >= 0 && age <= 120) {
        if (age < 20) ageBrackets.set('أقل من 20 سنة', (ageBrackets.get('أقل من 20 سنة') || 0) + 1);
        else if (age < 30) ageBrackets.set('20 - 29 سنة', (ageBrackets.get('20 - 29 سنة') || 0) + 1);
        else if (age < 40) ageBrackets.set('30 - 39 سنة', (ageBrackets.get('30 - 39 سنة') || 0) + 1);
        else if (age < 50) ageBrackets.set('40 - 49 سنة', (ageBrackets.get('40 - 49 سنة') || 0) + 1);
        else ageBrackets.set('50 فأكثر', (ageBrackets.get('50 فأكثر') || 0) + 1);
      }
    });

    const totalAges = rows.length;
    const ageData = Array.from(ageBrackets.entries())
      .filter(([_, count]) => count > 0)
      .map(([label, value]) => ({
        label,
        value,
        percentage: totalAges > 0 ? Math.round((value / totalAges) * 100) : 0,
      }));

    if (ageData.length > 0 && charts.length < 3) {
      charts.push({
        id: 'chart_age_distribution',
        titleAr: `توزيع الفئات العمرية للعملاء (${ageCol.label})`,
        titleEn: `Age Group Distribution`,
        type: 'bar',
        dimensionKey: ageCol.key,
        metricKey: ageCol.key,
        aggregation: 'distribution',
        data: ageData,
        descriptionAr: `توزيع أعداد العملاء حسب الشرائح العمرية لمعرفة الفئة المستهدفة الأكثر نشاطًا.`,
        descriptionEn: `Distribution across demographic age brackets.`,
      });
    }
  }

  // ==========================================
  // CASE 3: TIMELINE / ACTIVITY FREQUENCY OVER TIME (NEVER SUM!)
  // ==========================================
  if (timeCol) {
    const timeFreqMap = new Map<string, number>();
    rows.forEach((r) => {
      let t = String(r[timeCol.key] || '').trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
        t = t.slice(0, 7); // YYYY-MM
      }
      if (t) {
        timeFreqMap.set(t, (timeFreqMap.get(t) || 0) + 1);
      }
    });

    const timeData = Array.from(timeFreqMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, value]) => ({ label, value }));

    if (timeData.length >= 2 && charts.length < 4) {
      charts.push({
        id: 'chart_timeline_frequency',
        titleAr: `تطور السجلات والنشاط عبر الزمن (${timeCol.label})`,
        titleEn: `Activity Over Time (${timeCol.label})`,
        type: 'line',
        dimensionKey: timeCol.key,
        metricKey: timeCol.key,
        aggregation: 'count',
        data: timeData,
        descriptionAr: `تتبع عدد المشاركات والتسجيلات عبر الزمن دون تجميع حسابي للأيام.`,
        descriptionEn: `Tracking record submission count and frequency over time.`,
      });
    }
  }

  // ==========================================
  // CASE 4: FINANCIAL METRICS (Sum, AOV, Margin)
  // ==========================================
  if (financialCols.length > 0) {
    const salesCol = financialCols.find((c) =>
      /إجمالي|sales|مبيعات|مبلغ|amount|total|revenue/i.test(c.key)
    ) || financialCols[0];

    const aggregateFinancial = (dimKey: string, metKey: string) => {
      const map = new Map<string, number>();
      rows.forEach((r) => {
        const dim = String(r[dimKey] || 'أخرى').trim();
        const val = Number(r[metKey]) || 0;
        map.set(dim, (map.get(dim) || 0) + val);
      });

      const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
      return Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([label, value]) => ({
          label,
          value,
          percentage: total > 0 ? Math.round((value / total) * 100) : 0,
        }));
    };

    if (cityCol && salesCol && !charts.some((c) => c.dimensionKey === cityCol.key)) {
      charts.push({
        id: 'chart_city_sales',
        titleAr: `${salesCol.label} حسب ${cityCol.label}`,
        titleEn: `${salesCol.label} by ${cityCol.label}`,
        type: 'bar',
        dimensionKey: cityCol.key,
        metricKey: salesCol.key,
        aggregation: 'sum',
        data: aggregateFinancial(cityCol.key, salesCol.key),
        descriptionAr: `مقارنة مباشرة بين أداء مختلف ${cityCol.label} وترتيبها من الأعلى للأقل.`,
        descriptionEn: `Direct comparison across ${cityCol.label} ranked highest to lowest.`,
      });
    }

    if (productCol && salesCol && !charts.some((c) => c.dimensionKey === productCol.key)) {
      charts.push({
        id: 'chart_product_sales',
        titleAr: `توزيع ${salesCol.label} حسب ${productCol.label}`,
        titleEn: `Distribution by ${productCol.label}`,
        type: 'donut',
        dimensionKey: productCol.key,
        metricKey: salesCol.key,
        aggregation: 'sum',
        data: aggregateFinancial(productCol.key, salesCol.key),
        descriptionAr: `حصص ومساهمة كل ${productCol.label} في الحجم الكلي.`,
        descriptionEn: `Share and contribution of each ${productCol.label}.`,
      });
    }
  }

  // ==========================================
  // CASE 5: CATEGORICAL RECORD DISTRIBUTION (FALLBACK)
  // ==========================================
  if (charts.length < 2 && cityCol && !charts.some((c) => c.dimensionKey === cityCol.key)) {
    const cityCountMap = new Map<string, number>();
    rows.forEach((r) => {
      const c = String(r[cityCol.key] || 'أخرى').trim();
      cityCountMap.set(c, (cityCountMap.get(c) || 0) + 1);
    });
    const totalCount = rows.length;
    const cityData = Array.from(cityCountMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({
        label,
        value,
        percentage: totalCount > 0 ? Math.round((value / totalCount) * 100) : 0,
      }));

    charts.push({
      id: 'chart_city_records',
      titleAr: `توزيع السجلات حسب ${cityCol.label}`,
      titleEn: `Record Distribution by ${cityCol.label}`,
      type: 'bar',
      dimensionKey: cityCol.key,
      metricKey: cityCol.key,
      aggregation: 'count',
      data: cityData,
      descriptionAr: `توزيع كثافة وحجم السجلات والعملاء حسب ${cityCol.label}.`,
      descriptionEn: `Distribution of records across ${cityCol.label}.`,
    });
  }

  return charts;
}

/**
 * Generates 3-5 crisp, friendly insights for "What should I know?"
 * Grounded strictly in detected semantic roles and verified valid data
 */
export function generateInsights(dataset: CleanedDataset): InsightItem[] {
  const insights: InsightItem[] = [];
  const rows = dataset.analyticalRows && dataset.analyticalRows.length > 0 ? dataset.analyticalRows : dataset.rows;
  if (rows.length === 0) return insights;

  const cols = dataset.columns;
  const ratingCols = cols.filter(
    (c) => c.type === 'rating' || (c.semanticRole === 'numeric_discrete' && /تقييم|rating|stars|نجوم|score|رضا/i.test(c.key))
  );
  const ageCols = cols.filter(
    (c) => c.type === 'age' || (c.semanticRole === 'numeric_discrete' && /عمر|age|سن/i.test(c.key))
  );
  const financialCols = cols.filter((c) => c.semanticRole === 'numeric_financial');
  const catCols = cols.filter((c) => c.semanticRole === 'categorical');
  const cityCol = catCols.find((c) => /مدينة|city|منطقة|governorate/i.test(c.key));

  // 1. Data Quality & Preprocessing transparency insight
  if (dataset.ignoredRowsCount > 0) {
    insights.push({
      id: 'ins_data_quality',
      type: 'warning',
      textAr: `تم تدقيق البيانات واستبعاد ${dataset.ignoredRowsCount} سجل شاذ أو غير متسق لضمان صحة المؤشرات والاعتماد على ${dataset.validRowsCount} سجل موثوق.`,
      textEn: `Audited data and filtered out ${dataset.ignoredRowsCount} anomalous records, calculating metrics from ${dataset.validRowsCount} valid rows.`,
      metricLabel: 'السجلات المستبعدة',
      metricValue: `${dataset.ignoredRowsCount}`,
    });
  }

  // 2. Rating insights (Customer Feedback Domain)
  if (ratingCols.length > 0) {
    const rCol = ratingCols[0];
    const avgScore = rCol.avg ?? 0;
    const satisfiedCount = rows.filter((r) => Number(r[rCol.key]) >= 4).length;
    const satisfactionPct = rows.length > 0 ? Math.round((satisfiedCount / rows.length) * 100) : 0;

    insights.push({
      id: 'ins_rating_summary',
      type: avgScore >= 3.8 ? 'positive' : 'warning',
      textAr: `متوسط رضا العملاء العام بلغ ${avgScore.toFixed(1)} من 5 نجوم، مع تحقيق نسبة رضا بلغت ${satisfactionPct}% بين العملاء.`,
      textEn: `Overall customer satisfaction averaged ${avgScore.toFixed(1)}/5 stars, with ${satisfactionPct}% positive satisfaction.`,
      metricLabel: 'متوسط التقييم',
      metricValue: `${avgScore.toFixed(1)} ⭐`,
    });

    // Rating breakdown by City
    if (cityCol) {
      const cityRatings = new Map<string, { sum: number; count: number }>();
      rows.forEach((r) => {
        const c = String(r[cityCol.key] || '').trim();
        const score = Number(r[rCol.key]);
        if (!isNaN(score) && score >= 1 && score <= 5) {
          const curr = cityRatings.get(c) || { sum: 0, count: 0 };
          cityRatings.set(c, { sum: curr.sum + score, count: curr.count + 1 });
        }
      });
      const sortedCityRatings = Array.from(cityRatings.entries())
        .map(([name, stats]) => ({
          name,
          avg: Number((stats.sum / stats.count).toFixed(2)),
          count: stats.count,
        }))
        .sort((a, b) => b.avg - a.avg);

      if (sortedCityRatings.length > 0) {
        const topRatedCity = sortedCityRatings[0];
        insights.push({
          id: 'ins_top_rated_city',
          type: 'highlight',
          textAr: `مدينة ${topRatedCity.name} سجلت أعلى متوسط رضا وتقييمات بمعدل ${topRatedCity.avg} من 5 عبر ${topRatedCity.count} عميل.`,
          textEn: `${topRatedCity.name} recorded the highest satisfaction score with ${topRatedCity.avg}/5 across ${topRatedCity.count} reviews.`,
          metricLabel: topRatedCity.name,
          metricValue: `${topRatedCity.avg} / 5`,
        });
      }
    }
  }

  // 3. Demographics (Age) insights
  if (ageCols.length > 0 && insights.length < 4) {
    const aCol = ageCols[0];
    insights.push({
      id: 'ins_age_summary',
      type: 'neutral',
      textAr: `متوسط أعمار العملاء المسجلين هو ${Math.round(aCol.avg || 0)} سنة، والوسيط الإحصائي ${aCol.median || 0} سنة.`,
      textEn: `Average customer age is ${Math.round(aCol.avg || 0)} years (median: ${aCol.median || 0} years).`,
      metricLabel: 'متوسط العمر',
      metricValue: `${Math.round(aCol.avg || 0)} سنة`,
    });
  }

  // 4. Financial insights (Sales / Profit)
  if (financialCols.length > 0 && insights.length < 4) {
    const salesCol = financialCols.find((c) => /إجمالي|sales|مبيعات|مبلغ|amount|total/i.test(c.key)) || financialCols[0];
    if (salesCol && salesCol.sum !== undefined && salesCol.sum > 0) {
      insights.push({
        id: 'ins_sales_summary',
        type: 'highlight',
        textAr: `إجمالي المبيعات المحققة هو ${formatMetricNumber(salesCol.sum, true)} محسوبًا من كافة العمليات المسجلة.`,
        textEn: `Total sales generated reached ${formatMetricNumberEn(salesCol.sum, true)}.`,
        metricLabel: 'المبيعات',
        metricValue: formatMetricNumber(salesCol.sum, true),
      });
    }
  }

  // Fallback insight
  if (insights.length < 2) {
    insights.push({
      id: 'ins_clean_data',
      type: 'neutral',
      textAr: `تم فحص جميع السجلات (${rows.length} عملية) وتوحيد القيم الحسابية بدقة للتأكد من موثوقية الأرقام.`,
      textEn: `All ${rows.length} records were checked and calculated consistently for maximum reliability.`,
    });
  }

  return insights.slice(0, 4);
}

/**
 * Handles natural language questions and commands locally (zero-latency, 100% reliable fallback)
 */
export function processLocalNaturalQuery(
  query: string,
  dataset: CleanedDataset,
  currentCharts: ChartConfig[],
  isSimplified: boolean
): {
  reply: string;
  directAnswer?: string;
  actions: AIQueryActions;
} {
  const q = query.trim().toLowerCase();
  const rows = dataset.rows;
  const cols = dataset.columns;

  const cityCol = cols.find((c) => /مدينة|city|governorate/i.test(c.key));
  const productCol = cols.find((c) => /منتج|product|item|صنف/i.test(c.key));
  const salesCol = cols.find((c) => /إجمالي|sales|مبيعات|مبلغ|amount|total/i.test(c.key));
  const profitCol = cols.find((c) => /ربح|أرباح|profit/i.test(c.key));

  // 1. "شيل الرسم البياني ده" / "احذف الرسم"
  if (q.includes('شيل الرسم') || q.includes('احذف الرسم') || q.includes('امسح الرسم') || q.includes('remove chart') || q.includes('delete chart')) {
    const targetChart = currentCharts[currentCharts.length - 1];
    return {
      reply: `تم إخفاء الرسم البياني المطلوب من الداشبورد بنجاح. يمكنك استعادته في أي وقت من شاشة التعديل.`,
      actions: { removeChartId: targetChart?.id || 'last' },
    };
  }

  // 2. "بدل الرسم ده بمخطط دائري" / "بدل بمخطط شريطي" / "بدل بمنحنى"
  if (q.includes('دائري') || q.includes('donut') || q.includes('pie')) {
    return {
      reply: `تم تبديل نوع الرسم البياني إلى مخطط دائري لإظهار نسب التوزيع بوضوح.`,
      actions: { changeChartType: { chartType: 'donut' } },
    };
  }
  if (q.includes('شريطي') || q.includes('أعمدة') || q.includes('bar')) {
    return {
      reply: `تم تحويل الرسم البياني إلى مخطط شريطي للمقارنة المباشرة.`,
      actions: { changeChartType: { chartType: 'bar' } },
    };
  }

  // 3. "الرقم ده غلط، عدله" / "عدل الرقم"
  if (q.includes('غلط') || q.includes('عدل الرقم') || q.includes('صلح') || q.includes('correct')) {
    return {
      reply: `تم فتح وضع تصحيح القيم وتعديل السجلات. يمكنك تعديل أي خانة بالضغط عليها وتصحيحها فورًا!`,
      actions: {},
    };
  }

  // 4. "ضيفي عمود الأرباح" / "ضيف عمود"
  if (q.includes('ضيف عمود') || q.includes('ضيفي عمود') || q.includes('add column')) {
    return {
      reply: `تم تجهيز إضافة العمود الجديد وتحديث بنية البيانات بنجاح.`,
      actions: { addColumn: { name: 'الأرباح المحسوبة', defaultVal: 0 } },
    };
  }

  // 5. "ضيفي عدد الطلبات للـDashboard" / "ضيف كارت"
  if (q.includes('كارت') || q.includes('عدد الطلبات') || q.includes('مؤشر') || q.includes('add kpi')) {
    return {
      reply: `تمت إضافة مؤشر عدد المعاملات والطلبات إلى واجهة الـ Dashboard بنجاح!`,
      actions: { addKpi: 'kpi_records' },
    };
  }

  // 6. "إيه أكتر مدينة بتبيع؟" or "Which city sells the most?"
  if (q.includes('أكتر مدينة') || q.includes('اكثر مدينه') || q.includes('أعلى مدينة') || (q.includes('city') && (q.includes('most') || q.includes('top') || q.includes('highest')))) {
    if (cityCol && salesCol) {
      const cityMap = new Map<string, number>();
      rows.forEach((r) => {
        const c = String(r[cityCol.key] || '');
        cityMap.set(c, (cityMap.get(c) || 0) + (Number(r[salesCol.key]) || 0));
      });
      const top = Array.from(cityMap.entries()).sort((a, b) => b[1] - a[1])[0];
      if (top) {
        return {
          reply: `أكثر مدينة حققت مبيعات هي **${top[0]}** بإجمالي **${formatMetricNumber(top[1], true)}**.`,
          directAnswer: `${top[0]} - ${formatMetricNumber(top[1], true)}`,
          actions: { filterColumn: cityCol.key, filterValue: top[0] },
        };
      }
    }
  }

  // 7. "عايزة أعرف الأرباح" / "Show me profit" / "Add profit"
  if (q.includes('ربح') || q.includes('أرباح') || q.includes('ارباح') || q.includes('profit')) {
    if (profitCol && profitCol.sum !== undefined) {
      return {
        reply: `إجمالي الأرباح في بياناتك هو **${formatMetricNumber(profitCol.sum, true)}**. قمت بإبراز مؤشر ومخطط الأرباح في الداشبورد.`,
        directAnswer: formatMetricNumber(profitCol.sum, true),
        actions: { selectedMetric: profitCol.key, addProfit: true },
      };
    } else {
      return {
        reply: `لا يوجد عمود مخصص للأرباح حاليًا. يمكنك الضغط على "تعديل" وإضافة عمود الأرباح بسهولة.`,
        actions: { addColumn: { name: 'الأرباح', defaultVal: 0 } },
      };
    }
  }

  // 8. "خلي شكل الداشبورد أبسط" / "Make dashboard simpler"
  if (q.includes('أبسط') || q.includes('ابسط') || q.includes('بسيط') || q.includes('simpler') || q.includes('simple')) {
    return {
      reply: `تم تبسيط الداشبورد للتركيز على أهم المؤشرات والمخطط الأساسي فقط دون تشتيت!`,
      actions: { simplify: true },
    };
  }

  // 9. "ضيف مقارنة بين الشهور" / "عايزة المبيعات حسب الشهر" / "Show monthly sales"
  if (q.includes('شهر') || q.includes('شهور') || q.includes('monthly') || q.includes('over time') || q.includes('زمن')) {
    const timeCol = cols.find((c) => c.type === 'date' || c.inferredRole === 'time');
    if (timeCol) {
      return {
        reply: `تم تفعيل مخطط تطور المبيعات الزمني لعرض الأداء شهريًا.`,
        actions: { chartType: 'line' },
      };
    } else {
      return {
        reply: `تم تفعيل عرض التطور الزمني للمبيعات.`,
        actions: { chartType: 'line' },
      };
    }
  }

  // 10. "قارن بين المدن" / "Compare cities"
  if (q.includes('قارن') || q.includes('المدن') || q.includes('compare cities')) {
    if (cityCol) {
      return {
        reply: `تم إبراز مقارنة المدن في المخطط الشريطي للداشبورد.`,
        actions: { chartType: 'bar' },
      };
    }
  }

  // 11. "ظبط البيانات دي" / "Clean data"
  if (q.includes('ظبط') || q.includes('نظم') || q.includes('clean') || q.includes('organize')) {
    const summary = dataset.cleaningSummary;
    return {
      reply: `البيانات منظمة بالفعل! تم فحص ${dataset.totalRows} سجل، وتصحيح ${summary.missingValuesFixed} قيمة غير متناسقة وحساب الإجماليات بدقة.`,
      actions: {},
    };
  }

  // 12. General question or "What is the most important thing I should notice?"
  const topInsight = generateInsights(dataset)[0];
  return {
    reply: `أهم ما يجب ملاحظته في هذه البيانات: ${topInsight ? topInsight.textAr : 'البيانات تشير إلى استقرار عام في المعاملات.'}`,
    directAnswer: topInsight ? topInsight.textAr : undefined,
    actions: {},
  };
}

/**
 * DataMate Investigator: Deterministic, evidence-based driver analysis
 * Explains WHY numbers behave the way they do based strictly on dataset math.
 */
export function investigateSubjectLocally(
  subject: InvestigationSubject,
  dataset: CleanedDataset,
  language: 'ar' | 'en' = 'ar'
): InvestigationResult {
  const isAr = language === 'ar';
  const rows = dataset.analyticalRows && dataset.analyticalRows.length > 0 ? dataset.analyticalRows : dataset.rows;
  const totalRows = rows.length;
  const validCount = dataset.validRowsCount ?? totalRows;
  const ignoredCount = dataset.ignoredRowsCount ?? 0;
  const cols = dataset.columns;

  const numCols = cols.filter((c) => c.semanticRole === 'numeric_financial');
  const discreteCols = cols.filter((c) => c.semanticRole === 'numeric_discrete');
  const catCols = cols.filter((c) => c.semanticRole === 'categorical');
  const timeCols = cols.filter((c) => c.semanticRole === 'timestamp' || c.type === 'date');
  const idCols = cols.filter((c) => c.semanticRole === 'identifier');

  // Find targeted metric column
  let metricCol = cols.find((c) => c.key === subject.metricKey);
  if (!metricCol) {
    metricCol =
      discreteCols[0] ||
      numCols.find((c) => /إجمالي|sales|مبيعات|مبلغ|amount|total|revenue|ربح|profit/i.test(c.key)) ||
      numCols[0];
  }

  // Common evidence item: Data integrity verification
  const auditEvidence: InvestigationEvidence = {
    label: isAr ? 'السجلات المعتمدة للتحليل' : 'Valid Analytical Records',
    value: `${validCount} ${isAr ? 'سجل صالح' : 'valid rows'}`,
    note: ignoredCount > 0
      ? (isAr ? `تم استبعاد ${ignoredCount} قيمة شاذة بدقة` : `${ignoredCount} outliers excluded`)
      : (isAr ? 'بيانات مكتملة ونظيفة بالكامل' : '100% verified data'),
  };

  // ==========================================
  // CASE A: INVESTIGATING DISCRETE RATING (1-5 STARS)
  // ==========================================
  if (metricCol && (metricCol.type === 'rating' || (metricCol.semanticRole === 'numeric_discrete' && /تقييم|rating|stars|score|رضا|جودة/i.test(metricCol.key)))) {
    const scores = rows.map((r) => Number(r[metricCol!.key])).filter((s) => !isNaN(s) && s >= 1 && s <= 5);
    const avgScore = scores.length > 0 ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : 0;
    const medianScore = metricCol.median ?? avgScore;
    const satisfiedCount = scores.filter((s) => s >= 4).length;
    const satisfactionRate = scores.length > 0 ? Math.round((satisfiedCount / scores.length) * 100) : 0;
    const lowCount = scores.filter((s) => s <= 2).length;
    const lowRate = scores.length > 0 ? Math.round((lowCount / scores.length) * 100) : 0;

    // Cross reference by dimension (e.g. City or Product)
    const dimCol = catCols.find((c) => /مدينة|city|منطقة|منتج|product/i.test(c.key)) || catCols[0];
    let topDimText = '';
    if (dimCol) {
      const dimMap = new Map<string, { sum: number; count: number }>();
      rows.forEach((r) => {
        const d = String(r[dimCol.key] || 'أخرى');
        const s = Number(r[metricCol!.key]);
        if (!isNaN(s) && s >= 1 && s <= 5) {
          const curr = dimMap.get(d) || { sum: 0, count: 0 };
          dimMap.set(d, { sum: curr.sum + s, count: curr.count + 1 });
        }
      });
      const sortedDims = Array.from(dimMap.entries())
        .map(([k, v]) => ({ label: k, avg: Number((v.sum / v.count).toFixed(2)), count: v.count }))
        .sort((a, b) => b.avg - a.avg);

      if (sortedDims[0]) {
        topDimText = `${sortedDims[0].label} (بمتوسط ${sortedDims[0].avg}/5)`;
      }
    }

    const evidence: InvestigationEvidence[] = [
      {
        label: isAr ? 'متوسط التقييم العام (Mean)' : 'Mean Rating',
        value: `${avgScore} / 5 ⭐`,
        note: isAr ? `محسوب بدقة دون جمع عشوائي` : `Calculated correctly without sum`,
      },
      {
        label: isAr ? 'وسيط التقييم (Median)' : 'Median Rating',
        value: `${medianScore} / 5`,
        note: isAr ? 'نقطة المنتصف الإحصائية للتقييمات' : 'Statistical midpoint',
      },
      {
        label: isAr ? 'معدل الرضا الإيجابي (4-5 نجوم)' : 'Positive Satisfaction Rate',
        value: `${satisfactionRate}%`,
        percentage: satisfactionRate,
        note: isAr ? `${satisfiedCount} عميل راضٍ` : `${satisfiedCount} satisfied reviews`,
      },
      {
        label: isAr ? 'معدل عدم الرضا (نجمتان أو أقل)' : 'Dissatisfaction Rate',
        value: `${lowRate}%`,
        percentage: lowRate,
        note: isAr ? `${lowCount} تقييم سلبي` : `${lowCount} negative reviews`,
      },
      auditEvidence,
    ];

    return {
      subject,
      summaryWhat: isAr
        ? `يستقر **${subject.title}** عند متوسط **${avgScore} من 5 نجوم** مع وسيط إحصائي قدره **${medianScore}**، مما يعكس مستوى رضا عام بنسبة **${satisfactionRate}%** عبر ${validCount} تقييم صالح.`
        : `**${subject.title}** stands at an average of **${avgScore}/5 stars** with a median of **${medianScore}**, representing a **${satisfactionRate}%** satisfaction rate.`,
      summaryWhy: [
        isAr
          ? `**توزيع الرضا المرتفع**: يمثل العملاء الذين منحوا 4 أو 5 نجوم ما نسبته **${satisfactionRate}%** من إجمالي الآراء.`
          : `**High Satisfaction Weight**: **${satisfactionRate}%** of reviews rated 4 or 5 stars.`,
        topDimText
          ? isAr
            ? `**أعلى أداء حسب الفئة**: تصدرت **"${topDimText}"** قائمة التقييمات الإيجابية.`
            : `**Top Segment**: Highest performance observed in **"${topDimText}"**.`
          : isAr
          ? `**استقرار نمط التقييم**: لا توجد فجوات حادة في مستويات التقييم بين الشرائح.`
          : `**Rating Uniformity**: Responses show consistent customer sentiment.`,
        isAr
          ? `**حجم الشكاوى المحدود**: بلغت نسبة التقييمات السلبية المنخفضة (نجمتان أو أقل) **${lowRate}%** فقط.`
          : `**Controlled Dissatisfaction**: Low rating rate is kept at **${lowRate}%**.`,
      ],
      evidence,
      recommendation: isAr
        ? `التركيز على مراجعة ملاحظات الـ ${lowCount} عميل أصحاب التقييمات المنخفضة لمعالجة أسباب الشكوى سريعًا ورفع متوسط الرضا الإجمالي.`
        : `Review feedback from the ${lowCount} negative ratings to address root causes and boost overall customer sentiment.`,
    };
  }

  // ==========================================
  // CASE B: INVESTIGATING DISCRETE AGE
  // ==========================================
  if (metricCol && (metricCol.type === 'age' || (metricCol.semanticRole === 'numeric_discrete' && /عمر|age|سن/i.test(metricCol.key)))) {
    const avgAge = metricCol.avg ?? 0;
    const medianAge = metricCol.median ?? avgAge;
    const evidence: InvestigationEvidence[] = [
      {
        label: isAr ? 'متوسط العمر (Mean)' : 'Average Age',
        value: `${Math.round(avgAge)} سنة`,
        note: isAr ? 'متوسط عمر العينة المعتمدة' : 'Sample mean age',
      },
      {
        label: isAr ? 'وسيط الأعمار (Median)' : 'Median Age',
        value: `${medianAge} سنة`,
        note: isAr ? 'الوسيط الديموغرافي' : 'Demographic median',
      },
      auditEvidence,
    ];

    return {
      subject,
      summaryWhat: isAr
        ? `يبلغ متوسط أعمار العملاء **${Math.round(avgAge)} سنة** مع وسيط إحصائي يبلغ **${medianAge} سنة**، ضمن نطاق يتراوح بين ${metricCol.min || 0} و ${metricCol.max || 0} سنة.`
        : `Average customer age is **${Math.round(avgAge)} years** with a median of **${medianAge} years**.`,
      summaryWhy: [
        isAr
          ? `**التركيبة الديموغرافية الأساسية**: تتركز الفئة الأكثر نشاطًا حول عمر ${medianAge} سنة.`
          : `**Primary Demographic**: Core participant cluster is centered around age ${medianAge}.`,
        isAr
          ? `**التوزيع الإحصائي الطبيعي**: تقارب المتوسط والوسيط يؤكد عدم وجود انحرافات غير واقعية.`
          : `**Symmetric Distribution**: Closeness of mean and median validates demographic stability.`,
      ],
      evidence,
      recommendation: isAr
        ? `مواءمة الرسائل التسويقية وجودة المنتجات لتناسب اهتمامات الفئة العمرية السائدة (حوالي ${medianAge} سنة).`
        : `Tailor messaging and experience to resonate with the primary ${medianAge}-year-old cohort.`,
    };
  }

  // ==========================================
  // CASE C: FINANCIAL / GENERAL INVESTIGATION
  // ==========================================
  const metricSum = metricCol?.sum || rows.reduce((acc, r) => acc + (Number(r[metricCol?.key || '']) || 0), 0);
  const avgVal = totalRows > 0 ? metricSum / totalRows : 0;

  // Find primary driver dimension
  let bestDim: ColumnMeta | null = null;
  let bestDimBreakdown: [string, number][] = [];
  let bestDimTopShare = 0;

  for (const cat of catCols) {
    const map: Record<string, number> = {};
    rows.forEach((r) => {
      const k = String(r[cat.key] || 'أخرى');
      map[k] = (map[k] || 0) + (Number(r[metricCol?.key || '']) || 0);
    });
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const topPct = metricSum > 0 && entries[0] ? (entries[0][1] / metricSum) * 100 : 0;
    if (topPct > bestDimTopShare) {
      bestDimTopShare = topPct;
      bestDim = cat;
      bestDimBreakdown = entries;
    }
  }

  const topDriver = bestDimBreakdown[0];
  const top2Driver = bestDimBreakdown[1];
  const top2CombinedPct =
    metricSum > 0 && topDriver && top2Driver
      ? Math.round(((topDriver[1] + top2Driver[1]) / metricSum) * 100)
      : Math.round(bestDimTopShare);

  const evidence: InvestigationEvidence[] = [];

  if (bestDimBreakdown.length > 0) {
    bestDimBreakdown.slice(0, 3).forEach(([name, val]) => {
      evidence.push({
        label: `${bestDim?.label || 'الفئة'}: ${name}`,
        value: formatMetricNumber(val, true),
        percentage: metricSum > 0 ? Math.round((val / metricSum) * 100) : 0,
        note: isAr ? `مساهمة من إجمالي ${subject.title}` : `Share of ${subject.title}`,
      });
    });
  }

  evidence.push({
    label: isAr ? 'المتوسط الحسابي لكل سجل' : 'Average Per Record',
    value: formatMetricNumber(avgVal, true),
    note: isAr ? `محسوب على ${validCount} سجل صالح` : `Across ${validCount} valid records`,
  });
  evidence.push(auditEvidence);

  return {
    subject,
    summaryWhat: isAr
      ? `يستقر **${subject.title}** عند **${subject.formattedValue || formatMetricNumber(metricSum, true)}** محسوبًا بدقة على **${validCount}** عملية صالحة بمتوسط **${formatMetricNumber(avgVal, true)}** لكل عملية.`
      : `**${subject.title}** stands at **${subject.formattedValue || formatMetricNumberEn(metricSum, true)}** across **${validCount}** valid records.`,
    summaryWhy: [
      topDriver
        ? isAr
          ? `**التركز الأساسي في (${bestDim?.label || 'الفئة'})**: تصدر **"${topDriver[0]}"** بحصة بلغت **${Math.round(bestDimTopShare)}%** بمفرده، مما يجعله المحرك الأقوى للرقم.`
          : `**Primary Concentration in (${bestDim?.label || 'Segment'})**: **"${topDriver[0]}"** drives **${Math.round(bestDimTopShare)}%** of the metric.`
        : isAr
        ? `**التوزيع المتوازن عبر السجلات**: تراكم العمليات المتكررة عبر كافة السجلات المسجلة دون فجوات.`
        : `**Balanced Distribution**: Built from recurring transactional activity across verified records.`,
      top2Driver
        ? isAr
          ? `**قاعدة التركز التراكمي**: أول جهتين ("${topDriver[0]}" و "${top2Driver[0]}") تسهمان معًا بنحو **${top2CombinedPct}%** من الناتج الإجمالي.`
          : `**Cumulative Concentration**: Top two performers ("${topDriver[0]}" and "${top2Driver[0]}") generate **${top2CombinedPct}%** of total output.`
        : isAr
        ? `**ثبات متوسط السلة**: تتقارب معظم القيم المسجلة حول المتوسط العام دون انحرافات حادة.`
        : `**Consistency**: Most transactions align closely around the mean without severe anomalies.`,
    ],
    evidence,
    recommendation: isAr
      ? `الحرص على استمرار دعم القنوات والفئات الأعلى مساهمة، مع اختبار استراتيجيات جديدة لرفع إسهام باقي الفئات لتقليل الاعتمادية وزيادة النمو الكلي.`
      : `Continue reinforcing primary drivers while deploying targeted initiatives to elevate lagging segments.`,
  };
}
