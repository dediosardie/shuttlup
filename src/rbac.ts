/**
 * RBAC UTILITIES - Re-exports for Convenience
 * 
 * This file provides convenient re-exports of all RBAC-related
 * utilities, hooks, and components for easier imports.
 */

// Role definitions and types
export type {
  UserRole,
  Permission,
  Module,
} from './config/rolePermissions';

export {
  ROLE_PERMISSIONS,
  ROLE_MODULE_ACCESS,
  ROLE_DESCRIPTIONS,
  hasPermission,
  hasModuleAccess,
  getRolePermissions,
  getRoleModules,
  isValidRole,
} from './config/rolePermissions';

// Role access hook
export { useRoleAccess } from './hooks/useRoleAccess';
export type { UserRoleData } from './hooks/useRoleAccess';

// Protected route components
export {
  ProtectedRoute,
  ConditionalRender,
  RoleBadge,
} from './components/ProtectedRoute';

// Auth service with role support
export { authService } from './services/authService';
export type {
  AuthResponse,
  AuthState,
} from './services/authService';

/**
 * Example Usage:
 * 
 * // Import everything you need from one place
 * import {
 *   useRoleAccess,
 *   ProtectedRoute,
 *   ConditionalRender,
 *   RoleBadge,
 *   type UserRole,
 *   type Permission,
 * } from './rbac';
 * 
 * // Use in your component
 * function MyComponent() {
 *   const { hasPermission, hasRole } = useRoleAccess();
 *   
 *   return (
 *     <div>
 *       <RoleBadge />
 *       
 *       <ProtectedRoute requiredModule="vehicles">
 *         <VehicleList />
 *       </ProtectedRoute>
 *       
 *       <ConditionalRender requiredPermission="vehicles:create">
 *         <button>Add Vehicle</button>
 *       </ConditionalRender>
 *       
 *       {hasPermission('vehicles:delete') && (
 *         <button>Delete</button>
 *       )}
 *     </div>
 *   );
 * }
 */
