import { useState, useEffect } from 'react';
import { TripRequest, FleetDetail, Route } from '../types';
import { Card, Button, Input, Textarea, Select } from './ui';
import { supabase } from '../supabaseClient';
import { auditLogService } from '../services/auditLogService';

export default function TripRequestPage() {
  const [tripRequests, setTripRequests] = useState<TripRequest[]>([]);
  const [fleetDetails, setFleetDetails] = useState<FleetDetail[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<TripRequest | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    shuttle_no: '',
    reason: '',
    reason_shortext: '',
    date_requested: new Date().toISOString().split('T')[0],
    date_of_service: '',
    module: '',
    arrival_time: '',
    passenger_count: 0,
    in_out: '',
    address: '',
    van_driver: '',
    details: '',
    van_nos: '',
    requestor_confirmed_service: '',
    route: '',
    status: 'pending' as 'pending' | 'completed' | 'cancelled',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const initializePage = async () => {
      await loadCurrentUser();
      loadFleetDetails();
    };
    initializePage();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadTripRequests();
    }
  }, [currentUser]);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        setCurrentUser(userData);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadTripRequests = async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('trip_requests')
        .select('*');
      
      // If user is a passenger, only load their own requests
      if (currentUser?.role === 'passenger') {
        query = query.eq('requestor_user_id', currentUser.id);
      }
      
      const { data, error } = await query.order('date_requested', { ascending: false });

      if (error) throw error;
      setTripRequests(data || []);
    } catch (error) {
      console.error('Error loading trip requests:', error);
      alert('Failed to load trip requests');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFleetDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('fleet_details')
        .select('*')
        .eq('status', 'active')
        .order('van_number');

      if (error) throw error;
      setFleetDetails(data || []);
    } catch (error) {
      console.error('Error loading fleet details:', error);
    }
  };

  const loadRoutes = async (dateOfService: string) => {
    if (!dateOfService) {
      setRoutes([]);
      return;
    }

    try {
      const serviceDate = new Date(dateOfService);
      const year = serviceDate.getFullYear();
      const month = serviceDate.getMonth(); // 0-indexed

      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .not('month', 'is', null)
        .order('route');

      if (error) throw error;

      // Filter by year and month
      const filteredRoutes = (data || []).filter(route => {
        if (!route.month) return false;
        const routeDate = new Date(route.month);
        return routeDate.getFullYear() === year && routeDate.getMonth() === month;
      });

      setRoutes(filteredRoutes);
    } catch (error) {
      console.error('Error loading routes:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.shuttle_no.trim()) {
      newErrors.shuttle_no = 'Shuttle number is required';
    }
    if (!formData.passenger_count) {
      newErrors.passenger_count = 'Passenger count is required';
    }
    if (!formData.date_of_service) {
      newErrors.date_of_service = 'Date of service is required';
    }
    if (!formData.reason.trim()) {
      newErrors.reason = 'Reason is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      if (editingRequest) {
        // Update existing request
        const { error } = await supabase
          .from('trip_requests')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingRequest.id);

        if (error) throw error;
        
        // Audit log
        await auditLogService.createLog(
          'UPDATE',
          `Updated trip request #${formData.shuttle_no}`,
          { before: editingRequest, after: formData }
        );
        
        alert('Trip request updated successfully!');
      } else {
        // Create new request
        const newRequest = {
          ...formData,
          requestor: currentUser?.full_name || 'Unknown',
          requestor_user_id: currentUser?.id,
        };
        
        const { error } = await supabase
          .from('trip_requests')
          .insert(newRequest);

        if (error) throw error;
        
        // Audit log
        await auditLogService.createLog(
          'CREATE',
          `Created trip request #${formData.shuttle_no}`,
          { after: newRequest }
        );
        
        alert('Trip request created successfully!');
      }

      resetForm();
      loadTripRequests();
    } catch (error) {
      console.error('Error saving trip request:', error);
      alert('Failed to save trip request');
    }
  };

  const handleEdit = async (request: TripRequest) => {
    try {
      // Fetch latest data
      const { data, error } = await supabase
        .from('trip_requests')
        .select('*')
        .eq('id', request.id)
        .single();

      if (error) throw error;

      if (data) {
        setEditingRequest(data);
        setFormData({
          shuttle_no: data.shuttle_no,
          reason: data.reason,
          reason_shortext: data.reason_shortext,
          date_requested: data.date_requested,
          date_of_service: data.date_of_service,
          module: data.module,
          arrival_time: data.arrival_time,
          passenger_count: data.passenger_count,
          in_out: data.in_out,
          address: data.address,
          van_driver: data.van_driver,
          details: data.details,
          van_nos: data.van_nos,
          requestor_confirmed_service: data.requestor_confirmed_service,
          route: data.route,
          status: data.status,
        });
        setIsFormOpen(true);
        setErrors({});
      }
    } catch (error) {
      console.error('Error fetching trip request:', error);
      alert('Failed to load trip request details');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this trip request?')) return;

    try {
      // Get request details before deletion for audit log
      const requestToDelete = tripRequests.find(r => r.id === id);
      
      const { error } = await supabase
        .from('trip_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Audit log
      if (requestToDelete) {
        await auditLogService.createLog(
          'DELETE',
          `Deleted trip request #${requestToDelete.shuttle_no} (Requestor: ${requestToDelete.requestor})`
        );
      }
      
      alert('Trip request deleted successfully!');
      loadTripRequests();
    } catch (error) {
      console.error('Error deleting trip request:', error);
      alert('Failed to delete trip request');
    }
  };

  const handleComplete = async (id: string) => {
    if (!confirm('Mark this trip request as completed?')) return;

    try {
      // Get request details for audit log
      const request = tripRequests.find(r => r.id === id);
      
      const { error } = await supabase
        .from('trip_requests')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      
      // Audit log
      if (request) {
        await auditLogService.createLog(
          'STATUS_CHANGE',
          `Marked trip request #${request.shuttle_no} as COMPLETED (Requestor: ${request.requestor})`,
          { before: { status: request.status }, after: { status: 'completed' } }
        );
      }
      
      alert('Trip request marked as completed!');
      loadTripRequests();
    } catch (error) {
      console.error('Error completing trip request:', error);
      alert('Failed to complete trip request');
    }
  };

  const handleCancelled = async (id: string) => {
    if (!confirm('Mark this trip request as cancelled?')) return;

    try {
      // Get request details for audit log
      const request = tripRequests.find(r => r.id === id);
      
      const { error } = await supabase
        .from('trip_requests')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      
      // Audit log
      if (request) {
        await auditLogService.createLog(
          'STATUS_CHANGE',
          `Marked trip request #${request.shuttle_no} as CANCELLED (Requestor: ${request.requestor})`,
          { before: { status: request.status }, after: { status: 'cancelled' } }
        );
      }
      
      alert('Trip request marked as cancelled!');
      loadTripRequests();
    } catch (error) {
      console.error('Error cancelling trip request:', error);
      alert('Failed to cancel trip request');
    }
  };

  const handleVanNumberChange = (vanNumber: string) => {
    const selectedFleet = fleetDetails.find(f => f.van_number === vanNumber);
    setFormData({
      ...formData,
      van_nos: vanNumber,
      van_driver: selectedFleet?.driver_name || '',
    });
  };

  const handleDateOfServiceChange = (date: string) => {
    setFormData({ ...formData, date_of_service: date });
    loadRoutes(date);
  };

  const resetForm = () => {
    setFormData({
      shuttle_no: '',
      reason: '',
      reason_shortext: '',
      date_requested: new Date().toISOString().split('T')[0],
      date_of_service: '',
      module: '',
      arrival_time: '',
      passenger_count: 0,
      in_out: '',
      address: '',
      van_driver: '',
      details: '',
      van_nos: '',
      requestor_confirmed_service: '',
      route: '',
      status: 'pending',
    });
    setEditingRequest(null);
    setIsFormOpen(false);
    setErrors({});
  };

  const filteredRequests = tripRequests.filter(request =>
    request.requestor?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalRequests = filteredRequests.length;
  const completedRequests = filteredRequests.filter(r => r.status === 'completed').length;
  const cancelledRequests = filteredRequests.filter(r => r.status === 'cancelled').length;

  return (
    <div className="min-h-screen bg-bg-primary p-2 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <Card className="p-4 bg-bg-secondary border border-border-muted">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Trip Requests</h1>
              <p className="text-xs sm:text-sm text-text-secondary mt-1">Manage trip requests</p>
            </div>
            <Button
              onClick={() => setIsFormOpen(true)}
              className="bg-gradient-to-r from-accent to-accent-hover text-white px-4 py-2 rounded-lg font-medium text-sm hover:shadow-lg transition-all"
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Request
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
                <p className="text-xs text-text-muted">Total Requests</p>
                <p className="text-2xl font-bold text-text-primary">{totalRequests}</p>
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
                <p className="text-xs text-text-muted">Completed</p>
                <p className="text-2xl font-bold text-text-primary">{completedRequests}</p>
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
                <p className="text-xs text-text-muted">Cancelled</p>
                <p className="text-2xl font-bold text-text-primary">{cancelledRequests}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <Card className="p-4 bg-bg-secondary border border-border-muted">
          <Input
            type="text"
            placeholder="Search by requestor or passenger name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-elevated border-border-muted text-text-primary"
          />
        </Card>

        {/* Table */}
        <Card className="bg-bg-secondary border border-border-muted overflow-hidden">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-bg-elevated border-b border-border-muted sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider whitespace-nowrap">Shuttle No</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider whitespace-nowrap">Requestor</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider whitespace-nowrap">No. of Passengers</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider whitespace-nowrap">Date of Service</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider whitespace-nowrap">Time</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider whitespace-nowrap">In/Out</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider whitespace-nowrap">Route</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-text-primary uppercase tracking-wider whitespace-nowrap sticky right-0 bg-bg-elevated">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-muted">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-text-secondary">
                      Loading trip requests...
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-text-secondary">
                      No trip requests found
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((request) => (
                    <tr
                      key={request.id}
                      onDoubleClick={() => handleEdit(request)}
                      className="hover:bg-bg-elevated transition-colors cursor-pointer"
                    >
                      <td className="px-3 py-3 text-sm text-text-primary font-medium whitespace-nowrap">{request.shuttle_no}</td>
                      <td className="px-3 py-3 text-sm text-text-primary whitespace-nowrap">{request.requestor}</td>
                      <td className="px-3 py-3 text-sm text-text-secondary whitespace-nowrap">{request.passenger_count}</td>
                      <td className="px-3 py-3 text-sm text-text-secondary whitespace-nowrap">{new Date(request.date_of_service).toLocaleDateString()}</td>
                      <td className="px-3 py-3 text-sm text-text-secondary whitespace-nowrap">{request.arrival_time || '-'}</td>
                      <td className="px-3 py-3 text-sm text-text-secondary whitespace-nowrap">{request.in_out || '-'}</td>
                      <td className="px-3 py-3 text-sm text-text-secondary whitespace-nowrap">{request.route || '-'}</td>
                      <td className="px-3 py-3 text-sm whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          request.status === 'completed'
                            ? 'bg-green-900/30 text-green-400'
                            : request.status === 'cancelled'
                            ? 'bg-red-900/30 text-red-400'
                            : 'bg-yellow-900/30 text-yellow-400'
                        }`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap sticky right-0 bg-bg-secondary">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleComplete(request.id);
                            }}
                            className="text-green-500 hover:text-green-400 transition-colors p-1"
                            title="Complete"
                            disabled={request.status === 'completed'}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelled(request.id);
                            }}
                            className="text-yellow-500 hover:text-yellow-400 transition-colors p-1"
                            title="Cancel"
                            disabled={request.status === 'cancelled'}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(request);
                            }}
                            className="text-accent hover:text-accent-hover transition-colors p-1"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(request.id);
                            }}
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
                    {editingRequest ? 'Edit Trip Request' : 'New Trip Request'}
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
                  {/* Shuttle No */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Shuttle No <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={formData.shuttle_no}
                      onChange={(e) => setFormData({ ...formData, shuttle_no: e.target.value })}
                      className="w-full bg-bg-elevated border-border-muted text-text-primary"
                      placeholder="Enter shuttle number"
                    />
                    {errors.shuttle_no && <p className="text-red-500 text-xs mt-1">{errors.shuttle_no}</p>}
                  </div>

                  {/* Passenger Count */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Passenger Count <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      value={formData.passenger_count}
                      onChange={(e) => setFormData({ ...formData, passenger_count: e.target.value === '' ? 0 : Number(e.target.value) })}
                      className="w-full bg-bg-elevated border-border-muted text-text-primary"
                      placeholder="Enter passenger count"
                    />
                    {errors.passenger_count && <p className="text-red-500 text-xs mt-1">{errors.passenger_count}</p>}
                  </div>

                  {/* Date Requested */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Date Requested
                    </label>
                    <Input
                      type="date"
                      value={formData.date_requested}
                      onChange={(e) => setFormData({ ...formData, date_requested: e.target.value })}
                      className="w-full bg-bg-elevated border-border-muted text-text-primary"
                    />
                  </div>

                  {/* Date of Service */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Date of Service <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={formData.date_of_service}
                      onChange={(e) => handleDateOfServiceChange(e.target.value)}
                      className="w-full bg-bg-elevated border-border-muted text-text-primary"
                    />
                    {errors.date_of_service && <p className="text-red-500 text-xs mt-1">{errors.date_of_service}</p>}
                  </div>

                  {/* Arrival Time */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Arrival Time
                    </label>
                    <Input
                      type="time"
                      value={formData.arrival_time}
                      onChange={(e) => setFormData({ ...formData, arrival_time: e.target.value })}
                      className="w-full bg-bg-elevated border-border-muted text-text-primary"
                    />
                  </div>

                  {/* In/Out */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      In/Out
                    </label>
                    <Input
                      type="text"
                      value={formData.in_out}
                      onChange={(e) => setFormData({ ...formData, in_out: e.target.value })}
                      className="w-full bg-bg-elevated border-border-muted text-text-primary"
                      placeholder="Enter in/out"
                    />
                  </div>

                  {/* Route */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Route
                    </label>
                    <Select
                      value={formData.route}
                      onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                      className="w-full bg-bg-elevated border-border-muted text-text-primary"
                    >
                      <option value="">Select route</option>
                      {routes.map((route) => (
                        <option key={route.id} value={route.route}>
                          {route.route}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {/* Module */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Module
                    </label>
                    <Input
                      type="text"
                      value={formData.module}
                      onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                      className="w-full bg-bg-elevated border-border-muted text-text-primary"
                      placeholder="Enter module"
                    />
                  </div>

                  {/* Van Driver - Hidden for passengers */}
                  {currentUser?.role !== 'passenger' && (
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Van Driver
                      </label>
                      <Input
                        type="text"
                        value={formData.van_driver}
                        onChange={(e) => setFormData({ ...formData, van_driver: e.target.value })}
                        className="w-full bg-bg-elevated border-border-muted text-text-primary"
                        placeholder="Enter van driver"
                      />
                    </div>
                  )}

                  {/* Van Nos - Hidden for passengers */}
                  {currentUser?.role !== 'passenger' && (
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Van Number
                      </label>
                      <Select
                        value={formData.van_nos}
                        onChange={(e) => handleVanNumberChange(e.target.value)}
                        className="w-full bg-bg-elevated border-border-muted text-text-primary"
                      >
                        <option value="">Select van number</option>
                        {fleetDetails.map((fleet) => (
                          <option key={fleet.id} value={fleet.van_number}>
                            {fleet.van_number} - {fleet.plate_number}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}

                  {/* Confirmed Service */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Confirmed Service
                    </label>
                    <Input
                      type="text"
                      value={formData.requestor_confirmed_service}
                      onChange={(e) => setFormData({ ...formData, requestor_confirmed_service: e.target.value })}
                      className="w-full bg-bg-elevated border-border-muted text-text-primary"
                      placeholder="Enter confirmed service"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Status
                    </label>
                    <Select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'pending' | 'completed' | 'cancelled' })}
                      className="w-full bg-bg-elevated border-border-muted text-text-primary"
                    >
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </Select>
                  </div>

                  {/* Address */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Address
                    </label>
                    <Input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full bg-bg-elevated border-border-muted text-text-primary"
                      placeholder="Enter address"
                    />
                  </div>

                  {/* Reason */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Reason <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      className="w-full bg-bg-elevated border-border-muted text-text-primary"
                      placeholder="Enter reason"
                      rows={2}
                    />
                    {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason}</p>}
                  </div>

                  {/* Reason Short Text */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Reason (Short)
                    </label>
                    <Input
                      type="text"
                      value={formData.reason_shortext}
                      onChange={(e) => setFormData({ ...formData, reason_shortext: e.target.value })}
                      className="w-full bg-bg-elevated border-border-muted text-text-primary"
                      placeholder="Enter short reason"
                    />
                  </div>

                  {/* Details */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Details (Name of Passengers)
                    </label>
                    <Textarea
                      value={formData.details}
                      onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                      className="w-full bg-bg-elevated border-border-muted text-text-primary"
                      placeholder="Enter details"
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
                    {editingRequest ? 'Update' : 'Create'} Request
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

