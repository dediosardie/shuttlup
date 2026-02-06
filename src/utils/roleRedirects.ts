/**
 * ROLE-BASED REDIRECT UTILITIES
 * 
 * Manages automatic redirects based on user roles.
 * Ensures users land on their appropriate default pages.
 */

import { UserRole } from '../config/rolePermissions';
import { pageRestrictionService } from '../services/pageRestrictionService';

/**
 * Default landing pages for each role
 */
export const ROLE_DEFAULT_PAGES: Record<UserRole, string> = {
  driver: '/attendance',
  administration: '/reports',
  maintenance_team: '/vehicles',
  fleet_manager: '/reports',
  client_company_liaison: '/reports',
  passenger: '/trips',
};

/**
 * Get the default page for a given role
 */
export function getRoleDefaultPage(role: UserRole | null | undefined): string {
  if (!role) {
    return '/login';
  }
  
  return ROLE_DEFAULT_PAGES[role] || '/reports';
}

/**
 * Check if a user with a given role can access a specific path
 * Returns the redirect path if access is denied, null if access is allowed
 * This function dynamically checks against the page_restrictions table
 */
export async function checkRoleAccess(
  role: UserRole | null | undefined,
  currentPath: string
): Promise<string | null> {
  if (!role) {
    return '/login';
  }

  try {
    // Get accessible pages from database for this role
    const accessiblePages = await pageRestrictionService.getAccessiblePagesByRole(role);
    const allowedPaths = accessiblePages.map(page => page.page_path);
    
    console.log(`🔍 [checkRoleAccess] Role: ${role}, Current path: ${currentPath}`);
    console.log(`🔍 [checkRoleAccess] Allowed paths:`, allowedPaths);
    
    // Check if current path is allowed
    const isAllowed = allowedPaths.some(path => currentPath.startsWith(path));
    
    if (!isAllowed) {
      console.warn(`⚠️ [checkRoleAccess] Access denied to ${currentPath} for role ${role}`);
      // Redirect to role's default page
      return getRoleDefaultPage(role);
    }
    
    console.log(`✓ [checkRoleAccess] Access granted to ${currentPath} for role ${role}`);
    return null; // Access allowed
  } catch (error) {
    console.error('[checkRoleAccess] Error checking access:', error);
    // On error, redirect to default page as a safety measure
    return getRoleDefaultPage(role);
  }
}

/**
 * Check if a path requires authentication
 */
export function isProtectedPath(path: string): boolean {
  const publicPaths = ['/login', '/signup', '/forgot-password'];
  return !publicPaths.some(publicPath => path.startsWith(publicPath));
}
