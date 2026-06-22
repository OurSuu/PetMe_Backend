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
import { InventoryItem, Expense, ProductCategory, Product } from '../types';

interface ExtendedInventoryItem extends InventoryItem {
  computedProduced: number;
  computedStock: number;
  daysAged: number | null;
}

export default function Inventory() {
  const [inventory, setInventory] = useState<ExtendedInventoryItem[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const role = localStorage.getItem('userRole') || 'staff';

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    baseCost: '0'
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
        const extended = invRes.map(item => {
          const producedExpenses = expRes.filter(e => 
            e.category?.groupName === 'Production' && 
            e.productId === item.product.id
          );
          
          const computedProduced = producedExpenses.reduce((sum, e) => sum + e.quantity, 0);
          const computedStock = computedProduced - item.totalSold;

          return {
            ...item,
            computedProduced,
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
        categoryId: product.categoryId?.toString() || '',
        baseCost: product.baseCost
      });
    } else {
      setSelectedProduct(null);
      setFormData({
        name: '',
        categoryId: categories.length > 0 ? categories[0].id.toString() : '',
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
        categoryId: parseInt(formData.categoryId),
        baseCost: formData.baseCost
      };

      if (selectedProduct) {
        await api.put(`/products/${selectedProduct.id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Failed to save product', error);
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
    } catch (error) {
      console.error('Failed to delete/archive product', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const slug = newCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const created = await api.post<ProductCategory>('/product-categories', {
        name: newCategoryName,
        slug
      });
      // Re-fetch categories to get the full list with new ID
      const catRes = await api.get<ProductCategory[]>('/product-categories');
      if (catRes) setCategories(catRes);
      
      // Auto-select the newly created category
      setFormData(prev => ({ ...prev, categoryId: created.id.toString() }));
      setIsCategoryModalOpen(false);
      setNewCategoryName('');
    } catch (error: any) {
      console.error('Failed to create category', error);
      if (error?.status === 409) {
        alert('A category with this name already exists.');
      }
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
            actions={role === 'owner' ? (row) => (
              <>
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
            ) : undefined}
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
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Select
                label="Category"
                value={formData.categoryId}
                onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                options={categories.map(c => ({ value: c.id, label: c.name }))}
                required
              />
            </div>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => setIsCategoryModalOpen(true)}
              className="mb-1"
              title="Add New Category"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
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

      <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title="Quick Add Category" size="sm">
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <Input
            label="Category Name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            required
            autoFocus
          />
          <div className="pt-4 flex justify-end gap-3 border-t border-border-primary/50">
            <Button type="button" variant="ghost" onClick={() => setIsCategoryModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Add</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
