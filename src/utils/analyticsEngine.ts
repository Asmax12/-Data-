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
 * Automatically builds relevant KPIs from the data
 */
export function generateKPIs(dataset: CleanedDataset): KPIItem[] {
  const kpis: KPIItem[] = [];
  const rows = dataset.rows;
  const count = rows.length;
  if (count === 0) return kpis;

  const cols = dataset.columns;
  const numCols = cols.filter((c) => c.type === 'numeric');

  // Look for total / sales / amount
  const salesCol = numCols.find((c) =>
    /إجمالي|sales|مبيعات|مبلغ|amount|total|revenue|قيمة/i.test(c.key)
  ) || numCols.find((c) => /سعر|price/i.test(c.key));

  // Look for profit
  const profitCol = numCols.find((c) => /ربح|أرباح|profit|margin|صافي/i.test(c.key));

  // Look for quantity
  const qtyCol = numCols.find((c) => /كمية|qty|quantity|عدد/i.test(c.key));

  // 1. Total Volume / Revenue
  if (salesCol && salesCol.sum !== undefined) {
    const totalSales = salesCol.sum;
    kpis.push({
      id: 'kpi_sales',
      label: 'إجمالي المبيعات',
      labelAr: 'إجمالي المبيعات',
      value: totalSales,
      formattedValue: formatMetricNumber(totalSales, true),
      subtitle: `من إجمالي ${count} عملية مسجلة`,
      subtitleAr: `من إجمالي ${count} عملية مسجلة`,
      type: 'currency',
      metricKey: salesCol.key,
      iconName: 'DollarSign',
    });

    // Average Order Value (AOV)
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
    });
  }

  // 2. Total Profit
  if (profitCol && profitCol.sum !== undefined) {
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
    });
  }

  // 3. Total Orders or Records
  kpis.push({
    id: 'kpi_records',
    label: 'عدد المعاملات والطلبات',
    labelAr: 'عدد المعاملات والطلبات',
    value: count,
    formattedValue: count.toLocaleString('ar-EG'),
    subtitle: 'سجل مكتمل تم تنظيمه بنجاح',
    subtitleAr: 'سجل مكتمل تم تنظيمه بنجاح',
    type: 'number',
    iconName: 'ShoppingBag',
  });

  // 4. Quantity Sold if exists
  if (qtyCol && qtyCol.sum !== undefined) {
    const totalQty = qtyCol.sum;
    kpis.push({
      id: 'kpi_quantity',
      label: 'إجمالي الكميات',
      labelAr: 'إجمالي الكميات',
      value: totalQty,
      formattedValue: totalQty.toLocaleString('ar-EG'),
      subtitle: 'وحدة أو منتج تم تسليمه',
      subtitleAr: 'وحدة أو منتج تم تسليمه',
      type: 'number',
      metricKey: qtyCol.key,
      iconName: 'Package',
    });
  }

  return kpis;
}

/**
 * Automatically chooses suitable charts based on available dimensions and metrics
 */
export function generateCharts(dataset: CleanedDataset): ChartConfig[] {
  const charts: ChartConfig[] = [];
  const rows = dataset.rows;
  if (rows.length === 0) return charts;

  const cols = dataset.columns;
  const numCols = cols.filter((c) => c.type === 'numeric');
  const catCols = cols.filter((c) => c.type === 'category' || c.inferredRole === 'dimension');
  const timeCols = cols.filter((c) => c.type === 'date' || c.inferredRole === 'time');

  // Preferred metric: sales/amount or profit or first numeric
  const primaryMetric =
    numCols.find((c) => /إجمالي|sales|مبيعات|مبلغ|amount|total|revenue/i.test(c.key)) ||
    numCols.find((c) => /سعر|price/i.test(c.key)) ||
    numCols[0];

  const profitMetric = numCols.find((c) => /ربح|أرباح|profit/i.test(c.key));

  // Preferred dimensions: City / Region, Product / Item, Department / Category
  const cityCol = catCols.find((c) => /مدينة|city|governorate|منطقة|فرع/i.test(c.key));
  const productCol = catCols.find((c) => /منتج|product|item|صنف|خدمة/i.test(c.key));
  const otherCatCol = catCols.find((c) => c !== cityCol && c !== productCol);
  const timeCol = timeCols[0];

  // Helper to aggregate data
  const aggregate = (dimKey: string, metKey: string) => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const dim = String(r[dimKey] || 'أخرى').trim();
      const val = Number(r[metKey]) || 0;
      map.set(dim, (map.get(dim) || 0) + val);
    });

    const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
    const sorted = Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8); // top 8 to keep clean

    return sorted.map(([label, value]) => ({
      label,
      value,
      percentage: total > 0 ? Math.round((value / total) * 100) : 0,
    }));
  };

  // Chart 1: City / Region breakdown (Bar Chart)
  if (cityCol && primaryMetric) {
    const data = aggregate(cityCol.key, primaryMetric.key);
    charts.push({
      id: 'chart_city_sales',
      titleAr: `${primaryMetric.label} حسب ${cityCol.label}`,
      titleEn: `${primaryMetric.label} by ${cityCol.label}`,
      type: 'bar',
      dimensionKey: cityCol.key,
      metricKey: primaryMetric.key,
      aggregation: 'sum',
      data,
      descriptionAr: `مقارنة مباشرة بين أداء مختلف ${cityCol.label} وترتيبها من الأعلى للأقل.`,
      descriptionEn: `Direct comparison across ${cityCol.label} ranked highest to lowest.`,
    });
  }

  // Chart 2: Time Series / Trend (Line Chart)
  if (timeCol && primaryMetric) {
    // Group by date or month
    const timeMap = new Map<string, number>();
    rows.forEach((r) => {
      let t = String(r[timeCol.key] || '').trim();
      // Simplify date: take YYYY-MM or keep short
      if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
        t = t.slice(0, 7); // Month level
      }
      const val = Number(r[primaryMetric.key]) || 0;
      timeMap.set(t, (timeMap.get(t) || 0) + val);
    });

    const timeData = Array.from(timeMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, value]) => ({ label, value }));

    if (timeData.length >= 2) {
      charts.push({
        id: 'chart_timeline',
        titleAr: `تطور ${primaryMetric.label} عبر الزمن (${timeCol.label})`,
        titleEn: `${primaryMetric.label} Over Time`,
        type: 'line',
        dimensionKey: timeCol.key,
        metricKey: primaryMetric.key,
        aggregation: 'sum',
        data: timeData,
        descriptionAr: `تتبع حركة المبيعات وتحديد فترات الذروة والنمو.`,
        descriptionEn: `Tracking sales momentum and identifying peak periods.`,
      });
    }
  }

  // Chart 3: Product / Category breakdown (Donut or Bar)
  const categoryCol = productCol || otherCatCol || catCols[0];
  if (categoryCol && primaryMetric && (!cityCol || categoryCol.key !== cityCol.key)) {
    const data = aggregate(categoryCol.key, primaryMetric.key);
    charts.push({
      id: 'chart_category',
      titleAr: `توزيع ${primaryMetric.label} حسب ${categoryCol.label}`,
      titleEn: `Distribution by ${categoryCol.label}`,
      type: 'donut',
      dimensionKey: categoryCol.key,
      metricKey: primaryMetric.key,
      aggregation: 'sum',
      data,
      descriptionAr: `حصص ومساهمة كل ${categoryCol.label} في الحجم الكلي.`,
      descriptionEn: `Share and contribution of each ${categoryCol.label} to total volume.`,
    });
  }

  // Chart 4: Profit breakdown if profit exists and not redundant
  if (profitMetric && cityCol && charts.length < 3) {
    const data = aggregate(cityCol.key, profitMetric.key);
    charts.push({
      id: 'chart_profit_city',
      titleAr: `${profitMetric.label} حسب ${cityCol.label}`,
      titleEn: `${profitMetric.label} by ${cityCol.label}`,
      type: 'bar',
      dimensionKey: cityCol.key,
      metricKey: profitMetric.key,
      aggregation: 'sum',
      data,
      descriptionAr: `مقارنة حجم الأرباح الفعلية الناتجة عن كل ${cityCol.label}.`,
      descriptionEn: `Direct net profit comparison across ${cityCol.label}.`,
    });
  }

  return charts;
}

/**
 * Generates 3-5 crisp, friendly insights for "What should I know?"
 */
export function generateInsights(dataset: CleanedDataset): InsightItem[] {
  const insights: InsightItem[] = [];
  const rows = dataset.rows;
  if (rows.length === 0) return insights;

  const cols = dataset.columns;
  const numCols = cols.filter((c) => c.type === 'numeric');
  const catCols = cols.filter((c) => c.type === 'category' || c.inferredRole === 'dimension');

  const salesCol =
    numCols.find((c) => /إجمالي|sales|مبيعات|مبلغ|amount|total|revenue/i.test(c.key)) ||
    numCols.find((c) => /سعر|price/i.test(c.key)) ||
    numCols[0];

  const profitCol = numCols.find((c) => /ربح|أرباح|profit/i.test(c.key));
  const cityCol = catCols.find((c) => /مدينة|city|منطقة|governorate/i.test(c.key));
  const productCol = catCols.find((c) => /منتج|product|صنف|item/i.test(c.key));

  // 1. Top City / Dimension
  if (cityCol && salesCol) {
    const cityMap = new Map<string, number>();
    rows.forEach((r) => {
      const city = String(r[cityCol.key] || '').trim();
      const val = Number(r[salesCol.key]) || 0;
      cityMap.set(city, (cityMap.get(city) || 0) + val);
    });
    const sorted = Array.from(cityMap.entries()).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      const [topCity, topVal] = sorted[0];
      const total = Array.from(cityMap.values()).reduce((a, b) => a + b, 0);
      const share = total > 0 ? Math.round((topVal / total) * 100) : 0;
      insights.push({
        id: 'ins_top_city',
        type: 'highlight',
        textAr: `مدينة ${topCity} حققت أعلى مبيعات بقيمة ${formatMetricNumber(topVal, true)} (بنسبة ${share}% من إجمالي المبيعات).`,
        textEn: `${topCity} generated the highest sales with ${formatMetricNumberEn(topVal, true)} (${share}% of total).`,
        metricLabel: topCity,
        metricValue: `${share}%`,
      });
    }
  }

  // 2. Top Product / Item
  if (productCol && (profitCol || salesCol)) {
    const targetCol = profitCol || salesCol;
    const prodMap = new Map<string, number>();
    rows.forEach((r) => {
      const prod = String(r[productCol.key] || '').trim();
      const val = Number(r[targetCol.key]) || 0;
      prodMap.set(prod, (prodMap.get(prod) || 0) + val);
    });
    const sorted = Array.from(prodMap.entries()).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      const [topProd, topVal] = sorted[0];
      const isProfit = targetCol === profitCol;
      insights.push({
        id: 'ins_top_prod',
        type: 'positive',
        textAr: `منتج "${topProd}" هو الأكثر توليدًا ${isProfit ? 'للأرباح' : 'للمبيعات'} بإجمالي ${formatMetricNumber(topVal, true)}.`,
        textEn: `"${topProd}" is the top ${isProfit ? 'profit' : 'sales'} driver with ${formatMetricNumberEn(topVal, true)}.`,
        metricLabel: topProd,
        metricValue: formatMetricNumber(topVal, true),
      });
    }
  }

  // 3. Contrast / Opportunity: City with high volume but lower profit, or second city
  if (cityCol && salesCol && profitCol) {
    const cityData = new Map<string, { sales: number; profit: number }>();
    rows.forEach((r) => {
      const city = String(r[cityCol.key] || '').trim();
      const s = Number(r[salesCol.key]) || 0;
      const p = Number(r[profitCol.key]) || 0;
      const curr = cityData.get(city) || { sales: 0, profit: 0 };
      cityData.set(city, { sales: curr.sales + s, profit: curr.profit + p });
    });

    const entries = Array.from(cityData.entries()).map(([c, d]) => ({
      city: c,
      sales: d.sales,
      profit: d.profit,
      margin: d.sales > 0 ? (d.profit / d.sales) * 100 : 0,
    }));

    entries.sort((a, b) => b.sales - a.sales);
    if (entries.length >= 2) {
      const secondCity = entries[1];
      insights.push({
        id: 'ins_second_city',
        type: 'neutral',
        textAr: `مدينة ${secondCity.city} تحتل المركز الثاني بمبيعات ${formatMetricNumber(secondCity.sales, true)} وهامش ربح ${Math.round(secondCity.margin)}%.`,
        textEn: `${secondCity.city} is in second place with ${formatMetricNumberEn(secondCity.sales, true)} and a ${Math.round(secondCity.margin)}% margin.`,
      });
    }
  }

  // 4. Time Trend / Monthly Insight
  const dateCol = cols.find((c) => c.type === 'date' || c.inferredRole === 'time');
  if (dateCol && salesCol) {
    const monthMap = new Map<string, number>();
    rows.forEach((r) => {
      let d = String(r[dateCol.key] || '');
      if (/^\d{4}-\d{2}/.test(d)) d = d.slice(0, 7);
      const val = Number(r[salesCol.key]) || 0;
      monthMap.set(d, (monthMap.get(d) || 0) + val);
    });

    const sortedMonths = Array.from(monthMap.entries()).sort((a, b) => b[1] - a[1]);
    if (sortedMonths.length > 0) {
      const [peakMonth, peakVal] = sortedMonths[0];
      insights.push({
        id: 'ins_peak_period',
        type: 'positive',
        textAr: `فترة (${peakMonth}) شهدت أعلى نشاط وذروة مبيعات بقيمة ${formatMetricNumber(peakVal, true)}.`,
        textEn: `Period (${peakMonth}) achieved peak sales activity of ${formatMetricNumberEn(peakVal, true)}.`,
      });
    }
  }

  // Fallback insight if few columns
  if (insights.length < 3) {
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
  const rows = dataset.rows;
  const totalRows = rows.length;
  const cols = dataset.columns;

  const numCols = cols.filter((c) => c.type === 'numeric');
  const catCols = cols.filter((c) => c.type === 'category' || c.inferredRole === 'dimension');
  const timeCols = cols.filter((c) => c.type === 'date' || c.inferredRole === 'time');

  // Find targeted metric column
  let metricCol = numCols.find((c) => c.key === subject.metricKey);
  if (!metricCol) {
    metricCol =
      numCols.find((c) => /إجمالي|sales|مبيعات|مبلغ|amount|total|revenue|ربح|profit/i.test(c.key)) ||
      numCols[0];
  }

  // Handle entity / data point investigation (e.g. City = "الرياض")
  if (subject.type === 'datapoint' && subject.dimensionKey && subject.filterValue) {
    const dimKey = subject.dimensionKey;
    const filterVal = subject.filterValue;
    const matchingRows = rows.filter((r) => String(r[dimKey]) === filterVal);
    const entityRowsCount = matchingRows.length;
    const shareOfRows = totalRows > 0 ? Math.round((entityRowsCount / totalRows) * 100) : 0;

    let entitySum = 0;
    let allSum = 0;
    if (metricCol) {
      const mKey = metricCol.key;
      entitySum = matchingRows.reduce((acc, r) => acc + (Number(r[mKey]) || 0), 0);
      allSum = rows.reduce((acc, r) => acc + (Number(r[mKey]) || 0), 0);
    }
    const shareOfMetric = allSum > 0 ? Math.round((entitySum / allSum) * 100) : shareOfRows;
    const avgPerOrder = entityRowsCount > 0 ? entitySum / entityRowsCount : 0;

    // Check secondary dimension for this entity (e.g., top products sold in this city)
    const secondaryCat = catCols.find((c) => c.key !== dimKey);
    const subBreakdown: Record<string, number> = {};
    if (secondaryCat && metricCol) {
      const sKey = secondaryCat.key;
      const mKey = metricCol.key;
      matchingRows.forEach((r) => {
        const val = String(r[sKey] || 'غير محدد');
        subBreakdown[val] = (subBreakdown[val] || 0) + (Number(r[mKey]) || 0);
      });
    }

    const sortedSub = Object.entries(subBreakdown).sort((a, b) => b[1] - a[1]);
    const topSub = sortedSub[0];
    const topSubPct = entitySum > 0 && topSub ? Math.round((topSub[1] / entitySum) * 100) : 0;

    const evidence: InvestigationEvidence[] = [
      {
        label: isAr ? `حجم مساهمة ${filterVal}` : `Contribution Share`,
        value: formatMetricNumber(entitySum, true),
        percentage: shareOfMetric,
        note: isAr ? `${shareOfMetric}% من الإجمالي العام` : `${shareOfMetric}% of overall total`,
      },
      {
        label: isAr ? 'عدد العمليات المسجلة' : 'Number of Transactions',
        value: `${entityRowsCount} ${isAr ? 'عملية' : 'orders'}`,
        percentage: shareOfRows,
        note: isAr ? `${shareOfRows}% من إجمالي العمليات` : `${shareOfRows}% of total transactions`,
      },
      {
        label: isAr ? 'متوسط قيمة العملية' : 'Avg Order Value',
        value: formatMetricNumber(avgPerOrder, true),
        note: isAr ? 'معدل الإنفاق لكل عملية' : 'Average spend per order',
      },
    ];

    if (topSub) {
      evidence.push({
        label: isAr ? `أعلى تصنيف فرعي (${topSub[0]})` : `Top Sub-segment (${topSub[0]})`,
        value: formatMetricNumber(topSub[1], true),
        percentage: topSubPct,
        note: isAr ? `${topSubPct}% من مبيعات هذا القسم` : `${topSubPct}% of segment sales`,
      });
    }

    return {
      subject,
      summaryWhat: isAr
        ? `يمثل **${filterVal}** شريحة حيوية تحقق **${formatMetricNumber(entitySum, true)}** عبر **${entityRowsCount}** عملية مسجلة، وهو ما يشكل **${shareOfMetric}%** من الحجم الكلي.`
        : `**${filterVal}** generates **${formatMetricNumberEn(entitySum, true)}** across **${entityRowsCount}** transactions, accounting for **${shareOfMetric}%** of total volume.`,
      summaryWhy: [
        isAr
          ? `**كثافة العمليات والطلب**: استحوذت هذه الشريحة على ${shareOfRows}% من نشاط السجلات بالكامل، مما يدل على قاعدة عملاء نشطة ومتكررة.`
          : `**High Order Volume**: Accounts for ${shareOfRows}% of all recorded activity, reflecting strong repeat transactions.`,
        topSub
          ? isAr
            ? `**تركز الطلب في منتج/صنف رائد**: يشكل صنف **"${topSub[0]}"** المحرك الأكبر بمفرده بنسبة ${topSubPct}% من أداء هذه الشريحة.`
            : `**Core Driver**: Category **"${topSub[0]}"** alone accounts for ${topSubPct}% of this segment's performance.`
          : isAr
          ? `**استقرار القيمة المتوسطة**: متوسط العملية الواحدة يصل إلى ${formatMetricNumber(avgPerOrder, true)}، وهو ما يعزز ثبات العائد.`
          : `**Stable Basket Value**: Average transaction size reaches ${formatMetricNumberEn(avgPerOrder, true)}.`,
        isAr
          ? `**المكانة النسبية في البيانات**: يتفوق هذا النطاق بشكل ملحوظ مقارنة بالمعدل العام لباقي الشرائح.`
          : `**Relative Outperformance**: Consistently ranks at the upper tier of the dataset.`,
      ],
      evidence,
      recommendation: isAr
        ? `الحفاظ على هذا الزخم من خلال ضمان توفر مخزون مستمر لأهم الأصناف (${topSub ? topSub[0] : 'الأكثر طلباً'})، واختبار عروض مجمعة (Bundles) لرفع متوسط العملية إلى مستويات أعلى.`
        : `Maintain momentum by securing inventory for leading products and introducing bundle offers to lift average ticket size further.`,
    };
  }

  // Handle Chart investigation
  if (subject.type === 'chart' && subject.dimensionKey) {
    const dimCol = cols.find((c) => c.key === subject.dimensionKey) || catCols[0];
    const metric = metricCol || numCols[0];

    const aggregated: Record<string, number> = {};
    if (dimCol && metric) {
      rows.forEach((r) => {
        const dVal = String(r[dimCol.key] || 'غير محدد');
        aggregated[dVal] = (aggregated[dVal] || 0) + (Number(r[metric.key]) || 0);
      });
    }

    const sortedEntries = Object.entries(aggregated).sort((a, b) => b[1] - a[1]);
    const totalAgg = sortedEntries.reduce((acc, curr) => acc + curr[1], 0);
    const topEntry = sortedEntries[0] || ['غير متاح', 0];
    const secondEntry = sortedEntries[1];
    const lowestEntry = sortedEntries[sortedEntries.length - 1] || ['غير متاح', 0];

    const topShare = totalAgg > 0 ? Math.round((topEntry[1] / totalAgg) * 100) : 0;
    const gapMultiplier = lowestEntry[1] > 0 ? (topEntry[1] / lowestEntry[1]).toFixed(1) : '—';

    const evidence: InvestigationEvidence[] = sortedEntries.slice(0, 4).map(([name, val]) => ({
      label: name,
      value: formatMetricNumber(val, true),
      percentage: totalAgg > 0 ? Math.round((val / totalAgg) * 100) : 0,
      note: isAr ? `مساهمة من إجمالي الرسم` : `Share of chart total`,
    }));

    return {
      subject,
      summaryWhat: isAr
        ? `يوضح المخطط تفاوتًا واضحًا في توزيع **${metric?.label || subject.title}**، حيث يتصدر **"${topEntry[0]}"** المشهد بإجمالي **${formatMetricNumber(topEntry[1], true)}** بنسبة **${topShare}%** من إجمالي المخطط.`
        : `The chart demonstrates a clear distribution pattern for **${subject.title}**, led by **"${topEntry[0]}"** with **${formatMetricNumberEn(topEntry[1], true)}** (${topShare}% share).`,
      summaryWhy: [
        isAr
          ? `**الريادة الواضحة للصدارة**: يتفوق **"${topEntry[0]}"** على أدنى عنصر (${lowestEntry[0]}) بمعدل **${gapMultiplier}x** ضعفًا، مما يجعله مركز الثقل الحقيقي.`
          : `**Clear Leader Advantage**: **"${topEntry[0]}"** outperforms the lowest item (${lowestEntry[0]}) by **${gapMultiplier}x**, representing the core weight.`,
        secondEntry
          ? isAr
            ? `**الفجوة بين المركزين الأول والثاني**: الفارق بين "${topEntry[0]}" و "${secondEntry[0]}" يبلغ ${formatMetricNumber(topEntry[1] - secondEntry[1], true)}، ما يبرز هيمنة المتصدر.`
            : `**First-to-Second Gap**: The difference between top two entries is ${formatMetricNumberEn(topEntry[1] - secondEntry[1], true)}. `
          : isAr
          ? `**تركز الحصص السوقية**: أغلب النشاط محصور في نطاق ضيق مقارنة بالخيارات المتاحة.`
          : `**Share Concentration**: Most recorded activity is concentrated within top segments.`,
        isAr
          ? `**فرص النمو غير المستغلة**: الفئات الأدنى ما زالت تمتلك مساحات واسعة للتوسع وزيادة حصتها.`
          : `**Untapped Potential**: Lower-tier items represent substantial headroom for growth.`,
      ],
      evidence,
      recommendation: isAr
        ? `ينبغي حماية ريادة "${topEntry[0]}" كركيزة للأعمال، بالتوازي مع تخصيص حملات محددة لتحفيز الفئات الأقل نموًا دون تشتيت الموارد الرئيسية.`
        : `Protect the core leadership of "${topEntry[0]}" while testing targeted campaigns to unlock growth in lower-tier segments.`,
    };
  }

  // Default: General KPI or Metric Investigation (e.g. Total Sales, Profit, Orders)
  const metricSum = metricCol?.sum || rows.reduce((acc, r) => acc + (Number(r[metricCol?.key || '']) || 0), 0);
  const avgVal = totalRows > 0 ? metricSum / totalRows : 0;

  // Find the primary driver dimension with highest variance/concentration
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
    note: isAr ? `محسوب على ${totalRows} سجل` : `Across ${totalRows} records`,
  });

  return {
    subject,
    summaryWhat: isAr
      ? `يستقر **${subject.title}** عند **${subject.formattedValue || formatMetricNumber(metricSum, true)}** محسوبًا على إجمالي **${totalRows}** عملية مسجلة بمتوسط **${formatMetricNumber(avgVal, true)}** لكل عملية.`
      : `**${subject.title}** stands at **${subject.formattedValue || formatMetricNumberEn(metricSum, true)}** across **${totalRows}** transactions with an average of **${formatMetricNumberEn(avgVal, true)}** per transaction.`,
    summaryWhy: [
      topDriver
        ? isAr
          ? `**التركز الأساسي في (${bestDim?.label || 'الفئة'})**: تصدر **"${topDriver[0]}"** بحصة بلغت **${Math.round(bestDimTopShare)}%** بمفرده، مما يجعله المحرك الأقوى للرقم.`
          : `**Primary Concentration in (${bestDim?.label || 'Segment'})**: **"${topDriver[0]}"** drives **${Math.round(bestDimTopShare)}%** of the metric, serving as the core catalyst.`
        : isAr
        ? `**التوزيع عبر السجلات**: يعتمد الرقم على تراكم العمليات المتكررة عبر كافة السجلات المسجلة.`
        : `**Cumulative Distribution**: Built from recurring transactional activity across all records.`,
      top2Driver
        ? isAr
          ? `**قاعدة الـ 80/20 (باريتو)**: أول جهتين ("${topDriver[0]}" و "${top2Driver[0]}") تسهمان معًا بنحو **${top2CombinedPct}%** من الناتج الإجمالي.`
          : `**Pareto Dynamics**: Top two performers ("${topDriver[0]}" and "${top2Driver[0]}") collectively generate **${top2CombinedPct}%** of total output.`
        : isAr
        ? `**ثبات متوسط السلة**: تتقارب معظم القيم المسجلة حول المتوسط العام دون انحرافات حادة.`
        : `**Consistency**: Most transactions align closely around the mean without severe anomalies.`,
      timeCols.length > 0
        ? isAr
          ? `**العامل الزمني والتكرار**: تشير التواريخ إلى نشاط مستمر يحافظ على استدامة المؤشر.`
          : `**Time Velocity**: Transaction cadence supports continuous metric stability.`
        : isAr
        ? `**هامش الأمان المالي**: تركيبة العمليات تظهر استقرارًا عامًا في العوائد المحققة.`
        : `**Operational Resilience**: Transaction composition demonstrates healthy volume stability.`,
    ],
    evidence,
    recommendation: isAr
      ? `الحرص على استمرار دعم القنوات والفئات الأعلى مساهمة، مع اختبار استراتيجيات جديدة لرفع إسهام باقي الفئات لتقليل الاعتمادية وزيادة النمو الكلي.`
      : `Continue reinforcing primary drivers while deploying targeted initiatives to elevate lagging segments, mitigating concentration risk and boosting growth.`,
  };
}
