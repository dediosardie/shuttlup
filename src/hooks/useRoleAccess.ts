/**
 * ROLE-BASED ACCESS CONTROL HOOK
 * 
 * Provides utilities for checking user permissions and module access
 * based on their assigned role.
 */

import { useState, useEffect } from 'react';
import { 
  UserRole, 
  Permission, 
  Module,
  hasPermission as checkPermission,
  hasModuleAccess as checkModuleAccess,
  getRolePermissions,
  getRoleModules,
  isValidRole,
  ROLE_DESCRIPTIONS
} from '../config/rolePermissions';

export interface UserRoleData {
  userId: string;
  email: string;
  role: UserRole;
  clientId?: string; // For client-scoped roles
}

export function useRoleAccess() {
  const [userRole, setUserRole] = useState<UserRoleData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function initRole() {
      try {
        // Get user from localStorage (custom auth)
        const userId = localStorage.getItem('user_id');
        const userEmail = localStorage.getItem('user_email');
        const roleStr = localStorage.getItem('user_role');

        console.log('useRoleAccess - Reading from localStorage:', { userId, userEmail, roleStr });
        console.log('Valid roles are:', ['fleet_manager', 'maintenance_team', 'driver', 'administration', 'client_company_liaison']);

        if (!mounted) return;

        if (!userId || !userEmail || !roleStr) {
          console.error('Missing localStorage data:', { userId: !!userId, userEmail: !!userEmail, roleStr: !!roleStr });
          setUserRole(null);
          setLoading(false);
          return;
        }

        if (isValidRole(roleStr)) {
          console.log('✓ Role is valid:', roleStr);
          setUserRole({
            userId,
            email: userEmail,
            role: roleStr as UserRole,
          });
        } else {
          console.error('✗ Invalid role from localStorage:', roleStr);
          console.error('This role is not in the allowed list. User needs role updated in database.');
          setUserRole(null);
        }
        setLoading(false);
      } catch (error) {
        if (mounted) {
          console.error('Error loading user role:', error);
          setUserRole(null);
          setLoading(false);
        }
      }
    }

    initRole();

    // Listen for storage events (for multi-tab support)
    const handleStorageChange = () => {
      initRole();
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      mounted = false;
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  async function loadUserRole() {
    // Manual refresh function - kept for backward compatibility
    try {
      const userId = localStorage.getItem('user_id');
      const userEmail = localStorage.getItem('user_email');
      const roleStr = localStorage.getItem('user_role');

      if (!userId || !userEmail || !roleStr) {
        setUserRole(null);
        return;
      }

      if (isValidRole(roleStr)) {
        setUserRole({
          userId,
          email: userEmail,
          role: roleStr as UserRole,
        });
      } else {
        console.error('Invalid role:', roleStr);
        setUserRole(null);
      }
    } catch (error) {
      console.error('Error refreshing user role:', error);
    }
  }

  /**
   * Check if current user has a specific permission
   */
  function hasPermission(permission: Permission): boolean {
    if (!userRole) return false;
    return checkPermission(userRole.role, permission);
  }

  /**
   * Check if current user has access to a module
   */
  function hasModuleAccess(module: Module): boolean {
    if (!userRole) return false;
    return checkModuleAccess(userRole.role, module);
  }

  /**
   * Get all permissions for current user
   */
  function getPermissions(): Permission[] {
    if (!userRole) return [];
    return getRolePermissions(userRole.role);
  }

  /**
   * Get all accessible modules for current user
   */
  function getModules(): Module[] {
    if (!userRole) return [];
    return getRoleModules(userRole.role);
  }

  /**
   * Get role description and responsibilities
   */
  function getRoleDescription() {
    if (!userRole) return null;
    return ROLE_DESCRIPTIONS[userRole.role];
  }

  /**
   * Check if user is authenticated
   */
  function isAuthenticated(): boolean {
    return userRole !== null;
  }

  /**
   * Check if user has a specific role
   */
  function hasRole(role: UserRole): boolean {
    return userRole?.role === role;
  }

  /**
   * Check if user has any of the specified roles
   */
  function hasAnyRole(roles: UserRole[]): boolean {
    if (!userRole) return false;
    return roles.includes(userRole.role);
  }

  return {
    userRole,
    loading,
    hasPermission,
    hasModuleAccess,
    getPermissions,
    getModules,
    getRoleDescription,
    isAuthenticated,
    hasRole,
    hasAnyRole,
    refresh: loadUserRole,
  };
}
