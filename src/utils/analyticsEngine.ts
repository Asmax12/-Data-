import {
  CleanedDataset,
  ColumnMeta,
  KPIItem,
  ChartConfig,
  InsightItem,
  DataRow,
  AIQueryActions,
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
