import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Card from '../components/ui/Card';
import DateRangeFilter, { DateRangeValue } from '../components/ui/DateRangeFilter';
import Header from '../components/layout/Header';
import { api } from '../api/client';
import { DashboardData } from '../types';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(value);
};

const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#a78bfa', '#f472b6', '#2dd4bf'];

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRangeValue>({ period: 'month' });

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (dateRange.period) queryParams.append('period', dateRange.period);
        if (dateRange.startDate) queryParams.append('startDate', dateRange.startDate);
        if (dateRange.endDate) queryParams.append('endDate', dateRange.endDate);

        const response = await api.get<{ metrics: any, expensesByCategory: any[], salesByCategory: any[], dailySummary: any }>(`/dashboard?${queryParams.toString()}`);
        // The API returns { period, metrics, expensesByCategory, salesByCategory, dailySummary }
        setData(response as any);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [dateRange]);

  const metrics = data?.metrics;
  const expensesByCategory = data?.expensesByCategory || [];
  const salesByCategory = data?.salesByCategory || [];
  const dailySummary = data?.dailySummary;

  // Find most wasteful category
  const sortedExpenses = [...expensesByCategory].sort((a, b) => b.value - a.value);
  const topExpense = sortedExpenses[0];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Dashboard">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </Header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 pb-20">
        
        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card 
            variant="metric" 
            title="Total Revenue" 
            icon={<TrendingUp className="w-5 h-5" />} 
            accentColor="success"
            className="stagger-children"
          >
            {loading ? <div className="h-8 skeleton w-24 rounded mt-1"></div> : formatCurrency(metrics?.totalRevenue || 0)}
          </Card>
          
          <Card 
            variant="metric" 
            title="Total Expenses" 
            icon={<TrendingDown className="w-5 h-5" />} 
            accentColor="danger"
            className="stagger-children"
          >
            {loading ? <div className="h-8 skeleton w-24 rounded mt-1"></div> : formatCurrency(metrics?.totalExpenses || 0)}
          </Card>
          
          <Card 
            variant="metric" 
            title="Net Profit" 
            icon={<DollarSign className="w-5 h-5" />} 
            accentColor="primary"
            className="stagger-children"
          >
            {loading ? <div className="h-8 skeleton w-24 rounded mt-1"></div> : formatCurrency(metrics?.netProfit || 0)}
          </Card>
          
          <Card 
            variant="metric" 
            title="Profit Margin" 
            icon={<Percent className="w-5 h-5" />} 
            accentColor="warning"
            className="stagger-children"
          >
            {loading ? <div className="h-8 skeleton w-20 rounded mt-1"></div> : `${metrics?.profitMargin?.toFixed(1) || 0}%`}
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Expense Distribution" className="min-h-[400px]">
            {loading ? (
              <div className="h-full w-full flex items-center justify-center">
                <div className="w-64 h-64 skeleton rounded-full"></div>
              </div>
            ) : expensesByCategory.length > 0 ? (
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensesByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {expensesByCategory.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: '#1a1d2b', borderColor: 'rgba(255,255,255,0.06)', borderRadius: '0.75rem', color: '#f1f5f9' }}
                      itemStyle={{ color: '#f1f5f9' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {topExpense && (
                  <div className="text-center mt-4 text-sm">
                    <span className="text-text-muted">Largest Expense: </span>
                    <span className="text-accent-danger font-medium">{topExpense.name} ({formatCurrency(topExpense.value)})</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-text-muted">
                No expense data for this period
              </div>
            )}
          </Card>

          <Card title="Sales vs Profit by Category" className="min-h-[400px]">
            {loading ? (
              <div className="h-full w-full flex items-end justify-center gap-4 px-8 pb-8 pt-16">
                {[40, 70, 50, 90, 60].map((h, i) => (
                  <div key={i} className="w-12 skeleton rounded-t-md" style={{ height: `${h}%` }}></div>
                ))}
              </div>
            ) : salesByCategory.length > 0 ? (
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesByCategory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="category" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => `฿${value >= 1000 ? value/1000 + 'k' : value}`} />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      contentStyle={{ backgroundColor: '#1a1d2b', borderColor: 'rgba(255,255,255,0.06)', borderRadius: '0.75rem', color: '#f1f5f9' }}
                    />
                    <Bar dataKey="sales" name="Sales" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-text-muted">
                No sales data for this period
              </div>
            )}
          </Card>
        </div>

        {/* Lower Row: Daily Summary & Other Callouts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card title="Daily Closing Summary" subtitle="Today's Cash Flow">
            {loading ? (
              <div className="space-y-4 mt-2">
                <div className="h-10 skeleton rounded w-full"></div>
                <div className="h-10 skeleton rounded w-full"></div>
                <div className="h-10 skeleton rounded w-full"></div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 mt-2">
                <div className="flex justify-between items-center p-3 rounded-lg bg-surface-secondary border border-border-primary">
                  <span className="text-text-secondary font-medium">Cash In (Cleared)</span>
                  <span className="text-accent-success font-bold text-lg">{formatCurrency(dailySummary?.cashIn || 0)}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-surface-secondary border border-border-primary">
                  <span className="text-text-secondary font-medium">Cash Out</span>
                  <span className="text-accent-danger font-bold text-lg">{formatCurrency(dailySummary?.cashOut || 0)}</span>
                </div>
                <div className="flex justify-between items-center p-4 rounded-lg bg-surface-primary border border-border-hover shadow-md">
                  <span className="text-text-primary font-bold">Net Today</span>
                  <span className={`font-bold text-xl ${(dailySummary?.netCashFlow || 0) >= 0 ? 'text-accent-success' : 'text-accent-danger'}`}>
                    {formatCurrency(dailySummary?.netCashFlow || 0)}
                  </span>
                </div>
              </div>
            )}
          </Card>

          <Card title="Marketing / Discounts" subtitle="Lost Revenue via Promotions">
            {loading ? (
               <div className="h-20 skeleton rounded mt-4"></div>
            ) : (
              <div className="h-full flex flex-col justify-center mt-2">
                <div className="p-6 rounded-xl bg-accent-warning/10 border border-accent-warning/20 flex flex-col items-center justify-center text-center gap-2">
                  <span className="text-text-secondary text-sm">Total Promotional Discounts</span>
                  <span className="text-3xl font-bold text-accent-warning animate-scale-in">
                    {formatCurrency(metrics?.totalDiscounts || 0)}
                  </span>
                </div>
              </div>
            )}
          </Card>

          <Card title="Tax Provision" subtitle="Allocated Savings (from settings)">
            {loading ? (
              <div className="h-20 skeleton rounded mt-4"></div>
            ) : (
              <div className="h-full flex flex-col justify-center mt-2">
                <div className="p-6 rounded-xl bg-surface-secondary border border-border-primary flex flex-col items-center justify-center text-center gap-2 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-accent-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <span className="text-text-secondary text-sm">Reserved for Taxes</span>
                  <span className="text-3xl font-bold gradient-text animate-fade-in">
                    {formatCurrency(metrics?.taxProvision || 0)}
                  </span>
                </div>
              </div>
            )}
          </Card>

          <Card title="Break-even Analysis" subtitle="Target Revenue to Cover Fixed Costs">
            {loading ? (
              <div className="h-20 skeleton rounded mt-4"></div>
            ) : (
              <div className="h-full flex flex-col justify-center mt-2">
                <div className="p-6 rounded-xl bg-surface-secondary border border-border-primary flex flex-col items-center justify-center text-center gap-2 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-accent-success/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <span className="text-text-secondary text-sm">Fixed Exp: {formatCurrency(metrics?.totalFixedExpenses || 0)}</span>
                  <span className="text-3xl font-bold text-accent-success animate-fade-in">
                    {formatCurrency(metrics?.breakEvenRevenue || 0)}
                  </span>
                </div>
              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
}
