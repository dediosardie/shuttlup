import { useState, useEffect } from 'react';
import { Driver } from '../types';
import DriverTable from './DriverTable';
import DriverForm from './DriverForm';
import Modal from './Modal';
import { driverStorage } from '../storage';
import { notificationService } from '../services/notificationService';
import { auditLogService } from '../services/auditLogService';
import { Card, Button } from './ui';

export default function DriverModule() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [editingDriver, setEditingDriver] = useState<Driver | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Load drivers from storage on mount
    const loadDrivers = async () => {
      try {
        setIsLoading(true);
        const storedDrivers = await driverStorage.getAll();
        console.log('Loaded drivers:', storedDrivers);
        setDrivers(storedDrivers);
      } catch (error) {
        console.error('Error loading drivers:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadDrivers();
  }, []);

  // Dispatch event when drivers update so other modules can react
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('driversUpdated', { detail: drivers }));
  }, [drivers]);

  const handleSaveDriver = async (driverData: Omit<Driver, 'id'>) => {
    try {
      const newDriver = await driverStorage.save(driverData);
      setDrivers([...drivers, newDriver]);
      setIsModalOpen(false);
      
      notificationService.success(
        'Driver Added',
        `${newDriver.full_name} has been successfully added`
      );
      await auditLogService.createLog(
        'Driver Created',
        `Added driver ${newDriver.full_name} (License: ${newDriver.license_number})`
      );
    } catch (error) {
      console.error('Failed to save driver:', error);
      notificationService.error('Failed to Add Driver', 'Unable to add driver. Please try again.');
      alert('Failed to save driver. Please try again.');
    }
  };

  const handleUpdateDriver = async (driver: Driver) => {
    const oldDriver = drivers.find(d => d.id === driver.id);
    try {
      await driverStorage.update(driver);
      setDrivers(drivers.map(d => d.id === driver.id ? driver : d));
      setEditingDriver(undefined);
      setIsModalOpen(false);
      
      notificationService.success(
        'Driver Updated',
        `${driver.full_name}'s information has been updated`
      );
      await auditLogService.createLog(
        'Driver Updated',
        `Updated driver ${driver.full_name} (License: ${driver.license_number})`,
        { before: oldDriver, after: driver }
      );
    } catch (error) {
      console.error('Failed to update driver:', error);
      notificationService.error('Failed to Update Driver', 'Unable to update driver. Please try again.');
      alert('Failed to update driver. Please try again.');
    }
  };

  const handleSuspendDriver = async (id: string) => {
    try {
      const driver = drivers.find(d => d.id === id);
      await driverStorage.suspend(id);
      setDrivers(drivers.map(d => 
        d.id === id ? { ...d, status: 'suspended' as const } : d
      ));
      
      notificationService.warning(
        'Driver Suspended',
        `${driver?.full_name || 'Driver'} has been suspended`
      );
      await auditLogService.createLog(
        'Driver Suspended',
        `Suspended driver ${driver?.full_name} (License: ${driver?.license_number})`
      );
    } catch (error) {
      console.error('Failed to suspend driver:', error);
      notificationService.error('Failed to Suspend Driver', 'Unable to suspend driver. Please try again.');
      alert('Failed to suspend driver. Please try again.');
    }
  };

  const handleDeleteDriver = async (id: string) => {
    try {
      const driver = drivers.find(d => d.id === id);
      await driverStorage.delete(id);
      setDrivers(drivers.filter(d => d.id !== id));
      
      notificationService.success(
        'Driver Deleted',
        `${driver?.full_name || 'Driver'} has been successfully deleted`
      );
      await auditLogService.createLog(
        'Driver Deleted',
        `Deleted driver ${driver?.full_name} (License: ${driver?.license_number})`
      );
    } catch (error: any) {
      console.error('Failed to delete driver:', error);
      
      // Check if it's a foreign key constraint error
      if (error?.message?.includes('trips_driver_id_fkey') || 
          error?.message?.includes('still referenced') ||
          error?.code === '23503') {
        const driver = drivers.find(d => d.id === id);
        notificationService.error(
          'Cannot Delete Driver',
          `${driver?.full_name || 'Driver'} cannot be deleted because they have trip history. Suspend the driver instead.`
        );
        alert(`Cannot delete ${driver?.full_name || 'this driver'}.\n\nThis driver has existing trip records and cannot be deleted.\nPlease suspend the driver instead to prevent future assignments.`);
      } else {
        notificationService.error('Failed to Delete Driver', 'Unable to delete driver. Please try again.');
      }
    }
  };

  const handleEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setIsModalOpen(true);
  };

  const handleAddDriver = () => {
    setEditingDriver(undefined);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDriver(undefined);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary">Total Drivers</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{drivers.length}</p>
            </div>
            <div className="w-12 h-12 bg-accent-soft rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary">Active</p>
              <p className="text-2xl font-bold text-emerald-500 mt-1">{drivers.filter(d => d.status === 'active').length}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary">Suspended</p>
              <p className="text-2xl font-bold text-red-500 mt-1">{drivers.filter(d => d.status === 'suspended').length}</p>
            </div>
            <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Card */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b border-border-muted">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Driver Management</h2>
            <p className="text-sm text-text-secondary mt-1">Manage driver records and licensing</p>
          </div>
          <Button onClick={handleAddDriver} variant="primary"
              size="md"
              className="inline-flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Driver
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
              <p className="text-text-secondary mt-4">Loading drivers...</p>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <DriverTable drivers={drivers} onSuspend={handleSuspendDriver} onEdit={handleEditDriver} onDelete={handleDeleteDriver} />
          </div>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingDriver ? 'Edit Driver' : 'Add New Driver'}
      >
        <DriverForm
          onSave={handleSaveDriver}
          onUpdate={handleUpdateDriver}
          initialData={editingDriver}
        />
      </Modal>
    </div>
  );
}
