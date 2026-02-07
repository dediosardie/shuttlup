import { useState, useEffect } from 'react';
import { Card, Button, Input, Select, Textarea } from './ui';
import { supabase } from '../supabaseClient';
import { auditLogService } from '../services/auditLogService';

interface FleetDetail {
  id: string;
  status: 'active' | 'inactive';
  van_number: string;
  plate_number: string;
  driver_name: string;
  mobile_number: string;
  unit: string;
  area: string;
  profit_centre: 'Delta' | 'Subcon ST';
  remarks: string;
  created_at?: string;
  updated_at?: string;
}

export default function FleetDetailsModule() {
  const [fleetDetails, setFleetDetails] = useState<FleetDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFleet, setEditingFleet] = useState<FleetDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    status: 'active' as 'active' | 'inactive',
    van_number: '',
    plate_number: '',
    driver_name: '',
    mobile_number: '',
    unit: '',
    area: '',
    profit_centre: 'Delta' as 'Delta' | 'Subcon ST',
    remarks: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadFleetDetails();
  }, []);

  const loadFleetDetails = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('fleet_details')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFleetDetails(data || []);
    } catch (error) {
      console.error('Error loading fleet details:', error);
      alert('Failed to load fleet details');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.van_number.trim()) {
      newErrors.van_number = 'Van number is required';
    }
    if (!formData.plate_number.trim()) {
      newErrors.plate_number = 'Plate number is required';
    }
    if (!formData.driver_name.trim()) {
      newErrors.driver_name = 'Driver name is required';
    }
    if (!formData.mobile_number.trim()) {
      newErrors.mobile_number = 'Mobile number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      if (editingFleet) {
        // Update existing fleet detail
        const updatedData = {
          ...formData,
          updated_at: new Date().toISOString(),
        };
        
        const { error } = await supabase
          .from('fleet_details')
          .update(updatedData)
          .eq('id', editingFleet.id);

        if (error) throw error;
        
        // Audit log
        await auditLogService.createLog(
          'UPDATE',
          `Updated fleet detail for van "${formData.van_number}" (${formData.plate_number})`,
          { before: editingFleet, after: updatedData }
        );
        
        alert('Fleet detail updated successfully!');
      } else {
        // Create new fleet detail
        const { error } = await supabase
          .from('fleet_details')
          .insert(formData);

        if (error) throw error;
        
        // Audit log
        await auditLogService.createLog(
          'CREATE',
          `Created fleet detail for van "${formData.van_number}" (${formData.plate_number})`,
          { after: formData }
        );
        
        alert('Fleet detail added successfully!');
      }

      resetForm();
      loadFleetDetails();
    } catch (error) {
      console.error('Error saving fleet detail:', error);
      alert('Failed to save fleet detail');
    }
  };

  const handleEdit = (fleet: FleetDetail) => {
    setEditingFleet(fleet);
    setFormData({
      status: fleet.status,
      van_number: fleet.van_number,
      plate_number: fleet.plate_number,
      driver_name: fleet.driver_name,
      mobile_number: fleet.mobile_number,
      unit: fleet.unit,
      area: fleet.area,
      profit_centre: fleet.profit_centre,
      remarks: fleet.remarks,
    });
    setIsFormOpen(true);
    setErrors({});
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fleet detail?')) return;

    try {
      // Get fleet details before deletion for audit log
      const fleetToDelete = fleetDetails.find(f => f.id === id);
      
      const { error } = await supabase
        .from('fleet_details')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Audit log
      if (fleetToDelete) {
        await auditLogService.createLog(
          'DELETE',
          `Deleted fleet detail for van "${fleetToDelete.van_number}" (${fleetToDelete.plate_number}, Driver: ${fleetToDelete.driver_name})`
        );
      }
      
      alert('Fleet detail deleted successfully!');
      loadFleetDetails();
    } catch (error) {
      console.error('Error deleting fleet detail:', error);
      alert('Failed to delete fleet detail');
    }
  };

  const resetForm = () => {
    setFormData({
      status: 'active',
      van_number: '',
      plate_number: '',
      driver_name: '',
      mobile_number: '',
      unit: '',
      area: '',
      profit_centre: 'Delta',
      remarks: '',
    });
    setEditingFleet(null);
    setIsFormOpen(false);
    setErrors({});
  };

  const filteredFleetDetails = fleetDetails.filter(fleet =>
    fleet.van_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fleet.plate_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fleet.driver_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalFleets = fleetDetails.length;
  const activeFleets = fleetDetails.filter(f => f.status === 'active').length;
  const inactiveFleets = fleetDetails.filter(f => f.status === 'inactive').length;

  return (
    <div className="min-h-screen bg-bg-primary p-2 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <Card className="p-4 bg-bg-secondary border border-border-muted">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Fleet Details</h1>
              <p className="text-xs sm:text-sm text-text-secondary mt-1">Manage fleet information</p>
            </div>
            <Button
              onClick={() => setIsFormOpen(true)}
              className="bg-gradient-to-r from-accent to-accent-hover text-white px-4 py-2 rounded-lg font-medium text-sm hover:shadow-lg transition-all"
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Fleet
            </Button>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-4 bg-bg-secondary border border-border-muted">
            <div className="flex items-center gap-3">
              <div className="bg-accent-soft rounded-lg p-3">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-text-muted">Total Fleets</p>
                <p className="text-2xl font-bold text-text-primary">{totalFleets}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-bg-secondary border border-border-muted">
            <div className="flex items-center gap-3">
              <div className="bg-green-900/20 rounded-lg p-3">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-text-muted">Active</p>
                <p className="text-2xl font-bold text-text-primary">{activeFleets}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-bg-secondary border border-border-muted">
            <div className="flex items-center gap-3">
              <div className="bg-red-900/20 rounded-lg p-3">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-text-muted">Inactive</p>
                <p className="text-2xl font-bold text-text-primary">{inactiveFleets}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <Card className="p-4 bg-bg-secondary border border-border-muted">
          <Input
            type="text"
            placeholder="Search by van number, plate number, or driver name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-elevated border-border-muted text-text-primary"
          />
        </Card>

        {/* Table with fixed height and scroll */}
        <Card className="bg-bg-secondary border border-border-muted overflow-hidden">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-bg-elevated border-b border-border-muted sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider whitespace-nowrap">Van Number</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider whitespace-nowrap">Plate Number</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider whitespace-nowrap">Driver Name</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider whitespace-nowrap">Mobile</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider whitespace-nowrap">Unit</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider whitespace-nowrap">Area</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider whitespace-nowrap">Profit Centre</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider whitespace-nowrap">Remarks</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-text-primary uppercase tracking-wider whitespace-nowrap sticky right-0 bg-bg-elevated">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-muted">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-text-secondary">
                      Loading fleet details...
                    </td>
                  </tr>
                ) : filteredFleetDetails.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-text-secondary">
                      No fleet details found
                    </td>
                  </tr>
                ) : (
                  filteredFleetDetails.map((fleet) => (
                    <tr
                      key={fleet.id}
                      className="hover:bg-bg-elevated transition-colors"
                    >
                      <td className="px-3 py-3 text-sm whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          fleet.status === 'active'
                            ? 'bg-green-900/30 text-green-400'
                            : 'bg-red-900/30 text-red-400'
                        }`}>
                          {fleet.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-text-primary font-medium whitespace-nowrap">{fleet.van_number}</td>
                      <td className="px-3 py-3 text-sm text-text-primary whitespace-nowrap">{fleet.plate_number}</td>
                      <td className="px-3 py-3 text-sm text-text-primary whitespace-nowrap">{fleet.driver_name}</td>
                      <td className="px-3 py-3 text-sm text-text-secondary whitespace-nowrap">{fleet.mobile_number}</td>
                      <td className="px-3 py-3 text-sm text-text-secondary whitespace-nowrap">{fleet.unit}</td>
                      <td className="px-3 py-3 text-sm text-text-secondary whitespace-nowrap">{fleet.area}</td>
                      <td className="px-3 py-3 text-sm text-text-primary whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-accent-soft text-accent">
                          {fleet.profit_centre}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-text-secondary max-w-xs truncate">{fleet.remarks || '-'}</td>
                      <td className="px-3 py-3 whitespace-nowrap sticky right-0 bg-bg-secondary">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(fleet)}
                            className="text-accent hover:text-accent-hover transition-colors p-1"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(fleet.id)}
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
            <Card className="bg-bg-secondary border border-border-muted max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-text-primary">
                    {editingFleet ? 'Edit Fleet Detail' : 'Add Fleet Detail'}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                      className="w-full bg-bg-elevated border-border-muted text-text-primary"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </Select>
                  </div>

                  {/* Van Number */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Van Number <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={formData.van_number}
                      onChange={(e) => setFormData({ ...formData, van_number: e.target.value })}
                      className="w-full bg-bg-elevated border-border-muted text-text-primary"
                      placeholder="Enter van number"
                    />
                    {errors.van_number && <p className="text-red-500 text-xs mt-1">{errors.van_number}</p>}
                  </div>

                  {/* Plate Number */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Plate Number <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={formData.plate_number}
                      onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                      className="w-full bg-bg-elevated border-border-muted text-text-primary"
                      placeholder="Enter plate number"
                    />
                    {errors.plate_number && <p className="text-red-500 text-xs mt-1">{errors.plate_number}</p>}
                  </div>

                  {/* Driver Name */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Driver Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={formData.driver_name}
                      onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                      className="w-full bg-bg-elevated border-border-muted text-text-primary"
                      placeholder="Enter driver name"
                    />
                    {errors.driver_name && <p className="text-red-500 text-xs mt-1">{errors.driver_name}</p>}
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={formData.mobile_number}
                      onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                      className="w-full bg-bg-elevated border-border-muted text-text-primary"
                      placeholder="Enter mobile number"
                    />
                    {errors.mobile_number && <p className="text-red-500 text-xs mt-1">{errors.mobile_number}</p>}
                  </div>

                  {/* Unit */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Unit
                    </label>
                    <Input
                      type="text"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full bg-bg-elevated border-border-muted text-text-primary"
                      placeholder="Enter unit"
                    />
                  </div>

                  {/* Area */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Area
                    </label>
                    <Input
                      type="text"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      className="w-full bg-bg-elevated border-border-muted text-text-primary"
                      placeholder="Enter area"
                    />
                  </div>

                  {/* Profit Centre */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Profit Centre
                    </label>
                    <Select
                      value={formData.profit_centre}
                      onChange={(e) => setFormData({ ...formData, profit_centre: e.target.value as 'Delta' | 'Subcon ST' })}
                      className="w-full bg-bg-elevated border-border-muted text-text-primary"
                    >
                      <option value="Delta">Delta</option>
                      <option value="Subcon ST">Subcon ST</option>
                    </Select>
                  </div>

                  {/* Remarks */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Remarks
                    </label>
                    <Textarea
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      className="w-full bg-bg-elevated border-border-muted text-text-primary"
                      placeholder="Enter remarks"
                      rows={3}
                    />
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
                    {editingFleet ? 'Update' : 'Add'} Fleet
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
