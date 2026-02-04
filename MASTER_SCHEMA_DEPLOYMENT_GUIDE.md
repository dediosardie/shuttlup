# Master Database Schema - Deployment Guide

## Overview
The `MASTER_DATABASE_SCHEMA.sql` file contains a complete 1:1 replication of the entire database structure for the Vehicle Maintenance Management System. This single file can be run on a fresh Supabase project to recreate the exact database architecture.

## What's Included

### ✅ All Tables (22 Tables)
1. **Core Tables**
   - `users` - Authentication and user accounts
   - `vehicles` - Fleet vehicle inventory
   - `drivers` - Driver records with user account linking
   - `driver_attendance` - Attendance tracking with photos/GPS

2. **Maintenance Module**
   - `maintenance` - Maintenance scheduling and records

3. **Trip Management**
   - `trips` - Trip scheduling and tracking
   - `trip_locations` - Real-time GPS tracking data

4. **Fuel Tracking**
   - `fuel_transactions` - Fuel purchases and consumption
   - `fuel_efficiency_metrics` - Calculated efficiency metrics

5. **Incidents & Insurance**
   - `incidents` - Incident reports
   - `incident_photos` - Photo evidence
   - `insurance_claims` - Insurance claim tracking

6. **Compliance & Documents**
   - `documents` - Document management
   - `compliance_alerts` - Compliance notifications

7. **Vehicle Disposal**
   - `disposal_requests` - Disposal workflow
   - `disposal_auctions` - Auction management
   - `bids` - Bid tracking
   - `disposal_transfers` - Transfer documentation

8. **Access Control & Audit**
   - `page_restrictions` - Role-based page access
   - `audit_logs` - Audit trail

### ✅ All Indexes (60+ Indexes)
- Performance-optimized indexes on all foreign keys
- Search optimization indexes on frequently queried columns
- Date/timestamp indexes for reporting

### ✅ All Views (3 Views)
- `v_active_fleet` - Active vehicle summary
- `v_expiring_documents` - Expiring documents within 30 days
- `v_vehicle_performance` - Performance metrics per vehicle

### ✅ All Functions (5 Functions)
- `authenticate_user()` - User authentication
- `create_user_account()` - User registration
- `update_user_password()` - Password updates
- `update_document_status()` - Auto-update document status
- `calculate_fuel_efficiency()` - Fuel efficiency calculations

### ✅ All Triggers (16 Triggers)
- Auto-update `updated_at` timestamps
- Auto-generate incident numbers
- Auto-generate disposal numbers

### ✅ Storage Configuration
- `driver-attendance` bucket for attendance images
- Storage policies for authenticated uploads
- Public read access for image display

### ✅ RLS Configuration
- RLS disabled for all tables (custom authentication)
- Access control handled at application level

### ✅ Seed Data
- Page restrictions for all 14 pages
- Role-based access configurations

---

## Deployment Steps

### Step 1: Create New Supabase Project
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in project details:
   - **Name**: Vehicle Maintenance System
   - **Database Password**: (save this securely)
   - **Region**: Choose nearest to your users
4. Wait for project initialization (~2 minutes)

### Step 2: Run Master Schema
1. Open your new Supabase project
2. Go to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `MASTER_DATABASE_SCHEMA.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. Wait for completion (~30-60 seconds)

### Step 3: Verify Deployment
Run these verification queries in SQL Editor:

```sql
-- Check tables created (should return 22 rows)
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check storage bucket
SELECT * FROM storage.buckets WHERE id = 'driver-attendance';

-- Check page restrictions seeded (should return 14 rows)
SELECT COUNT(*) FROM page_restrictions;
```

### Step 4: Create Initial Admin User
Run this in SQL Editor to create your first admin account:

```sql
SELECT * FROM create_user_account(
  'admin@yourcompany.com',
  'ChangeThisPassword123!',
  'System Administrator',
  'administration',
  true  -- is_active
);
```

**⚠️ IMPORTANT**: Change this password immediately after first login!

### Step 5: Get API Credentials
1. Go to **Settings** → **API** in Supabase dashboard
2. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key

### Step 6: Update Application Environment
Update your `.env` file with the new credentials:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Step 7: Link Drivers to Users (Optional)
If you're migrating data, link existing drivers to user accounts:

```sql
-- Method 1: Manual linking via dashboard
-- Go to Table Editor → drivers → Edit each row → Set user_id

-- Method 2: SQL bulk update (if you have matching emails)
UPDATE drivers d
SET user_id = u.id
FROM users u
WHERE d.email_field = u.email  -- Replace with actual matching logic
AND d.user_id IS NULL;
```

---

## Testing the Deployment

### Test 1: Authentication
```sql
-- Verify user can authenticate
SELECT * FROM authenticate_user('admin@yourcompany.com', 'ChangeThisPassword123!');
```

### Test 2: Create Sample Vehicle
```sql
INSERT INTO vehicles (
  plate_number, 
  make, 
  model, 
  year, 
  vin, 
  ownership_type, 
  insurance_expiry, 
  registration_expiry
) VALUES (
  'TEST-001',
  'Toyota',
  'Hilux',
  2024,
  '1HGTEST0000000001',
  'Internal',
  '2025-12-31',
  '2025-12-31'
);
```

### Test 3: Create Sample Driver
```sql
-- First create a user account
SELECT * FROM create_user_account(
  'driver1@test.com',
  'TestPassword123',
  'John Doe',
  'driver',
  true
);

-- Get the user_id from the result above, then create driver record
INSERT INTO drivers (
  user_id,
  full_name,
  license_number,
  license_expiry
) VALUES (
  'paste-user-id-here',
  'John Doe',
  'DL12345678',
  '2026-12-31'
);
```

### Test 4: Query Views
```sql
-- Test active fleet view
SELECT * FROM v_active_fleet LIMIT 5;

-- Test expiring documents view
SELECT * FROM v_expiring_documents;

-- Test vehicle performance view
SELECT * FROM v_vehicle_performance LIMIT 5;
```

---

## Common Issues & Solutions

### Issue: "relation already exists"
**Solution**: You're running the script on a database that already has some tables. Use a fresh Supabase project or drop existing tables first.

### Issue: Storage bucket not created
**Solution**: Run this separately:
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'driver-attendance',
  'driver-attendance',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png']
);
```

### Issue: Functions not executing
**Solution**: Check if extensions are enabled:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### Issue: No page restrictions showing
**Solution**: Run the seed data insert manually (from lines 900-915 of master schema).

---

## Database Diagram

```
┌─────────────┐
│    users    │──┐
└─────────────┘  │
                 │
┌─────────────┐  │  ┌──────────────────┐
│   drivers   │←─┴──│driver_attendance │
└─────────────┘     └──────────────────┘
      │
      │  ┌──────────┐
      ├──│  trips   │──┐
      │  └──────────┘  │
      │                │  ┌────────────────┐
      │                └──│ trip_locations │
      │                   └────────────────┘
      │
      │  ┌───────────────────┐
      └──│fuel_transactions  │
         └───────────────────┘

┌─────────────┐
│  vehicles   │──┐
└─────────────┘  │
                 │  ┌──────────────┐
                 ├──│ maintenance  │
                 │  └──────────────┘
                 │
                 │  ┌───────────┐
                 ├──│   trips   │
                 │  └───────────┘
                 │
                 │  ┌──────────┐       ┌──────────────────┐
                 ├──│incidents │───────│insurance_claims  │
                 │  └──────────┘       └──────────────────┘
                 │
                 │  ┌────────────────────┐
                 └──│ disposal_requests  │──┐
                    └────────────────────┘  │
                                            │  ┌──────────────────┐
                                            ├──│disposal_auctions │
                                            │  └──────────────────┘
                                            │
                                            │  ┌──────────────────┐
                                            └──│disposal_transfers│
                                               └──────────────────┘
```

---

## Schema Version History

### Version 2.0 (February 4, 2026) - Current
- ✅ Added `user_id` column to drivers table
- ✅ Added `driver_attendance` table
- ✅ Added `trip_locations` table for GPS tracking
- ✅ Added `conduction_number` to vehicles
- ✅ Added storage bucket configuration
- ✅ Disabled RLS for custom authentication
- ✅ Added page restrictions seed data

### Version 1.0 (January 30, 2026)
- Initial schema with core modules
- All base tables and relationships
- Basic authentication functions

---

## Maintenance Tasks

### Daily
```sql
-- Update document status (run via cron or scheduled job)
SELECT update_document_status();
```

### Weekly
```sql
-- Review audit logs
SELECT * FROM audit_logs 
WHERE timestamp > NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC;
```

### Monthly
```sql
-- Generate fuel efficiency metrics
-- (Run for each vehicle or integrate into automated reports)
SELECT * FROM calculate_fuel_efficiency(
  'vehicle-uuid-here',
  DATE_TRUNC('month', CURRENT_DATE),
  CURRENT_DATE
);
```

---

## Security Checklist

- [ ] Changed default admin password
- [ ] Enabled Supabase database backups (Settings → Database → Backups)
- [ ] Configured allowed domains in Supabase Auth settings
- [ ] Set up SSL/HTTPS for your application
- [ ] Reviewed and configured page restrictions
- [ ] Set up audit log monitoring
- [ ] Documented database password in secure location
- [ ] Configured database connection pooling if needed

---

## Support & Documentation

- **Schema File**: `MASTER_DATABASE_SCHEMA.sql`
- **Migrations Folder**: `migrations/` (historical changes)
- **Frontend Integration**: See `src/services/` for API usage
- **Authentication Guide**: `AUTHENTICATION_GUIDE.md`
- **RBAC Guide**: `RBAC_QUICK_REFERENCE.md`

---

## Rollback Plan

If you need to start fresh:

1. **Drop all tables** (CAUTION: This deletes all data):
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

2. Re-run the master schema file

---

**Last Updated**: February 4, 2026  
**Schema Version**: 2.0  
**Database**: PostgreSQL 15+ (Supabase)
