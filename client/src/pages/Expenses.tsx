import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Download } from 'lucide-react';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import DataTable, { Column } from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Badge from '../components/ui/Badge';
import { api } from '../api/client';
import { downloadCSV } from '../utils/export';
import { Expense, Product } from '../types';

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    isProduct: false,
    productName: '',
    productId: '', // still keep for existing product selection if needed, though we primarily use productName
    description: '',
    note: '',
    amount: '',
    quantity: '1',
    expenseDate: new Date().toISOString().split('T')[0]
  });

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [expensesRes, productsRes] = await Promise.all([
        api.get<Expense[]>('/expenses'),
        api.get<Product[]>('/products')
      ]);
      setExpenses(expensesRes || []);
      setProducts(productsRes || []);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(() => fetchData(false), 10000); // Poll every 10s
    return () => clearInterval(intervalId);
  }, []);

  const handleOpenModal = (expense?: Expense) => {
    if (expense) {
      setSelectedExpense(expense);
      setFormData({
        isProduct: !!expense.productId,
        productName: expense.product?.name || '',
        productId: expense.productId?.toString() || '',
        description: expense.description || '',
        note: expense.note || '',
        amount: expense.amount,
        quantity: expense.quantity.toString(),
        expenseDate: expense.expenseDate
      });
    } else {
      setSelectedExpense(null);
      setFormData({
        isProduct: false,
        productName: '',
        productId: '',
        description: '',
        note: '',
        amount: '',
        quantity: '1',
        expenseDate: new Date().toISOString().split('T')[0]
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: any = {
        description: formData.description,
        note: formData.note,
        amount: formData.amount,
        quantity: parseInt(formData.quantity),
        expenseDate: formData.expenseDate
      };
      
      if (formData.isProduct) {
        payload.productName = formData.productName;
        // Optionally pass productId if they didn't change the name and we know it
      } else {
        payload.productId = null;
        payload.productName = '';
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

  const handleOpenDelete = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsDeleteOpen(true);
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
      Type: e.productId ? 'Product Cost' : 'General',
      Product: e.product?.name || '',
      Title: e.description || '',
      Note: e.note || '',
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
      key: 'type',
      header: 'Type',
      render: (_, row) => (
        <Badge variant={row.productId ? 'warning' : 'default'}>
          {row.productId ? 'Product Cost' : 'General'}
        </Badge>
      )
    },
    {
      key: 'description',
      header: 'Title / Item'
    },
    {
      key: 'product.name',
      header: 'Product',
      render: (_, row) => row.product?.name || '-'
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
            actions={(row) => (
              <>
                <button 
                  onClick={() => handleOpenModal(row)} 
                  className="p-1 text-text-muted hover:text-accent-primary transition-colors"
                  title="Edit Expense"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleOpenDelete(row)} 
                  className="p-1 text-text-muted hover:text-accent-danger transition-colors"
                  title="Delete Expense"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          />
        </Card>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedExpense ? "Edit Expense" : "Log New Expense"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title / Item Name"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="e.g., ค่าสกรีนเสื้อ, ค่าขนส่ง"
            required
          />

          <div className="flex items-center gap-2 pt-2 pb-2">
            <input
              type="checkbox"
              id="isProduct"
              checked={formData.isProduct}
              onChange={(e) => setFormData({...formData, isProduct: e.target.checked})}
              className="w-4 h-4 rounded border-border-hover bg-surface-secondary text-accent-primary focus:ring-accent-primary/50 cursor-pointer"
            />
            <label htmlFor="isProduct" className="text-sm text-text-primary cursor-pointer select-none">
              This is a Product Stock Cost (เป็นต้นทุนสินค้า)
            </label>
          </div>

          {formData.isProduct && (
            <div className="relative">
              <Input
                label="Product Name"
                value={formData.productName}
                onChange={(e) => setFormData({...formData, productName: e.target.value})}
                placeholder="e.g., PET ME — หน้างอ สีดำ M"
                required={formData.isProduct}
                list="product-suggestions"
              />
              <datalist id="product-suggestions">
                {products.map(p => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
              <p className="text-xs text-text-muted mt-1">
                Type the product name. If it doesn't exist, it will be created automatically.
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Total Amount (฿)"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              required
            />
            <Input
              label="Quantity"
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: e.target.value})}
              required
            />
            <Input
              label="Date"
              type="date"
              value={formData.expenseDate}
              onChange={(e) => setFormData({...formData, expenseDate: e.target.value})}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Note / Remarks</label>
            <textarea
              className="w-full bg-surface-secondary border border-border-hover rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/50 transition-colors"
              rows={3}
              value={formData.note}
              onChange={(e) => setFormData({...formData, note: e.target.value})}
              placeholder="Any additional details..."
            />
          </div>

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
