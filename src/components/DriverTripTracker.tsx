// Driver Trip Tracking Component - Mobile-optimized for real-time GPS tracking
import { useState, useEffect } from 'react';
import { Trip } from '../types';
import { TripLocation } from '../types/tracking';
import { tripTrackingService } from '../services/tripTrackingService';
import { Card, Button } from './ui';

interface DriverTripTrackerProps {
  trip: Trip;
  onComplete?: () => void;
}

export default function DriverTripTracker({ trip, onComplete }: DriverTripTrackerProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<TripLocation | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [locations, setLocations] = useState<TripLocation[]>([]);
  const [distanceTraveled, setDistanceTraveled] = useState(0);

  useEffect(() => {
    // Check if tracking is already active for this trip
    const checkTracking = async () => {
      if (tripTrackingService.getCurrentTripId() === trip.id) {
        setIsTracking(true);
        loadLocations();
      }
    };
    checkTracking();

    // Listen for tracking errors
    const handleTrackingError = ((event: CustomEvent) => {
      setTrackingError(event.detail);
    }) as EventListener;

    window.addEventListener('trackingError', handleTrackingError);
    return () => window.removeEventListener('trackingError', handleTrackingError);
  }, [trip.id]);

  // Reload locations periodically
  useEffect(() => {
    if (isTracking) {
      const interval = setInterval(loadLocations, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isTracking]);

  const loadLocations = async () => {
    try {
      const locs = await tripTrackingService.getTripLocations(trip.id);
      setLocations(locs);
      
      if (locs.length > 0) {
        setCurrentLocation(locs[locs.length - 1]);
        const distance = tripTrackingService.calculateDistance(locs);
        setDistanceTraveled(distance);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const handleStartTracking = async () => {
    try {
      setTrackingError(null);
      await tripTrackingService.startTracking(trip.id);
      setIsTracking(true);
      await loadLocations();
    } catch (error: any) {
      setTrackingError(error.message);
      console.error('Failed to start tracking:', error);
    }
  };

  const handleStopTracking = async () => {
    try {
      await tripTrackingService.stopTracking();
      setIsTracking(false);
      await loadLocations();
    } catch (error) {
      console.error('Failed to stop tracking:', error);
    }
  };

  const handleCompleteTrip = async () => {
    await handleStopTracking();
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="space-y-4">
          {/* Trip Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Current Trip
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Origin:</span>
                <span className="font-medium text-gray-900 dark:text-white">{trip.origin}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Destination:</span>
                <span className="font-medium text-gray-900 dark:text-white">{trip.destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Planned Distance:</span>
                <span className="font-medium text-gray-900 dark:text-white">{trip.distance_km} km</span>
              </div>
              {distanceTraveled > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Distance Traveled:</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {distanceTraveled.toFixed(2)} km
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tracking Status */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {isTracking ? 'Tracking Active' : 'Tracking Inactive'}
                </span>
              </div>
              {locations.length > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {locations.length} points recorded
                </span>
              )}
            </div>

            {currentLocation && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Current Position:</span>
                  <span className="font-mono text-gray-900 dark:text-white">
                    {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                  </span>
                </div>
                {currentLocation.speed && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Speed:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {currentLocation.speed.toFixed(1)} km/h
                    </span>
                  </div>
                )}
                {currentLocation.accuracy && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">GPS Accuracy:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      ±{currentLocation.accuracy.toFixed(0)}m
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Last Updated:</span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(currentLocation.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {trackingError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-800 dark:text-red-200">
                {trackingError}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 space-y-3">
            {!isTracking ? (
              <Button
                onClick={handleStartTracking}
                variant="primary"
                size="lg"
                className="w-full"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Start Tracking
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleStopTracking}
                  variant="secondary"
                  size="lg"
                  className="w-full"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  Stop Tracking
                </Button>
                <Button
                  onClick={handleCompleteTrip}
                  variant="primary"
                  size="lg"
                  className="w-full"
                >
                  Complete Trip
                </Button>
              </>
            )}
          </div>

          {/* Info Note */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <strong>Note:</strong> GPS tracking requires location permission. 
              Your position will be recorded every 30 seconds while tracking is active.
              Keep this tab open for continuous tracking.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
