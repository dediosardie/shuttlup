-- Page Restrictions Table Migration
-- This table manages page-level access control for different user roles

CREATE TABLE IF NOT EXISTS page_restrictions (
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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_page_restrictions_page_name ON page_restrictions(page_name);
CREATE INDEX IF NOT EXISTS idx_page_restrictions_is_active ON page_restrictions(is_active);

-- Add RLS policy
ALTER TABLE page_restrictions ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read page restrictions
CREATE POLICY "Authenticated users can view page restrictions" ON page_restrictions
    FOR SELECT
    TO authenticated
    USING (true);

-- Only fleet_manager and administration can modify page restrictions
CREATE POLICY "Fleet managers and administrators can modify page restrictions" ON page_restrictions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('fleet_manager', 'administration')
        )
    );

-- Insert default page restrictions
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
('Page Restrictions', '/page-restrictions', 'Page access control management', true, false, false, true, false)
ON CONFLICT (page_name) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_page_restrictions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_page_restrictions_updated_at
    BEFORE UPDATE ON page_restrictions
    FOR EACH ROW
    EXECUTE FUNCTION update_page_restrictions_updated_at();

-- Comments
COMMENT ON TABLE page_restrictions IS 'Manages page-level access control for different user roles';
COMMENT ON COLUMN page_restrictions.page_name IS 'Display name of the page';
COMMENT ON COLUMN page_restrictions.page_path IS 'URL path or route for the page';
COMMENT ON COLUMN page_restrictions.fleet_manager_access IS 'Access permission for fleet_manager role';
COMMENT ON COLUMN page_restrictions.maintenance_team_access IS 'Access permission for maintenance_team role';
COMMENT ON COLUMN page_restrictions.driver_access IS 'Access permission for driver role';
COMMENT ON COLUMN page_restrictions.administration_access IS 'Access permission for administration role';
COMMENT ON COLUMN page_restrictions.client_company_liaison_access IS 'Access permission for client_company_liaison role';
