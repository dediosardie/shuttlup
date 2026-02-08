/**
 * ROLE-BASED ACCESS CONTROL HOOK
 * 
 * Provides utilities for checking user permissions and module access
 * based on their assigned role.
 */

import { useState, useEffect } from 'react';
import { 
  UserRole, 
  isValidRole
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

        // console.log('useRoleAccess - Reading from localStorage:', { userId, userEmail, roleStr });
        // console.log('Valid roles are:', ['fleet_manager', 'maintenance_team', 'driver', 'administration', 'client_company_liaison']);

        if (!mounted) return;

        if (!userId || !userEmail || !roleStr) {
          // Only log as warning if partial data exists (indicates corruption)
          if (userId || userEmail || roleStr) {
            console.warn('Incomplete localStorage data:', { userId: !!userId, userEmail: !!userEmail, roleStr: !!roleStr });
          }
          // Silent when no data exists (user not logged in)
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
   * Get role description (placeholder - for display purposes only)
   */
  function getRoleDescription() {
    if (!userRole) return null;
    
    // Simplified role info for display
    const roleDescriptions: Record<UserRole, { title: string; description: string; responsibilities: string[]; restrictions: string[] }> = {
      fleet_manager: {
        title: 'Fleet Manager',
        description: 'Oversee entire fleet operations',
        responsibilities: ['Manage fleet operations', 'Monitor vehicles', 'Ensure compliance'],
        restrictions: ['Access controlled by page restrictions'],
      },
      maintenance_team: {
        title: 'Maintenance Team',
        description: 'Perform vehicle maintenance',
        responsibilities: ['Execute maintenance tasks', 'Track repairs', 'Manage parts'],
        restrictions: ['Access controlled by page restrictions'],
      },
      driver: {
        title: 'Driver',
        description: 'Operate vehicles and log activities',
        responsibilities: ['Drive safely', 'Log trips', 'Report incidents'],
        restrictions: ['Access controlled by page restrictions'],
      },
      passenger: {
        title: 'Passenger',
        description: 'View transportation services',
        responsibilities: ['View trip information', 'Access passenger features'],
        restrictions: ['Access controlled by page restrictions'],
      },
      administration: {
        title: 'Administration',
        description: 'Manage system operations',
        responsibilities: ['System configuration', 'User management', 'Generate reports'],
        restrictions: ['Access controlled by page restrictions'],
      },
      client_company_liaison: {
        title: 'Client Liaison',
        description: 'Coordinate with clients',
        responsibilities: ['Manage client relations', 'Coordinate services'],
        restrictions: ['Access controlled by page restrictions'],
      },
    };
    
    return roleDescriptions[userRole.role];
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
    isAuthenticated: !!userRole,
    hasRole,
    hasAnyRole,
    getRoleDescription,
    refreshRole: loadUserRole,
  };
}
