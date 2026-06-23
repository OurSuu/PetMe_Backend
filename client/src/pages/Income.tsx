import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Download, RefreshCw } from 'lucide-react';
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
import { Income, Product, SalesChannel } from '../types';

export default function IncomePage() {
  const [incomeList, setIncomeList] = useState<Income[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState<Income | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [formData, setFormData] = useState({
    productName: '',
    channelId: '',
    quantity: '1',
    fullPrice: '',
    discountPercent: '0',
    saleDate: new Date().toISOString().split('T')[0],
    cashFlowStatus: 'cleared'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [incomeRes, productsRes, channelsRes] = await Promise.all([
        api.get<Income[]>('/income'),
        api.get<Product[]>('/products'),
        api.get<SalesChannel[]>('/sales-channels')
      ]);
      setIncomeList(incomeRes || []);
      setProducts(productsRes || []);
      setChannels(channelsRes || []);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (income?: Income) => {
    if (income) {
      setSelectedIncome(income);
      setFormData({
        productName: income.product?.name || '',
        channelId: income.channelId.toString(),
        quantity: income.quantity.toString(),
        fullPrice: income.fullPrice,
        discountPercent: income.discountPercent,
        saleDate: income.saleDate,
        cashFlowStatus: income.cashFlowStatus
      });
    } else {
      setSelectedIncome(null);
      setFormData({
        productName: '',
        channelId: channels.length > 0 ? channels[0].id.toString() : '',
        quantity: '1',
        fullPrice: '',
        discountPercent: '0',
        saleDate: new Date().toISOString().split('T')[0],
        cashFlowStatus: 'cleared'
      });
    }
    setIsModalOpen(true);
  };

  // Auto populate full price based on selected product baseCost
  useEffect(() => {
    if (!selectedIncome && formData.productName) {
      const prod = products.find(p => p.name.toLowerCase() === formData.productName.toLowerCase());
      if (prod && prod.baseCost) {
        setFormData(prev => ({ ...prev, fullPrice: prod.baseCost }));
      }
    }
  }, [formData.productName, products, selectedIncome]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const full = parseFloat(formData.fullPrice);
      const discountPct = parseFloat(formData.discountPercent);
      const discountAmt = full * (discountPct / 100);
      const net = full - discountAmt;

      const payload = {
        productName: formData.productName,
        channelId: parseInt(formData.channelId),
        quantity: parseInt(formData.quantity),
        fullPrice: full.toString(),
        discountPercent: discountPct.toString(),
        discountAmount: discountAmt.toString(),
        netAmount: net.toString(),
        saleDate: formData.saleDate,
        cashFlowStatus: formData.cashFlowStatus
      };

      if (selectedIncome) {
        await api.put(`/income/${selectedIncome.id}`, payload);
      } else {
        await api.post('/income', payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Failed to save income', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedIncome) return;
    setSubmitting(true);
    try {
      await api.delete(`/income/${selectedIncome.id}`);
      setIsDeleteOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Failed to delete income', error);
      if (error?.status === 403) alert('Forbidden: Only Owners can delete transactions.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api.post<{message: string, count: number}>('/income/sync');
      alert(res.message || `Successfully synced preorders.`);
      fetchData();
    } catch (error: any) {
      console.error('Failed to sync preorders', error);
      alert(error.response?.data?.error || 'Failed to sync preorders.');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleCleared = async (income: Income) => {
    try {
      await api.put(`/income/${income.id}`, {
        ...income,
        isCleared: !income.isCleared
      });
      fetchData();
    } catch (error: any) {
      console.error('Failed to update clearance status', error);
      if (error?.status === 403) alert('Forbidden: Only Owners can modify transaction status.');
    }
  };

  const handleToggleShipped = async (income: Income) => {
    try {
      await api.put(`/income/${income.id}`, {
        ...income,
        isShipped: !income.isShipped
      });
      fetchData();
    } catch (error: any) {
      console.error('Failed to update shipped status', error);
      alert('Error: ' + error.message);
    }
  };

  const handleExport = () => {
    const exportData = incomeList.map(i => ({
      Date: i.saleDate,
      Product: i.product?.name || 'Unknown',
      Channel: i.channel?.name || 'Unknown',
      FullPrice: i.fullPrice,
      DiscountPercent: i.discountPercent,
      Quantity: i.quantity,
      NetAmount: i.netAmount,
      Total: parseFloat(i.netAmount) * i.quantity,
      PaymentStatus: i.cashFlowStatus,
      ClearedBank: i.isCleared ? 'Yes' : 'No'
    }));
    downloadCSV(exportData, 'income_export');
  };

  const columns: Column<Income>[] = [
    {
      key: 'saleDate',
      header: 'Date',
      render: (val) => new Date(val).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
    },
    {
      key: 'product.name',
      header: 'Product',
      render: (_, row) => row.product?.name || 'Unknown'
    },
    {
      key: 'channel.name',
      header: 'Channel',
      render: (_, row) => <Badge variant="info">{row.channel?.name || 'Unknown'}</Badge>
    },
    {
      key: 'quantity',
      header: 'Qty',
      align: 'center'
    },
    {
      key: 'netAmount',
      header: 'Net Total',
      align: 'right',
      render: (val, row) => `฿${(parseFloat(val) * row.quantity).toLocaleString()}`
    },
    {
      key: 'cashFlowStatus',
      header: 'Status',
      align: 'center',
      render: (val) => <Badge variant={val === 'cleared' ? 'success' : 'warning'}>{val}</Badge>
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
    },
    {
      key: 'isShipped',
      header: 'Shipped (Stock Deducted)',
      align: 'center',
      render: (val, row) => (
        <input 
          type="checkbox" 
          checked={!!val} 
          onChange={() => handleToggleShipped(row)}
          className="w-4 h-4 rounded border-border-hover bg-surface-secondary text-accent-success focus:ring-accent-success/50 cursor-pointer"
        />
      )
    }
  ];

  const full = parseFloat(formData.fullPrice || '0');
  const discountPct = parseFloat(formData.discountPercent || '0');
  const previewNet = full * (1 - discountPct / 100);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Income & Sales">
        <div className="flex gap-3">
          <Button onClick={handleSync} variant="secondary" icon={<RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />} loading={syncing}>
            Sync Preorders
          </Button>
          <Button onClick={handleExport} variant="secondary" icon={<Download className="w-4 h-4" />}>
            Export CSV
          </Button>
          <Button onClick={() => handleOpenModal()} icon={<Plus className="w-4 h-4" />} variant="primary">
            Log Sale
          </Button>
        </div>
      </Header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-20">
        <Card title="Sales History">
          <DataTable 
            columns={columns} 
            data={incomeList} 
            loading={loading}
            actions={(row) => (
              <>
                <button 
                  onClick={() => handleOpenModal(row)} 
                  className="p-1 text-text-muted hover:text-accent-primary transition-colors"
                  title="Edit Sale"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => { setSelectedIncome(row); setIsDeleteOpen(true); }} 
                  className="p-1 text-text-muted hover:text-accent-danger transition-colors"
                  title="Delete Sale"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          />
        </Card>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedIncome ? "Edit Sale" : "Log New Sale"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                label="Product Name"
                value={formData.productName}
                onChange={(e) => setFormData({...formData, productName: e.target.value})}
                list="product-list"
                placeholder="Start typing product name..."
                required
              />
              <datalist id="product-list">
                {products.filter(p => !p.isArchived).map(p => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </div>
            <Select
              label="Sales Channel"
              value={formData.channelId}
              onChange={(e) => setFormData({...formData, channelId: e.target.value})}
              options={channels.map(c => ({ value: c.id, label: c.name }))}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Full Price per Unit (฿)"
              type="number"
              step="0.01"
              value={formData.fullPrice}
              onChange={(e) => setFormData({...formData, fullPrice: e.target.value})}
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Discount (%)"
              type="number"
              min="0"
              max="100"
              step="1"
              value={formData.discountPercent}
              onChange={(e) => setFormData({...formData, discountPercent: e.target.value})}
            />
            <div className="flex flex-col justify-center gap-1 mt-2">
              <span className="text-sm font-medium text-text-secondary">Net per Unit</span>
              <span className="text-xl font-bold text-accent-success">฿{previewNet.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Sale Date"
              type="date"
              value={formData.saleDate}
              onChange={(e) => setFormData({...formData, saleDate: e.target.value})}
              required
            />
            <Select
              label="Payment Status"
              value={formData.cashFlowStatus}
              onChange={(e) => setFormData({...formData, cashFlowStatus: e.target.value})}
              options={[
                { value: 'cleared', label: 'Cleared (Paid)' },
                { value: 'pending', label: 'Pending' }
              ]}
              required
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border-primary/50">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Save Sale</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Sale Record"
        message="Are you sure you want to delete this sale? This action will affect revenue and inventory metrics."
        confirmText="Delete"
        loading={submitting}
      />
    </div>
  );
}
