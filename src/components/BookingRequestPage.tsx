import { useState, useEffect } from 'react';
import { TripRequest, FleetDetail, TripRequestPassenger, User } from '../types';
import { Card, Button } from './ui';
import { supabase } from '../supabaseClient';
import { auditLogService } from '../services/auditLogService';

export default function BookingRequestPage() {
  const [bookings, setBookings] = useState<TripRequest[]>([]);
  const [fleetDetails, setFleetDetails] = useState<FleetDetail[]>([]);
  const [tripPassengers, setTripPassengers] = useState<Record<string, TripRequestPassenger[]>>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializePage = async () => {
      await loadCurrentUser();
    };
    initializePage();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadBookings();
      loadFleetDetails();
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

  const loadBookings = async () => {
    try {
      setIsLoading(true);

      // Get trips where user is requestor
      const { data: requestorTrips, error: requestorError } = await supabase
        .from('trip_requests')
        .select('*')
        .eq('requestor_user_id', currentUser?.id)
        .order('date_of_service', { ascending: true });

      if (requestorError) throw requestorError;

      // Get trips where user is a passenger
      const { data: passengerTrips, error: passengerError } = await supabase
        .from('trip_request_passengers')
        .select(`
          trip_request_id,
          trip_requests (*)
        `)
        .eq('passenger_user_id', currentUser?.id);

      if (passengerError) throw passengerError;

      // Combine and deduplicate trips
      const passengerTripRecords = passengerTrips?.map(pt => pt.trip_requests).filter(Boolean) || [];
      const allTrips = [...(requestorTrips || []), ...passengerTripRecords];
      
      // Remove duplicates based on trip ID
      const uniqueTrips = allTrips.filter((trip, index, self) =>
        index === self.findIndex(t => t.id === trip.id)
      );

      setBookings(uniqueTrips as TripRequest[]);

      // Load passengers for all trips
      if (uniqueTrips.length > 0) {
        await loadTripPassengers(uniqueTrips.map(t => t.id));
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
      alert('Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTripPassengers = async (tripIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('trip_request_passengers')
        .select(`
          *,
          passenger:users!trip_request_passengers_passenger_user_id_fkey(
            id,
            full_name,
            email,
            role
          )
        `)
        .in('trip_request_id', tripIds);

      if (error) throw error;

      // Group passengers by trip_request_id
      const grouped = (data || []).reduce((acc, item) => {
        if (!acc[item.trip_request_id]) {
          acc[item.trip_request_id] = [];
        }
        acc[item.trip_request_id].push(item as TripRequestPassenger);
        return acc;
      }, {} as Record<string, TripRequestPassenger[]>);

      setTripPassengers(grouped);
    } catch (error) {
      console.error('Error loading trip passengers:', error);
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

  const handleConfirm = async (tripId: string) => {
    if (!currentUser) return;
    if (!confirm('Confirm your attendance for this trip?')) return;

    try {
      const { error } = await supabase
        .from('trip_request_passengers')
        .update({ 
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('trip_request_id', tripId)
        .eq('passenger_user_id', currentUser.id);

      if (error) throw error;
      
      // Get booking details for audit log
      const booking = bookings.find(b => b.id === tripId);
      if (booking) {
        await auditLogService.createLog(
          'STATUS_CHANGE',
          `Confirmed attendance for trip #${booking.shuttle_no} (${booking.requestor})`,
          { before: { status: 'pending' }, after: { status: 'confirmed' } }
        );
      }
      
      alert('Your attendance has been confirmed!');
      await loadBookings();
    } catch (error) {
      console.error('Error confirming attendance:', error);
      alert('Failed to confirm attendance');
    }
  };

  const handleCancel = async (tripId: string) => {
    if (!currentUser) return;
    if (!confirm('Cancel your attendance for this trip?')) return;

    try {
      const { error } = await supabase
        .from('trip_request_passengers')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('trip_request_id', tripId)
        .eq('passenger_user_id', currentUser.id);

      if (error) throw error;
      
      // Get booking details for audit log
      const booking = bookings.find(b => b.id === tripId);
      if (booking) {
        await auditLogService.createLog(
          'STATUS_CHANGE',
          `Cancelled attendance for trip #${booking.shuttle_no} (${booking.requestor})`,
          { before: { status: getPassengerStatus(tripId) }, after: { status: 'cancelled' } }
        );
      }
      
      alert('Your attendance has been cancelled.');
      await loadBookings();
    } catch (error) {
      console.error('Error cancelling attendance:', error);
      alert('Failed to cancel attendance');
    }
  };

  const getPassengerStatus = (tripId: string): 'pending' | 'confirmed' | 'cancelled' | null => {
    if (!currentUser) return null;
    const passengers = tripPassengers[tripId] || [];
    const myPassengerRecord = passengers.find(p => p.passenger_user_id === currentUser.id);
    return myPassengerRecord?.status || null;
  };

  const getConfirmedCount = (tripId: string): number => {
    const passengers = tripPassengers[tripId] || [];
    return passengers.filter(p => p.status === 'confirmed').length;
  };

  return (
    <div className="min-h-screen bg-bg-primary p-2 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <Card className="p-4 bg-bg-secondary border border-border-muted">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary">My Bookings</h1>
              <p className="text-xs sm:text-sm text-text-secondary mt-1">View and manage your trip bookings</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-accent-soft rounded-lg p-2">
                <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-text-muted">Total Bookings</p>
                <p className="text-lg font-bold text-text-primary">{bookings.length}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Bookings List */}
        <div className="space-y-3">
          {isLoading ? (
            <Card className="p-6 bg-bg-secondary border border-border-muted text-center text-text-secondary">
              Loading bookings...
            </Card>
          ) : bookings.length === 0 ? (
            <Card className="p-8 bg-bg-secondary border border-border-muted text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-accent-soft rounded-full p-6">
                  <svg className="w-12 h-12 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">No Bookings Found</h3>
              <p className="text-text-secondary">You don't have any trip bookings yet.</p>
            </Card>
          ) : (
            bookings.map((booking) => {
              const passengerStatus = getPassengerStatus(booking.id);
              const confirmedCount = getConfirmedCount(booking.id);
              const isRequestor = booking.requestor_user_id === currentUser?.id;

              return (
                <Card
                  key={booking.id}
                  className="p-4 bg-bg-secondary border border-border-muted hover:bg-bg-elevated transition-colors"
                >
                  <div className="space-y-3">
                    {/* Row 1: Requestor */}
                    <div>
                      <p className="text-xs text-text-muted">Requestor:</p>
                      <p className="text-sm font-medium text-text-primary">{booking.requestor}</p>
                      {isRequestor && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-900/30 text-blue-400 mt-1">
                          You are the requestor
                        </span>
                      )}
                    </div>

                    {/* Row 2: No. of Passengers and Confirmed Passengers */}
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <p className="text-xs text-text-muted">No. of Passengers:</p>
                        <p className="text-sm text-text-primary">{booking.passenger_count}</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-text-muted">Confirmed Passengers:</p>
                        <p className="text-sm text-text-primary">{confirmedCount}</p>
                      </div>
                    </div>

                    {/* Row 3: Date of Service and Time */}
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <p className="text-xs text-text-muted">Date of Service:</p>
                        <p className="text-sm text-text-primary">{new Date(booking.date_of_service).toLocaleDateString()}</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-text-muted">Time:</p>
                        <p className="text-sm text-text-primary">{booking.arrival_time || '-'}</p>
                      </div>
                    </div>

                    {/* Row 4: Driver's Name and Contact */}
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <p className="text-xs text-text-muted">Driver's Name:</p>
                        <p className="text-sm text-text-primary">{booking.van_driver || '-'}</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-text-muted">Contact No.:</p>
                        <p className="text-sm text-text-primary">
                          {fleetDetails.find(f => f.van_number === booking.van_nos)?.mobile_number || '-'}
                        </p>
                      </div>
                    </div>

                    {/* Row 5: Status Badge and Route */}
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          booking.status === 'completed'
                            ? 'bg-green-900/30 text-green-400'
                            : booking.status === 'cancelled'
                            ? 'bg-red-900/30 text-red-400'
                            : 'bg-yellow-900/30 text-yellow-400'
                        }`}>
                          {booking.status}
                        </span>
                        {passengerStatus && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            passengerStatus === 'confirmed'
                              ? 'bg-green-900/30 text-green-400'
                              : passengerStatus === 'cancelled'
                              ? 'bg-red-900/30 text-red-400'
                              : 'bg-yellow-900/30 text-yellow-400'
                          }`}>
                            {passengerStatus}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 text-right">
                        <p className="text-xs text-text-muted">Route:</p>
                        <p className="text-sm text-text-primary">{booking.route || '-'}</p>
                      </div>
                    </div>

                    {/* Action Buttons - For attendance confirmation */}
                    {passengerStatus && (
                      <div className="pt-2 grid grid-cols-2 gap-2">
                        <Button
                          onClick={() => handleConfirm(booking.id)}
                          disabled={passengerStatus === 'confirmed'}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                            passengerStatus === 'confirmed'
                              ? 'bg-bg-elevated text-text-muted cursor-not-allowed'
                              : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:shadow-lg'
                          }`}
                        >
                          <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {passengerStatus === 'confirmed' ? 'Confirmed' : 'Confirm'}
                        </Button>
                        <Button
                          onClick={() => handleCancel(booking.id)}
                          disabled={passengerStatus === 'cancelled'}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                            passengerStatus === 'cancelled'
                              ? 'bg-bg-elevated text-text-muted cursor-not-allowed'
                              : 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:shadow-lg'
                          }`}
                        >
                          <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          {passengerStatus === 'cancelled' ? 'Cancelled' : 'Cancel'}
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
