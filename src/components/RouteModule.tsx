import { useState, useEffect } from 'react';
import { Route } from '../types';
import { Card, Button, Input } from './ui';
import { supabase } from '../supabaseClient';

export default function RouteModule() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isBulkImport, setIsBulkImport] = useState(false);
  const [formData, setFormData] = useState({
    route: '',
    part_number: '',
    rate: '',
    po_qty: '',
    po_number: '',
    month: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadRoutes();
    updatePOQtyFromTripRequests();
  }, []);

  const updatePOQtyFromTripRequests = async () => {
    try {
      // Fetch all routes
      const { data: routes, error: routesError } = await supabase
        .from('routes')
        .select('*');

      if (routesError) throw routesError;
      if (!routes || routes.length === 0) return;

      // Fetch all trip requests
      const { data: tripRequests, error: tripsError } = await supabase
        .from('trip_requests')
        .select('*');

      if (tripsError) throw tripsError;
      if (!tripRequests || tripRequests.length === 0) return;

      // Process each route
      for (const route of routes) {
        if (!route.month) continue;

        const routeDate = new Date(route.month);
        const routeYear = routeDate.getFullYear();
        const routeMonth = routeDate.getMonth();

        // Count matching trip requests
        const matchingTrips = tripRequests.filter(trip => {
          if (!trip.route || !trip.date_of_service) return false;
          
          // Check if route names match (case-insensitive)
          if (trip.route.toLowerCase() !== route.route.toLowerCase()) return false;

          // Check if date_of_service year and month match route month
          const tripDate = new Date(trip.date_of_service);
          return tripDate.getFullYear() === routeYear && tripDate.getMonth() === routeMonth;
        });

        const newPOQty = matchingTrips.length;

        // Update route if po_qty changed
        if (route.po_qty !== newPOQty) {
          await supabase
            .from('routes')
            .update({ po_qty: newPOQty, updated_at: new Date().toISOString() })
            .eq('id', route.id);
        }
      }

      console.log('PO QTY updated successfully from trip requests');
      // Reload routes to show updated values
      loadRoutes();
    } catch (error) {
      console.error('Error updating PO QTY from trip requests:', error);
    }
  };

  const getLastDayOfCurrentMonth = () => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };

  const handleNewRoute = () => {
    setIsBulkImport(true);
    setFormData({
      route: '',
      part_number: '',
      rate: '',
      po_qty: '',
      po_number: '',
      month: getLastDayOfCurrentMonth(),
    });
    setIsFormOpen(true);
  };

  const formatMonthDisplay = (dateString: string | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[date.getMonth()]}-${date.getFullYear().toString().slice(-2)}`;
  };

  const loadRoutes = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .order('month', { ascending: false });

      if (error) throw error;
      setRoutes(data || []);
    } catch (error) {
      console.error('Error loading routes:', error);
      alert('Failed to load routes');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (isBulkImport: boolean = false) => {
    const newErrors: Record<string, string> = {};

    if (isBulkImport) {
      // For bulk import, only validate PO Number and Month
      if (!formData.po_number.trim()) {
        newErrors.po_number = 'PO Number is required';
      }
      if (!formData.month.trim()) {
        newErrors.month = 'Month is required';
      }
    } else {
      // For manual add/edit, validate all fields
      if (!formData.route.trim()) {
        newErrors.route = 'Route is required';
      }
      if (!formData.part_number.trim()) {
        newErrors.part_number = 'Part number is required';
      }
      if (!formData.rate || parseFloat(formData.rate) <= 0) {
        newErrors.rate = 'Rate must be greater than 0';
      }
      if (!formData.po_qty || parseInt(formData.po_qty) <= 0) {
        newErrors.po_qty = 'PO Qty must be greater than 0';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (isBulkImport) {
      // Bulk import from rates
      if (!validateForm(true)) return;
      
      try {
        // Fetch all rates
        const { data: rates, error: fetchError } = await supabase
          .from('rates')
          .select('*')
          .order('month', { ascending: false });

        if (fetchError) throw fetchError;
        
        if (!rates || rates.length === 0) {
          alert('No rates found to import');
          return;
        }

        // Prepare routes data from rates
        const routesToInsert = rates.map(rate => ({
          lines: rate.line,
          route: rate.route,
          part_number: '', // Empty since rates don't have part_number
          rate: rate.rate,
          po_qty: 0, // Default to 0 since rates don't have po_qty
          po_number: formData.po_number,
          month: formData.month,
        }));

        // Insert all routes
        const { error: insertError } = await supabase
          .from('routes')
          .insert(routesToInsert);

        if (insertError) throw insertError;
        alert(`Successfully imported ${rates.length} routes from rates!`);
        resetForm();
        loadRoutes();
      } catch (error) {
        console.error('Error bulk importing routes:', error);
        alert('Failed to import routes from rates');
      }
    } else if (editingRoute) {
      // Update existing route
      if (!validateForm(false)) return;
      
      try {
        const { error } = await supabase
          .from('routes')
          .update({
            route: formData.route,
            part_number: formData.part_number,
            rate: parseFloat(formData.rate),
            po_qty: parseInt(formData.po_qty),
            po_number: formData.po_number || null,
            month: formData.month || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingRoute.id);

        if (error) throw error;
        alert('Route updated successfully!');
        resetForm();
        loadRoutes();
      } catch (error) {
        console.error('Error updating route:', error);
        alert('Failed to update route');
      }
    } else {
      // Create new route manually
      if (!validateForm(false)) return;
      
      try {
        const { error } = await supabase
          .from('routes')
          .insert({
            route: formData.route,
            part_number: formData.part_number,
            rate: parseFloat(formData.rate),
            po_qty: parseInt(formData.po_qty),
            po_number: formData.po_number || null,
            month: formData.month || null,
          });

        if (error) throw error;
        alert('Route added successfully!');
        resetForm();
        loadRoutes();
      } catch (error) {
        console.error('Error adding route:', error);
        alert('Failed to add route');
      }
    }
  };

  const handleEdit = async (route: Route) => {
    try {
      // Fetch the latest data from database to ensure we have current values
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('id', route.id)
        .single();

      if (error) throw error;

      if (data) {
        setEditingRoute(data);
        setFormData({
          route: data.route,
          part_number: data.part_number,
          rate: data.rate.toString(),
          po_qty: data.po_qty.toString(),
          po_number: data.po_number || '',
          month: data.month || '',
        });
        setIsFormOpen(true);
        setIsBulkImport(false);
        setErrors({});
      }
    } catch (error) {
      console.error('Error fetching route details:', error);
      alert('Failed to load route details for editing');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this route?')) return;

    try {
      const { error } = await supabase
        .from('routes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Route deleted successfully!');
      loadRoutes();
    } catch (error) {
      console.error('Error deleting route:', error);
      alert('Failed to delete route');
    }
  };

  const resetForm = () => {
    setFormData({
      route: '',
      part_number: '',
      rate: '',
      po_qty: '',
      po_number: '',
      month: '',
    });
    setEditingRoute(null);
    setIsFormOpen(false);
    setIsBulkImport(false);
    setErrors({});
  };

  const filteredRoutes = routes.filter(route =>
    route.po_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalRoutes = filteredRoutes.length;
  const totalPOQty = filteredRoutes.reduce((sum, route) => sum + route.po_qty, 0);
  const totalAmount = filteredRoutes.length > 0
    ? filteredRoutes.reduce((sum, route) => sum + route.rate * route.po_qty, 0)
    : 0;

  return (
    <div className="min-h-screen bg-bg-primary p-2 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <Card className="p-4 bg-bg-secondary border border-border-muted">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Route Management</h1>
              <p className="text-xs sm:text-sm text-text-secondary mt-1">Manage maintenance routes</p>
            </div>
            <Button
              onClick={handleNewRoute}
              className="bg-gradient-to-r from-accent to-accent-hover text-white px-4 py-2 rounded-lg font-medium text-sm hover:shadow-lg transition-all"
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Route
            </Button>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-4 bg-bg-secondary border border-border-muted">
            <div className="flex items-center gap-3">
              <div className="bg-accent-soft rounded-lg p-3">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-text-muted">Total Routes</p>
                <p className="text-2xl font-bold text-text-primary">{totalRoutes}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-bg-secondary border border-border-muted">
            <div className="flex items-center gap-3">
              <div className="bg-accent-soft rounded-lg p-3">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-text-muted">Total PO Qty</p>
                <p className="text-2xl font-bold text-text-primary">{totalPOQty.toLocaleString()}</p>
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
                <p className="text-xs text-text-muted">Total Amount</p>
                <p className="text-2xl font-bold text-text-primary">₱ {totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <Card className="p-4 bg-bg-secondary border border-border-muted">
          <Input
            type="text"
            placeholder="Search by PO Number..."
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
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider">Lines</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider">Route</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider">Part Number</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider">Rate</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider">PO Qty</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider">Amount</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider">PO Number</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider">Month</th>
                  <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-text-primary uppercase tracking-wider">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-muted">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-text-secondary">
                      Loading routes...
                    </td>
                  </tr>
                ) : filteredRoutes.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-text-secondary">
                      No routes found
                    </td>
                  </tr>
                ) : (
                  filteredRoutes.map((route) => (
                    <tr
                      key={route.id}
                      onDoubleClick={() => handleEdit(route)}
                      className="hover:bg-bg-elevated cursor-pointer transition-colors"
                    >
                      <td className="px-3 sm:px-4 py-3 text-sm text-text-primary">{route.lines}</td>
                      <td className="px-3 sm:px-4 py-3 text-sm text-text-primary font-medium">{route.route}</td>
                      <td className="px-3 sm:px-4 py-3 text-sm text-text-secondary">{route.part_number}</td>
                      <td className="px-3 sm:px-4 py-3 text-sm text-text-primary">₱{route.rate.toFixed(2)}</td>
                      <td className="px-3 sm:px-4 py-3 text-sm text-text-primary">{route.po_qty.toLocaleString()}</td>
                      <td className="px-3 sm:px-4 py-3 text-sm text-text-primary font-medium">₱{(route.rate * route.po_qty).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-3 sm:px-4 py-3 text-sm text-text-secondary">{route.po_number || '-'}</td>
                      <td className="px-3 sm:px-4 py-3 text-sm text-text-secondary">{formatMonthDisplay(route.month)}</td>
                      <td className="px-3 sm:px-4 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(route.id);
                          }}
                          className="text-red-500 hover:text-red-400 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
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
                    {isBulkImport ? 'Import Routes from Rates' : editingRoute ? 'Edit Route' : 'Add Route'}
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
                  {isBulkImport ? (
                    // Bulk Import Fields
                    <>
                      <div className="bg-accent-soft border border-accent/30 rounded-lg p-3 mb-4">
                        <p className="text-sm text-text-primary">
                          This will import all routes from the Rates table. Please provide PO Number and Month.
                        </p>
                      </div>

                      {/* PO Number */}
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          PO Number <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="text"
                          value={formData.po_number}
                          onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                          className="w-full bg-bg-elevated border-border-muted text-text-primary"
                          placeholder="Enter PO number"
                        />
                        {errors.po_number && <p className="text-red-500 text-xs mt-1">{errors.po_number}</p>}
                      </div>

                      {/* Month */}
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          Month <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="date"
                          value={formData.month}
                          onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                          className="w-full bg-bg-elevated border-border-muted text-text-primary"
                        />
                        {errors.month && <p className="text-red-500 text-xs mt-1">{errors.month}</p>}
                        <p className="text-xs text-text-muted mt-1">Default: Last day of current month</p>
                      </div>
                    </>
                  ) : (
                    // Manual Add/Edit Fields
                    <>
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

                      {/* Part Number */}
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          Part Number <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="text"
                          value={formData.part_number}
                          onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                          className="w-full bg-bg-elevated border-border-muted text-text-primary"
                          placeholder="Enter part number"
                        />
                        {errors.part_number && <p className="text-red-500 text-xs mt-1">{errors.part_number}</p>}
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

                      {/* PO Qty */}
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          PO Qty <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="number"
                          value={formData.po_qty}
                          onChange={(e) => setFormData({ ...formData, po_qty: e.target.value })}
                          className="w-full bg-bg-elevated border-border-muted text-text-primary"
                          placeholder="0"
                        />
                        {errors.po_qty && <p className="text-red-500 text-xs mt-1">{errors.po_qty}</p>}
                      </div>

                      {/* PO Number (Optional for manual) */}
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          PO Number
                        </label>
                        <Input
                          type="text"
                          value={formData.po_number}
                          onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                          className="w-full bg-bg-elevated border-border-muted text-text-primary"
                          placeholder="Enter PO number (optional)"
                        />
                      </div>

                      {/* Month (Optional for manual) */}
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          Month
                        </label>
                        <Input
                          type="date"
                          value={formData.month}
                          onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                          className="w-full bg-bg-elevated border-border-muted text-text-primary"
                        />
                      </div>
                    </>
                  )}
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
                    {isBulkImport ? 'Import All Rates' : editingRoute ? 'Update' : 'Add'} Route
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
