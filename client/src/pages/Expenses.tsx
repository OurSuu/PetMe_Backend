import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Download } from 'lucide-react';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import DataTable, { Column } from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Badge from '../components/ui/Badge';
import { api } from '../api/client';
import { downloadCSV } from '../utils/export';
import { Expense, ExpenseCategory, Product } from '../types';

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const role = localStorage.getItem('userRole') || 'staff';
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    categoryId: '',
    productId: '',
    description: '',
    amount: '',
    quantity: '1',
    expenseDate: new Date().toISOString().split('T')[0],
    
    // Custom logic fields for production
    blankCost: '',
    screenCost: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [expensesRes, categoriesRes, productsRes] = await Promise.all([
        api.get<Expense[]>('/expenses'),
        api.get<{items: ExpenseCategory[], grouped: any}>('/expense-categories'),
        api.get<Product[]>('/products')
      ]);
      setExpenses(expensesRes || []);
      setCategories(categoriesRes?.items || []);
      setProducts(productsRes || []);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedCategory = categories.find(c => c.id.toString() === formData.categoryId);
  const isProduction = selectedCategory?.groupName === 'Production';

  const handleOpenModal = (expense?: Expense) => {
    if (expense) {
      setSelectedExpense(expense);
      setFormData({
        categoryId: expense.categoryId.toString(),
        productId: expense.productId?.toString() || '',
        description: expense.description || '',
        amount: expense.amount,
        quantity: expense.quantity.toString(),
        expenseDate: expense.expenseDate,
        blankCost: '',
        screenCost: ''
      });
    } else {
      setSelectedExpense(null);
      setFormData({
        categoryId: categories.length > 0 ? categories[0].id.toString() : '',
        productId: '',
        description: '',
        amount: '',
        quantity: '1',
        expenseDate: new Date().toISOString().split('T')[0],
        blankCost: '',
        screenCost: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let finalAmount = formData.amount;
      
      // Calculate production cost: (Blank + Screen)
      if (isProduction && formData.blankCost && formData.screenCost) {
        finalAmount = (parseFloat(formData.blankCost) + parseFloat(formData.screenCost)).toString();
      }

      const payload: any = {
        categoryId: parseInt(formData.categoryId),
        description: formData.description,
        amount: finalAmount,
        quantity: parseInt(formData.quantity),
        expenseDate: formData.expenseDate
      };
      
      if (isProduction && formData.productId) {
        payload.productId = parseInt(formData.productId);
      }

      if (selectedExpense) {
        await api.put(`/expenses/${selectedExpense.id}`, payload);
      } else {
        await api.post('/expenses', payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Failed to save expense', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedExpense) return;
    setSubmitting(true);
    try {
      await api.delete(`/expenses/${selectedExpense.id}`);
      setIsDeleteOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Failed to delete expense', error);
      if (error?.status === 403) alert('Forbidden: Only Owners can delete transactions.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleCleared = async (expense: Expense) => {
    try {
      await api.put(`/expenses/${expense.id}`, {
        ...expense,
        isCleared: !expense.isCleared
      });
      fetchData();
    } catch (error: any) {
      console.error('Failed to update clearance status', error);
      if (error?.status === 403) alert('Forbidden: Only Owners can modify transaction status.');
    }
  };

  const handleExport = () => {
    const exportData = expenses.map(e => ({
      Date: e.expenseDate,
      Category: e.category?.name || 'Unknown',
      Group: e.category?.groupName || 'Unknown',
      Description: e.description || '',
      CostPerUnit: e.amount,
      Quantity: e.quantity,
      Total: parseFloat(e.amount) * e.quantity,
      Cleared: e.isCleared ? 'Yes' : 'No'
    }));
    downloadCSV(exportData, 'expenses_export');
  };

  const columns: Column<Expense>[] = [
    {
      key: 'expenseDate',
      header: 'Date',
      render: (val) => new Date(val).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
    },
    {
      key: 'category.name',
      header: 'Category',
      render: (_, row) => (
        <Badge variant={row.category?.groupName === 'Production' ? 'warning' : 'default'}>
          {row.category?.name || 'Unknown'}
        </Badge>
      )
    },
    {
      key: 'description',
      header: 'Description'
    },
    {
      key: 'amount',
      header: 'Cost / Unit',
      align: 'right',
      render: (val) => `฿${parseFloat(val).toLocaleString()}`
    },
    {
      key: 'quantity',
      header: 'Qty',
      align: 'center'
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (_, row) => `฿${(parseFloat(row.amount) * row.quantity).toLocaleString()}`
    },
    {
      key: 'isCleared',
      header: 'Cleared (Bank)',
      align: 'center',
      render: (val, row) => (
        <input 
          type="checkbox" 
          checked={!!val} 
          onChange={() => handleToggleCleared(row)}
          className="w-4 h-4 rounded border-border-hover bg-surface-secondary text-accent-primary focus:ring-accent-primary/50 cursor-pointer"
        />
      )
    }
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Expenses">
        <div className="flex gap-3">
          <Button onClick={handleExport} variant="secondary" icon={<Download className="w-4 h-4" />}>
            Export CSV
          </Button>
          <Button onClick={() => handleOpenModal()} icon={<Plus className="w-4 h-4" />}>
            Log Expense
          </Button>
        </div>
      </Header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-20">
        <Card title="Expense History" className="mb-6">
          <DataTable 
            columns={columns} 
            data={expenses} 
            loading={loading}
            actions={role === 'owner' ? (row) => (
              <>
                <button onClick={() => handleOpenModal(row)} className="p-1 text-text-muted hover:text-accent-primary transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => { setSelectedExpense(row); setIsDeleteOpen(true); }} className="p-1 text-text-muted hover:text-accent-danger transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            ) : undefined}
          />
        </Card>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedExpense ? "Edit Expense" : "Log New Expense"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Category"
            value={formData.categoryId}
            onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
            options={categories.map(c => ({ value: c.id, label: `${c.groupName} - ${c.name}` }))}
            required
          />
          {isProduction && (
            <Select
              label="Related Product"
              value={formData.productId}
              onChange={(e) => setFormData({...formData, productId: e.target.value})}
              options={[{ value: '', label: 'Select Product...' }, ...products.map(p => ({ value: p.id, label: p.name }))]}
              required
            />
          )}
          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="e.g., T-Shirt Blank XL"
          />
          <Input
            label="Quantity"
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(e) => setFormData({...formData, quantity: e.target.value})}
            required
          />
          
          {isProduction ? (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Blank Cost (฿)"
                type="number"
                step="0.01"
                value={formData.blankCost}
                onChange={(e) => setFormData({...formData, blankCost: e.target.value})}
                required={!selectedExpense}
              />
              <Input
                label="Screen Cost (฿)"
                type="number"
                step="0.01"
                value={formData.screenCost}
                onChange={(e) => setFormData({...formData, screenCost: e.target.value})}
                required={!selectedExpense}
              />
            </div>
          ) : (
            <Input
              label="Amount (Cost per unit ฿)"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              required
            />
          )}

          <Input
            label="Date"
            type="date"
            value={formData.expenseDate}
            onChange={(e) => setFormData({...formData, expenseDate: e.target.value})}
            required
          />

          <div className="pt-4 flex justify-end gap-3 border-t border-border-primary/50">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Save Expense</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Expense"
        message="Are you sure you want to delete this expense record? This action cannot be undone and will affect your dashboard metrics."
        confirmText="Delete"
        loading={submitting}
      />
    </div>
  );
}
