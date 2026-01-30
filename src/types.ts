// Vehicle Module - Defined per vehicle-module.md
export interface Vehicle {
  id: string;
  plate_number: string;
  conduction_number?: string; // Can be used as reference when plate_number doesn't exist yet
  make: string;
  model: string;
  variant?: string;
  year: number;
  vin: string;
  engine_number?: string;
  fuel_capacity?: number;
  ownership_type: 'Internal' | 'Leased'  | 'Leased to Own'| 'Shuttle';
  status: 'active' | 'maintenance' | 'disposed';
  insurance_expiry: string;
  registration_expiry: string;
  created_at?: string;
  updated_at?: string;
}

// User Management - Based on public.users table
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'fleet_manager' | 'maintenance_team' | 'driver' | 'administration' | 'client_company_liaison';
  is_active: boolean;
  session_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Driver Module - Simplified per types used in system
export interface Driver {
  id: string;
  full_name: string;
  license_number: string;
  license_expiry: string;
  status: 'active' | 'suspended';
  created_at?: string;
  updated_at?: string;
}

// Maintenance Module - Simplified per maintenance-module.md
export interface Maintenance {
  id: string;
  vehicle_id: string;
  maintenance_type: 'preventive' | 'repair';
  scheduled_date: string;
  status: 'pending' | 'completed';
  cost?: number;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// Trip Scheduling Module - Defined per trip-scheduling-module.md
export interface Trip {
  id: string;
  vehicle_id: string;
  driver_id: string;
  origin: string;
  destination: string;
  planned_departure: string;
  planned_arrival: string;
  actual_departure?: string;
  actual_arrival?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  distance_km: number;
  estimated_fuel_consumption: number;
  route_waypoints?: any; // JSON
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Fuel Tracking Module - Defined per fuel-tracking-module.md
export interface FuelTransaction {
  id: string;
  vehicle_id: string;
  driver_id: string;
  transaction_date: string;
  odometer_reading: number;
  liters: number;
  cost: number;
  cost_per_liter: number;
  fuel_type: 'diesel' | 'petrol' | 'electric' | 'hybrid';
  station_name?: string;
  station_location?: string;
  receipt_image_url?: string;
  is_full_tank: boolean;
  created_at: string;
}

export interface FuelEfficiencyMetric {
  id: string;
  vehicle_id: string;
  period_start: string;
  period_end: string;
  total_liters: number;
  total_distance: number;
  average_consumption: number;
  total_cost: number;
  efficiency_rating: 'excellent' | 'good' | 'average' | 'poor';
  baseline_consumption: number;
  variance_percentage: number;
}

// Incident & Insurance Module - Defined per incident-insurance-module.md
export interface Incident {
  id: string;
  incident_number: string;
  vehicle_id: string;
  driver_id: string;
  incident_date: string;
  location: string;
  incident_type: 'collision' | 'theft' | 'vandalism' | 'mechanical_failure' | 'other';
  severity: 'minor' | 'moderate' | 'severe' | 'critical';
  description: string;
  weather_conditions?: string;
  road_conditions?: string;
  police_report_number?: string;
  witnesses?: any; // JSON
  status: 'reported' | 'under_investigation' | 'resolved' | 'closed';
  estimated_cost?: number;
  actual_cost?: number;
  assigned_to?: string;
  resolution_notes?: string;
  reported_by: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface IncidentPhoto {
  id: string;
  incident_id: string;
  photo_url: string;
  description?: string;
  uploaded_at: string;
  uploaded_by: string;
}

export interface InsuranceClaim {
  id: string;
  incident_id: string;
  claim_number: string;
  insurance_company: string;
  policy_number: string;
  claim_date: string;
  claim_amount: number;
  approved_amount?: number;
  status: 'filed' | 'pending' | 'approved' | 'rejected' | 'paid';
  adjuster_name?: string;
  adjuster_contact?: string;
  notes?: string;
}

// Compliance Document Module - Defined per compliance-document-module.md
export interface Document {
  id: string;
  document_type: 'registration' | 'insurance' | 'permit' | 'license' | 'inspection' | 'contract' | 'other';
  related_entity_type: 'vehicle' | 'driver' | 'fleet';
  related_entity_id: string;
  document_name: string;
  document_number?: string;
  issuing_authority: string;
  issue_date: string;
  expiry_date?: string;
  file_url: string;
  file_type: string;
  file_size: number;
  status: 'active' | 'expired' | 'expiring_soon' | 'revoked';
  reminder_days: number;
  notes?: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface ComplianceAlert {
  id: string;
  document_id: string;
  alert_type: 'expiring_soon' | 'expired' | 'missing';
  alert_date: string;
  days_until_expiry?: number;
  is_acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_at?: string;
}

// Vehicle Disposal Module - Defined per vehicle-disposal-module.md
export interface DisposalRequest {
  id: string;
  disposal_number: string;
  vehicle_id: string;
  disposal_reason: 'end_of_life' | 'excessive_maintenance' | 'accident_damage' | 'upgrade' | 'policy_change';
  recommended_method: 'auction' | 'best_offer' | 'trade_in' | 'scrap' | 'donation';
  condition_rating: 'excellent' | 'good' | 'fair' | 'poor' | 'salvage';
  current_mileage: number;
  estimated_value: number;
  requested_by: string;
  request_date: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approval_date?: string;
  rejection_reason?: string;
  status: 'pending_approval' | 'listed' | 'bidding_open' | 'sold' | 'transferred' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface DisposalAuction {
  id: string;
  disposal_id: string;
  auction_type: 'public' | 'sealed_bid' | 'online';
  start_date: string;
  end_date: string;
  starting_price: number;
  reserve_price?: number;
  current_highest_bid?: number;
  total_bids: number;
  winner_id?: string;
  winning_bid?: number;
  auction_status: 'scheduled' | 'active' | 'closed' | 'awarded' | 'cancelled';
}

export interface Bid {
  id: string;
  auction_id: string;
  bidder_name: string;
  bidder_contact: string;
  bid_amount: number;
  bid_date: string;
  is_valid: boolean;
  notes?: string;
}

export interface DisposalTransfer {
  id: string;
  disposal_id: string;
  buyer_name: string;
  buyer_contact: string;
  buyer_id_number: string;
  buyer_address: string;
  sale_price: number;
  payment_method: 'cash' | 'check' | 'bank_transfer' | 'finance';
  payment_status: 'pending' | 'partial' | 'completed';
  payment_date?: string;
  transfer_date: string;
  transfer_document_url?: string;
  deregistration_date?: string;
  deregistration_proof_url?: string;
  final_odometer: number;
  transfer_status: 'pending_payment' | 'pending_documents' | 'completed';
  notes?: string;
}

// Page Restrictions Module
export interface PageRestriction {
  id: string;
  page_name: string;
  page_path: string;
  description?: string;
  fleet_manager_access: boolean;
  maintenance_team_access: boolean;
  driver_access: boolean;
  administration_access: boolean;
  client_company_liaison_access: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
