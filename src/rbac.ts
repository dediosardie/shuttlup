/**
 * RBAC TYPE DEFINITIONS - Re-exports for Convenience
 * 
 * ⚠️ IMPORTANT: Access control is managed by PageRestrictionModule
 * and the page_restrictions database table.
 */

// Role definitions and types
export type {
  UserRole,
  Permission,
  Module,
} from './config/rolePermissions';

export {
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
