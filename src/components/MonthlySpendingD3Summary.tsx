import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PieChart as PieIcon, 
  BarChart2, 
  Sparkles, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShoppingBag, 
  Info,
  CheckCircle2,
  AlertCircle,
  Clock,
  Maximize2,
  Search,
  X,
  Eye,
  FileText,
  CreditCard,
  Tag,
  ArrowUpDown,
  Download,
  ExternalLink,
  ChevronDown,
  Receipt,
  Filter,
  Check
} from 'lucide-react';
import { Transaction, BudgetCategory, AppSettings, Account } from '../types';

interface MonthlySpendingD3SummaryProps {
  transactions: Transaction[];
  accounts?: Account[];
  budgets?: BudgetCategory[];
  settings?: AppSettings;
  defaultMonth?: string;
  defaultYear?: number;
  onNavigateToTab?: (tab: 'dashboard' | 'transactions' | 'budget' | 'accounts' | 'analytics') => void;
}

interface CategorySpendingData {
  category: string;
  amount: number;
  percentage: number;
  count: number;
  topTransaction: { provider: string; amount: number; date: string } | null;
  budgetLimit?: number;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  color?: string;
  subtitle?: string;
  metrics: { label: string; value: string; color?: string }[];
  hint?: string;
}

interface DailySpendItem {
  day: number;
  amount: number;
  cumulative: number;
  transactions: Transaction[];
}

const CATEGORY_COLOR_MAP: Record<string, string> = {
  Everyday: '#f59e0b',
  Housing: '#3b82f6',
  'Tech & Media': '#8b5cf6',
  Transportation: '#10b981',
  Healthcare: '#ec4899',
  Entertainment: '#06b6d4',
  Food: '#f97316',
  Shopping: '#a855f7',
  Utilities: '#0284c7',
  Personal: '#e11d48',
  Travel: '#14b8a6',
  Education: '#6366f1',
  Other: '#64748b'
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MonthlySpendingD3Summary: React.FC<MonthlySpendingD3SummaryProps> = ({
  transactions,
  accounts = [],
  budgets = [],
  settings,
  defaultMonth = 'August',
  defaultYear = 2026,
  onNavigateToTab
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [chartType, setChartType] = useState<'donut' | 'bars' | 'trend'>('donut');
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [selectedCategoryDetail, setSelectedCategoryDetail] = useState<string | null>(null);

  // Drill-down state
  const [drilledCategory, setDrilledCategory] = useState<string | null>(null);
  const [drillSearchQuery, setDrillSearchQuery] = useState<string>('');
  const [drillSortBy, setDrillSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'vendor-asc'>('date-desc');
  const [drillSubcategoryFilter, setDrillSubcategoryFilter] = useState<string>('all');
  const [lightboxReceipt, setLightboxReceipt] = useState<{
    url: string;
    provider: string;
    amount: number;
    date: string;
  } | null>(null);

  // Floating rich tooltip state
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    title: '',
    metrics: []
  });

  // SVG Refs for D3 visualizations
  const donutSvgRef = useRef<SVGSVGElement | null>(null);
  const barChartSvgRef = useRef<SVGSVGElement | null>(null);
  const trendSvgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const drilldownPanelRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(400);

  // Resize observer for responsive D3 charts
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Filter current month's expenses
  const currentMonthTransactions = useMemo(() => {
    return transactions.filter(
      (t) => t.type === 'Expense' && t.month === selectedMonth && t.year === selectedYear
    );
  }, [transactions, selectedMonth, selectedYear]);

  // Previous month data for comparison
  const previousMonthInfo = useMemo(() => {
    const currentIdx = MONTH_NAMES.indexOf(selectedMonth);
    const prevMonth = currentIdx === 0 ? MONTH_NAMES[11] : MONTH_NAMES[currentIdx - 1];
    const prevYear = currentIdx === 0 ? selectedYear - 1 : selectedYear;
    
    const prevTx = transactions.filter(
      (t) => t.type === 'Expense' && t.month === prevMonth && t.year === prevYear
    );
    const prevTotal = prevTx.reduce((sum, t) => sum + t.amount, 0);
    return { month: prevMonth, year: prevYear, total: prevTotal };
  }, [transactions, selectedMonth, selectedYear]);

  // Calculate Category Breakdowns
  const { categoryData, totalMonthlySpend, dailyAverage, topCategory, maxSingleExpense } = useMemo(() => {
    const map: Record<string, { amount: number; count: number; topTx: Transaction | null }> = {};
    let total = 0;
    let maxTx: Transaction | null = null;

    currentMonthTransactions.forEach((t) => {
      total += t.amount;
      if (!maxTx || t.amount > maxTx.amount) {
        maxTx = t;
      }
      if (!map[t.category]) {
        map[t.category] = { amount: 0, count: 0, topTx: null };
      }
      map[t.category].amount += t.amount;
      map[t.category].count += 1;
      if (!map[t.category].topTx || t.amount > map[t.category].topTx!.amount) {
        map[t.category].topTx = t;
      }
    });

    const categories: CategorySpendingData[] = Object.entries(map).map(([category, info]) => {
      const matchingBudget = budgets.find((b) => b.category.toLowerCase() === category.toLowerCase());
      return {
        category,
        amount: parseFloat(info.amount.toFixed(2)),
        percentage: total > 0 ? parseFloat(((info.amount / total) * 100).toFixed(1)) : 0,
        count: info.count,
        topTransaction: info.topTx
          ? { provider: info.topTx.provider, amount: info.topTx.amount, date: info.topTx.date }
          : null,
        budgetLimit: matchingBudget?.monthlyLimit
      };
    }).sort((a, b) => b.amount - a.amount);

    const monthIndex = MONTH_NAMES.indexOf(selectedMonth);
    const daysInMonth = monthIndex >= 0 ? new Date(selectedYear, monthIndex + 1, 0).getDate() : 30;
    const avg = total / daysInMonth;

    return {
      categoryData: categories,
      totalMonthlySpend: total,
      dailyAverage: avg,
      topCategory: categories.length > 0 ? categories[0] : null,
      maxSingleExpense: maxTx
    };
  }, [currentMonthTransactions, budgets, selectedMonth, selectedYear]);

  // Month-over-Month percentage change
  const momChange = useMemo(() => {
    if (previousMonthInfo.total === 0) return null;
    const diff = totalMonthlySpend - previousMonthInfo.total;
    const pct = (diff / previousMonthInfo.total) * 100;
    return {
      diff,
      pct: parseFloat(pct.toFixed(1)),
      isIncrease: diff > 0
    };
  }, [totalMonthlySpend, previousMonthInfo]);

  // Daily Spending timeline for D3 Trend chart
  const dailySpendingTimeline = useMemo(() => {
    const monthIndex = MONTH_NAMES.indexOf(selectedMonth);
    const daysCount = monthIndex >= 0 ? new Date(selectedYear, monthIndex + 1, 0).getDate() : 30;
    const dayMap: Record<number, { amount: number; txs: Transaction[] }> = {};

    for (let i = 1; i <= daysCount; i++) {
      dayMap[i] = { amount: 0, txs: [] };
    }

    currentMonthTransactions.forEach((t) => {
      const day = parseInt(t.date.split('-')[2], 10);
      if (!isNaN(day) && day >= 1 && day <= daysCount) {
        dayMap[day].amount += t.amount;
        dayMap[day].txs.push(t);
      }
    });

    let cumulative = 0;
    return Object.entries(dayMap).map(([dayStr, val]) => {
      const day = parseInt(dayStr, 10);
      cumulative += val.amount;
      return {
        day,
        amount: parseFloat(val.amount.toFixed(2)),
        cumulative: parseFloat(cumulative.toFixed(2)),
        transactions: val.txs
      };
    });
  }, [currentMonthTransactions, selectedMonth, selectedYear]);

  // Handle drill-down selection and smooth scrolling
  const handleSelectDrilldown = (category: string) => {
    if (drilledCategory === category) {
      setDrilledCategory(null);
    } else {
      setDrilledCategory(category);
      setDrillSearchQuery('');
      setDrillSubcategoryFilter('all');
      setTimeout(() => {
        drilldownPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  };

  // Specific transactions for the currently drilled category
  const drilledCategoryData = useMemo(() => {
    if (!drilledCategory) return null;

    const allInCat = currentMonthTransactions.filter(
      (t) => t.category.toLowerCase() === drilledCategory.toLowerCase()
    );

    const matchingBudget = budgets.find(
      (b) => b.category.toLowerCase() === drilledCategory.toLowerCase()
    );

    const totalCatSpend = allInCat.reduce((sum, t) => sum + t.amount, 0);
    const avgCatSpend = allInCat.length > 0 ? totalCatSpend / allInCat.length : 0;
    
    // Subcategories list
    const subcategories = Array.from(new Set(allInCat.map((t) => t.subcategory).filter(Boolean)));

    // Filter by search query
    let filtered = allInCat.filter((t) => {
      const matchSearch =
        !drillSearchQuery.trim() ||
        t.provider.toLowerCase().includes(drillSearchQuery.toLowerCase()) ||
        t.subcategory.toLowerCase().includes(drillSearchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(drillSearchQuery.toLowerCase())) ||
        (t.notes && t.notes.toLowerCase().includes(drillSearchQuery.toLowerCase()));

      const matchSubcat =
        drillSubcategoryFilter === 'all' ||
        t.subcategory.toLowerCase() === drillSubcategoryFilter.toLowerCase();

      return matchSearch && matchSubcat;
    });

    // Sort transactions
    filtered.sort((a, b) => {
      if (drillSortBy === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (drillSortBy === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (drillSortBy === 'amount-desc') return b.amount - a.amount;
      if (drillSortBy === 'amount-asc') return a.amount - b.amount;
      if (drillSortBy === 'vendor-asc') return a.provider.localeCompare(b.provider);
      return 0;
    });

    return {
      category: drilledCategory,
      color: CATEGORY_COLOR_MAP[drilledCategory] || '#6366f1',
      totalSpend: totalCatSpend,
      avgSpend: avgCatSpend,
      count: allInCat.length,
      percentageOfTotal: totalMonthlySpend > 0 ? (totalCatSpend / totalMonthlySpend) * 100 : 0,
      budgetLimit: matchingBudget?.monthlyLimit,
      subcategories,
      filteredTransactions: filtered,
      allTransactions: allInCat
    };
  }, [drilledCategory, currentMonthTransactions, budgets, totalMonthlySpend, drillSearchQuery, drillSubcategoryFilter, drillSortBy]);

  // Navigate months
  const handlePrevMonth = () => {
    const idx = MONTH_NAMES.indexOf(selectedMonth);
    if (idx === 0) {
      setSelectedMonth(MONTH_NAMES[11]);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth(MONTH_NAMES[idx - 1]);
    }
  };

  const handleNextMonth = () => {
    const idx = MONTH_NAMES.indexOf(selectedMonth);
    if (idx === 11) {
      setSelectedMonth(MONTH_NAMES[0]);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth(MONTH_NAMES[idx + 1]);
    }
  };

  // Tooltip position calculator relative to component container
  const updateTooltipPos = (event: MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return { x, y };
  };

  // =========================================================================
  // 1. D3 DONUT CHART RENDERING WITH INTERACTIVE HOVER TOOLTIPS & DRILL-DOWN
  // =========================================================================
  useEffect(() => {
    if (!donutSvgRef.current || chartType !== 'donut') return;

    const svg = d3.select(donutSvgRef.current);
    svg.selectAll('*').remove();

    const width = Math.min(containerWidth * 0.48, 320);
    const height = width;
    const radius = Math.min(width, height) / 2;
    const innerRadius = radius * 0.62;

    if (categoryData.length === 0) {
      const g = svg
        .attr('viewBox', `0 0 ${width} ${height}`)
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

      g.append('circle')
        .attr('r', radius * 0.8)
        .attr('fill', 'none')
        .attr('stroke', '#334155')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4,4');

      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.3em')
        .attr('fill', '#94a3b8')
        .attr('font-size', '11px')
        .text('No expenses recorded');
      return;
    }

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const pie = d3
      .pie<CategorySpendingData>()
      .value((d) => d.amount)
      .sort(null)
      .padAngle(0.03);

    const normalArc = d3
      .arc<d3.PieArcDatum<CategorySpendingData>>()
      .innerRadius(innerRadius)
      .outerRadius(radius - 6)
      .cornerRadius(4);

    const hoverArc = d3
      .arc<d3.PieArcDatum<CategorySpendingData>>()
      .innerRadius(innerRadius - 3)
      .outerRadius(radius)
      .cornerRadius(6);

    const activeArc = d3
      .arc<d3.PieArcDatum<CategorySpendingData>>()
      .innerRadius(innerRadius - 4)
      .outerRadius(radius + 4)
      .cornerRadius(6);

    const arcs = g
      .selectAll('.arc')
      .data(pie(categoryData))
      .enter()
      .append('g')
      .attr('class', 'arc')
      .style('cursor', 'pointer');

    arcs
      .append('path')
      .attr('d', (d) => {
        if (drilledCategory === d.data.category) return activeArc(d);
        return normalArc(d);
      })
      .attr('fill', (d) => CATEGORY_COLOR_MAP[d.data.category] || '#6366f1')
      .attr('stroke', (d) => (drilledCategory === d.data.category ? '#ffffff' : '#14161c'))
      .attr('stroke-width', (d) => (drilledCategory === d.data.category ? 3 : 2))
      .attr('opacity', (d) => {
        if (!drilledCategory) return 1;
        return drilledCategory === d.data.category ? 1 : 0.45;
      })
      .style('transition', 'opacity 0.2s ease, stroke-width 0.2s ease')
      .on('mouseenter', function (event, d) {
        if (drilledCategory !== d.data.category) {
          d3.select(this)
            .transition()
            .duration(150)
            .attr('d', hoverArc as any)
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 2);
        }
        setHoveredCategory(d.data.category);

        const pos = updateTooltipPos(event);
        const avgExpense = d.data.count > 0 ? (d.data.amount / d.data.count).toFixed(2) : '0.00';
        const budgetText = d.data.budgetLimit
          ? `$${d.data.budgetLimit} (${Math.round((d.data.amount / d.data.budgetLimit) * 100)}% used)`
          : undefined;

        setTooltip({
          visible: true,
          x: pos.x,
          y: pos.y,
          title: d.data.category,
          color: CATEGORY_COLOR_MAP[d.data.category] || '#6366f1',
          subtitle: `${d.data.count} transaction${d.data.count === 1 ? '' : 's'} in ${selectedMonth}`,
          metrics: [
            { label: 'Total Spent', value: `$${d.data.amount.toFixed(2)}`, color: '#ffffff' },
            { label: 'Share of Monthly Spend', value: `${d.data.percentage}%`, color: '#818cf8' },
            { label: 'Average Transaction', value: `$${avgExpense}` },
            ...(d.data.topTransaction
              ? [{ label: 'Top Vendor', value: `${d.data.topTransaction.provider} ($${d.data.topTransaction.amount.toFixed(2)})` }]
              : []),
            ...(budgetText ? [{ label: 'Monthly Budget', value: budgetText }] : [])
          ],
          hint: drilledCategory === d.data.category 
            ? '✓ Currently drilled down — Click to close' 
            : '💡 Click to drill down into transaction list'
        });
      })
      .on('mousemove', function (event) {
        const pos = updateTooltipPos(event);
        setTooltip((prev) => ({ ...prev, x: pos.x, y: pos.y }));
      })
      .on('mouseleave', function (event, d) {
        if (drilledCategory !== d.data.category) {
          d3.select(this)
            .transition()
            .duration(150)
            .attr('d', normalArc as any)
            .attr('stroke', '#14161c')
            .attr('stroke-width', 2);
        }
        setHoveredCategory(null);
        setTooltip((prev) => ({ ...prev, visible: false }));
      })
      .on('click', (event, d) => {
        handleSelectDrilldown(d.data.category);
      });

    // Center Display
    const centerGroup = g.append('g').attr('text-anchor', 'middle');

    const activeCat = categoryData.find((c) => c.category === (hoveredCategory || drilledCategory));

    if (activeCat) {
      centerGroup
        .append('text')
        .attr('dy', '-0.5em')
        .attr('font-size', '10px')
        .attr('fill', '#94a3b8')
        .attr('font-weight', '600')
        .attr('text-transform', 'uppercase')
        .text(activeCat.category);

      centerGroup
        .append('text')
        .attr('dy', '0.8em')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .attr('fill', CATEGORY_COLOR_MAP[activeCat.category] || '#ffffff')
        .text(`$${activeCat.amount.toFixed(2)}`);

      centerGroup
        .append('text')
        .attr('dy', '2.2em')
        .attr('font-size', '10px')
        .attr('fill', '#cbd5e1')
        .text(`${activeCat.percentage}% of total`);
    } else {
      centerGroup
        .append('text')
        .attr('dy', '-0.6em')
        .attr('font-size', '9px')
        .attr('fill', '#64748b')
        .attr('letter-spacing', '0.1em')
        .attr('text-transform', 'uppercase')
        .text('Total Spent');

      centerGroup
        .append('text')
        .attr('dy', '0.8em')
        .attr('font-size', '17px')
        .attr('font-weight', 'bold')
        .attr('fill', '#ffffff')
        .text(`$${totalMonthlySpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

      centerGroup
        .append('text')
        .attr('dy', '2.3em')
        .attr('font-size', '10px')
        .attr('fill', '#818cf8')
        .text(`${categoryData.length} Categories`);
    }
  }, [categoryData, hoveredCategory, drilledCategory, totalMonthlySpend, containerWidth, chartType]);

  // =========================================================================
  // 2. D3 HORIZONTAL RANKED BAR CHART WITH TOOLTIPS & DRILL-DOWN
  // =========================================================================
  useEffect(() => {
    if (!barChartSvgRef.current || chartType !== 'bars') return;

    const svg = d3.select(barChartSvgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 10, right: 70, bottom: 20, left: 105 };
    const width = Math.max(containerWidth - 20, 320);
    const barHeight = 30;
    const height = Math.max(categoryData.length * (barHeight + 10) + margin.top + margin.bottom, 180);

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    if (categoryData.length === 0) return;

    const maxVal = d3.max(categoryData, (d: CategorySpendingData) => d.amount) || 100;
    const x = d3
      .scaleLinear()
      .domain([0, maxVal * 1.1])
      .range([margin.left, width - margin.right]);

    const y = d3
      .scaleBand()
      .domain(categoryData.map((d: CategorySpendingData) => d.category))
      .range([margin.top, height - margin.bottom])
      .padding(0.25);

    const g = svg.append('g');

    // Grid lines
    g.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(
        d3.axisBottom(x)
          .ticks(5)
          .tickFormat((d) => `$${d}`)
          .tickSize(-height + margin.top + margin.bottom)
      )
      .call((ax) => ax.select('.domain').remove())
      .call((ax) => ax.selectAll('.tick line').attr('stroke', '#1e293b').attr('stroke-dasharray', '2,2'))
      .call((ax) => ax.selectAll('.tick text').attr('fill', '#64748b').attr('font-size', '10px'));

    // Category labels (Y-axis)
    g.selectAll<SVGTextElement, CategorySpendingData>('.cat-label')
      .data(categoryData)
      .enter()
      .append('text')
      .attr('class', 'cat-label')
      .attr('x', margin.left - 10)
      .attr('y', (d: CategorySpendingData) => (y(d.category) || 0) + y.bandwidth() / 2 + 4)
      .attr('text-anchor', 'end')
      .attr('fill', (d: CategorySpendingData) => (drilledCategory === d.category ? '#818cf8' : '#e2e8f0'))
      .attr('font-size', '11px')
      .attr('font-weight', (d: CategorySpendingData) => (drilledCategory === d.category ? '700' : '500'))
      .style('cursor', 'pointer')
      .text((d: CategorySpendingData) => d.category)
      .on('click', (event: any, d: CategorySpendingData) => handleSelectDrilldown(d.category));

    // Background track bars
    g.selectAll<SVGRectElement, CategorySpendingData>('.bar-bg')
      .data(categoryData)
      .enter()
      .append('rect')
      .attr('class', 'bar-bg')
      .attr('x', margin.left)
      .attr('y', (d: CategorySpendingData) => y(d.category) || 0)
      .attr('width', width - margin.left - margin.right)
      .attr('height', y.bandwidth())
      .attr('fill', '#090a0c')
      .attr('rx', 4)
      .style('cursor', 'pointer')
      .on('click', (event: any, d: CategorySpendingData) => handleSelectDrilldown(d.category));

    // Animated Spend bars
    const bars = g
      .selectAll<SVGRectElement, CategorySpendingData>('.bar')
      .data(categoryData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', margin.left)
      .attr('y', (d: CategorySpendingData) => y(d.category) || 0)
      .attr('width', 0)
      .attr('height', y.bandwidth())
      .attr('fill', (d: CategorySpendingData) => CATEGORY_COLOR_MAP[d.category] || '#6366f1')
      .attr('stroke', (d: CategorySpendingData) => (drilledCategory === d.category ? '#ffffff' : 'none'))
      .attr('stroke-width', (d: CategorySpendingData) => (drilledCategory === d.category ? 2 : 0))
      .attr('opacity', (d: CategorySpendingData) => {
        if (!drilledCategory) return 1;
        return drilledCategory === d.category ? 1 : 0.45;
      })
      .attr('rx', 4)
      .style('cursor', 'pointer');

    bars
      .transition()
      .duration(500)
      .attr('width', (d: CategorySpendingData) => Math.max(x(d.amount) - margin.left, 4));

    // Hover and Click on bars
    bars
      .on('mouseenter', function (event, d: CategorySpendingData) {
        d3.select(this)
          .transition()
          .duration(120)
          .attr('opacity', 1)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2);

        setHoveredCategory(d.category);
        const pos = updateTooltipPos(event);
        const avgExpense = d.count > 0 ? (d.amount / d.count).toFixed(2) : '0.00';

        setTooltip({
          visible: true,
          x: pos.x,
          y: pos.y,
          title: d.category,
          color: CATEGORY_COLOR_MAP[d.category] || '#6366f1',
          subtitle: `${d.count} transaction${d.count === 1 ? '' : 's'} (${d.percentage}% of total)`,
          metrics: [
            { label: 'Amount Spent', value: `$${d.amount.toFixed(2)}`, color: '#ffffff' },
            { label: 'Average Per Purchase', value: `$${avgExpense}` },
            ...(d.topTransaction
              ? [{ label: 'Top Vendor', value: `${d.topTransaction.provider} ($${d.topTransaction.amount.toFixed(2)})` }]
              : [])
          ],
          hint: drilledCategory === d.category 
            ? '✓ Drilled down — Click to close list' 
            : '💡 Click bar to view specific transaction list'
        });
      })
      .on('mousemove', function (event) {
        const pos = updateTooltipPos(event);
        setTooltip((prev) => ({ ...prev, x: pos.x, y: pos.y }));
      })
      .on('mouseleave', function (event, d: CategorySpendingData) {
        d3.select(this)
          .transition()
          .duration(120)
          .attr('opacity', drilledCategory && drilledCategory !== d.category ? 0.45 : 1)
          .attr('stroke', drilledCategory === d.category ? '#ffffff' : 'none')
          .attr('stroke-width', drilledCategory === d.category ? 2 : 0);

        setHoveredCategory(null);
        setTooltip((prev) => ({ ...prev, visible: false }));
      })
      .on('click', (event: any, d: CategorySpendingData) => handleSelectDrilldown(d.category));

    // Value Labels
    g.selectAll<SVGTextElement, CategorySpendingData>('.val-label')
      .data(categoryData)
      .enter()
      .append('text')
      .attr('class', 'val-label')
      .attr('x', (d: CategorySpendingData) => x(d.amount) + 8)
      .attr('y', (d: CategorySpendingData) => (y(d.category) || 0) + y.bandwidth() / 2 + 4)
      .attr('fill', '#ffffff')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .text((d: CategorySpendingData) => `$${d.amount.toFixed(2)}`);

  }, [categoryData, containerWidth, chartType, drilledCategory]);

  // =========================================================================
  // 3. D3 CUMULATIVE DAILY SPENDING TREND CHART WITH HOVER TOOLTIPS
  // =========================================================================
  useEffect(() => {
    if (!trendSvgRef.current || chartType !== 'trend') return;

    const svg = d3.select(trendSvgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 15, right: 25, bottom: 25, left: 55 };
    const width = Math.max(containerWidth - 20, 320);
    const height = 220;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    if (dailySpendingTimeline.length === 0) return;

    const x = d3
      .scaleLinear()
      .domain([1, dailySpendingTimeline.length])
      .range([margin.left, width - margin.right]);

    const maxCumulative = d3.max(dailySpendingTimeline, (d: DailySpendItem) => d.cumulative) || 100;
    const y = d3
      .scaleLinear()
      .domain([0, maxCumulative * 1.1])
      .range([height - margin.bottom, margin.top]);

    const g = svg.append('g');

    // Gradient definition for area fill
    const defs = svg.append('defs');
    const gradient = defs
      .append('linearGradient')
      .attr('id', 'spend-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#6366f1').attr('stop-opacity', 0.4);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#6366f1').attr('stop-opacity', 0.0);

    // Grid lines
    g.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(
        d3.axisBottom(x)
          .ticks(Math.min(dailySpendingTimeline.length, 10))
          .tickFormat((d) => `Day ${d}`)
      )
      .call((ax) => ax.select('.domain').attr('stroke', '#334155'))
      .call((ax) => ax.selectAll('.tick line').attr('stroke', '#1e293b'))
      .call((ax) => ax.selectAll('.tick text').attr('fill', '#64748b').attr('font-size', '10px'));

    g.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(
        d3.axisLeft(y)
          .ticks(5)
          .tickFormat((d) => `$${d}`)
          .tickSize(-width + margin.left + margin.right)
      )
      .call((ax) => ax.select('.domain').remove())
      .call((ax) => ax.selectAll('.tick line').attr('stroke', '#1e293b').attr('stroke-dasharray', '2,2'))
      .call((ax) => ax.selectAll('.tick text').attr('fill', '#64748b').attr('font-size', '10px'));

    // Area path
    const area = d3
      .area<DailySpendItem>()
      .x((d: DailySpendItem) => x(d.day))
      .y0(height - margin.bottom)
      .y1((d: DailySpendItem) => y(d.cumulative))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(dailySpendingTimeline)
      .attr('fill', 'url(#spend-gradient)')
      .attr('d', area);

    // Line path
    const line = d3
      .line<DailySpendItem>()
      .x((d: DailySpendItem) => x(d.day))
      .y((d: DailySpendItem) => y(d.cumulative))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(dailySpendingTimeline)
      .attr('fill', 'none')
      .attr('stroke', '#818cf8')
      .attr('stroke-width', 2.5)
      .attr('d', line);

    // Data points with hover tooltips
    const dots = g.selectAll<SVGCircleElement, DailySpendItem>('.dot')
      .data(dailySpendingTimeline.filter((d: DailySpendItem) => d.amount > 0))
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', (d: DailySpendItem) => x(d.day))
      .attr('cy', (d: DailySpendItem) => y(d.cumulative))
      .attr('r', 4.5)
      .attr('fill', '#ffffff')
      .attr('stroke', '#6366f1')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer');

    dots
      .on('mouseenter', function (event, d: DailySpendItem) {
        d3.select(this)
          .transition()
          .duration(120)
          .attr('r', 7)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 3);

        const pos = updateTooltipPos(event);
        const topVendors = d.transactions.slice(0, 2).map((t) => `${t.provider} ($${t.amount.toFixed(2)})`).join(', ');

        setTooltip({
          visible: true,
          x: pos.x,
          y: pos.y,
          title: `Day ${d.day} (${selectedMonth} ${d.day})`,
          color: '#818cf8',
          subtitle: `${d.transactions.length} transaction${d.transactions.length === 1 ? '' : 's'} recorded`,
          metrics: [
            { label: 'Day Spend', value: `+$${d.amount.toFixed(2)}`, color: '#f59e0b' },
            { label: 'Cumulative Total', value: `$${d.cumulative.toFixed(2)}`, color: '#ffffff' },
            ...(topVendors ? [{ label: 'Transactions', value: topVendors }] : [])
          ]
        });
      })
      .on('mousemove', function (event) {
        const pos = updateTooltipPos(event);
        setTooltip((prev) => ({ ...prev, x: pos.x, y: pos.y }));
      })
      .on('mouseleave', function () {
        d3.select(this)
          .transition()
          .duration(120)
          .attr('r', 4.5)
          .attr('stroke', '#6366f1')
          .attr('stroke-width', 2);

        setTooltip((prev) => ({ ...prev, visible: false }));
      });

  }, [dailySpendingTimeline, containerWidth, chartType, selectedMonth]);

  return (
    <div 
      id="monthly-spending-d3-summary" 
      ref={containerRef} 
      className="relative bg-[#14161c] p-6 rounded-2xl border border-white/5 space-y-6 shadow-xl"
    >
      
      {/* Dynamic Floating D3 Tooltip */}
      {tooltip.visible && (
        <div
          id="d3-spending-tooltip"
          className="absolute z-50 pointer-events-none transition-all duration-75 ease-out shadow-2xl rounded-xl border border-white/10 bg-[#0c0e14]/95 backdrop-blur-md p-3 text-xs w-[240px]"
          style={{
            left: `${Math.min(Math.max(tooltip.x - 120, 10), Math.max(containerWidth - 250, 10))}px`,
            top: `${Math.max(tooltip.y - 125, 10)}px`
          }}
        >
          <div className="flex items-center gap-2 border-b border-white/10 pb-1.5 mb-2">
            {tooltip.color && (
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: tooltip.color }}
              />
            )}
            <div className="truncate">
              <div className="font-bold text-white text-xs truncate">{tooltip.title}</div>
              {tooltip.subtitle && (
                <div className="text-[10px] text-slate-400 truncate">{tooltip.subtitle}</div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            {tooltip.metrics.map((m, idx) => (
              <div key={idx} className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">{m.label}:</span>
                <span className="font-semibold font-serif" style={{ color: m.color || '#e2e8f0' }}>
                  {m.value}
                </span>
              </div>
            ))}
          </div>

          {tooltip.hint && (
            <div className="mt-2 pt-1.5 border-t border-white/10 text-[10px] text-indigo-300 font-medium flex items-center gap-1">
              <span>{tooltip.hint}</span>
            </div>
          )}
        </div>
      )}

      {/* Top Header & Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <PieIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Monthly Spending Summary & D3 Visualizer
                </h3>
                {drilledCategory && (
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 flex items-center gap-1 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    Drill-Down: {drilledCategory}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Interactive D3 charts with hover tooltips and click-to-drill-down transaction lists
              </p>
            </div>
          </div>
        </div>

        {/* Controls: Month Pagination & Chart Type Toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Selector Bar */}
          <div className="flex items-center bg-[#090a0c] p-1 rounded-xl border border-white/10">
            <button
              id="btn-prev-month"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-2 text-xs font-semibold text-white flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>{selectedMonth} {selectedYear}</span>
            </div>
            <button
              id="btn-next-month"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Chart View Mode Switcher */}
          <div className="flex items-center bg-[#090a0c] p-1 rounded-xl border border-white/10 text-xs">
            <button
              id="btn-chart-donut"
              onClick={() => setChartType('donut')}
              className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                chartType === 'donut'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Donut</span>
            </button>

            <button
              id="btn-chart-bars"
              onClick={() => setChartType('bars')}
              className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                chartType === 'bars'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ranked Bars</span>
            </button>

            <button
              id="btn-chart-trend"
              onClick={() => setChartType('trend')}
              className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                chartType === 'trend'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Daily Run-Rate</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Summary Highlight KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Total Monthly Spend */}
        <div className="bg-[#090a0c] p-4 rounded-xl border border-white/5 space-y-1">
          <span className="text-slate-500 text-[10px] uppercase tracking-wider font-medium">
            {selectedMonth} Total Spend
          </span>
          <div className="text-2xl font-serif text-white tracking-tight">
            ${totalMonthlySpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {momChange && (
            <div className={`text-[11px] flex items-center gap-1 font-medium ${
              momChange.isIncrease ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {momChange.isIncrease ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              <span>{Math.abs(momChange.pct)}% vs {previousMonthInfo.month}</span>
            </div>
          )}
        </div>

        {/* Daily Average Spend */}
        <div className="bg-[#090a0c] p-4 rounded-xl border border-white/5 space-y-1">
          <span className="text-slate-500 text-[10px] uppercase tracking-wider font-medium">
            Daily Average Spend
          </span>
          <div className="text-2xl font-serif text-indigo-400 tracking-tight">
            ${dailyAverage.toFixed(2)}<span className="text-xs font-sans text-slate-500">/day</span>
          </div>
          <div className="text-[11px] text-slate-400">
            {currentMonthTransactions.length} total transactions
          </div>
        </div>

        {/* Top Expense Category */}
        <div 
          onClick={() => topCategory && handleSelectDrilldown(topCategory.category)}
          className="bg-[#090a0c] p-4 rounded-xl border border-white/5 space-y-1 cursor-pointer hover:border-indigo-500/30 transition-all group"
          title="Click to drill down"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-[10px] uppercase tracking-wider font-medium">
              Top Category ({topCategory?.percentage || 0}%)
            </span>
            <span className="text-[10px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
              Drill down →
            </span>
          </div>
          <div className="text-xl font-bold text-white truncate flex items-center gap-2">
            {topCategory ? (
              <>
                <span 
                  className="w-2.5 h-2.5 rounded-full shrink-0" 
                  style={{ backgroundColor: CATEGORY_COLOR_MAP[topCategory.category] || '#6366f1' }}
                />
                <span className="truncate">{topCategory.category}</span>
              </>
            ) : (
              'None'
            )}
          </div>
          <div className="text-[11px] text-slate-400">
            ${topCategory ? topCategory.amount.toFixed(2) : '0.00'} spent
          </div>
        </div>

        {/* Largest Single Expense */}
        <div className="bg-[#090a0c] p-4 rounded-xl border border-white/5 space-y-1">
          <span className="text-slate-500 text-[10px] uppercase tracking-wider font-medium">
            Largest Single Expense
          </span>
          <div className="text-2xl font-serif text-amber-400 tracking-tight truncate">
            {maxSingleExpense ? `$${maxSingleExpense.amount.toFixed(2)}` : '$0.00'}
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            {maxSingleExpense ? `${maxSingleExpense.provider} (${maxSingleExpense.category})` : 'No expenses'}
          </div>
        </div>

      </div>

      {/* Main D3 Graphic Display & Category Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left / Top: Active D3 Chart View */}
        <div className="lg:col-span-6 bg-[#090a0c] p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center min-h-[320px] relative">
          
          {/* Helpful click to drilldown hint banner */}
          <div className="w-full flex items-center justify-between text-[11px] text-slate-400 mb-2 px-2">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Hover for live insights &bull; Click to drill down
            </span>
            {drilledCategory && (
              <button
                onClick={() => setDrilledCategory(null)}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 underline underline-offset-2"
              >
                Reset filter
              </button>
            )}
          </div>

          {chartType === 'donut' && (
            <div className="w-full flex flex-col items-center">
              <svg id="d3-donut-svg" ref={donutSvgRef} className="w-full max-w-[320px] overflow-visible" />
              <p className="text-[10px] text-slate-500 mt-3 text-center">
                Click any slice to drill down into that category's detailed transactions.
              </p>
            </div>
          )}

          {chartType === 'bars' && (
            <div className="w-full overflow-x-auto">
              <svg id="d3-bars-svg" ref={barChartSvgRef} className="w-full min-w-[300px]" />
              <p className="text-[10px] text-slate-500 mt-2 text-center">
                Ranked expense volume across spending categories. Click any bar to drill down.
              </p>
            </div>
          )}

          {chartType === 'trend' && (
            <div className="w-full overflow-x-auto">
              <svg id="d3-trend-svg" ref={trendSvgRef} className="w-full min-w-[300px]" />
              <p className="text-[10px] text-slate-500 mt-2 text-center">
                Hover over data dots to inspect day-by-day velocity during {selectedMonth}.
              </p>
            </div>
          )}
        </div>

        {/* Right: Category Breakdown Cards with Drill-Down Actions */}
        <div className="lg:col-span-6 space-y-2.5 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
          {categoryData.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              No expenses recorded for {selectedMonth} {selectedYear}.
            </div>
          ) : (
            categoryData.map((item) => {
              const isDrilled = drilledCategory === item.category;
              const isHovered = hoveredCategory === item.category;
              const color = CATEGORY_COLOR_MAP[item.category] || '#6366f1';

              return (
                <div
                  key={item.category}
                  onMouseEnter={() => setHoveredCategory(item.category)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  onClick={() => handleSelectDrilldown(item.category)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isDrilled
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-lg ring-1 ring-indigo-500/50'
                      : isHovered
                      ? 'bg-[#1a1d26] border-white/20'
                      : 'bg-[#090a0c] border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-md shrink-0 shadow-sm" style={{ backgroundColor: color }} />
                      <span className="text-xs font-semibold text-white">{item.category}</span>
                      <span className="text-[10px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">
                        {item.count} tx
                      </span>
                      {isDrilled && (
                        <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-medium px-1.5 py-0.2 rounded border border-indigo-500/30">
                          Active Drill-Down
                        </span>
                      )}
                    </div>

                    <div className="text-right flex items-baseline gap-2">
                      <span className="text-xs font-serif font-bold text-white">
                        ${item.amount.toFixed(2)}
                      </span>
                      <span className="text-[10px] font-semibold text-indigo-400 min-w-[38px]">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-white/5 h-1.5 rounded-full mt-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: color
                      }}
                    />
                  </div>

                  {/* Action row & Top merchant preview */}
                  <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate max-w-[200px]">
                      {item.topTransaction ? (
                        <>Top: <strong className="text-slate-300">{item.topTransaction.provider}</strong> (${item.topTransaction.amount.toFixed(2)})</>
                      ) : (
                        'No merchant records'
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectDrilldown(item.category);
                      }}
                      className={`text-[10px] font-medium px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                        isDrilled
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white/5 hover:bg-white/10 text-indigo-300'
                      }`}
                    >
                      {isDrilled ? 'Close View ✕' : `View ${item.count} tx →`}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* ===================================================================== */}
      {/* 4. CLICK-TO-DRILL-DOWN TRANSACTION LIST PANEL */}
      {/* ===================================================================== */}
      {drilledCategoryData && (
        <div 
          id="category-drilldown-panel" 
          ref={drilldownPanelRef}
          className="mt-6 bg-[#090a0c] rounded-2xl border border-indigo-500/30 p-5 space-y-4 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Header of Drill-Down with Category Branding & Close Button */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-md"
                style={{ backgroundColor: drilledCategoryData.color }}
              >
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-bold text-white tracking-tight">
                    {drilledCategoryData.category} Transactions
                  </h4>
                  <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 font-medium">
                    {selectedMonth} {selectedYear}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Detailed drill-down breakdown for {drilledCategoryData.category} spending
                </p>
              </div>
            </div>

            {/* Close Drill-Down Button */}
            <div className="flex items-center gap-2">
              {onNavigateToTab && (
                <button
                  onClick={() => onNavigateToTab('transactions')}
                  className="px-3 py-1.5 rounded-xl text-xs bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Full Ledger</span>
                </button>
              )}
              <button
                id="btn-close-drilldown"
                onClick={() => setDrilledCategory(null)}
                className="px-3 py-1.5 rounded-xl text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 flex items-center gap-1.5 transition-colors font-medium"
              >
                <X className="w-3.5 h-3.5" />
                <span>Close Drill-Down</span>
              </button>
            </div>
          </div>

          {/* Category Summary Key Metrics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#14161c] p-3.5 rounded-xl border border-white/5">
            <div>
              <div className="text-[10px] uppercase text-slate-500 font-medium">Total Category Spend</div>
              <div className="text-xl font-serif font-bold text-white">
                ${drilledCategoryData.totalSpend.toFixed(2)}
              </div>
              <div className="text-[11px] text-indigo-400">
                {drilledCategoryData.percentageOfTotal.toFixed(1)}% of monthly total
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase text-slate-500 font-medium">Transactions Count</div>
              <div className="text-xl font-serif font-bold text-white">
                {drilledCategoryData.count}
              </div>
              <div className="text-[11px] text-slate-400">
                {drilledCategoryData.subcategories.length} subcategories
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase text-slate-500 font-medium">Average Purchase</div>
              <div className="text-xl font-serif font-bold text-emerald-400">
                ${drilledCategoryData.avgSpend.toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-400">per transaction</div>
            </div>

            <div>
              <div className="text-[10px] uppercase text-slate-500 font-medium">Budget Status</div>
              <div className="text-xl font-serif font-bold text-amber-400">
                {drilledCategoryData.budgetLimit 
                  ? `$${drilledCategoryData.budgetLimit.toFixed(0)}` 
                  : 'No limit'}
              </div>
              <div className="text-[11px] text-slate-400">
                {drilledCategoryData.budgetLimit 
                  ? `${Math.round((drilledCategoryData.totalSpend / drilledCategoryData.budgetLimit) * 100)}% utilized`
                  : 'Uncapped'}
              </div>
            </div>
          </div>

          {/* Search, Subcategory Filter & Sort Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-drilldown-search"
                type="text"
                value={drillSearchQuery}
                onChange={(e) => setDrillSearchQuery(e.target.value)}
                placeholder="Search vendor, memo, subcategory..."
                className="w-full pl-9 pr-8 py-2 bg-[#14161c] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              {drillSearchQuery && (
                <button
                  onClick={() => setDrillSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Subcategory & Sort Selectors */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Subcategory Filter */}
              {drilledCategoryData.subcategories.length > 1 && (
                <div className="flex items-center gap-1.5 bg-[#14161c] px-2.5 py-1.5 rounded-xl border border-white/10 text-slate-300">
                  <Filter className="w-3.5 h-3.5 text-indigo-400" />
                  <select
                    id="select-drilldown-subcat"
                    value={drillSubcategoryFilter}
                    onChange={(e) => setDrillSubcategoryFilter(e.target.value)}
                    className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-[#14161c] text-white">All Subcategories</option>
                    {drilledCategoryData.subcategories.map((sub) => (
                      <option key={sub} value={sub} className="bg-[#14161c] text-white">{sub}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sort By Selector */}
              <div className="flex items-center gap-1.5 bg-[#14161c] px-2.5 py-1.5 rounded-xl border border-white/10 text-slate-300">
                <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
                <select
                  id="select-drilldown-sort"
                  value={drillSortBy}
                  onChange={(e: any) => setDrillSortBy(e.target.value)}
                  className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="date-desc" className="bg-[#14161c] text-white">Date (Newest First)</option>
                  <option value="date-asc" className="bg-[#14161c] text-white">Date (Oldest First)</option>
                  <option value="amount-desc" className="bg-[#14161c] text-white">Amount (Highest First)</option>
                  <option value="amount-asc" className="bg-[#14161c] text-white">Amount (Lowest First)</option>
                  <option value="vendor-asc" className="bg-[#14161c] text-white">Vendor (A to Z)</option>
                </select>
              </div>

              <span className="text-[11px] text-slate-500 px-1">
                Showing {drilledCategoryData.filteredTransactions.length} of {drilledCategoryData.count}
              </span>
            </div>
          </div>

          {/* Specific Transactions Table / Cards List */}
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
            {drilledCategoryData.filteredTransactions.length === 0 ? (
              <div className="text-center py-12 bg-[#14161c] rounded-xl border border-white/5 space-y-2">
                <Search className="w-6 h-6 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-400">
                  No transactions match your search filter in {drilledCategoryData.category}.
                </p>
                <button
                  onClick={() => {
                    setDrillSearchQuery('');
                    setDrillSubcategoryFilter('all');
                  }}
                  className="text-xs text-indigo-400 hover:underline"
                >
                  Clear search filters
                </button>
              </div>
            ) : (
              drilledCategoryData.filteredTransactions.map((tx) => {
                const acct = accounts.find((a) => a.id === tx.accountId);
                return (
                  <div
                    key={tx.id}
                    className="p-3 bg-[#14161c] hover:bg-[#181b24] transition-colors rounded-xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    {/* Left: Vendor details, subcategory, account */}
                    <div className="flex items-start gap-3">
                      <div 
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-serif text-sm font-bold text-white shrink-0 shadow"
                        style={{ backgroundColor: `${drilledCategoryData.color}33`, borderColor: `${drilledCategoryData.color}66` }}
                      >
                        {tx.provider.charAt(0)}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white tracking-tight">
                            {tx.provider}
                          </span>
                          {tx.subcategory && (
                            <span className="text-[10px] bg-white/5 text-slate-300 px-2 py-0.5 rounded font-medium border border-white/10">
                              {tx.subcategory}
                            </span>
                          )}
                          {tx.isSubscription && (
                            <span className="text-[10px] bg-indigo-500/10 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/20 font-medium">
                              Recurring
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            {tx.date}
                          </span>
                          <span>&bull;</span>
                          {acct && (
                            <span className="flex items-center gap-1 text-slate-400">
                              <CreditCard className="w-3 h-3 text-slate-500" />
                              {acct.name}
                            </span>
                          )}
                          {tx.description && (
                            <>
                              <span>&bull;</span>
                              <span className="text-slate-400 italic truncate max-w-[200px]">
                                {tx.description}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount, receipt preview button, status */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center">
                      {/* Receipt Action Button if receipt exists */}
                      {tx.receiptUrl ? (
                        <button
                          type="button"
                          onClick={() => setLightboxReceipt({
                            url: tx.receiptUrl!,
                            provider: tx.provider,
                            amount: tx.amount,
                            date: tx.date
                          })}
                          className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-[11px] flex items-center gap-1.5 transition-colors"
                          title="View receipt image"
                        >
                          <Receipt className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Receipt</span>
                        </button>
                      ) : null}

                      <div className="text-right">
                        <div className="text-base font-serif font-bold text-white tracking-tight">
                          -${tx.amount.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center justify-end gap-1">
                          {tx.status === 'Pending' ? (
                            <span className="text-amber-400">Pending</span>
                          ) : (
                            <span className="text-emerald-400">Cleared</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Quick Category Quick-Select Pills Bar (Always accessible) */}
      <div className="pt-2 border-t border-white/5 flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-[10px] uppercase text-slate-500 font-semibold shrink-0">
          Quick Drill-Down:
        </span>
        {categoryData.map((cat) => {
          const isSelected = drilledCategory === cat.category;
          const color = CATEGORY_COLOR_MAP[cat.category] || '#6366f1';
          return (
            <button
              key={cat.category}
              onClick={() => handleSelectDrilldown(cat.category)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0 flex items-center gap-1.5 transition-all border ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-md scale-105'
                  : 'bg-[#090a0c] text-slate-400 border-white/5 hover:border-white/20 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span>{cat.category}</span>
              <span className="opacity-70 font-mono text-[10px]">(${cat.amount.toFixed(0)})</span>
            </button>
          );
        })}
      </div>

      {/* Lightbox Modal for Receipt Preview */}
      {lightboxReceipt && (
        <div 
          id="receipt-lightbox-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setLightboxReceipt(null)}
        >
          <div 
            className="bg-[#14161c] border border-white/10 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-indigo-400" />
                  {lightboxReceipt.provider} Receipt
                </h4>
                <p className="text-xs text-slate-400">
                  {lightboxReceipt.date} &bull; ${lightboxReceipt.amount.toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => setLightboxReceipt(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative max-h-[400px] flex items-center justify-center bg-black/50 rounded-xl overflow-hidden border border-white/5 p-2">
              <img
                src={lightboxReceipt.url}
                alt={`${lightboxReceipt.provider} Receipt`}
                className="max-h-[380px] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href={lightboxReceipt.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open original image
              </a>
              <button
                onClick={() => setLightboxReceipt(null)}
                className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
