/**
 * ROLE-BASED REDIRECT UTILITIES
 * 
 * Manages automatic redirects based on user roles.
 * Ensures users land on their appropriate default pages.
 */

import { UserRole } from '../config/rolePermissions';

/**
 * Default landing pages for each role
 */
export const ROLE_DEFAULT_PAGES: Record<UserRole, string> = {
  driver: '/trips',
  administration: '/reports',
  maintenance_team: '/vehicles',
  fleet_manager: '/reports',
  client_company_liaison: '/reports',
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
 */
export function checkRoleAccess(
  role: UserRole | null | undefined,
  currentPath: string
): string | null {
  if (!role) {
    return '/login';
  }

  // Define which paths each role can access
  const roleAccessMap: Record<UserRole, string[]> = {
    driver: ['/trips', '/vehicles', '/fuel', '/incidents', '/attendance'],
    administration: ['/reports', '/vehicles', '/drivers', '/maintenance', '/trips', '/fuel', '/incidents', '/compliance', '/disposal', '/analytics','/attendance', '/users', '/page-restrictions', '/live-tracking'],
    maintenance_team: ['/vehicles', '/maintenance', '/incidents', '/disposal', '/reports'],
    fleet_manager: ['/reports', '/vehicles', '/drivers', '/maintenance', '/trips', '/fuel', '/incidents', '/compliance', '/disposal', '/analytics', '/live-tracking','/attendance'],
    client_company_liaison: ['/reports', '/vehicles', '/compliance'],
  };

  const allowedPaths = roleAccessMap[role] || [];
  
  // Check if current path is allowed
  const isAllowed = allowedPaths.some(path => currentPath.startsWith(path));
  
  if (!isAllowed) {
    // Redirect to role's default page
    return getRoleDefaultPage(role);
  }
  
  return null; // Access allowed
}

/**
 * Check if a path requires authentication
 */
export function isProtectedPath(path: string): boolean {
  const publicPaths = ['/login', '/signup', '/forgot-password'];
  return !publicPaths.some(publicPath => path.startsWith(publicPath));
}
