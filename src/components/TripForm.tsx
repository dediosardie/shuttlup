// Trip Form Component - Defined per trip-scheduling-module.md
import React, { useState, useEffect, useRef } from 'react';
import { Trip, Vehicle, Driver, Maintenance } from '../types';
import { Input, Select, Textarea, Button } from './ui';
import { supabase } from '../supabaseClient';

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
    notes: initialData?.notes,    departure_image_url: initialData?.departure_image_url,
    arrival_image_url: initialData?.arrival_image_url,  });

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
  const [vehicleInputValue, setVehicleInputValue] = useState('');
  const [showVehicleSuggestions, setShowVehicleSuggestions] = useState(false);
  const originRef = useRef<HTMLDivElement>(null);
  const destinationRef = useRef<HTMLDivElement>(null);
  const vehicleRef = useRef<HTMLDivElement>(null);

  // Filter: only active vehicles per business rules
  const activeVehicles = vehicles.filter(v => v.status !== 'disposed');
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>(activeVehicles);

  // Camera capture states
  const [capturing, setCapturing] = useState(false);
  const [capturedDepartureImage, setCapturedDepartureImage] = useState<string | null>(null);
  const [capturedArrivalImage, setCapturedArrivalImage] = useState<string | null>(null);
  const [isUploadingDeparture, setIsUploadingDeparture] = useState(false);
  const [isUploadingArrival, setIsUploadingArrival] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Get vehicle display text
  const getVehicleDisplay = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return '';
    return `${vehicle.plate_number || vehicle.conduction_number} - ${vehicle.make} ${vehicle.model}`;
  };

  // Handle vehicle input change with filtering
  const handleVehicleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setVehicleInputValue(inputValue);
    
    if (inputValue.length === 0) {
      setFilteredVehicles(activeVehicles);
      setShowVehicleSuggestions(false);
      setFormData(prev => ({ ...prev, vehicle_id: '' }));
      return;
    }
    
    const filtered = activeVehicles.filter(vehicle => {
      const displayText = `${vehicle.plate_number || vehicle.conduction_number} ${vehicle.make} ${vehicle.model}`.toLowerCase();
      return displayText.includes(inputValue.toLowerCase());
    });
    
    setFilteredVehicles(filtered);
    setShowVehicleSuggestions(inputValue.length > 0 && filtered.length > 0);
  };

  // Handle vehicle selection from suggestions
  const handleVehicleSelect = (vehicle: Vehicle) => {
    const displayText = `${vehicle.plate_number || vehicle.conduction_number} - ${vehicle.make} ${vehicle.model}`;
    setVehicleInputValue(displayText);
    setFormData(prev => ({ ...prev, vehicle_id: vehicle.id }));
    setShowVehicleSuggestions(false);
  };

  // Camera capture function (replicated from DriverAttendancePage)
  const captureImage = async (imageType: 'departure' | 'arrival') => {
    setCapturing(true);
    setCameraError(null);

    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera API is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Edge.');
        setCapturing(false);
        return;
      }

      // Request camera access - captures a single still image frame only
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      // Create temporary video element in memory
      const video = document.createElement('video');
      video.srcObject = mediaStream;
      video.muted = true;
      video.playsInline = true;

      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          resolve();
        };
      });

      // Wait briefly for camera to adjust exposure
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capture ONE single still frame to canvas
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');

      if (context) {
        // Draw the single frame
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to image data URL
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);

        // Set captured image based on type
        if (imageType === 'departure') {
          setCapturedDepartureImage(imageDataUrl);
          uploadImageToStorage(imageDataUrl, 'departure');
        } else {
          setCapturedArrivalImage(imageDataUrl);
          uploadImageToStorage(imageDataUrl, 'arrival');
        }
      }

      // IMMEDIATELY stop camera stream
      mediaStream.getTracks().forEach(track => {
        track.stop();
        console.log('Camera track stopped');
      });
      
    } catch (error: any) {
      console.error('Camera access error:', error);
      
      // Provide specific error messages based on error type
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setCameraError('No camera device found. Please connect a camera and try again.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setCameraError('Camera is already in use by another application.');
      } else if (error.name === 'OverconstrainedError') {
        setCameraError('Camera settings are not supported. Please check your device.');
      } else if (error.name === 'SecurityError') {
        setCameraError('Camera access blocked. Please ensure you are using HTTPS or localhost.');
      } else {
        setCameraError(`Unable to access camera: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setCapturing(false);
    }
  };

  const uploadImageToStorage = async (imageDataUrl: string, imageType: 'departure' | 'arrival') => {
    try {
      if (imageType === 'departure') {
        setIsUploadingDeparture(true);
      } else {
        setIsUploadingArrival(true);
      }
      
      // Convert base64 to blob
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      
      // Create structured path: trip-images/{year}/{month}/{day}/{vehicleId}_{imageType}_{timestamp}.jpg
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const timestamp = now.getTime();
      const vehicleId = formData.vehicle_id || 'unknown';
      const fileName = `${vehicleId}_${imageType}_${timestamp}.jpg`;
      const filePath = `trip-images/${year}/${month}/${day}/${fileName}`;

      console.log('📤 Uploading trip image:', filePath);

      // Upload to Supabase Storage
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('trip-images')
        .upload(filePath, blob, {
          cacheControl: '31536000',
          upsert: false,
          contentType: 'image/jpeg',
        });

      if (uploadError) {
        console.error('❌ Image upload error:', uploadError);
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      console.log('✅ Image uploaded successfully:', uploadData);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('trip-images')
        .getPublicUrl(filePath);

      const imageUrl = urlData.publicUrl;
      console.log('🔗 Image URL:', imageUrl);

      // Update form data with the URL
      if (imageType === 'departure') {
        setFormData(prev => ({ ...prev, departure_image_url: imageUrl }));
      } else {
        setFormData(prev => ({ ...prev, arrival_image_url: imageUrl }));
      }

    } catch (error) {
      console.error('❌ Image upload failed:', error);
      setCameraError(`Failed to upload ${imageType} image. Please try again.`);
      
      // Clear the captured image on upload failure
      if (imageType === 'departure') {
        setCapturedDepartureImage(null);
      } else {
        setCapturedArrivalImage(null);
      }
    } finally {
      if (imageType === 'departure') {
        setIsUploadingDeparture(false);
      } else {
        setIsUploadingArrival(false);
      }
    }
  };

  const removeImage = (imageType: 'departure' | 'arrival') => {
    if (imageType === 'departure') {
      setCapturedDepartureImage(null);
      setFormData(prev => ({ ...prev, departure_image_url: undefined }));
    } else {
      setCapturedArrivalImage(null);
      setFormData(prev => ({ ...prev, arrival_image_url: undefined }));
    }
  };

  // Helper function to format datetime for datetime-local input
  const formatDateTimeLocal = (dateString: string | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Format: YYYY-MM-DDTHH:MM (required for datetime-local input)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

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
      if (vehicleRef.current && !vehicleRef.current.contains(event.target as Node)) {
        setShowVehicleSuggestions(false);
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
        planned_departure: formatDateTimeLocal(initialData.planned_departure),
        planned_arrival: formatDateTimeLocal(initialData.planned_arrival),
        actual_departure: initialData.actual_departure,
        actual_arrival: initialData.actual_arrival,
        status: initialData.status,
        distance_km: initialData.distance_km,
        estimated_fuel_consumption: initialData.estimated_fuel_consumption,
        route_waypoints: initialData.route_waypoints,
        notes: initialData.notes,
        departure_image_url: initialData.departure_image_url,
        arrival_image_url: initialData.arrival_image_url,
      });
      
      // Set vehicle input value for editing
      if (initialData.vehicle_id) {
        setVehicleInputValue(getVehicleDisplay(initialData.vehicle_id));
      }

      // Set captured images if URLs exist
      if (initialData.departure_image_url) {
        setCapturedDepartureImage(initialData.departure_image_url);
      }
      if (initialData.arrival_image_url) {
        setCapturedArrivalImage(initialData.arrival_image_url);
      }

      // Parse and set coordinates from route_waypoints if available
      if (initialData.route_waypoints) {
        try {
          const waypoints = JSON.parse(initialData.route_waypoints);
          if (waypoints.origin) {
            setOriginCoords({ lat: waypoints.origin.lat, lon: waypoints.origin.lon });
          }
          if (waypoints.destination) {
            setDestinationCoords({ lat: waypoints.destination.lat, lon: waypoints.destination.lon });
          }
        } catch (error) {
          console.error('Error parsing route waypoints:', error);
        }
      }

      // Clear suggestions when editing existing trip
      setShowOriginSuggestions(false);
      setShowDestinationSuggestions(false);
      setOriginSuggestions([]);
      setDestinationSuggestions([]);
    } else {
      // Reset all states when creating new trip
      setOriginCoords(null);
      setDestinationCoords(null);
      setEstimatedDuration('');
      setRouteInstructions([]);
      setShowOriginSuggestions(false);
      setShowDestinationSuggestions(false);
      setVehicleInputValue('');
      setShowVehicleSuggestions(false);
      setFilteredVehicles(activeVehicles);
      setCapturedDepartureImage(null);
      setCapturedArrivalImage(null);
    }
  }, [initialData, vehicles]);

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

    // Store coordinates in route_waypoints for future editing
    const waypointsData = {
      origin: originCoords,
      destination: destinationCoords
    };

    const submitData = {
      ...formData,
      route_waypoints: JSON.stringify(waypointsData)
    };

    if (initialData && onUpdate) {
      onUpdate({ 
        ...submitData, 
        id: initialData.id,
        created_at: initialData.created_at,
        updated_at: new Date().toISOString()
      });
    } else {
      onSave(submitData);
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
        {/* Vehicle (autocomplete, required, from active vehicles) */}
        <div style={{ position: 'relative' }} ref={vehicleRef}>
          <Input
            label={<>Vehicle <span className="text-red-600">*</span></>}
            type="text"
            name="vehicle_input"
            value={vehicleInputValue}
            onChange={handleVehicleInputChange}
            onFocus={() => {
              if (vehicleInputValue.length > 0 && filteredVehicles.length > 0) {
                setShowVehicleSuggestions(true);
              }
            }}
            onBlur={() => {
              setTimeout(() => setShowVehicleSuggestions(false), 200);
            }}
            required
            placeholder="Type to search vehicle..."
          />
          {showVehicleSuggestions && filteredVehicles.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: '#2d3748',
              border: '1px solid #4a5568',
              borderRadius: '4px',
              maxHeight: '240px',
              overflowY: 'auto',
              zIndex: 50,
              marginTop: '4px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
            }}>
              {filteredVehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  onClick={() => handleVehicleSelect(vehicle)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #4a5568',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4a5568'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#e2e8f0' }}>
                    {vehicle.plate_number || vehicle.conduction_number}
                  </div>
                  <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '2px' }}>
                    {vehicle.make} {vehicle.model}
                  </div>
                </div>
              ))}
            </div>
          )}
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
            step="1"
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

      {/* Camera Error Display */}
      {cameraError && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm">{cameraError}</span>
          </div>
        </div>
      )}

      {/* Trip Images Section */}
      <div className="grid grid-cols-2 gap-6">
        {/* Departure Image */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Departure Image
          </label>
          
          {!capturedDepartureImage && (
            <button
              type="button"
              onClick={() => captureImage('departure')}
              disabled={capturing || isUploadingDeparture}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {capturing ? 'Capturing...' : 'Capture Departure'}
            </button>
          )}

          {isUploadingDeparture && (
            <div className="flex items-center gap-2 text-blue-600">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm">Uploading...</span>
            </div>
          )}

          {capturedDepartureImage && !isUploadingDeparture && (
            <div className="relative">
              <img
                src={capturedDepartureImage}
                alt="Departure"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600"
              />
              <button
                type="button"
                onClick={() => removeImage('departure')}
                className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors shadow-lg"
                title="Remove image"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Arrival Image */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Arrival Image
          </label>
          
          {!capturedArrivalImage && (
            <button
              type="button"
              onClick={() => captureImage('arrival')}
              disabled={capturing || isUploadingArrival}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {capturing ? 'Capturing...' : 'Capture Arrival'}
            </button>
          )}

          {isUploadingArrival && (
            <div className="flex items-center gap-2 text-green-600">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm">Uploading...</span>
            </div>
          )}

          {capturedArrivalImage && !isUploadingArrival && (
            <div className="relative">
              <img
                src={capturedArrivalImage}
                alt="Arrival"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600"
              />
              <button
                type="button"
                onClick={() => removeImage('arrival')}
                className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors shadow-lg"
                title="Remove image"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
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
