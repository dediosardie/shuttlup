// Trip Module - Defined per trip-scheduling-module.md
import { useState, useEffect } from 'react';
import { Trip, Vehicle, Driver, Maintenance } from '../types';
import TripTable from './TripTable';
import TripForm from './TripForm';
import DriverTripTracker from './DriverTripTracker';
import Modal from './Modal';
import { Card, Button } from './ui';
import { vehicleStorage, driverStorage, maintenanceStorage } from '../storage';
import { tripService } from '../services/supabaseService';
import { notificationService } from '../services/notificationService';
import { auditLogService } from '../services/auditLogService';

export default function TripModule() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [editingTrip, setEditingTrip] = useState<Trip | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Load trips, vehicles, and drivers from storage on mount
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [tripsData, vehiclesData, driversData, maintenancesData] = await Promise.all([
          tripService.getAll(),
          vehicleStorage.getAll(),
          driverStorage.getAll(),
          maintenanceStorage.getAll(),
        ]);
        setTrips(tripsData);
        setVehicles(vehiclesData);
        setDrivers(driversData);
        setMaintenances(maintenancesData);
        console.log('Loaded data for trip module:', {
          trips: tripsData.length,
          vehicles: vehiclesData.length,
          drivers: driversData.length,
          maintenances: maintenancesData.length,
        });
      } catch (error) {
        console.error('Error loading trip data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Dispatch event when trips update so other modules can react
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('tripsUpdated', { detail: trips }));
  }, [trips]);

  // Listen for updates from other modules
  useEffect(() => {
    const handleVehiclesUpdate = ((event: CustomEvent) => {
      setVehicles(event.detail);
    }) as EventListener;
    
    const handleDriversUpdate = ((event: CustomEvent) => {
      setDrivers(event.detail);
    }) as EventListener;

    window.addEventListener('vehiclesUpdated', handleVehiclesUpdate);
    window.addEventListener('driversUpdated', handleDriversUpdate);

    return () => {
      window.removeEventListener('vehiclesUpdated', handleVehiclesUpdate);
      window.removeEventListener('driversUpdated', handleDriversUpdate);
    };
  }, []);

  // Action: Create Trip (primary, submit)
  const handleSaveTrip = async (tripData: Omit<Trip, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newTrip = await tripService.create(tripData);
      setTrips([newTrip, ...trips]);
      setIsModalOpen(false);
      
      notificationService.success(
        'Trip Scheduled',
        `Trip to ${newTrip.destination} has been scheduled`
      );
      await auditLogService.createLog(
        'Trip Created',
        `Scheduled trip from ${newTrip.origin} to ${newTrip.destination}`
      );
    } catch (error: any) {
      console.error('Failed to save trip:', error);
      notificationService.error('Failed to Schedule Trip', error.message || 'Unable to schedule trip.');
      alert(error.message || 'Failed to save trip. Please try again.');
    }
  };

  // Action: Update Trip (primary, submit)
  const handleUpdateTrip = async (trip: Trip) => {
    try {
      const { id, created_at, updated_at, ...updateData } = trip;
      const updated = await tripService.update(id, updateData);
      setTrips(trips.map(t => t.id === updated.id ? updated : t));
      setIsModalOpen(false);
      setEditingTrip(undefined);
      
      notificationService.success(
        'Trip Updated',
        `Trip to ${updated.destination} has been updated`
      );
      await auditLogService.createLog(
        'Trip Updated',
        `Updated trip from ${updated.origin} to ${updated.destination}`,
        { before: trip, after: updated }
      );
    } catch (error: any) {
      console.error('Failed to update trip:', error);
      notificationService.error('Failed to Update Trip', error.message || 'Unable to update trip.');
      alert(error.message || 'Failed to update trip. Please try again.');
    }
  };

  // Action: Start Trip (success, updates status to in_progress, records actual_departure)
  const handleStartTrip = async (id: string) => {
    try {
      const updated = await tripService.startTrip(id);
      setTrips(trips.map(t => t.id === updated.id ? updated : t));
      
      notificationService.info(
        'Trip Started',
        `Trip to ${updated.destination} is now in progress`
      );
      await auditLogService.createLog(
        'Trip Started',
        `Started trip to ${updated.destination}`
      );
    } catch (error: any) {
      console.error('Failed to start trip:', error);
      notificationService.error('Failed to Start Trip', error.message || 'Unable to start trip.');
      alert(error.message || 'Failed to start trip. Please try again.');
    }
  };

  // Action: Complete Trip (success, updates status to completed, records actual_arrival)
  const handleCompleteTrip = async (id: string) => {
    try {
      const updated = await tripService.completeTrip(id);
      setTrips(trips.map(t => t.id === updated.id ? updated : t));
      
      notificationService.success(
        'Trip Completed',
        `Trip to ${updated.destination} has been completed successfully`
      );
      await auditLogService.createLog(
        'Trip Completed',
        `Completed trip to ${updated.destination}`
      );
    } catch (error: any) {
      console.error('Failed to complete trip:', error);
      notificationService.error('Failed to Complete Trip', error.message || 'Unable to complete trip.');
      alert(error.message || 'Failed to complete trip. Please try again.');
    }
  };

  // Action: Cancel Trip (danger, confirmation required)
  const handleCancelTrip = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this trip?')) {
      return;
    }
    try {
      const trip = trips.find(t => t.id === id);
      const updated = await tripService.cancelTrip(id);
      setTrips(trips.map(t => t.id === updated.id ? updated : t));
      
      notificationService.warning(
        'Trip Cancelled',
        `Trip to ${updated.destination} has been cancelled`
      );
      await auditLogService.createLog(
        'Trip Cancelled',
        `Cancelled trip to ${trip?.destination}`
      );
    } catch (error: any) {
      console.error('Failed to cancel trip:', error);
      notificationService.error('Failed to Cancel Trip', error.message || 'Unable to cancel trip.');
      alert(error.message || 'Failed to cancel trip. Please try again.');
    }
  };

  // Action: View Route Map (secondary, displays visual route)
  const handleViewRoute = (trip: Trip) => {
    alert(`View route for trip from ${trip.origin} to ${trip.destination}\n(Route visualization would be implemented here)`);
  };

  const handleEditTrip = (trip: Trip) => {
    setEditingTrip(trip);
    setIsModalOpen(true);
  };

  const handleAddTrip = () => {
    setEditingTrip(undefined);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTrip(undefined);
  };

  // Calculate stats
  const plannedTrips = trips.filter(t => t.status === 'planned').length;
  const inProgressTrips = trips.filter(t => t.status === 'in_progress').length;
  const completedTrips = trips.filter(t => t.status === 'completed').length;
  const totalDistance = trips.reduce((sum, t) => sum + t.distance_km, 0);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary">Planned Trips</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{plannedTrips}</p>
            </div>
            <div className="w-12 h-12 bg-accent-soft rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary">In Progress</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{inProgressTrips}</p>
            </div>
            <div className="w-12 h-12 bg-accent-soft rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary">Completed</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{completedTrips}</p>
            </div>
            <div className="w-12 h-12 bg-accent-soft rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary">Total Distance</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{totalDistance.toFixed(0)} km</p>
            </div>
            <div className="w-12 h-12 bg-accent-soft rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Active Trip Tracking Section */}
      {inProgressTrips > 0 && (
        <Card>
          <div className="p-6 border-b border-border-muted">
            <h3 className="text-lg font-semibold text-text-primary">Active Trip Tracking</h3>
            <p className="text-sm text-text-secondary mt-1">Real-time GPS tracking for in-progress trips</p>
          </div>
          <div className="p-6 space-y-4">
            {trips
              .filter(t => t.status === 'in_progress')
              .map(trip => (
                <DriverTripTracker
                  key={trip.id}
                  trip={trip}
                  onComplete={() => handleCompleteTrip(trip.id)}
                />
              ))
            }
          </div>
        </Card>
      )}

      {/* Main Content */}
      <Card>
        <div className="p-6 border-b border-border-muted">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">Trip Schedule</h2>
              <p className="text-sm text-text-secondary mt-1">Manage routes and monitor trip status</p>
            </div>
            <Button
              onClick={handleAddTrip}
              variant="primary"
              size="md"
              className="inline-flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Schedule Trip
            </Button>
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
              <p className="mt-2 text-text-secondary">Loading trips...</p>
            </div>
          ) : (
            <TripTable
              trips={trips}
              vehicles={vehicles}
              drivers={drivers}
              onEdit={handleEditTrip}
              onStart={handleStartTrip}
              onComplete={handleCompleteTrip}
              onCancel={handleCancelTrip}
              onViewRoute={handleViewRoute}
            />
          )}
        </div>
      </Card>

      {/* Modal for Create/Edit Trip */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingTrip ? 'Edit Trip' : 'Schedule New Trip'}
      >
        <TripForm
          onSave={handleSaveTrip}
          onUpdate={handleUpdateTrip}
          initialData={editingTrip}
          vehicles={vehicles}
          drivers={drivers}
          maintenances={maintenances}
        />
      </Modal>
    </div>
  );
}
