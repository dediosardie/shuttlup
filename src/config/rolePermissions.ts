/**
 * TYPE DEFINITIONS FOR ROLE-BASED ACCESS CONTROL
 * 
 * This file contains ONLY type definitions for user roles and modules.
 * 
 * ⚠️ IMPORTANT: Actual access control is managed by PageRestrictionModule
 * and the page_restrictions database table.
 * 
 * The page_restrictions table is the SINGLE SOURCE OF TRUTH for access control.
 */

export type UserRole = 
  | 'fleet_manager' 
  | 'maintenance_team' 
  | 'driver' 
  | 'passenger'
  | 'administration' 
  | 'client_company_liaison';

export type Permission = 
  | 'vehicles:read'
  | 'vehicles:create'
  | 'vehicles:update'
  | 'vehicles:delete'
  | 'maintenance:read'
  | 'maintenance:create'
  | 'maintenance:update'
  | 'maintenance:delete'
  | 'drivers:read'
  | 'drivers:create'
  | 'drivers:update'
  | 'drivers:delete'
  | 'drivers:performance'
  | 'trips:read'
  | 'trips:create'
  | 'trips:update'
  | 'trips:delete'
  | 'attendance:read'
  | 'attendance:create'
  | 'attendance:update'
  | 'attendance:delete'
  | 'fuel:read'
  | 'fuel:create'
  | 'fuel:update'
  | 'fuel:delete'
  | 'incidents:read'
  | 'incidents:create'
  | 'incidents:update'
  | 'incidents:delete'
  | 'reports:read'
  | 'reports:create'
  | 'reports:configure'
  | 'leasing:read'
  | 'leasing:create'
  | 'leasing:update'
  | 'leasing:delete'
  | 'disposal:read'
  | 'disposal:create'
  | 'disposal:update'
  | 'disposal:delete'
  | 'compliance:read'
  | 'compliance:create'
  | 'compliance:update'
  | 'compliance:delete'
  | 'analytics:read'
  | 'system:configure'
  | 'users:read'
  | 'users:manage'
  | 'passengers:read'
  | 'passengers:create'
  | 'passengers:update';

export type Module = 
  | 'vehicles'
  | 'maintenance'
  | 'drivers'
  | 'trips'
  | 'fuel'
  | 'incidents'
  | 'reports'
  | 'compliance'
  | 'disposal'
  | 'analytics'
  | 'attendance'
  | 'users';

/**
 * Validate if a user role is valid
 */
export function isValidRole(role: string): role is UserRole {
  return ['fleet_manager', 'maintenance_team', 'driver', 'passenger', 'administration', 'client_company_liaison'].includes(role);
}
