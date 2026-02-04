-- ============================================================================
-- VEHICLE MAINTENANCE MANAGEMENT SYSTEM - MASTER DATABASE SCHEMA
-- ============================================================================
-- Version: 2.1
-- Generated: February 4, 2026
-- Database: PostgreSQL 15+ (Supabase)
-- Purpose: Complete 1:1 database replication for new project deployments
--
-- EXECUTION ORDER:
-- 1. Extensions
-- 2. Tables (with DROP IF EXISTS)
-- 3. Views (with DROP IF EXISTS)
-- 4. Functions (with DROP IF EXISTS)
-- 5. Triggers (with DROP IF EXISTS)
-- 6. Storage Buckets & Policies
-- 7. Seed Data
-- 8. Verification Queries
--
-- This script is idempotent and can be run multiple times safely.
-- ============================================================================

-- ============================================================================
-- STEP 1: EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- STEP 2: TABLES (DROP AND CREATE IN DEPENDENCY ORDER)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- USERS TABLE (Custom Authentication)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('fleet_manager', 'maintenance_team', 'driver', 'administration', 'client_company_liaison')),
    is_active BOOLEAN DEFAULT true,
    session_id TEXT,
    session_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_session_id ON users(session_id);

COMMENT ON TABLE users IS 'User accounts for authentication and authorization';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password';
COMMENT ON COLUMN users.session_id IS 'Current active session token';
COMMENT ON COLUMN users.session_expires_at IS 'Session expiration timestamp';

-- ----------------------------------------------------------------------------
-- VEHICLES TABLE
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS vehicles CASCADE;

CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plate_number VARCHAR(50) UNIQUE NOT NULL,
    conduction_number VARCHAR(50) UNIQUE,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 1),
    vin VARCHAR(17) UNIQUE NOT NULL,
    ownership_type VARCHAR(50) NOT NULL CHECK (ownership_type IN ('Internal', 'Leased', 'Leased to Own', 'Shuttle')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'disposed')),
    insurance_expiry DATE NOT NULL,
    registration_expiry DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_plate_number ON vehicles(plate_number);
CREATE INDEX idx_vehicles_ownership_type ON vehicles(ownership_type);

COMMENT ON TABLE vehicles IS 'Fleet vehicle inventory and details';
COMMENT ON COLUMN vehicles.conduction_number IS 'LTO conduction sticker number';
COMMENT ON COLUMN vehicles.ownership_type IS 'Internal, Leased, Leased to Own, or Shuttle';

-- ----------------------------------------------------------------------------
-- DRIVERS TABLE
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS drivers CASCADE;

CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    license_expiry DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT drivers_user_id_unique UNIQUE (user_id)
);

CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_drivers_license_expiry ON drivers(license_expiry);
CREATE INDEX idx_drivers_license_number ON drivers(license_number);
CREATE INDEX idx_drivers_user_id ON drivers(user_id);

COMMENT ON TABLE drivers IS 'Driver records and license information';
COMMENT ON COLUMN drivers.user_id IS 'References the user account that can login as this driver';

-- ----------------------------------------------------------------------------
-- DRIVER ATTENDANCE TABLE
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS driver_attendance CASCADE;

CREATE TABLE driver_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  action_type VARCHAR(10) NOT NULL CHECK (action_type IN ('login', 'logout')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  image_url TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_driver_attendance_driver_id ON driver_attendance(driver_id);
CREATE INDEX idx_driver_attendance_date ON driver_attendance(attendance_date);
CREATE INDEX idx_driver_attendance_action ON driver_attendance(action_type);
CREATE INDEX idx_driver_attendance_timestamp ON driver_attendance(timestamp DESC);

COMMENT ON TABLE driver_attendance IS 'Tracks driver login/logout attendance with images and location';
COMMENT ON COLUMN driver_attendance.action_type IS 'Type of action: login or logout';
COMMENT ON COLUMN driver_attendance.image_url IS 'URL of the captured image stored in Supabase Storage';
COMMENT ON COLUMN driver_attendance.latitude IS 'GPS latitude coordinate';
COMMENT ON COLUMN driver_attendance.longitude IS 'GPS longitude coordinate';

-- ----------------------------------------------------------------------------
-- MAINTENANCE TABLE
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS maintenance CASCADE;

CREATE TABLE maintenance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    maintenance_type VARCHAR(50) NOT NULL CHECK (maintenance_type IN ('preventive', 'repair')),
    scheduled_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    cost DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_maintenance_vehicle ON maintenance(vehicle_id);
CREATE INDEX idx_maintenance_scheduled_date ON maintenance(scheduled_date);
CREATE INDEX idx_maintenance_status ON maintenance(status);

COMMENT ON TABLE maintenance IS 'Vehicle maintenance records and scheduling';

-- ----------------------------------------------------------------------------
-- TRIPS TABLE
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS trips CASCADE;

CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
    origin VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    planned_departure TIMESTAMP WITH TIME ZONE NOT NULL,
    planned_arrival TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_departure TIMESTAMP WITH TIME ZONE,
    actual_arrival TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
    distance_km DECIMAL(10, 2) NOT NULL,
    estimated_fuel_consumption DECIMAL(10, 2) NOT NULL,
    route_waypoints JSONB,
    notes TEXT,
    tracking_enabled BOOLEAN DEFAULT false,
    tracking_started_at TIMESTAMP WITH TIME ZONE,
    tracking_stopped_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_planned_times CHECK (planned_arrival > planned_departure),
    CONSTRAINT valid_actual_times CHECK (actual_arrival IS NULL OR actual_departure IS NULL OR actual_arrival > actual_departure)
);

CREATE INDEX idx_trips_vehicle ON trips(vehicle_id);
CREATE INDEX idx_trips_driver ON trips(driver_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_departure ON trips(planned_departure);

COMMENT ON TABLE trips IS 'Trip scheduling, tracking, and history';
COMMENT ON COLUMN trips.tracking_enabled IS 'Whether real-time GPS tracking is enabled for this trip';

-- ----------------------------------------------------------------------------
-- TRIP LOCATIONS (GPS Tracking)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS trip_locations CASCADE;

CREATE TABLE trip_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(10, 2),
  speed DECIMAL(10, 2),
  heading DECIMAL(5, 2),
  altitude DECIMAL(10, 2),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trip_locations_trip_id ON trip_locations(trip_id);
CREATE INDEX idx_trip_locations_timestamp ON trip_locations(timestamp DESC);

COMMENT ON TABLE trip_locations IS 'Stores GPS location data for real-time trip tracking';
COMMENT ON COLUMN trip_locations.accuracy IS 'GPS accuracy in meters';
COMMENT ON COLUMN trip_locations.speed IS 'Speed in kilometers per hour';
COMMENT ON COLUMN trip_locations.heading IS 'Direction of travel in degrees (0-360)';

-- ----------------------------------------------------------------------------
-- FUEL TRANSACTIONS TABLE
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS fuel_transactions CASCADE;

CREATE TABLE fuel_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    odometer_reading INTEGER NOT NULL,
    liters DECIMAL(10, 2) NOT NULL CHECK (liters > 0),
    cost DECIMAL(10, 2) NOT NULL CHECK (cost > 0),
    cost_per_liter DECIMAL(10, 2) NOT NULL CHECK (cost_per_liter > 0),
    fuel_type VARCHAR(50) NOT NULL CHECK (fuel_type IN ('diesel', 'petrol', 'electric', 'hybrid')),
    station_name VARCHAR(255),
    station_location VARCHAR(255),
    receipt_image_url TEXT,
    is_full_tank BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fuel_vehicle ON fuel_transactions(vehicle_id);
CREATE INDEX idx_fuel_driver ON fuel_transactions(driver_id);
CREATE INDEX idx_fuel_date ON fuel_transactions(transaction_date);

COMMENT ON TABLE fuel_transactions IS 'Fuel purchase and consumption records';

-- ----------------------------------------------------------------------------
-- FUEL EFFICIENCY METRICS TABLE
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS fuel_efficiency_metrics CASCADE;

CREATE TABLE fuel_efficiency_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_liters DECIMAL(10, 2) NOT NULL,
    total_distance DECIMAL(10, 2) NOT NULL,
    average_consumption DECIMAL(10, 2) NOT NULL,
    total_cost DECIMAL(10, 2) NOT NULL,
    efficiency_rating VARCHAR(50) NOT NULL CHECK (efficiency_rating IN ('excellent', 'good', 'average', 'poor')),
    baseline_consumption DECIMAL(10, 2) NOT NULL,
    variance_percentage DECIMAL(5, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_period CHECK (period_end > period_start)
);

CREATE INDEX idx_fuel_efficiency_vehicle ON fuel_efficiency_metrics(vehicle_id);
CREATE INDEX idx_fuel_efficiency_period ON fuel_efficiency_metrics(period_start, period_end);

COMMENT ON TABLE fuel_efficiency_metrics IS 'Calculated fuel efficiency metrics by period';

-- ----------------------------------------------------------------------------
-- INCIDENTS TABLE
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS incidents CASCADE;

CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_number VARCHAR(50) UNIQUE NOT NULL,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
    incident_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(255) NOT NULL,
    incident_type VARCHAR(50) NOT NULL CHECK (incident_type IN ('collision', 'theft', 'vandalism', 'mechanical_failure', 'other')),
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('minor', 'moderate', 'severe', 'critical')),
    description TEXT NOT NULL,
    weather_conditions VARCHAR(255),
    road_conditions VARCHAR(255),
    police_report_number VARCHAR(100),
    witnesses JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'under_investigation', 'resolved', 'closed')),
    estimated_cost DECIMAL(10, 2),
    actual_cost DECIMAL(10, 2),
    assigned_to UUID REFERENCES users(id),
    resolution_notes TEXT,
    reported_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_incidents_vehicle ON incidents(vehicle_id);
CREATE INDEX idx_incidents_driver ON incidents(driver_id);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_date ON incidents(incident_date);
CREATE INDEX idx_incidents_number ON incidents(incident_number);

COMMENT ON TABLE incidents IS 'Incident reports and investigation tracking';

-- ----------------------------------------------------------------------------
-- INCIDENT PHOTOS TABLE
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS incident_photos CASCADE;

CREATE TABLE incident_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    description TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    uploaded_by UUID NOT NULL REFERENCES users(id)
);

CREATE INDEX idx_incident_photos_incident ON incident_photos(incident_id);

COMMENT ON TABLE incident_photos IS 'Photo evidence attached to incident reports';

-- ----------------------------------------------------------------------------
-- INSURANCE CLAIMS TABLE
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS insurance_claims CASCADE;

CREATE TABLE insurance_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE RESTRICT,
    claim_number VARCHAR(100) UNIQUE NOT NULL,
    insurance_company VARCHAR(255) NOT NULL,
    policy_number VARCHAR(100) NOT NULL,
    claim_date DATE NOT NULL,
    claim_amount DECIMAL(10, 2) NOT NULL,
    approved_amount DECIMAL(10, 2),
    status VARCHAR(50) NOT NULL DEFAULT 'filed' CHECK (status IN ('filed', 'pending', 'approved', 'rejected', 'paid')),
    adjuster_name VARCHAR(255),
    adjuster_contact VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_insurance_claims_incident ON insurance_claims(incident_id);
CREATE INDEX idx_insurance_claims_status ON insurance_claims(status);

COMMENT ON TABLE insurance_claims IS 'Insurance claim tracking and management';

-- ----------------------------------------------------------------------------
-- DOCUMENTS TABLE
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS documents CASCADE;

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('registration', 'insurance', 'permit', 'license', 'inspection', 'contract', 'other')),
    related_entity_type VARCHAR(50) NOT NULL CHECK (related_entity_type IN ('vehicle', 'driver', 'fleet')),
    related_entity_id UUID NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_number VARCHAR(100),
    issuing_authority VARCHAR(255) NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'expiring_soon', 'revoked')),
    reminder_days INTEGER NOT NULL DEFAULT 30,
    notes TEXT,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_entity ON documents(related_entity_type, related_entity_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_expiry ON documents(expiry_date);

COMMENT ON TABLE documents IS 'Document management and compliance tracking';

-- ----------------------------------------------------------------------------
-- COMPLIANCE ALERTS TABLE
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS compliance_alerts CASCADE;

CREATE TABLE compliance_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('expiring_soon', 'expired', 'missing')),
    alert_date DATE NOT NULL,
    days_until_expiry INTEGER,
    is_acknowledged BOOLEAN DEFAULT false,
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_compliance_alerts_document ON compliance_alerts(document_id);
CREATE INDEX idx_compliance_alerts_type ON compliance_alerts(alert_type);

COMMENT ON TABLE compliance_alerts IS 'Automatic alerts for document compliance issues';

-- ----------------------------------------------------------------------------
-- DISPOSAL REQUESTS TABLE
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS disposal_requests CASCADE;

CREATE TABLE disposal_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    disposal_number VARCHAR(50) UNIQUE NOT NULL,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    disposal_reason VARCHAR(50) NOT NULL CHECK (disposal_reason IN ('end_of_life', 'excessive_maintenance', 'accident_damage', 'upgrade', 'policy_change')),
    recommended_method VARCHAR(50) NOT NULL CHECK (recommended_method IN ('auction', 'best_offer', 'trade_in', 'scrap', 'donation')),
    condition_rating VARCHAR(50) NOT NULL CHECK (condition_rating IN ('excellent', 'good', 'fair', 'poor', 'salvage')),
    current_mileage INTEGER NOT NULL,
    estimated_value DECIMAL(10, 2) NOT NULL,
    requested_by UUID NOT NULL REFERENCES users(id),
    request_date DATE NOT NULL,
    approval_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES users(id),
    approval_date DATE,
    rejection_reason TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'listed', 'bidding_open', 'sold', 'transferred', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_disposal_vehicle ON disposal_requests(vehicle_id);
CREATE INDEX idx_disposal_status ON disposal_requests(status);
CREATE INDEX idx_disposal_number ON disposal_requests(disposal_number);

COMMENT ON TABLE disposal_requests IS 'Vehicle disposal request and approval workflow';

-- ----------------------------------------------------------------------------
-- DISPOSAL AUCTIONS TABLE
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS disposal_auctions CASCADE;

CREATE TABLE disposal_auctions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    disposal_id UUID NOT NULL REFERENCES disposal_requests(id) ON DELETE CASCADE,
    auction_type VARCHAR(50) NOT NULL CHECK (auction_type IN ('public', 'sealed_bid', 'online')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    starting_price DECIMAL(10, 2) NOT NULL,
    reserve_price DECIMAL(10, 2),
    current_highest_bid DECIMAL(10, 2),
    total_bids INTEGER DEFAULT 0,
    winner_id UUID,
    winning_bid DECIMAL(10, 2),
    auction_status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (auction_status IN ('scheduled', 'active', 'closed', 'awarded', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_auction_dates CHECK (end_date > start_date),
    CONSTRAINT valid_reserve_price CHECK (reserve_price IS NULL OR reserve_price >= starting_price)
);

CREATE INDEX idx_auctions_disposal ON disposal_auctions(disposal_id);
CREATE INDEX idx_auctions_status ON disposal_auctions(auction_status);
CREATE INDEX idx_auctions_dates ON disposal_auctions(start_date, end_date);

COMMENT ON TABLE disposal_auctions IS 'Auction management for vehicle disposal';

-- ----------------------------------------------------------------------------
-- AUCTION BIDS TABLE
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS bids CASCADE;

CREATE TABLE bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auction_id UUID NOT NULL REFERENCES disposal_auctions(id) ON DELETE CASCADE,
    bidder_name VARCHAR(255) NOT NULL,
    bidder_contact VARCHAR(255) NOT NULL,
    bid_amount DECIMAL(10, 2) NOT NULL,
    bid_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_valid BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bids_auction ON bids(auction_id);
CREATE INDEX idx_bids_date ON bids(bid_date);

COMMENT ON TABLE bids IS 'Bid history for disposal auctions';

-- ----------------------------------------------------------------------------
-- DISPOSAL TRANSFERS TABLE
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS disposal_transfers CASCADE;

CREATE TABLE disposal_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    disposal_id UUID NOT NULL REFERENCES disposal_requests(id) ON DELETE RESTRICT,
    buyer_name VARCHAR(255) NOT NULL,
    buyer_contact VARCHAR(255) NOT NULL,
    buyer_id_number VARCHAR(100) NOT NULL,
    buyer_address TEXT NOT NULL,
    sale_price DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'check', 'bank_transfer', 'finance')),
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'completed')),
    payment_date DATE,
    transfer_date DATE NOT NULL,
    transfer_document_url TEXT,
    deregistration_date DATE,
    deregistration_proof_url TEXT,
    final_odometer INTEGER NOT NULL,
    transfer_status VARCHAR(50) NOT NULL DEFAULT 'pending_payment' CHECK (transfer_status IN ('pending_payment', 'pending_documents', 'completed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_disposal_transfers_disposal ON disposal_transfers(disposal_id);
CREATE INDEX idx_disposal_transfers_status ON disposal_transfers(transfer_status);

COMMENT ON TABLE disposal_transfers IS 'Vehicle ownership transfer documentation';

-- ----------------------------------------------------------------------------
-- PAGE RESTRICTIONS TABLE (Role-Based Access Control)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS page_restrictions CASCADE;

CREATE TABLE page_restrictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_name VARCHAR(100) NOT NULL UNIQUE,
    page_path VARCHAR(255) NOT NULL,
    description TEXT,
    fleet_manager_access BOOLEAN DEFAULT false,
    maintenance_team_access BOOLEAN DEFAULT false,
    driver_access BOOLEAN DEFAULT false,
    administration_access BOOLEAN DEFAULT false,
    client_company_liaison_access BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_page_restrictions_page_name ON page_restrictions(page_name);
CREATE INDEX idx_page_restrictions_is_active ON page_restrictions(is_active);

COMMENT ON TABLE page_restrictions IS 'Manages page-level access control for different user roles';

-- ----------------------------------------------------------------------------
-- AUDIT LOGS TABLE
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS audit_logs CASCADE;

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_email ON audit_logs(user_email);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

COMMENT ON TABLE audit_logs IS 'Stores audit trail of all user actions in the system';

-- ============================================================================
-- STEP 3: VIEWS (DROP AND CREATE)
-- ============================================================================

-- Active Fleet View
DROP VIEW IF EXISTS v_active_fleet CASCADE;

CREATE VIEW v_active_fleet AS
SELECT 
    v.id,
    v.plate_number,
    v.conduction_number,
    v.make,
    v.model,
    v.year,
    v.status,
    v.ownership_type,
    COUNT(DISTINCT m.id) as maintenance_count,
    COUNT(DISTINCT t.id) as trip_count,
    COALESCE(SUM(ft.cost), 0) as total_fuel_cost
FROM vehicles v
LEFT JOIN maintenance m ON v.id = m.vehicle_id
LEFT JOIN trips t ON v.id = t.vehicle_id
LEFT JOIN fuel_transactions ft ON v.id = ft.vehicle_id
WHERE v.status = 'active'
GROUP BY v.id, v.plate_number, v.conduction_number, v.make, v.model, v.year, v.status, v.ownership_type;

COMMENT ON VIEW v_active_fleet IS 'Summary of active fleet vehicles with counts';

-- Expiring Documents View
DROP VIEW IF EXISTS v_expiring_documents CASCADE;

CREATE VIEW v_expiring_documents AS
SELECT 
    d.*,
    CASE 
        WHEN d.related_entity_type = 'vehicle' THEN v.plate_number
        WHEN d.related_entity_type = 'driver' THEN dr.full_name
        ELSE 'Fleet'
    END as entity_name,
    (d.expiry_date - CURRENT_DATE) as days_until_expiry
FROM documents d
LEFT JOIN vehicles v ON d.related_entity_type = 'vehicle' AND d.related_entity_id = v.id
LEFT JOIN drivers dr ON d.related_entity_type = 'driver' AND d.related_entity_id = dr.id
WHERE d.status IN ('active', 'expiring_soon')
AND d.expiry_date IS NOT NULL
AND d.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY d.expiry_date;

COMMENT ON VIEW v_expiring_documents IS 'Documents expiring within 30 days';

-- Vehicle Performance Summary View
DROP VIEW IF EXISTS v_vehicle_performance CASCADE;

CREATE VIEW v_vehicle_performance AS
SELECT 
    v.id,
    v.plate_number,
    v.make,
    v.model,
    COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'completed') as completed_maintenance,
    COUNT(DISTINCT i.id) as incident_count,
    COALESCE(AVG(fe.average_consumption), 0) as avg_fuel_efficiency,
    COALESCE(SUM(m.cost), 0) as total_maintenance_cost,
    COALESCE(SUM(ft.cost), 0) as total_fuel_cost
FROM vehicles v
LEFT JOIN maintenance m ON v.id = m.vehicle_id
LEFT JOIN incidents i ON v.id = i.vehicle_id
LEFT JOIN fuel_efficiency_metrics fe ON v.id = fe.vehicle_id
LEFT JOIN fuel_transactions ft ON v.id = ft.vehicle_id
GROUP BY v.id, v.plate_number, v.make, v.model;

COMMENT ON VIEW v_vehicle_performance IS 'Performance metrics per vehicle';

-- ============================================================================
-- STEP 4: FUNCTIONS (DROP AND CREATE)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Authenticate User Function
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS authenticate_user(TEXT, TEXT) CASCADE;

CREATE FUNCTION authenticate_user(
  p_email TEXT,
  p_password TEXT
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  is_active BOOLEAN,
  session_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.is_active,
    u.session_id
  FROM users u
  WHERE u.email = p_email
    AND u.password_hash = crypt(p_password, u.password_hash);
END;
$$;

GRANT EXECUTE ON FUNCTION authenticate_user(TEXT, TEXT) TO anon, authenticated;
COMMENT ON FUNCTION authenticate_user IS 'Authenticates user with email and password, returns user data if valid';

-- ----------------------------------------------------------------------------
-- Create User Account Function
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS create_user_account(TEXT, TEXT, TEXT, TEXT, BOOLEAN) CASCADE;

CREATE FUNCTION create_user_account(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT DEFAULT 'driver',
  p_is_active BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE users.email = p_email) THEN
    RAISE EXCEPTION 'Email already exists';
  END IF;

  INSERT INTO users (email, password_hash, full_name, role, is_active)
  VALUES (
    p_email,
    crypt(p_password, gen_salt('bf')),
    p_full_name,
    p_role,
    p_is_active
  )
  RETURNING users.id INTO v_user_id;

  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.is_active
  FROM users u
  WHERE u.id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_user_account(TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO anon, authenticated;
COMMENT ON FUNCTION create_user_account IS 'Creates new user account with hashed password';

-- ----------------------------------------------------------------------------
-- Update User Password Function
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS update_user_password(UUID, TEXT) CASCADE;

CREATE FUNCTION update_user_password(
  p_user_id UUID,
  p_new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users
  SET password_hash = crypt(p_new_password, gen_salt('bf')),
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_user_id;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION update_user_password(UUID, TEXT) TO authenticated;
COMMENT ON FUNCTION update_user_password IS 'Updates user password (requires authentication)';

-- ----------------------------------------------------------------------------
-- Update Document Status Function
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS update_document_status() CASCADE;

CREATE FUNCTION update_document_status()
RETURNS void AS $$
BEGIN
    UPDATE documents
    SET status = 'expired'
    WHERE expiry_date < CURRENT_DATE
    AND status != 'expired';

    UPDATE documents
    SET status = 'expiring_soon'
    WHERE expiry_date <= CURRENT_DATE + (reminder_days || ' days')::INTERVAL
    AND expiry_date >= CURRENT_DATE
    AND status = 'active';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_document_status IS 'Updates document status based on expiry date';

-- ----------------------------------------------------------------------------
-- Calculate Fuel Efficiency Function
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS calculate_fuel_efficiency(UUID, DATE, DATE) CASCADE;

CREATE FUNCTION calculate_fuel_efficiency(
    p_vehicle_id UUID,
    p_period_start DATE,
    p_period_end DATE
)
RETURNS TABLE(
    total_liters DECIMAL,
    total_distance DECIMAL,
    avg_consumption DECIMAL,
    total_cost DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        SUM(ft.liters)::DECIMAL AS total_liters,
        (MAX(ft.odometer_reading) - MIN(ft.odometer_reading))::DECIMAL AS total_distance,
        CASE 
            WHEN (MAX(ft.odometer_reading) - MIN(ft.odometer_reading)) > 0 
            THEN (SUM(ft.liters) / (MAX(ft.odometer_reading) - MIN(ft.odometer_reading)) * 100)::DECIMAL
            ELSE 0
        END AS avg_consumption,
        SUM(ft.cost)::DECIMAL AS total_cost
    FROM fuel_transactions ft
    WHERE ft.vehicle_id = p_vehicle_id
    AND ft.transaction_date::DATE BETWEEN p_period_start AND p_period_end;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_fuel_efficiency IS 'Calculates fuel efficiency metrics for a vehicle over a period';

-- ============================================================================
-- STEP 5: SEQUENCES AND TRIGGERS (DROP AND CREATE)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Sequences for Auto-Generated Numbers
-- ----------------------------------------------------------------------------
DROP SEQUENCE IF EXISTS incident_number_seq CASCADE;
CREATE SEQUENCE incident_number_seq;

DROP SEQUENCE IF EXISTS disposal_number_seq CASCADE;
CREATE SEQUENCE disposal_number_seq;

-- ----------------------------------------------------------------------------
-- Trigger Functions
-- ----------------------------------------------------------------------------

-- Update updated_at column function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update driver attendance updated_at function
DROP FUNCTION IF EXISTS update_driver_attendance_updated_at() CASCADE;

CREATE FUNCTION update_driver_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generate incident number function
DROP FUNCTION IF EXISTS generate_incident_number() CASCADE;

CREATE FUNCTION generate_incident_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.incident_number := 'INC-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || 
                           LPAD(NEXTVAL('incident_number_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generate disposal number function
DROP FUNCTION IF EXISTS generate_disposal_number() CASCADE;

CREATE FUNCTION generate_disposal_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.disposal_number := 'DSP-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || 
                           LPAD(NEXTVAL('disposal_number_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Apply Triggers
-- ----------------------------------------------------------------------------

-- Trigger: users updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: vehicles updated_at
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: drivers updated_at
DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers;
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: driver_attendance updated_at
DROP TRIGGER IF EXISTS driver_attendance_updated_at ON driver_attendance;
CREATE TRIGGER driver_attendance_updated_at
  BEFORE UPDATE ON driver_attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_attendance_updated_at();

-- Trigger: maintenance updated_at
DROP TRIGGER IF EXISTS update_maintenance_updated_at ON maintenance;
CREATE TRIGGER update_maintenance_updated_at BEFORE UPDATE ON maintenance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: trips updated_at
DROP TRIGGER IF EXISTS update_trips_updated_at ON trips;
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: incidents updated_at
DROP TRIGGER IF EXISTS update_incidents_updated_at ON incidents;
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: incidents auto-number
DROP TRIGGER IF EXISTS set_incident_number ON incidents;
CREATE TRIGGER set_incident_number BEFORE INSERT ON incidents
    FOR EACH ROW EXECUTE FUNCTION generate_incident_number();

-- Trigger: insurance_claims updated_at
DROP TRIGGER IF EXISTS update_insurance_claims_updated_at ON insurance_claims;
CREATE TRIGGER update_insurance_claims_updated_at BEFORE UPDATE ON insurance_claims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: documents updated_at
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: disposal_requests updated_at
DROP TRIGGER IF EXISTS update_disposal_requests_updated_at ON disposal_requests;
CREATE TRIGGER update_disposal_requests_updated_at BEFORE UPDATE ON disposal_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: disposal_requests auto-number
DROP TRIGGER IF EXISTS set_disposal_number ON disposal_requests;
CREATE TRIGGER set_disposal_number BEFORE INSERT ON disposal_requests
    FOR EACH ROW EXECUTE FUNCTION generate_disposal_number();

-- Trigger: disposal_auctions updated_at
DROP TRIGGER IF EXISTS update_disposal_auctions_updated_at ON disposal_auctions;
CREATE TRIGGER update_disposal_auctions_updated_at BEFORE UPDATE ON disposal_auctions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: disposal_transfers updated_at
DROP TRIGGER IF EXISTS update_disposal_transfers_updated_at ON disposal_transfers;
CREATE TRIGGER update_disposal_transfers_updated_at BEFORE UPDATE ON disposal_transfers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: page_restrictions updated_at
DROP TRIGGER IF EXISTS update_page_restrictions_updated_at ON page_restrictions;
CREATE TRIGGER update_page_restrictions_updated_at BEFORE UPDATE ON page_restrictions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 6: ROW LEVEL SECURITY (RLS) - DISABLED FOR CUSTOM AUTH
-- ============================================================================
-- This system uses custom authentication via public.users table
-- RLS is disabled and access control is handled at the application level

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE drivers DISABLE ROW LEVEL SECURITY;
ALTER TABLE driver_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance DISABLE ROW LEVEL SECURITY;
ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE trip_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_efficiency_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE incidents DISABLE ROW LEVEL SECURITY;
ALTER TABLE incident_photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_claims DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE disposal_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE disposal_auctions DISABLE ROW LEVEL SECURITY;
ALTER TABLE bids DISABLE ROW LEVEL SECURITY;
ALTER TABLE disposal_transfers DISABLE ROW LEVEL SECURITY;
ALTER TABLE page_restrictions DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 7: STORAGE BUCKETS AND POLICIES
-- ============================================================================

-- Driver Attendance Images Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'driver-attendance',
  'driver-attendance',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png'];

-- Storage Policies for driver-attendance bucket
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'driver-attendance');

CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'driver-attendance');

CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'driver-attendance');

CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'driver-attendance');

-- ============================================================================
-- STEP 8: SEED DATA - PAGE RESTRICTIONS
-- ============================================================================

INSERT INTO page_restrictions (page_name, page_path, description, fleet_manager_access, maintenance_team_access, driver_access, administration_access, client_company_liaison_access) VALUES
('Dashboard', '/dashboard', 'Main dashboard and overview', true, true, true, true, true),
('Vehicles', '/vehicles', 'Vehicle management module', true, true, true, true, true),
('Maintenance', '/maintenance', 'Maintenance scheduling and tracking', true, true, false, true, false),
('Drivers', '/drivers', 'Driver management and records', true, false, false, true, false),
('Trips', '/trips', 'Trip scheduling and tracking', true, false, true, true, false),
('Fuel Tracking', '/fuel', 'Fuel consumption and transactions', true, false, true, true, false),
('Incidents & Insurance', '/incidents', 'Incident reports and insurance claims', true, true, true, true, false),
('Reporting & Analytics', '/reports', 'Reports and data analytics', true, false, false, true, true),
('Compliance Documents', '/compliance', 'Document management and compliance', true, false, false, true, true),
('Vehicle Disposal', '/disposal', 'Vehicle disposal and auction management', true, false, false, true, false),
('User Management', '/users', 'System user administration', false, false, false, true, false),
('Page Restrictions', '/page-restrictions', 'Page access control management', true, false, false, true, false),
('Attendance', '/attendance', 'Driver attendance tracking with photo capture', true, false, true, true, false),
('Live Tracking', '/live-tracking', 'Real-time GPS tracking of active trips', true, false, false, true, false)
ON CONFLICT (page_name) DO NOTHING;

-- ============================================================================
-- STEP 9: VERIFICATION QUERIES
-- ============================================================================

-- Verify tables created (should return 22 tables)
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM pg_tables
    WHERE schemaname = 'public';
    
    RAISE NOTICE '✅ Tables created: %', table_count;
END $$;

-- Verify views created (should return 3 views)
DO $$
DECLARE
    view_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO view_count
    FROM pg_views
    WHERE schemaname = 'public';
    
    RAISE NOTICE '✅ Views created: %', view_count;
END $$;

-- Verify functions created (should return 5+ functions)
DO $$
DECLARE
    function_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_type = 'FUNCTION';
    
    RAISE NOTICE '✅ Functions created: %', function_count;
END $$;

-- Verify storage bucket created
DO $$
DECLARE
    bucket_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'driver-attendance'
    ) INTO bucket_exists;
    
    IF bucket_exists THEN
        RAISE NOTICE '✅ Storage bucket "driver-attendance" created';
    ELSE
        RAISE WARNING '⚠️  Storage bucket "driver-attendance" NOT found';
    END IF;
END $$;

-- Verify page restrictions seeded (should return 14 pages)
DO $$
DECLARE
    page_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO page_count FROM page_restrictions;
    
    RAISE NOTICE '✅ Page restrictions seeded: %', page_count;
END $$;

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  VEHICLE MAINTENANCE MANAGEMENT SYSTEM                       ║';
    RAISE NOTICE '║  Database Schema Deployment Complete                         ║';
    RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '📋 NEXT STEPS:';
    RAISE NOTICE '1. Create admin user: SELECT * FROM create_user_account(''admin@example.com'', ''password'', ''Admin'', ''administration'', true);';
    RAISE NOTICE '2. Update environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)';
    RAISE NOTICE '3. Link drivers to user accounts via user_id column';
    RAISE NOTICE '4. Test authentication and access control';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- END OF MASTER SCHEMA v2.1
-- ============================================================================
