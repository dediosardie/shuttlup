// Trip Form Component - Defined per trip-scheduling-module.md
import React, { useState, useEffect, useRef } from 'react';
import { Trip, Vehicle, Driver, Maintenance } from '../types';
import { Input, Select, Textarea, Button } from './ui';

interface AddressSuggestion {
  display_name: string;
  lat: string;
  lon: string;
}
interface TripFormProps {
  onSave: (trip: Omit<Trip, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdate?: (trip: Trip) => void;
  initialData?: Trip;
  vehicles: Vehicle[];
  drivers: Driver[];
  maintenances: Maintenance[];
}

export default function TripForm({ onSave, onUpdate, initialData, vehicles, drivers, maintenances }: TripFormProps) {
  const [formData, setFormData] = useState<Omit<Trip, 'id' | 'created_at' | 'updated_at'>>({
    vehicle_id: initialData?.vehicle_id || '',
    driver_id: initialData?.driver_id || '',
    origin: initialData?.origin || '',
    destination: initialData?.destination || '',
    planned_departure: initialData?.planned_departure || '',
    planned_arrival: initialData?.planned_arrival || '',
    actual_departure: initialData?.actual_departure,
    actual_arrival: initialData?.actual_arrival,
    status: initialData?.status || 'planned',
    distance_km: initialData?.distance_km || 0,
    estimated_fuel_consumption: initialData?.estimated_fuel_consumption || 0,
    route_waypoints: initialData?.route_waypoints,
    notes: initialData?.notes,
  });

  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  const [distanceError, setDistanceError] = useState<string | null>(null);
  const [maintenanceWarning, setMaintenanceWarning] = useState<string | null>(null);
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [routeInstructions, setRouteInstructions] = useState<string[]>([]);
  const [originSuggestions, setOriginSuggestions] = useState<AddressSuggestion[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<AddressSuggestion[]>([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
  const [originCoords, setOriginCoords] = useState<{lat: number, lon: number} | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<{lat: number, lon: number} | null>(null);
  const originRef = useRef<HTMLDivElement>(null);
  const destinationRef = useRef<HTMLDivElement>(null);

  // Filter: only active vehicles per business rules
  const activeVehicles = vehicles.filter(v => v.status !== 'disposed');

  // Search addresses using Nominatim (OpenStreetMap)
  const searchAddress = async (query: string, isOrigin: boolean) => {
    if (!query || query.length < 3) {
      if (isOrigin) setOriginSuggestions([]);
      else setDestinationSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'VehicleMaintenanceSystem/1.0'
          }
        }
      );
      const data = await response.json();
      
      if (isOrigin) {
        setOriginSuggestions(data);
        setShowOriginSuggestions(true);
      } else {
        setDestinationSuggestions(data);
        setShowDestinationSuggestions(true);
      }
    } catch (error) {
      console.error('Error searching address:', error);
    }
  };

  // Calculate route using OSRM
  const calculateRoute = async (originLat: number, originLon: number, destLat: number, destLon: number) => {
    setIsCalculatingDistance(true);
    setDistanceError(null);

    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${originLon},${originLat};${destLon},${destLat}?overview=false&steps=true`
      );
      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceInKm = route.distance / 1000;
        const durationInMinutes = Math.round(route.duration / 60);
        const hours = Math.floor(durationInMinutes / 60);
        const minutes = durationInMinutes % 60;
        
        // Extract major roads for route summary (filter roads > 500m)
        const majorRoads: string[] = [];
        if (route.legs && route.legs[0]?.steps) {
          route.legs[0].steps.forEach((step: any) => {
            if (step.name && step.name !== '' && step.distance > 500) {
              // Avoid duplicates
              if (!majorRoads.includes(step.name)) {
                majorRoads.push(step.name);
              }
            }
          });
        }
        
        const routeSummary = majorRoads.length > 0 
          ? majorRoads.slice(0, 5).join(' → ') // Show up to 5 major roads
          : 'Direct route via local roads';
        
        setFormData(prev => ({
          ...prev,
          distance_km: parseFloat(distanceInKm.toFixed(2)),
        }));
        setEstimatedDuration(hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`);
        setRouteInstructions([routeSummary]);
        setDistanceError(null);
      } else {
        setDistanceError('Could not calculate route. Please check addresses.');
        setRouteInstructions([]);
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      setDistanceError('Failed to calculate route. Please enter manually.');
      setRouteInstructions([]);
    } finally {
      setIsCalculatingDistance(false);
    }
  };

  // Debounced address search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.origin && !originCoords) {
        searchAddress(formData.origin, true);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.origin, originCoords]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.destination && !destinationCoords) {
        searchAddress(formData.destination, false);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.destination, destinationCoords]);

  // Auto-calculate route when both coordinates are available
  useEffect(() => {
    if (originCoords && destinationCoords) {
      calculateRoute(originCoords.lat, originCoords.lon, destinationCoords.lat, destinationCoords.lon);
    }
  }, [originCoords, destinationCoords]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (originRef.current && !originRef.current.contains(event.target as Node)) {
        setShowOriginSuggestions(false);
      }
      if (destinationRef.current && !destinationRef.current.contains(event.target as Node)) {
        setShowDestinationSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check for maintenance conflicts
  useEffect(() => {
    if (!formData.vehicle_id || !formData.planned_departure) {
      setMaintenanceWarning(null);
      return;
    }

    const departureDate = new Date(formData.planned_departure).toISOString().split('T')[0];
    const vehicleMaintenance = maintenances.find(
      m => m.vehicle_id === formData.vehicle_id && 
           m.status === 'pending' && 
           m.scheduled_date === departureDate
    );

    if (vehicleMaintenance) {
      setMaintenanceWarning(
        `⚠️ Warning: This vehicle has scheduled ${vehicleMaintenance.maintenance_type} maintenance on ${vehicleMaintenance.scheduled_date}`
      );
    } else {
      setMaintenanceWarning(null);
    }
  }, [formData.vehicle_id, formData.planned_departure, maintenances]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        vehicle_id: initialData.vehicle_id,
        driver_id: initialData.driver_id,
        origin: initialData.origin,
        destination: initialData.destination,
        planned_departure: initialData.planned_departure,
        planned_arrival: initialData.planned_arrival,
        actual_departure: initialData.actual_departure,
        actual_arrival: initialData.actual_arrival,
        status: initialData.status,
        distance_km: initialData.distance_km,
        estimated_fuel_consumption: initialData.estimated_fuel_consumption,
        route_waypoints: initialData.route_waypoints,
        notes: initialData.notes,
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Reset coordinates when address is manually changed
    if (name === 'origin') {
      setOriginCoords(null);
      setEstimatedDuration('');
      setRouteInstructions([]);
    }
    if (name === 'destination') {
      setDestinationCoords(null);
      setEstimatedDuration('');
      setRouteInstructions([]);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: name === 'distance_km' || name === 'estimated_fuel_consumption' ? parseFloat(value) : value,
    }));
  };

  const handleSelectSuggestion = (suggestion: AddressSuggestion, isOrigin: boolean) => {
    if (isOrigin) {
      setFormData(prev => ({ ...prev, origin: suggestion.display_name }));
      setOriginCoords({ lat: parseFloat(suggestion.lat), lon: parseFloat(suggestion.lon) });
      setShowOriginSuggestions(false);
      setOriginSuggestions([]);
    } else {
      setFormData(prev => ({ ...prev, destination: suggestion.display_name }));
      setDestinationCoords({ lat: parseFloat(suggestion.lat), lon: parseFloat(suggestion.lon) });
      setShowDestinationSuggestions(false);
      setDestinationSuggestions([]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: planned arrival must be after planned departure per business rules
    if (new Date(formData.planned_arrival) <= new Date(formData.planned_departure)) {
      alert('Planned arrival must be after planned departure');
      return;
    }

    if (initialData && onUpdate) {
      onUpdate({ 
        ...formData, 
        id: initialData.id,
        created_at: initialData.created_at,
        updated_at: new Date().toISOString()
      });
    } else {
      onSave(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {maintenanceWarning && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">{maintenanceWarning}</span>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-6">
        {/* Vehicle (select, required, from active vehicles) */}
        <div>
          <Select
            label={<>Vehicle <span className="text-red-600">*</span></>}
            name="vehicle_id"
            value={formData.vehicle_id}
            onChange={handleChange}
            required
          >
            <option value="">Select Vehicle</option>
            {activeVehicles.map(vehicle => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.plate_number || vehicle.conduction_number} - {vehicle.make} {vehicle.model}
              </option>
            ))}
          </Select>
        </div>

        {/* Driver (select, required, from available drivers) */}
        <div>
          <Select
            label={<>Driver <span className="text-red-600">*</span></>}
            name="driver_id"
            value={formData.driver_id}
            onChange={handleChange}
            required
          >
            <option value="">Select Driver</option>
            {drivers.filter(d => d.status === 'active').map(driver => (
              <option key={driver.id} value={driver.id}>
                {driver.full_name} - {driver.license_number}
              </option>
            ))}
          </Select>
        </div>

        {/* Origin (text/autocomplete, required) */}
        <div style={{ position: 'relative' }} ref={originRef}>
          <Input
            label={<>Origin <span className="text-red-600">*</span></>}
            type="text"
            name="origin"
            value={formData.origin}
            onChange={handleChange}
            required
            placeholder="Start typing address..."
            style={{
              backgroundColor: originCoords ? '#2d3748' : undefined,
              color: originCoords ? '#e2e8f0' : undefined
            }}
          />
          {showOriginSuggestions && originSuggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: '#2d3748',
              border: '1px solid #4a5568',
              borderRadius: '4px',
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 1000,
              marginTop: '4px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
            }}>
              {originSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => handleSelectSuggestion(suggestion, true)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: index < originSuggestions.length - 1 ? '1px solid #4a5568' : 'none',
                    transition: 'background-color 0.2s',
                    color: '#e2e8f0'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4a5568'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ fontSize: '14px' }}>{suggestion.display_name}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Destination (text/autocomplete, required) */}
        <div style={{ position: 'relative' }} ref={destinationRef}>
          <Input
            label={<>Destination <span className="text-red-600">*</span></>}
            type="text"
            name="destination"
            value={formData.destination}
            onChange={handleChange}
            required
            placeholder="Start typing address..."
            style={{
              backgroundColor: destinationCoords ? '#2d3748' : undefined,
              color: destinationCoords ? '#e2e8f0' : undefined
            }}
          />
          {showDestinationSuggestions && destinationSuggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: '#2d3748',
              border: '1px solid #4a5568',
              borderRadius: '4px',
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 1000,
              marginTop: '4px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
            }}>
              {destinationSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => handleSelectSuggestion(suggestion, false)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: index < destinationSuggestions.length - 1 ? '1px solid #4a5568' : 'none',
                    transition: 'background-color 0.2s',
                    color: '#e2e8f0'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4a5568'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ fontSize: '14px' }}>{suggestion.display_name}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Planned Departure (datetime, required) */}
        <div>
          <Input
            label={<>Planned Departure <span className="text-red-600">*</span></>}
            type="datetime-local"
            name="planned_departure"
            value={formData.planned_departure}
            onChange={handleChange}
            required
          />
        </div>

        {/* Planned Arrival (datetime, required) */}
        <div>
          <Input
            label={<>Planned Arrival <span className="text-red-600">*</span></>}
            type="datetime-local"
            name="planned_arrival"
            value={formData.planned_arrival}
            onChange={handleChange}
            required
          />
        </div>

        {/* Distance (number, required, km) */}
        <div>
          <Input
            label={<>Distance (km) <span className="text-red-600">*</span></>}
            type="number"
            name="distance_km"
            value={formData.distance_km}
            onChange={handleChange}
            required
            min="0"
            step="0.1"
            disabled={isCalculatingDistance}
            helperText="Distance auto-calculates from OpenStreetMap"
          />
          {isCalculatingDistance && (
            <p className="mt-1 text-xs text-blue-600">Calculating route...</p>
          )}
          {distanceError && (
            <p className="mt-1 text-xs text-amber-600">{distanceError}</p>
          )}
        </div>

        {/* Estimated Duration (display only) */}
        {estimatedDuration && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Estimated Duration
            </label>
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200">
              {estimatedDuration}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Duration computed based on optimal driving route
            </p>
          </div>
        )}

        {/* Route Instructions */}
        {routeInstructions.length > 0 && (
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Best Route Summary
            </label>
            <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {routeInstructions[0]}
              </p>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Optimal route via major roads (OpenStreetMap)
            </p>
          </div>
        )}

        {/* Estimated Fuel Consumption (number, required, liters) */}
        <div>
          <Input
            label={<>Estimated Fuel Consumption (liters) <span className="text-red-600">*</span></>}
            type="number"
            name="estimated_fuel_consumption"
            value={formData.estimated_fuel_consumption}
            onChange={handleChange}
            required
            min="0"
            step="0.1"
          />
        </div>
      </div>

      {/* Notes (textarea, optional) */}
      <div>
        <Textarea
          label="Notes"
          name="notes"
          value={formData.notes || ''}
          onChange={handleChange}
          rows={3}
          placeholder="Add any additional notes about the trip"
        />
      </div>

      {/* Actions: Save/Update (primary, submit) */}
      <div className="flex justify-end gap-3">
        <Button type="submit" variant="primary" size="md">
          {initialData ? 'Update Trip' : 'Create Trip'}
        </Button>
      </div>
    </form>
  );
}
