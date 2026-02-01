import { useState, useEffect } from 'react';
import { Maintenance, Vehicle } from '../types';
import MaintenanceTable from './MaintenanceTable';
import MaintenanceForm from './MaintenanceForm';
import Modal from './Modal';
import { Card, Button } from './ui';
import { maintenanceStorage, vehicleStorage } from '../storage';
import { notificationService } from '../services/notificationService';
import { auditLogService } from '../services/auditLogService';
import { vehicleService } from '../services/supabaseService';

export default function MaintenanceModule() {
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [editingMaintenance, setEditingMaintenance] = useState<Maintenance | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Load maintenances and vehicles from storage on mount
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [storedMaintenances, storedVehicles] = await Promise.all([
          maintenanceStorage.getAll(),
          vehicleStorage.getAll()
        ]);
        console.log('Loaded maintenance records:', storedMaintenances);
        console.log('Loaded vehicles:', storedVehicles);
        setMaintenances(storedMaintenances);
        setVehicles(storedVehicles);
      } catch (error) {
        console.error('Error loading maintenance data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Dispatch event when maintenances update so other modules can react
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('maintenanceUpdated', { detail: maintenances }));
  }, [maintenances]);

  const handleScheduleMaintenance = async (maintenanceData: Omit<Maintenance, 'id'>) => {
    try {
      const newMaintenance = await maintenanceStorage.save(maintenanceData);
      
      // Add new maintenance to state to refresh table
      setMaintenances(prev => [...prev, newMaintenance]);
      
      // Update vehicle status to "maintenance"
      try {
        await vehicleService.update(newMaintenance.vehicle_id, { status: 'maintenance' });
        
        // Dispatch event to update vehicles in other components
        window.dispatchEvent(new CustomEvent('maintenanceStatusChanged', { 
          detail: { vehicleId: newMaintenance.vehicle_id, status: 'maintenance' }
        }));
      } catch (vehicleError: any) {
        console.error('Failed to update vehicle status:', vehicleError);
        // Continue with success notification even if vehicle update fails
      }
      
      setIsModalOpen(false);
      
      notificationService.success(
        'Maintenance Scheduled',
        `${newMaintenance.maintenance_type} scheduled and vehicle marked as under maintenance`
      );
      await auditLogService.createLog(
        'Maintenance Scheduled',
        `Scheduled ${newMaintenance.maintenance_type} for ${newMaintenance.scheduled_date} and updated vehicle status to maintenance`
      );
    } catch (error) {
      console.error('Failed to schedule maintenance:', error);
      notificationService.error('Failed to Schedule', 'Unable to schedule maintenance. Please try again.');
      alert('Failed to schedule maintenance. Please try again.');
    }
  };

  const handleUpdateMaintenance = async (maintenance: Maintenance) => {
    const oldMaintenance = maintenances.find(m => m.id === maintenance.id);
    try {
      await maintenanceStorage.update(maintenance);
      setMaintenances(maintenances.map(m => m.id === maintenance.id ? maintenance : m));
      setEditingMaintenance(undefined);
      setIsModalOpen(false);
      
      notificationService.success(
        'Maintenance Updated',
        `${maintenance.maintenance_type} record has been updated`
      );
      await auditLogService.createLog(
        'Maintenance Updated',
        `Updated ${maintenance.maintenance_type} maintenance record`,
        { before: oldMaintenance, after: maintenance }
      );
    } catch (error) {
      console.error('Failed to update maintenance:', error);
      notificationService.error('Failed to Update', 'Unable to update maintenance. Please try again.');
      alert('Failed to update maintenance. Please try again.');
    }
  };

  const handleMarkCompleted = async (id: string) => {
    try {
      const maintenance = maintenances.find(m => m.id === id);
      await maintenanceStorage.markCompleted(id);
      setMaintenances(maintenances.map(m => 
        m.id === id ? { ...m, status: 'completed' as const } : m
      ));
      
      // Update vehicle status back to "active" when maintenance is completed
      if (maintenance) {
        try {
          await vehicleService.update(maintenance.vehicle_id, { status: 'active' });
          
          // Dispatch event to update vehicles in other components
          window.dispatchEvent(new CustomEvent('maintenanceStatusChanged', { 
            detail: { vehicleId: maintenance.vehicle_id, status: 'active' }
          }));
        } catch (vehicleError: any) {
          console.error('Failed to update vehicle status:', vehicleError);
          // Continue with success notification even if vehicle update fails
        }
      }
      
      notificationService.success(
        'Maintenance Completed',
        `${maintenance?.maintenance_type || 'Service'} has been marked as completed and vehicle returned to active status`
      );
      await auditLogService.createLog(
        'Maintenance Completed',
        `Completed ${maintenance?.maintenance_type} maintenance and updated vehicle status to active`
      );
    } catch (error) {
      console.error('Failed to mark maintenance as completed:', error);
      notificationService.error('Failed to Complete', 'Unable to mark as completed. Please try again.');
      alert('Failed to mark maintenance as completed. Please try again.');
    }
  };

  const handleDeleteMaintenance = async (id: string) => {
    const maintenance = maintenances.find(m => m.id === id);
    if (!maintenance) return;

    if (!confirm(`Are you sure you want to delete this ${maintenance.maintenance_type} maintenance record?`)) {
      return;
    }

    try {
      await maintenanceStorage.delete(id);
      setMaintenances(prev => prev.filter(m => m.id !== id));
      
      notificationService.success(
        'Maintenance Deleted',
        'Maintenance record has been successfully deleted'
      );
      await auditLogService.createLog(
        'Maintenance Deleted',
        `Deleted ${maintenance.maintenance_type} maintenance record for vehicle ${maintenance.vehicle_id}`
      );
    } catch (error) {
      console.error('Failed to delete maintenance:', error);
      notificationService.error('Failed to Delete', 'Unable to delete maintenance record. Please try again.');
      alert('Failed to delete maintenance. Please try again.');
    }
  };

  const handleEditMaintenance = (maintenance: Maintenance) => {
    setEditingMaintenance(maintenance);
    setIsModalOpen(true);
  };

  const handleAddMaintenance = () => {
    setEditingMaintenance(undefined);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMaintenance(undefined);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary">Total Records</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{maintenances.length}</p>
            </div>
            <div className="w-12 h-12 bg-accent-soft rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary">Pending</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{maintenances.filter(m => m.status === 'pending').length}</p>
            </div>
            <div className="w-12 h-12 bg-accent-soft rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary">Completed</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{maintenances.filter(m => m.status === 'completed').length}</p>
            </div>
            <div className="w-12 h-12 bg-accent-soft rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Card */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b border-border-muted">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Maintenance Schedule</h2>
            <p className="text-sm text-text-secondary mt-1">Track and manage vehicle maintenance</p>
          </div>
          <Button
            onClick={handleAddMaintenance}
              variant="primary"
              size="md"
              className="inline-flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Schedule Maintenance
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
              <p className="text-text-secondary mt-4">Loading maintenance records...</p>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <MaintenanceTable 
              maintenances={maintenances} 
              vehicles={vehicles}
              onMarkCompleted={handleMarkCompleted}
              onEdit={handleEditMaintenance}
              onDelete={handleDeleteMaintenance}
            />
          </div>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingMaintenance ? 'Edit Maintenance' : 'Schedule New Maintenance'}
      >
        <MaintenanceForm
          onSchedule={handleScheduleMaintenance}
          onUpdate={handleUpdateMaintenance}
          vehicles={vehicles}
          initialData={editingMaintenance}
        />
      </Modal>
    </div>
  );
}
