import { supabase } from '../supabaseClient';
import {
  User,
  Vehicle,
  Driver,
  Maintenance,
  Trip,
  FuelTransaction,
  FuelEfficiencyMetric,
  Incident,
  IncidentPhoto,
  InsuranceClaim,
  Document,
  ComplianceAlert,
  DisposalRequest,
  DisposalAuction,
  Bid,
  DisposalTransfer
} from '../types';

// ============================================================================
// USER OPERATIONS
// ============================================================================

export const userService = {
  async getAll(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(user: Omit<User, 'id' | 'created_at' | 'updated_at'> & { password?: string }): Promise<User> {
    if (!user.password) {
      throw new Error('Password is required for new users');
    }

    // Call the database function to create user with hashed password
    const { data, error } = await supabase
      .rpc('create_user_account', {
        p_email: user.email,
        p_password: user.password,
        p_full_name: user.full_name,
        p_role: user.role || 'viewer',
        p_is_active: user.is_active ?? true
      });

    if (error) throw new Error(`Failed to create user: ${error.message}`);
    if (!data || data.length === 0) throw new Error('No user returned from creation');

    return data[0];
  },

  async update(id: string, user: Partial<User>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update(user)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('User not found');
    return data[0];
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  async getActive(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('is_active', true)
      .order('full_name');
    
    if (error) throw error;
    return data || [];
  }
};

// ============================================================================
// VEHICLE OPERATIONS
// ============================================================================

export const vehicleService = {
  async getAll(): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Vehicle | null> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(vehicle: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('vehicles')
      .insert([vehicle])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, vehicle: Partial<Vehicle>): Promise<Vehicle> {
    console.log('Service update called with ID:', id);
    console.log('Service update data:', vehicle);
    const { data, error } = await supabase
      .from('vehicles')
      .update(vehicle)
      .eq('id', id)
      .select();
    
    console.log('Supabase response - data:', data);
    console.log('Supabase response - error:', error);
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Vehicle not found');
    return data[0];
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getActive(): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('status', 'active')
      .order('plate_number');
    
    if (error) throw error;
    return data || [];
  }
};

// ============================================================================
// DRIVER OPERATIONS
// ============================================================================

export const driverService = {
  async getAll(): Promise<Driver[]> {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .order('full_name');
    
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Driver | null> {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(driver: Omit<Driver, 'id' | 'created_at' | 'updated_at'>): Promise<Driver> {
    const { data, error } = await supabase
      .from('drivers')
      .insert([driver])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, driver: Partial<Driver>): Promise<Driver> {
    const { data, error } = await supabase
      .from('drivers')
      .update(driver)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Driver not found');
    return data[0];
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('drivers')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getActive(): Promise<Driver[]> {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('status', 'active')
      .order('full_name');
    
    if (error) throw error;
    return data || [];
  }
};

// ============================================================================
// MAINTENANCE OPERATIONS
// ============================================================================

export const maintenanceService = {
  async getAll(): Promise<Maintenance[]> {
    const { data, error } = await supabase
      .from('maintenance')
      .select('*')
      .order('scheduled_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getByVehicle(vehicleId: string): Promise<Maintenance[]> {
    const { data, error } = await supabase
      .from('maintenance')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('scheduled_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async create(maintenance: Omit<Maintenance, 'id' | 'created_at' | 'updated_at'>): Promise<Maintenance> {
    const { data, error } = await supabase
      .from('maintenance')
      .insert([maintenance])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, maintenance: Partial<Maintenance>): Promise<Maintenance> {
    const { data, error } = await supabase
      .from('maintenance')
      .update(maintenance)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Maintenance record not found');
    return data[0];
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('maintenance')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// ============================================================================
// TRIP OPERATIONS
// ============================================================================

export const tripService = {
  async getAll(): Promise<Trip[]> {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .order('planned_departure', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Trip | null> {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(trip: Omit<Trip, 'id' | 'created_at' | 'updated_at'>): Promise<Trip> {
    const { data, error } = await supabase
      .from('trips')
      .insert([trip])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, trip: Partial<Trip>): Promise<Trip> {
    const { data, error } = await supabase
      .from('trips')
      .update(trip)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Trip not found');
    return data[0];
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async startTrip(id: string): Promise<Trip> {
    return this.update(id, {
      status: 'in_progress',
      actual_departure: new Date().toISOString()
    });
  },

  async completeTrip(id: string): Promise<Trip> {
    return this.update(id, {
      status: 'completed',
      actual_arrival: new Date().toISOString()
    });
  },

  async cancelTrip(id: string): Promise<Trip> {
    return this.update(id, { status: 'cancelled' });
  }
};

// ============================================================================
// FUEL TRACKING OPERATIONS
// ============================================================================

export const fuelService = {
  async getAllTransactions(): Promise<FuelTransaction[]> {
    const { data, error } = await supabase
      .from('fuel_transactions')
      .select('*')
      .order('transaction_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getByVehicle(vehicleId: string): Promise<FuelTransaction[]> {
    const { data, error } = await supabase
      .from('fuel_transactions')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('transaction_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async createTransaction(transaction: Omit<FuelTransaction, 'id' | 'created_at'>): Promise<FuelTransaction> {
    const { data, error } = await supabase
      .from('fuel_transactions')
      .insert([transaction])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateTransaction(id: string, transaction: Partial<FuelTransaction>): Promise<FuelTransaction> {
    const { data, error } = await supabase
      .from('fuel_transactions')
      .update(transaction)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Fuel transaction not found');
    return data[0];
  },

  async deleteTransaction(id: string): Promise<void> {
    const { error } = await supabase
      .from('fuel_transactions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getEfficiencyMetrics(vehicleId?: string): Promise<FuelEfficiencyMetric[]> {
    let query = supabase
      .from('fuel_efficiency_metrics')
      .select('*')
      .order('period_start', { ascending: false });
    
    if (vehicleId) {
      query = query.eq('vehicle_id', vehicleId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  }
};

// ============================================================================
// INCIDENT & INSURANCE OPERATIONS
// ============================================================================

export const incidentService = {
  async getAll(): Promise<Incident[]> {
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .order('incident_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Incident | null> {
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(incident: Omit<Incident, 'id' | 'incident_number' | 'created_at' | 'updated_at'>): Promise<Incident> {
    const { data, error } = await supabase
      .from('incidents')
      .insert([incident])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, incident: Partial<Incident>): Promise<Incident> {
    const { data, error } = await supabase
      .from('incidents')
      .update(incident)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Incident not found');
    return data[0];
  },

  async uploadPhoto(photo: Omit<IncidentPhoto, 'id' | 'uploaded_at'>): Promise<IncidentPhoto> {
    const { data, error } = await supabase
      .from('incident_photos')
      .insert([photo])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getPhotos(incidentId: string): Promise<IncidentPhoto[]> {
    const { data, error } = await supabase
      .from('incident_photos')
      .select('*')
      .eq('incident_id', incidentId);
    
    if (error) throw error;
    return data || [];
  }
};

export const insuranceService = {
  async getAllClaims(): Promise<InsuranceClaim[]> {
    const { data, error } = await supabase
      .from('insurance_claims')
      .select('*')
      .order('claim_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getByIncident(incidentId: string): Promise<InsuranceClaim[]> {
    const { data, error } = await supabase
      .from('insurance_claims')
      .select('*')
      .eq('incident_id', incidentId);
    
    if (error) throw error;
    return data || [];
  },

  async createClaim(claim: Omit<InsuranceClaim, 'id'>): Promise<InsuranceClaim> {
    const { data, error } = await supabase
      .from('insurance_claims')
      .insert([claim])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateClaim(id: string, claim: Partial<InsuranceClaim>): Promise<InsuranceClaim> {
    const { data, error } = await supabase
      .from('insurance_claims')
      .update(claim)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Insurance claim not found');
    return data[0];
  }
};

// ============================================================================
// COMPLIANCE & DOCUMENT OPERATIONS
// ============================================================================

export const documentService = {
  async getAll(): Promise<Document[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Document | null> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getByEntity(entityType: string, entityId: string): Promise<Document[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('related_entity_type', entityType)
      .eq('related_entity_id', entityId)
      .order('expiry_date');
    
    if (error) throw error;
    return data || [];
  },

  async create(document: Omit<Document, 'id' | 'created_at' | 'updated_at'>): Promise<Document> {
    const { data, error } = await supabase
      .from('documents')
      .insert([document])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, document: Partial<Document>): Promise<Document> {
    const { data, error } = await supabase
      .from('documents')
      .update(document)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Document not found');
    return data[0];
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getExpiring(days: number = 30): Promise<Document[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .lte('expiry_date', futureDate.toISOString().split('T')[0])
      .gte('expiry_date', new Date().toISOString().split('T')[0])
      .in('status', ['active', 'expiring_soon'])
      .order('expiry_date');
    
    if (error) throw error;
    return data || [];
  }
};

export const complianceService = {
  async getAlerts(): Promise<ComplianceAlert[]> {
    const { data, error } = await supabase
      .from('compliance_alerts')
      .select('*')
      .order('alert_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async acknowledgeAlert(id: string, userId: string): Promise<ComplianceAlert> {
    const { data, error } = await supabase
      .from('compliance_alerts')
      .update({
        is_acknowledged: true,
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Compliance alert not found');
    return data[0];
  }
};

// ============================================================================
// DISPOSAL OPERATIONS
// ============================================================================

export const disposalService = {
  async getAllRequests(): Promise<DisposalRequest[]> {
    const { data, error } = await supabase
      .from('disposal_requests')
      .select('*')
      .order('request_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<DisposalRequest | null> {
    const { data, error } = await supabase
      .from('disposal_requests')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async createRequest(request: Omit<DisposalRequest, 'id' | 'disposal_number' | 'created_at' | 'updated_at'>): Promise<DisposalRequest> {
    const { data, error } = await supabase
      .from('disposal_requests')
      .insert([request])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateRequest(id: string, request: Partial<DisposalRequest>): Promise<DisposalRequest> {
    const { data, error } = await supabase
      .from('disposal_requests')
      .update(request)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Disposal request not found');
    return data[0];
  },

  async createAuction(auction: Omit<DisposalAuction, 'id' | 'created_at' | 'updated_at'>): Promise<DisposalAuction> {
    const { data, error } = await supabase
      .from('disposal_auctions')
      .insert([auction])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getAuctionsByDisposal(disposalId: string): Promise<DisposalAuction[]> {
    const { data, error } = await supabase
      .from('disposal_auctions')
      .select('*')
      .eq('disposal_id', disposalId);
    
    if (error) throw error;
    return data || [];
  },

  async placeBid(bid: Omit<Bid, 'id' | 'bid_date' | 'created_at'>): Promise<Bid> {
    const { data, error } = await supabase
      .from('bids')
      .insert([bid])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getBidsByAuction(auctionId: string): Promise<Bid[]> {
    const { data, error } = await supabase
      .from('bids')
      .select('*')
      .eq('auction_id', auctionId)
      .order('bid_amount', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async createTransfer(transfer: Omit<DisposalTransfer, 'id' | 'created_at' | 'updated_at'>): Promise<DisposalTransfer> {
    const { data, error } = await supabase
      .from('disposal_transfers')
      .insert([transfer])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getTransferByDisposal(disposalId: string): Promise<DisposalTransfer | null> {
    const { data, error } = await supabase
      .from('disposal_transfers')
      .select('*')
      .eq('disposal_id', disposalId)
      .single();
    
    if (error) throw error;
    return data;
  }
};
