import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import DataTable, { Column } from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import { Product, ProductCategory, SalesChannel, Setting } from '../types';

export default function Settings() {
  const [taxRate, setTaxRate] = useState('3');
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [savingTax, setSavingTax] = useState(false);

  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookMode, setWebhookMode] = useState('disabled');
  const [savingWebhook, setSavingWebhook] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const role = localStorage.getItem('userRole') || 'staff';

  // Category Modal State
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isCatDeleteOpen, setIsCatDeleteOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState<ProductCategory | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [catFormData, setCatFormData] = useState({ name: '' });
  const [deleteError, setDeleteError] = useState('');



  const fetchData = async () => {
    setLoading(true);
    try {
      const [taxRes, webhookUrlRes, webhookModeRes, prodRes, catRes, chanRes] = await Promise.all([
        api.get<Setting>('/settings/tax_provision').catch(() => null),
        api.get<Setting>('/settings/webhook_url').catch(() => null),
        api.get<Setting>('/settings/webhook_mode').catch(() => null),
        api.get<Product[]>('/products').catch(() => []),
        api.get<ProductCategory[]>('/product-categories').catch(() => []),
        api.get<SalesChannel[]>('/sales-channels').catch(() => [])
      ]);

      if (taxRes && taxRes.value) {
        const val = typeof taxRes.value === 'string' ? JSON.parse(taxRes.value) : taxRes.value;
        if (val.rate !== undefined) setTaxRate((val.rate * 100).toString());
        if (val.enabled !== undefined) setTaxEnabled(val.enabled);
      }
      
      if (webhookUrlRes && webhookUrlRes.value) setWebhookUrl(webhookUrlRes.value as string);
      if (webhookModeRes && webhookModeRes.value) setWebhookMode(webhookModeRes.value as string);

      if (prodRes) setProducts(prodRes as any);
      if (catRes) setCategories(catRes);
      if (chanRes) setChannels(chanRes);
    } catch (error) {
      console.error('Failed to fetch settings', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveTaxSettings = async () => {
    setSavingTax(true);
    try {
      await api.put('/settings/tax_provision', {
        value: {
          enabled: taxEnabled,
          rate: parseFloat(taxRate) / 100,
          label: 'Tax Provision'
        }
      });
    } catch (error) {
      console.error('Failed to save tax setting', error);
    } finally {
      setSavingTax(false);
    }
  };

  const saveWebhookSettings = async () => {
    setSavingWebhook(true);
    try {
      await api.put('/settings/webhook_url', { value: webhookUrl });
      await api.put('/settings/webhook_mode', { value: webhookMode });
    } catch (error) {
      console.error('Failed to save webhook settings', error);
    } finally {
      setSavingWebhook(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl) {
      alert('Please enter a webhook URL first.');
      return;
    }
    try {
      await api.post('/settings/webhook-test', { webhookUrl });
      alert('Test notification sent successfully!');
    } catch (error: any) {
      console.error('Failed to send test webhook', error);
      alert(error.response?.data?.error || 'Failed to send test notification.');
    }
  };

  const handleOpenCatModal = (cat?: ProductCategory) => {
    if (cat) {
      setSelectedCat(cat);
      setCatFormData({ name: cat.name });
    } else {
      setSelectedCat(null);
      setCatFormData({ name: '' });
    }
    setIsCatModalOpen(true);
  };

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const slug = catFormData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const payload = { name: catFormData.name, slug };

      if (selectedCat) {
        await api.put(`/product-categories/${selectedCat.id}`, payload);
      } else {
        await api.post('/product-categories', payload);
      }
      setIsCatModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Failed to save category', error);
      if (error?.status === 409) alert('A category with this name already exists.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCatDelete = async () => {
    if (!selectedCat) return;
    setSubmitting(true);
    setDeleteError('');
    try {
      await api.delete(`/product-categories/${selectedCat.id}`);
      setIsCatDeleteOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Failed to delete category', error);
      if (error?.status === 409) {
        setDeleteError('Cannot delete: This category is currently assigned to one or more products. Please reassign those products first.');
      } else {
        setDeleteError('An unexpected error occurred while deleting.');
      }
    } finally {
      setSubmitting(false);
    }
  };



  const catColumns: Column<ProductCategory>[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'slug', header: 'Slug' }
  ];



  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Settings" subtitle="Manage master data and application preferences" />

      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 pb-20">
        <Card title="Financial Settings">
          <div className="flex flex-col gap-4 max-w-md">
            <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg border border-border-primary">
              <div>
                <h4 className="font-medium">Tax Provision</h4>
                <p className="text-sm text-text-muted">Allocate a percentage of net profit</p>
              </div>
              <button 
                onClick={() => setTaxEnabled(!taxEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${taxEnabled ? 'bg-accent-success' : 'bg-surface-card border border-border-primary'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${taxEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {taxEnabled && (
              <div className="flex items-end gap-4 p-4 bg-surface-secondary/50 rounded-lg border border-border-primary/50">
                <Input
                  label="Provision Rate (%)"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                />
                <Button onClick={saveTaxSettings} loading={savingTax}>
                  Save
                </Button>
              </div>
            )}
          </div>
        </Card>

        <Card title="Notification Settings">
          <div className="flex flex-col gap-4 max-w-xl">
            <Input
              label="Discord/Line Webhook URL"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
            />
            
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-secondary">Webhook Mode</label>
              <select 
                className="w-full bg-surface-primary border border-border-hover rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:border-accent-primary transition-colors appearance-none"
                value={webhookMode}
                onChange={(e) => setWebhookMode(e.target.value)}
              >
                <option value="disabled">Disabled</option>
                <option value="daily_only">Daily Digest Only</option>
                <option value="critical_only">Critical Alerts Only</option>
                <option value="all_updates">All Updates</option>
              </select>
            </div>

            <div className="flex justify-start gap-3">
              <Button onClick={saveWebhookSettings} loading={savingWebhook}>
                Save Notifications
              </Button>
              <Button onClick={handleTestWebhook} variant="secondary">
                Send Test Notification
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card 
            title="Product Categories" 
            headerAction={
              <Button onClick={() => handleOpenCatModal()} size="sm" icon={<Plus className="w-4 h-4" />}>
                New
              </Button>
            }
          >
            <div className="mt-4">
              <DataTable 
                columns={catColumns} 
                data={categories} 
                loading={loading}
                actions={role === 'owner' ? (row) => (
                  <>
                    <button 
                      onClick={() => handleOpenCatModal(row)} 
                      className="p-1 text-text-muted hover:text-accent-primary transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => { setSelectedCat(row); setIsCatDeleteOpen(true); setDeleteError(''); }} 
                      className="p-1 text-text-muted hover:text-accent-danger transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                ) : undefined}
              />
            </div>
          </Card>



          <div className="space-y-6 lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Products Reference">
              <div className="flex flex-col gap-2 mt-4 max-h-[300px] overflow-y-auto pr-2">
                {products.map(p => (
                  <div key={p.id} className="flex justify-between items-center p-3 rounded bg-surface-secondary border border-border-primary">
                    <span className={p.isArchived ? 'opacity-50 line-through' : 'font-medium'}>{p.name}</span>
                    <Badge variant={p.isArchived ? 'danger' : 'default'}>{p.category?.name}</Badge>
                  </div>
                ))}
              </div>
              <p className="text-xs text-text-muted mt-4">Note: Add and edit products directly from the Inventory page.</p>
            </Card>

            <Card title="Sales Channels Reference">
              <div className="flex flex-col gap-2 mt-4 max-h-[300px] overflow-y-auto pr-2">
                {channels.map(c => (
                  <div key={c.id} className="p-3 rounded bg-surface-secondary border border-border-primary font-medium">
                    {c.name}
                  </div>
                ))}
              </div>
              <p className="text-xs text-text-muted mt-4">Note: Channels are currently managed via seed data for this demo.</p>
            </Card>
          </div>
        </div>
      </div>

      <Modal isOpen={isCatModalOpen} onClose={() => setIsCatModalOpen(false)} title={selectedCat ? "Edit Category" : "New Category"} size="sm">
        <form onSubmit={handleCatSubmit} className="space-y-4">
          <Input
            label="Category Name"
            value={catFormData.name}
            onChange={(e) => setCatFormData({...catFormData, name: e.target.value})}
            required
            autoFocus
          />
          <div className="pt-4 flex justify-end gap-3 border-t border-border-primary/50">
            <Button type="button" variant="ghost" onClick={() => setIsCatModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Save</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isCatDeleteOpen} onClose={() => setIsCatDeleteOpen(false)} title="Delete Category" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Are you sure you want to delete the category <strong>{selectedCat?.name}</strong>?
          </p>
          
          {deleteError && (
            <div className="p-3 bg-accent-danger/10 border border-accent-danger text-accent-danger rounded text-sm">
              {deleteError}
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-border-primary/50">
            <Button type="button" variant="ghost" onClick={() => setIsCatDeleteOpen(false)}>Cancel</Button>
            {(!deleteError) && (
              <Button type="button" variant="danger" onClick={handleCatDelete} loading={submitting}>Delete</Button>
            )}
          </div>
        </div>
      </Modal>



    </div>
  );
}
