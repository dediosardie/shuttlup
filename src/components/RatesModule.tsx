import { useState, useEffect } from 'react';
import { Card, Button, Input } from './ui';
import { supabase } from '../supabaseClient';

interface Rate {
  id: string;
  line: number;
  route: string;
  rate: number;
  created_at?: string;
  updated_at?: string;
}

export default function RatesModule() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<Rate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    route: '',
    rate: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadRates();
  }, []);

  const loadRates = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('rates')
        .select('*')
        .order('line', { ascending: true });

      if (error) throw error;
      setRates(data || []);
    } catch (error) {
      console.error('Error loading rates:', error);
      alert('Failed to load rates');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.route.trim()) {
      newErrors.route = 'Route is required';
    }
    if (!formData.rate || parseFloat(formData.rate) <= 0) {
      newErrors.rate = 'Rate must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      if (editingRate) {
        // Update existing rate
        const { error } = await supabase
          .from('rates')
          .update({
            route: formData.route,
            rate: parseFloat(formData.rate),
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingRate.id);

        if (error) throw error;
        alert('Rate updated successfully!');
      } else {
        // Create new rate
        const { error } = await supabase
          .from('rates')
          .insert({
            route: formData.route,
            rate: parseFloat(formData.rate),
          });

        if (error) throw error;
        alert('Rate added successfully!');
      }

      resetForm();
      loadRates();
    } catch (error) {
      console.error('Error saving rate:', error);
      alert('Failed to save rate');
    }
  };

  const handleEdit = (rate: Rate) => {
    setEditingRate(rate);
    setFormData({
      route: rate.route,
      rate: rate.rate.toString(),
    });
    setIsFormOpen(true);
    setErrors({});
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rate?')) return;

    try {
      const { error } = await supabase
        .from('rates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Rate deleted successfully!');
      loadRates();
    } catch (error) {
      console.error('Error deleting rate:', error);
      alert('Failed to delete rate');
    }
  };

  const resetForm = () => {
    setFormData({
      route: '',
      rate: '',
    });
    setEditingRate(null);
    setIsFormOpen(false);
    setErrors({});
  };

  const filteredRates = rates.filter(rate =>
    rate.route.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalRates = rates.length;
  const averageRate = rates.length > 0
    ? rates.reduce((sum, rate) => sum + rate.rate, 0) / rates.length
    : 0;
  const highestRate = rates.length > 0
    ? Math.max(...rates.map(r => r.rate))
    : 0;

  return (
    <div className="min-h-screen bg-bg-primary p-2 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <Card className="p-4 bg-bg-secondary border border-border-muted">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Rate Management</h1>
              <p className="text-xs sm:text-sm text-text-secondary mt-1">Manage route rates</p>
            </div>
            <Button
              onClick={() => setIsFormOpen(true)}
              className="bg-gradient-to-r from-accent to-accent-hover text-white px-4 py-2 rounded-lg font-medium text-sm hover:shadow-lg transition-all"
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Route Rate
            </Button>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-4 bg-bg-secondary border border-border-muted">
            <div className="flex items-center gap-3">
              <div className="bg-accent-soft rounded-lg p-3">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-text-muted">Total Rates</p>
                <p className="text-2xl font-bold text-text-primary">{totalRates}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-bg-secondary border border-border-muted">
            <div className="flex items-center gap-3">
              <div className="bg-accent-soft rounded-lg p-3">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-text-muted">Avg Rate</p>
                <p className="text-2xl font-bold text-text-primary">₱ {averageRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-bg-secondary border border-border-muted">
            <div className="flex items-center gap-3">
              <div className="bg-accent-soft rounded-lg p-3">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-text-muted">Highest Rate</p>
                <p className="text-2xl font-bold text-text-primary">₱ {highestRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <Card className="p-4 bg-bg-secondary border border-border-muted">
          <Input
            type="text"
            placeholder="Search by route..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-elevated border-border-muted text-text-primary"
          />
        </Card>

        {/* Table */}
        <Card className="bg-bg-secondary border border-border-muted overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-bg-elevated border-b border-border-muted">
                <tr>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider">Line</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider">Route</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider">Rate</th>
                  <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-text-primary uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-muted">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-text-secondary">
                      Loading rates...
                    </td>
                  </tr>
                ) : filteredRates.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-text-secondary">
                      No rates found
                    </td>
                  </tr>
                ) : (
                  filteredRates.map((rate) => (
                    <tr
                      key={rate.id}
                      className="hover:bg-bg-elevated transition-colors"
                    >
                      <td className="px-3 sm:px-4 py-3 text-sm text-text-primary">{rate.line}</td>
                      <td className="px-3 sm:px-4 py-3 text-sm text-text-primary font-medium">{rate.route}</td>
                      <td className="px-3 sm:px-4 py-3 text-sm text-text-primary">₱ {rate.rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-3 sm:px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(rate)}
                            className="text-accent hover:text-accent-hover transition-colors p-1"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(rate.id)}
                            className="text-red-500 hover:text-red-400 transition-colors p-1"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Form Modal */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="bg-bg-secondary border border-border-muted max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-text-primary">
                    {editingRate ? 'Edit Rate' : 'Generate Route'}
                  </h2>
                  <button
                    onClick={resetForm}
                    className="text-text-muted hover:text-text-primary transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Route */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Route <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={formData.route}
                      onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                      className="w-full bg-bg-elevated border-border-muted text-text-primary"
                      placeholder="Enter route name"
                    />
                    {errors.route && <p className="text-red-500 text-xs mt-1">{errors.route}</p>}
                  </div>

                  {/* Rate */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Rate (₱) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.rate}
                      onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                      className="w-full bg-bg-elevated border-border-muted text-text-primary"
                      placeholder="0.00"
                    />
                    {errors.rate && <p className="text-red-500 text-xs mt-1">{errors.rate}</p>}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                  <Button
                    onClick={resetForm}
                    className="flex-1 px-4 py-2 bg-bg-elevated text-text-primary border border-border-muted rounded-lg font-medium hover:bg-bg-primary transition-colors"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-accent to-accent-hover text-white rounded-lg font-medium hover:shadow-lg transition-all"
                  >
                    {editingRate ? 'Update' : 'Add'} Rate
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
