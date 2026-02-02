// Trip Tracking Service - Real-time GPS location tracking for drivers
import { supabase } from '../supabaseClient';
import { TripLocation } from '../types/tracking';

class TripTrackingService {
  private watchId: number | null = null;
  private currentTripId: string | null = null;
  private isTracking: boolean = false;

  /**
   * Start tracking location for a trip
   */
  async startTracking(tripId: string): Promise<void> {
    if (this.isTracking) {
      console.warn('Tracking already active');
      return;
    }

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by your browser');
    }

    this.currentTripId = tripId;
    this.isTracking = true;

    // Update trip to enable tracking
    await supabase
      .from('trips')
      .update({ 
        tracking_enabled: true,
        tracking_started_at: new Date().toISOString()
      })
      .eq('id', tripId);

    // Start watching position
    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handlePositionUpdate(position),
      (error) => this.handlePositionError(error),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    console.log(`Started tracking trip ${tripId}`);
  }

  /**
   * Stop tracking location
   */
  async stopTracking(): Promise<void> {
    if (!this.isTracking || !this.currentTripId) {
      return;
    }

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    // Update trip to disable tracking
    await supabase
      .from('trips')
      .update({ 
        tracking_enabled: false,
        tracking_stopped_at: new Date().toISOString()
      })
      .eq('id', this.currentTripId);

    console.log(`Stopped tracking trip ${this.currentTripId}`);
    
    this.currentTripId = null;
    this.isTracking = false;
  }

  /**
   * Handle position update from geolocation API
   */
  private async handlePositionUpdate(position: GeolocationPosition): Promise<void> {
    if (!this.currentTripId) return;

    const locationData: Omit<TripLocation, 'id' | 'created_at'> = {
      trip_id: this.currentTripId,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      speed: position.coords.speed ? position.coords.speed * 3.6 : undefined, // Convert m/s to km/h
      heading: position.coords.heading ?? undefined,
      altitude: position.coords.altitude ?? undefined,
      timestamp: new Date(position.timestamp).toISOString()
    };

    try {
      const { error } = await supabase
        .from('trip_locations')
        .insert([locationData]);

      if (error) {
        console.error('Failed to save location:', error);
      } else {
        console.log('Location saved:', locationData);
      }
    } catch (error) {
      console.error('Error saving location:', error);
    }
  }

  /**
   * Handle geolocation errors
   */
  private handlePositionError(error: GeolocationPositionError): void {
    console.error('Geolocation error:', error);
    
    let message = 'Unknown error';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'Location permission denied. Please enable location access.';
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Location information unavailable.';
        break;
      case error.TIMEOUT:
        message = 'Location request timed out.';
        break;
    }
    
    // Dispatch error event
    window.dispatchEvent(new CustomEvent('trackingError', { detail: message }));
  }

  /**
   * Get location history for a trip
   */
  async getTripLocations(tripId: string): Promise<TripLocation[]> {
    const { data, error } = await supabase
      .from('trip_locations')
      .select('*')
      .eq('trip_id', tripId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching trip locations:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get latest location for a trip
   */
  async getLatestLocation(tripId: string): Promise<TripLocation | null> {
    const { data, error } = await supabase
      .from('trip_locations')
      .select('*')
      .eq('trip_id', tripId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Error fetching latest location:', error);
      throw error;
    }

    return data || null;
  }

  /**
   * Check if tracking is currently active
   */
  isTrackingActive(): boolean {
    return this.isTracking;
  }

  /**
   * Get current trip ID being tracked
   */
  getCurrentTripId(): string | null {
    return this.currentTripId;
  }

  /**
   * Calculate total distance traveled (in km)
   */
  calculateDistance(locations: TripLocation[]): number {
    if (locations.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < locations.length; i++) {
      const prev = locations[i - 1];
      const curr = locations[i];
      totalDistance += this.haversineDistance(
        prev.latitude, prev.longitude,
        curr.latitude, curr.longitude
      );
    }

    return totalDistance;
  }

  /**
   * Haversine formula to calculate distance between two coordinates
   */
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const tripTrackingService = new TripTrackingService();
