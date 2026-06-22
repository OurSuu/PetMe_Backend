// Master Data Types
export interface ProductCategory {
  id: number;
  name: string;
  slug: string;
  createdAt: string;
}

export interface ExpenseCategory {
  id: number;
  name: string;
  groupName: string;
  createdAt: string;
}

export interface SalesChannel {
  id: number;
  name: string;
  createdAt: string;
}

export interface Product {
  id: number;
  name: string;
  categoryId: number | null;
  baseCost: string;
  isArchived: boolean;
  createdAt: string;
  category?: ProductCategory | null;
}

// Transaction Types
export interface Expense {
  id: number;
  categoryId: number;
  description: string | null;
  amount: string;
  quantity: number;
  costPerUnit: string | null;
  receiptPath: string | null;
  isCleared: boolean;
  expenseDate: string;
  createdAt: string;
  updatedAt: string;
  category?: ExpenseCategory;
  productId?: number | null;
  product?: Product;
}

export interface Income {
  id: number;
  productId: number;
  channelId: number;
  quantity: number;
  fullPrice: string;
  discountPercent: string;
  netAmount: string;
  discountAmount: string;
  cashFlowStatus: 'pending' | 'cleared';
  isCleared: boolean;
  saleDate: string;
  createdAt: string;
  updatedAt: string;
  product?: Product;
  channel?: SalesChannel;
}

// Dashboard Types
export interface DashboardMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  totalDiscounts: number;
  taxProvision: number;
  totalFixedExpenses?: number;
  breakEvenRevenue?: number;
}

export interface ExpenseDistribution {
  name: string;
  value: number;
  group: string;
}

export interface SalesByCategory {
  category: string;
  sales: number;
  profit: number;
}

export interface DailySummary {
  cashIn: number;
  cashOut: number;
  netCashFlow: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  expensesByCategory: ExpenseDistribution[];
  salesByCategory: SalesByCategory[];
  dailySummary: DailySummary;
}

// Inventory Types
export interface InventoryItem {
  product: Product;
  totalSold: number;
  totalProduced: number;
  currentStock: number;
  daysAged?: number | null;
}

// Settings Types
export interface Setting {
  id: number;
  key: string;
  value: any;
  updatedAt: string;
}

export interface TaxProvisionSetting {
  enabled: boolean;
  rate: number;
  label: string;
}

export interface CurrencySetting {
  code: string;
  symbol: string;
  locale: string;
}

// API Response Types  
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

// Form Types
export interface ExpenseFormData {
  categoryId: number;
  productId?: number;
  description?: string;
  amount: string;
  quantity: number;
  costPerUnit?: string;
  expenseDate: string;
  receipt?: File;
}

export interface IncomeFormData {
  productId: number;
  channelId: number;
  quantity: number;
  fullPrice: string;
  discountPercent: string;
  netAmount: string;
  discountAmount: string;
  cashFlowStatus: 'pending' | 'cleared';
  saleDate: string;
}

// Date filter type
export type DatePeriod = 'today' | 'week' | 'month' | 'year' | 'custom';
