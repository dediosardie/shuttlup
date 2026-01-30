// Incident & Insurance Module - Defined per incident-insurance-module.md
// This module includes Incident and Insurance Claim management
import { useState, useEffect } from 'react';
import { Incident, InsuranceClaim, Vehicle, Driver } from '../types';
import Modal from './Modal';
import { incidentService, insuranceService, vehicleService, driverService } from '../services/supabaseService';

// Format currency with Php prefix
const formatCurrency = (amount: number): string => {
  return `Php ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
export default function IncidentInsuranceModule() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [editingIncident] = useState<Incident | undefined>();
  const [selectedIncidentForClaim, setSelectedIncidentForClaim] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [incidentsData, claimsData, vehiclesData, driversData] = await Promise.all([
          incidentService.getAll(),
          insuranceService.getAllClaims(),
          vehicleService.getAll(),
          driverService.getAll(),
        ]);
        setIncidents(incidentsData);
        setClaims(claimsData);
        setVehicles(vehiclesData);
        setDrivers(driversData);
        console.log('Loaded incident data:', {
          incidents: incidentsData.length,
          claims: claimsData.length,
          vehicles: vehiclesData.length,
          drivers: driversData.length,
        });
      } catch (error) {
        console.error('Error loading incidents and claims:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();

    const handleVehiclesUpdate = ((event: CustomEvent) => setVehicles(event.detail)) as EventListener;
    const handleDriversUpdate = ((event: CustomEvent) => setDrivers(event.detail)) as EventListener;
    window.addEventListener('vehiclesUpdated', handleVehiclesUpdate);
    window.addEventListener('driversUpdated', handleDriversUpdate);
    return () => {
      window.removeEventListener('vehiclesUpdated', handleVehiclesUpdate);
      window.removeEventListener('driversUpdated', handleDriversUpdate);
    };
  }, []);

  // Dispatch event when incidents update so other modules can react
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('incidentsUpdated', { detail: incidents }));
  }, [incidents]);

  // Incident Form Component (inline for consolidation)
  const IncidentForm = ({ initialData, onSubmit, onClose }: any) => {
    const [formData, setFormData] = useState({
      vehicle_id: initialData?.vehicle_id || '',
      driver_id: initialData?.driver_id || '',
      incident_date: initialData?.incident_date || new Date().toISOString().slice(0, 16),
      location: initialData?.location || '',
      incident_type: initialData?.incident_type || 'collision',
      severity: initialData?.severity || 'minor',
      description: initialData?.description || '',
      weather_conditions: initialData?.weather_conditions || '',
      road_conditions: initialData?.road_conditions || '',
      police_report_number: initialData?.police_report_number || '',
      estimated_cost: initialData?.estimated_cost || 0,
      actual_cost: initialData?.actual_cost || 0,
      witnesses: initialData?.witnesses || '',
      assigned_to: initialData?.assigned_to || '',
      resolution_notes: initialData?.resolution_notes || '',
      status: initialData?.status || 'reported',
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // Validation: min 50 characters for description per markdown
      if (formData.description.length < 50) {
        alert('Description must be at least 50 characters');
        return;
      }
      onSubmit(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Vehicle (select, required, from active vehicles) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Vehicle <span className="text-red-600">*</span>
            </label>
            <select name="vehicle_id" value={formData.vehicle_id} onChange={(e) => setFormData({...formData, vehicle_id: e.target.value})} required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-red-500">
              <option value="">Select Vehicle</option>
              {vehicles.filter(v => v.status === 'active').map(v => (
                <option key={v.id} value={v.id}>{v.plate_number} - {v.make} {v.model}</option>
              ))}
            </select>
          </div>

          {/* Driver (select, required, from active drivers) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Driver <span className="text-red-600">*</span>
            </label>
            <select name="driver_id" value={formData.driver_id} onChange={(e) => setFormData({...formData, driver_id: e.target.value})} required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-red-500">
              <option value="">Select Driver</option>
              {drivers.filter(d => d.status === 'active').map(d => (
                <option key={d.id} value={d.id}>{d.full_name}</option>
              ))}
            </select>
          </div>

          {/* Incident Date (datetime, required) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Incident Date <span className="text-red-600">*</span></label>
            <input type="datetime-local" value={formData.incident_date} onChange={(e) => setFormData({...formData, incident_date: e.target.value})} required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-red-500" />
          </div>

          {/* Location (text, required) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Location <span className="text-red-600">*</span></label>
            <input type="text" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-red-500" />
          </div>

          {/* Incident Type (select, required) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Incident Type <span className="text-red-600">*</span></label>
            <select value={formData.incident_type} onChange={(e) => setFormData({...formData, incident_type: e.target.value as any})} required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-red-500">
              <option value="collision">Collision</option>
              <option value="theft">Theft</option>
              <option value="vandalism">Vandalism</option>
              <option value="mechanical_failure">Mechanical Failure</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Severity (select, required) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Severity <span className="text-red-600">*</span></label>
            <select value={formData.severity} onChange={(e) => setFormData({...formData, severity: e.target.value as any})} required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-red-500">
              <option value="minor">Minor</option>
              <option value="moderate">Moderate</option>
              <option value="severe">Severe</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Weather Conditions (text, optional) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Weather Conditions</label>
            <input type="text" value={formData.weather_conditions} onChange={(e) => setFormData({...formData, weather_conditions: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-red-500" />
          </div>

          {/* Road Conditions (text, optional) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Road Conditions</label>
            <input type="text" value={formData.road_conditions} onChange={(e) => setFormData({...formData, road_conditions: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-red-500" />
          </div>

          {/* Police Report Number (text, optional) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Police Report Number</label>
            <input type="text" value={formData.police_report_number} onChange={(e) => setFormData({...formData, police_report_number: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-red-500" />
          </div>

          {/* Estimated Cost (number, optional, decimal) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Cost</label>
            <input type="number" step="0.01" value={formData.estimated_cost} onChange={(e) => setFormData({...formData, estimated_cost: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-red-500" />
          </div>

          {/* Actual Cost (number, optional, decimal) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Actual Cost</label>
            <input type="number" step="0.01" value={formData.actual_cost} onChange={(e) => setFormData({...formData, actual_cost: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-red-500" />
          </div>

          {/* Assigned To (text, optional) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Assigned To</label>
            <input type="text" value={formData.assigned_to} onChange={(e) => setFormData({...formData, assigned_to: e.target.value})} placeholder="User ID or name" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-red-500" />
          </div>

          {/* Status (select, required) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status <span className="text-red-600">*</span></label>
            <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as any})} required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-red-500">
              <option value="reported">Reported</option>
              <option value="under_investigation">Under Investigation</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Description (textarea, required, min 50 characters) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description <span className="text-red-600">*</span> (min 50 characters)</label>
          <textarea rows={4} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} required minLength={50} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-red-500"></textarea>
          <p className="text-xs text-slate-500 mt-1">{formData.description.length}/50 characters</p>
        </div>

        {/* Witnesses (textarea, optional, JSON) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Witnesses</label>
          <textarea rows={2} value={formData.witnesses} onChange={(e) => setFormData({...formData, witnesses: e.target.value})} placeholder="Enter witness names and contact information" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-red-500"></textarea>
          <p className="text-xs text-slate-500 mt-1">Optional: List any witnesses with contact information</p>
        </div>

        {/* Resolution Notes (textarea, optional) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Resolution Notes</label>
          <textarea rows={3} value={formData.resolution_notes} onChange={(e) => setFormData({...formData, resolution_notes: e.target.value})} placeholder="Enter resolution notes when closing the incident" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-red-500"></textarea>
          <p className="text-xs text-slate-500 mt-1">Optional: Add notes about how the incident was resolved</p>
        </div>

        {/* Actions: Report Incident (primary, submit) */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
            {initialData ? 'Update Incident' : 'Report Incident'}
          </button>
        </div>
      </form>
    );
  };

  // Action: Report Incident (primary, submit) - per markdown
  const handleSaveIncident = async (incidentData: any) => {
    try {
      // Get current user ID from localStorage
      const userId = localStorage.getItem('user_id');
      if (!userId) {
        alert('You must be logged in to report an incident.');
        return;
      }
      
      // Add reported_by field
      const incidentWithReporter = {
        ...incidentData,
        reported_by: userId,
      };
      
      const newIncident = await incidentService.create(incidentWithReporter);
      setIncidents([newIncident, ...incidents]);
      setIsIncidentModalOpen(false);
    } catch (error: any) {
      console.error('Failed to save incident:', error);
      alert(error.message || 'Failed to save incident. Please try again.');
    }
  };

  // Action: File Insurance Claim (primary, opens claim form) - per markdown
  const handleFileClaim = (incidentId: string) => {
    setSelectedIncidentForClaim(incidentId);
    setIsClaimModalOpen(true);
  };

  // Calculate stats
  const reportedIncidents = incidents.filter(i => i.status === 'reported').length;
  const underInvestigation = incidents.filter(i => i.status === 'under_investigation').length;
  const resolvedIncidents = incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length;

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      ) : (
        <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Incidents</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{incidents.length}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Reported</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{reportedIncidents}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Under Investigation</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{underInvestigation}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Resolved/Closed</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{resolvedIncidents}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Incidents & Insurance Claims</h2>
              <p className="text-sm text-slate-600 mt-1">Manage incidents and track insurance claims</p>
            </div>
            {/* Action: Report Incident (primary) */}
            <button onClick={() => setIsIncidentModalOpen(true)} className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Report Incident
            </button>
          </div>
        </div>

        {/* Incidents Table - Columns per Incident Table definition */}
        <div className="p-6">
          {incidents.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-slate-900 mb-1">No incidents reported</h3>
              <p className="text-slate-600">System is clear - no incidents to display</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Incident #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Vehicle</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Severity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Est. Cost</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {incidents.map((incident) => (
                    <tr key={incident.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{incident.incident_number}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{new Date(incident.incident_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {(() => {
                          const vehicle = vehicles.find(v => v.id === incident.vehicle_id);
                          return vehicle ? `${vehicle.plate_number}${vehicle.conduction_number ? ` (${vehicle.conduction_number})` : ''}` : 'N/A';
                        })()}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 capitalize">{incident.incident_type.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          incident.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          incident.severity === 'severe' ? 'bg-orange-100 text-orange-800' :
                          incident.severity === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {incident.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          incident.status === 'reported' ? 'bg-amber-100 text-amber-800' :
                          incident.status === 'under_investigation' ? 'bg-blue-100 text-blue-800' :
                          incident.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {incident.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{formatCurrency(incident.estimated_cost || 0)}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium space-x-2">
                        {/* Action: File Insurance Claim (primary) - only if cost > Php 1000 per business rules */}
                        {incident.estimated_cost && incident.estimated_cost > 1000 && !claims.find(c => c.incident_id === incident.id) && (
                          <button onClick={() => handleFileClaim(incident.id)} className="text-blue-600 hover:text-blue-900">File Claim</button>
                        )}
                        <button className="text-red-600 hover:text-red-900">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal for Report Incident */}
      <Modal isOpen={isIncidentModalOpen} onClose={() => setIsIncidentModalOpen(false)} title={editingIncident ? 'Edit Incident' : 'Report New Incident'}>
        <IncidentForm initialData={editingIncident} onSubmit={handleSaveIncident} onClose={() => setIsIncidentModalOpen(false)} />
      </Modal>

      {/* Modal for File Insurance Claim */}
      <Modal isOpen={isClaimModalOpen} onClose={() => setIsClaimModalOpen(false)} title="File Insurance Claim">
        <p className="text-slate-600 mb-4">Insurance claim form for incident: {selectedIncidentForClaim}</p>
        <button onClick={() => setIsClaimModalOpen(false)} className="px-4 py-2 bg-slate-200 rounded">Close</button>
      </Modal>
        </>
      )}
    </div>
  );
}
