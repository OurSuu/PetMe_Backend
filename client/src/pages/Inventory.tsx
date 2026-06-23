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
import { InventoryItem, Expense, ProductCategory, Product } from '../types';

interface ExtendedInventoryItem extends InventoryItem {
  computedProduced: number;
  computedStock: number;
  totalAdjusted: number;
  daysAged: number | null;
}

export default function Inventory() {
  const [inventory, setInventory] = useState<ExtendedInventoryItem[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    categoryName: '',
    baseCost: '0'
  });

  const [adjustFormData, setAdjustFormData] = useState({
    quantity: '',
    reason: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, expRes, catRes] = await Promise.all([
        api.get<InventoryItem[]>('/inventory'),
        api.get<Expense[]>('/expenses'),
        api.get<ProductCategory[]>('/product-categories')
      ]);
      
      setCategories(catRes || []);

      if (invRes && expRes) {
        const extended = invRes.map((item: any) => {
          const producedExpenses = expRes.filter(e => 
            e.productId === item.product.id
          );
          
          const computedProduced = producedExpenses.reduce((sum, e) => sum + e.quantity, 0);
          const totalAdjusted = item.totalAdjusted || 0;
          const computedStock = computedProduced - item.totalSold + totalAdjusted;

          return {
            ...item,
            computedProduced,
            totalAdjusted,
            computedStock,
            daysAged: item.daysAged !== undefined ? item.daysAged : null
          };
        });
        
        setInventory(extended);
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setSelectedProduct(product);
      setFormData({
        name: product.name,
        categoryName: product.category?.name || '',
        baseCost: product.baseCost
      });
    } else {
      setSelectedProduct(null);
      setFormData({
        name: '',
        categoryName: '',
        baseCost: '0'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        categoryName: formData.categoryName,
        baseCost: formData.baseCost
      };

      if (selectedProduct) {
        await api.put(`/products/${selectedProduct.id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Failed to save product', error);
      alert('Error saving product: ' + (error.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDelete = (product: Product, totalSold: number) => {
    setSelectedProduct(product);
    if (totalSold > 0) {
      setDeleteMessage(`"${product.name}" has existing sales records. It will be safely ARCHIVED (Discontinued) to preserve financial history.`);
    } else {
      setDeleteMessage(`"${product.name}" has no sales records. It will be PERMANENTLY deleted.`);
    }
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    setSubmitting(true);
    try {
      await api.delete(`/products/${selectedProduct.id}`);
      setIsDeleteOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Failed to delete/archive product', error);
      alert('Error deleting product: ' + (error.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAdjust = (product: Product) => {
    setSelectedProduct(product);
    setAdjustFormData({ quantity: '', reason: '' });
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    
    const qty = parseInt(adjustFormData.quantity);
    if (isNaN(qty) || qty === 0) {
      alert('Please enter a valid non-zero number (e.g. 10 or -5).');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/inventory/adjust', {
        productId: selectedProduct.id,
        quantity: qty,
        reason: adjustFormData.reason
      });
      setIsAdjustModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Failed to adjust stock', error);
      alert('Error adjusting stock: ' + (error.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    const exportData = inventory.map(i => ({
      ProductName: i.product.name,
      Category: i.product.category?.name || 'Unknown',
      TotalProduced: i.computedProduced,
      TotalSold: i.totalSold,
      CurrentStock: i.computedStock,
      DaysAged: i.daysAged !== null ? i.daysAged : 'N/A',
      Status: i.product.isArchived ? 'Discontinued' : 'Active'
    }));
    downloadCSV(exportData, 'inventory_export');
  };

  const getStockStatus = (stock: number) => {
    if (stock <= 5) return 'danger';
    if (stock <= 20) return 'warning';
    return 'success';
  };

  const columns: Column<ExtendedInventoryItem>[] = [
    {
      key: 'product.name',
      header: 'Product Name',
      sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <span className={row.product.isArchived ? 'opacity-60 line-through' : ''}>{row.product.name}</span>
          {row.product.isArchived && <Badge variant="danger">Discontinued</Badge>}
        </div>
      )
    },
    {
      key: 'product.category.name',
      header: 'Category',
      render: (_, row) => <span className={`text-text-muted ${row.product.isArchived ? 'opacity-60' : ''}`}>{row.product.category?.name}</span>
    },
    {
      key: 'computedProduced',
      header: 'Total Produced',
      align: 'center',
      sortable: true,
      render: (val, row) => <span className={row.product.isArchived ? 'opacity-60' : ''}>{val as number}</span>
    },
    {
      key: 'totalSold',
      header: 'Total Sold',
      align: 'center',
      sortable: true,
      render: (val, row) => <span className={row.product.isArchived ? 'opacity-60' : ''}>{val as number}</span>
    },
    {
      key: 'computedStock',
      header: 'Current Stock',
      align: 'center',
      sortable: true,
      render: (val, row) => (
        <div className={row.product.isArchived ? 'opacity-60' : ''}>
          <Badge variant={row.product.isArchived ? 'default' : getStockStatus(val as number)}>
            {val as number} in stock
          </Badge>
        </div>
      )
    },
    {
      key: 'daysAged',
      header: 'Days Aged',
      align: 'center',
      sortable: true,
      render: (val, row) => <span className={row.product.isArchived ? 'opacity-60' : ''}>{val !== null ? `${val} days` : 'N/A'}</span>
    }
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Inventory & Products" subtitle="Manage products and monitor calculated stock levels">
        <div className="flex gap-3">
          <Button onClick={handleExport} variant="secondary" icon={<Download className="w-4 h-4" />}>
            Export CSV
          </Button>
          <Button onClick={() => handleOpenModal()} icon={<Plus className="w-4 h-4" />}>
            New Product
          </Button>
        </div>
      </Header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-20">
        <Card title="Products & Stock Levels">
          <DataTable 
            columns={columns} 
            data={inventory} 
            loading={loading}
            keyExtractor={(row) => row.product.id.toString()}
            actions={(row) => (
              <>
                <button 
                  onClick={() => handleOpenAdjust(row.product)} 
                  className="p-1 text-text-muted hover:text-accent-primary transition-colors font-bold text-lg leading-none flex items-center justify-center w-6 h-6"
                  title="Adjust Stock"
                >
                  ±
                </button>
                <button 
                  onClick={() => handleOpenModal(row.product)} 
                  className="p-1 text-text-muted hover:text-accent-primary transition-colors"
                  title="Edit Product"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleOpenDelete(row.product, row.totalSold)} 
                  className="p-1 text-text-muted hover:text-accent-danger transition-colors"
                  title="Delete/Archive Product"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          />
        </Card>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedProduct ? "Edit Product" : "New Product"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Product Name"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
            autoFocus
          />
          <Input
            label="Category"
            value={formData.categoryName}
            onChange={(e) => setFormData({...formData, categoryName: e.target.value})}
            placeholder="e.g. T-Shirt"
            list="category-suggestions"
            required
          />
          <datalist id="category-suggestions">
            {categories.map(c => <option key={c.id} value={c.name} />)}
          </datalist>
          <Input
            label="Base Cost (฿)"
            type="number"
            step="0.01"
            min="0"
            value={formData.baseCost}
            onChange={(e) => setFormData({...formData, baseCost: e.target.value})}
            required
          />
          <div className="pt-4 flex justify-end gap-3 border-t border-border-primary/50">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Save Product</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Product"
        message={deleteMessage}
        confirmText={deleteMessage.includes('ARCHIVED') ? 'Archive' : 'Delete'}
        loading={submitting}
        variant="danger"
      />

      <Modal isOpen={isAdjustModalOpen} onClose={() => setIsAdjustModalOpen(false)} title="Adjust Stock" size="sm">
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          <div className="text-sm text-text-secondary mb-4">
            Adjusting stock for: <strong className="text-text-primary">{selectedProduct?.name}</strong>
          </div>
          <Input
            label="Quantity Adjustment (+/-)"
            type="number"
            value={adjustFormData.quantity}
            onChange={(e) => setAdjustFormData({...adjustFormData, quantity: e.target.value})}
            placeholder="e.g. -5 to remove, 10 to add"
            required
            autoFocus
          />
          <Input
            label="Reason (Optional)"
            value={adjustFormData.reason}
            onChange={(e) => setAdjustFormData({...adjustFormData, reason: e.target.value})}
            placeholder="e.g. Damaged, Sample, Correction"
          />
          {selectedProduct && (
            <div className="text-xs text-text-muted mt-2 p-2 bg-surface-secondary rounded">
              <strong>Tip:</strong> Stock is calculated automatically. To reset stock to 0, adjust it by the opposite of the current stock (e.g., if stock is -1000, add +1000).
            </div>
          )}
          <div className="pt-4 flex justify-end gap-3 border-t border-border-primary/50">
            <Button type="button" variant="ghost" onClick={() => setIsAdjustModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Confirm</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
