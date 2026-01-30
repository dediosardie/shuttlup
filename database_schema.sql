-- Vehicle Maintenance Management System - Database Schema
-- Generated: January 30, 2026
-- Database: PostgreSQL (Supabase)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users Table (for authentication and authorization)
CREATE TABLE IF NOT EXISTS users (
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

-- Vehicles Table (per vehicle-module.md)
CREATE TABLE IF NOT EXISTS vehicles (
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

-- Drivers Table (simplified per driver-module.md reference)
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    license_expiry DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- MAINTENANCE MODULE
-- ============================================================================

-- Maintenance Table (simplified per maintenance-module.md)
CREATE TABLE IF NOT EXISTS maintenance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    maintenance_type VARCHAR(50) NOT NULL CHECK (maintenance_type IN ('preventive', 'repair')),
    scheduled_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    cost DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TRIP SCHEDULING MODULE
-- ============================================================================

-- Trips Table
CREATE TABLE IF NOT EXISTS trips (
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_planned_times CHECK (planned_arrival > planned_departure),
    CONSTRAINT valid_actual_times CHECK (actual_arrival IS NULL OR actual_departure IS NULL OR actual_arrival > actual_departure)
);

-- ============================================================================
-- FUEL TRACKING MODULE
-- ============================================================================

-- Fuel Transactions Table
CREATE TABLE IF NOT EXISTS fuel_transactions (
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

-- Fuel Efficiency Metrics Table
CREATE TABLE IF NOT EXISTS fuel_efficiency_metrics (
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

-- ============================================================================
-- INCIDENT & INSURANCE MODULE
-- ============================================================================

-- Incidents Table
CREATE TABLE IF NOT EXISTS incidents (
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

-- Incident Photos Table
CREATE TABLE IF NOT EXISTS incident_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    description TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    uploaded_by UUID NOT NULL REFERENCES users(id)
);

-- Insurance Claims Table
CREATE TABLE IF NOT EXISTS insurance_claims (
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

-- ============================================================================
-- COMPLIANCE & DOCUMENT MANAGEMENT MODULE
-- ============================================================================

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
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

-- Compliance Alerts Table
CREATE TABLE IF NOT EXISTS compliance_alerts (
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

-- ============================================================================
-- VEHICLE DISPOSAL MODULE
-- ============================================================================

-- Disposal Requests Table
CREATE TABLE IF NOT EXISTS disposal_requests (
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

-- Disposal Auctions Table
CREATE TABLE IF NOT EXISTS disposal_auctions (
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

-- Bids Table
CREATE TABLE IF NOT EXISTS bids (
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

-- Disposal Transfers Table
CREATE TABLE IF NOT EXISTS disposal_transfers (
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

-- ============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Vehicles
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_plate_number ON vehicles(plate_number);

-- Drivers
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_drivers_license_expiry ON drivers(license_expiry);
CREATE INDEX idx_drivers_license_number ON drivers(license_number);

-- Maintenance
CREATE INDEX idx_maintenance_vehicle ON maintenance(vehicle_id);
CREATE INDEX idx_maintenance_scheduled_date ON maintenance(scheduled_date);
CREATE INDEX idx_maintenance_status ON maintenance(status);

-- Trips
CREATE INDEX idx_trips_vehicle ON trips(vehicle_id);
CREATE INDEX idx_trips_driver ON trips(driver_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_departure ON trips(planned_departure);

-- Fuel Transactions
CREATE INDEX idx_fuel_vehicle ON fuel_transactions(vehicle_id);
CREATE INDEX idx_fuel_driver ON fuel_transactions(driver_id);
CREATE INDEX idx_fuel_date ON fuel_transactions(transaction_date);

-- Incidents
CREATE INDEX idx_incidents_vehicle ON incidents(vehicle_id);
CREATE INDEX idx_incidents_driver ON incidents(driver_id);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_date ON incidents(incident_date);
CREATE INDEX idx_incidents_number ON incidents(incident_number);

-- Documents
CREATE INDEX idx_documents_entity ON documents(related_entity_type, related_entity_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_expiry ON documents(expiry_date);

-- Disposal
CREATE INDEX idx_disposal_vehicle ON disposal_requests(vehicle_id);
CREATE INDEX idx_disposal_status ON disposal_requests(status);
CREATE INDEX idx_disposal_number ON disposal_requests(disposal_number);

-- Auctions
CREATE INDEX idx_auctions_disposal ON disposal_auctions(disposal_id);
CREATE INDEX idx_auctions_status ON disposal_auctions(auction_status);
CREATE INDEX idx_auctions_dates ON disposal_auctions(start_date, end_date);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_updated_at BEFORE UPDATE ON maintenance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_insurance_claims_updated_at BEFORE UPDATE ON insurance_claims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_disposal_requests_updated_at BEFORE UPDATE ON disposal_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_disposal_auctions_updated_at BEFORE UPDATE ON disposal_auctions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_disposal_transfers_updated_at BEFORE UPDATE ON disposal_transfers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- ============================================================================

-- Function to auto-generate incident numbers
CREATE OR REPLACE FUNCTION generate_incident_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.incident_number := 'INC-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || 
                           LPAD(NEXTVAL('incident_number_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS incident_number_seq;

CREATE TRIGGER set_incident_number BEFORE INSERT ON incidents
    FOR EACH ROW EXECUTE FUNCTION generate_incident_number();

-- Function to auto-generate disposal numbers
CREATE OR REPLACE FUNCTION generate_disposal_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.disposal_number := 'DSP-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || 
                           LPAD(NEXTVAL('disposal_number_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS disposal_number_seq;

CREATE TRIGGER set_disposal_number BEFORE INSERT ON disposal_requests
    FOR EACH ROW EXECUTE FUNCTION generate_disposal_number();

-- Function to update document status based on expiry date
CREATE OR REPLACE FUNCTION update_document_status()
RETURNS void AS $$
BEGIN
    -- Set status to 'expired' for documents past expiry
    UPDATE documents
    SET status = 'expired'
    WHERE expiry_date < CURRENT_DATE
    AND status != 'expired';

    -- Set status to 'expiring_soon' for documents within reminder period
    UPDATE documents
    SET status = 'expiring_soon'
    WHERE expiry_date <= CURRENT_DATE + (reminder_days || ' days')::INTERVAL
    AND expiry_date >= CURRENT_DATE
    AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Function to calculate fuel efficiency
CREATE OR REPLACE FUNCTION calculate_fuel_efficiency(
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

-- ============================================================================
-- VIEWS FOR REPORTING
-- ============================================================================

-- Active Fleet View
CREATE OR REPLACE VIEW v_active_fleet AS
SELECT 
    v.id,
    v.plate_number,
    v.make,
    v.model,
    v.year,
    v.status,
    COUNT(DISTINCT m.id) as maintenance_count,
    COUNT(DISTINCT t.id) as trip_count,
    COALESCE(SUM(ft.cost), 0) as total_fuel_cost
FROM vehicles v
LEFT JOIN maintenance m ON v.id = m.vehicle_id
LEFT JOIN trips t ON v.id = t.vehicle_id
LEFT JOIN fuel_transactions ft ON v.id = ft.vehicle_id
WHERE v.status = 'active'
GROUP BY v.id;

-- Expiring Documents View
CREATE OR REPLACE VIEW v_expiring_documents AS
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

-- Vehicle Performance Summary View
CREATE OR REPLACE VIEW v_vehicle_performance AS
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

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE disposal_requests ENABLE ROW LEVEL SECURITY;

-- Example RLS Policy: All authenticated users can read vehicles
CREATE POLICY "Authenticated users can view vehicles" ON vehicles
    FOR SELECT
    TO authenticated
    USING (true);

-- Example RLS Policy: Only admins and fleet managers can modify vehicles
CREATE POLICY "Admins and managers can modify vehicles" ON vehicles
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'fleet_manager')
        )
    );

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Uncomment below to insert sample data for testing

-- INSERT INTO users (email, full_name, role) VALUES
-- ('admin@example.com', 'System Admin', 'admin'),
-- ('manager@example.com', 'Fleet Manager', 'fleet_manager');

-- INSERT INTO vehicles (plate_number, make, model, year, vin, ownership_type, status, insurance_expiry, registration_expiry) VALUES
-- ('ABC-1234', 'Toyota', 'Hilux', 2022, '1HGCM82633A123456', 'owned', 'active', '2025-12-31', '2025-12-31'),
-- ('XYZ-5678', 'Ford', 'Ranger', 2021, '1HGCM82633A654321', 'leased', 'active', '2026-06-30', '2026-06-30');

-- INSERT INTO drivers (full_name, license_number, license_expiry, status) VALUES
-- ('John Doe', 'DL123456', '2025-12-31', 'active'),
-- ('Jane Smith', 'DL789012', '2026-06-30', 'active');

-- End of Schema
