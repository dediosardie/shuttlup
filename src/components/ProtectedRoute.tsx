/**
 * PROTECTED ROUTE COMPONENT
 * 
 * Enforces role-based access control at the route level.
 * Renders children only if user has required permissions.
 * Uses cached page restrictions from usePageAccess hook for instant checks.
 */

import React from 'react';
import { useRoleAccess } from '../hooks/useRoleAccess';
import { usePageAccess } from '../hooks/usePageAccess';
import { Permission, Module, UserRole } from '../config/rolePermissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
  requiredModule?: Module;
  requiredRole?: UserRole;
  requiredRoles?: UserRole[];
  pagePath?: string; // Page path to check against cached page restrictions
  fallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  // requiredPermission, // DEPRECATED - use PageRestrictionModule
  // requiredModule, // DEPRECATED - use PageRestrictionModule
  requiredRole,
  requiredRoles,
  pagePath,
  fallback = <AccessDenied />,
}: ProtectedRouteProps) {
  const { userRole, loading, hasRole, hasAnyRole } = useRoleAccess();
  const { hasPageAccess: checkPageAccess, loading: pageAccessLoading } = usePageAccess();

  // Show loading state only during initial load
  if (loading || pageAccessLoading) {
    return <LoadingScreen />;
  }

  // Not authenticated
  if (!userRole) {
    return fallback;
  }

  // PRIMARY: Check page-level restrictions from database (authoritative)
  if (pagePath && !checkPageAccess(pagePath)) {
    console.warn(`🔒 Access denied to page: ${pagePath} (page_restrictions)`);
    return fallback;
  }

  // Check specific role
  if (requiredRole && !hasRole(requiredRole)) {
    return fallback;
  }

  // Check multiple roles
  if (requiredRoles && !hasAnyRole(requiredRoles)) {
    return fallback;
  }

  // User has access
  return <>{children}</>;
}

/**
 * CONDITIONAL RENDER COMPONENT
 * 
 * Shows/hides UI elements based on permissions.
 * Use this to hide buttons, sections, or any UI elements.
 */
interface ConditionalRenderProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
  requiredModule?: Module;
  requiredRole?: UserRole;
  requiredRoles?: UserRole[];
  fallback?: React.ReactNode;
}

export function ConditionalRender({
  children,
  // requiredPermission, // DEPRECATED - use PageRestrictionModule
  // requiredModule, // DEPRECATED - use PageRestrictionModule
  requiredRole,
  requiredRoles,
  fallback = null,
}: ConditionalRenderProps) {
  const { hasRole, hasAnyRole } = useRoleAccess();

  // Note: requiredPermission and requiredModule are deprecated
  // Access control is now managed through PageRestrictionModule

  // Check specific role
  if (requiredRole && !hasRole(requiredRole)) {
    return <>{fallback}</>;
  }

  // Check multiple roles
  if (requiredRoles && !hasAnyRole(requiredRoles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * ACCESS DENIED SCREEN
 * This component is shown when access is denied, but App.tsx handles automatic redirects
 */
function AccessDenied() {
  const { getRoleDescription } = useRoleAccess();
  const roleInfo = getRoleDescription();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <svg
            className="mx-auto h-16 w-16 text-red-500 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            You do not have permission to access this page or feature.
          </p>

          {roleInfo && (
            <div className="bg-gray-50 rounded-lg p-4 text-left mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">Your Role: {roleInfo.title}</h3>
              <p className="text-sm text-gray-600 mb-3">{roleInfo.description}</p>
              
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Your Responsibilities:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {roleInfo.responsibilities.slice(0, 3).map((resp: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Restrictions:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {roleInfo.restrictions.slice(0, 2).map((restriction: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="text-red-500 mr-2">✗</span>
                      <span>{restriction}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <p className="text-sm text-gray-500 mb-4">
            You will be automatically redirected to your default page.
          </p>

          <button
            onClick={() => window.history.back()}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * LOADING SCREEN
 */
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-black-400 border-t-transparent"></div>
        <p className="mt-4 text-gray-300">Verifying permissions...</p>
      </div>
    </div>
  );
}

/**
 * ROLE BADGE COMPONENT
 * 
 * Displays user's current role as a badge
 */
export function RoleBadge() {
  const { userRole, getRoleDescription } = useRoleAccess();

  if (!userRole) return null;

  const roleInfo = getRoleDescription();

  const roleColors: Record<UserRole, string> = {
    fleet_manager: 'bg-purple-100 text-purple-800',
    maintenance_team: 'bg-orange-100 text-orange-800',
    driver: 'bg-blue-100 text-blue-800',
    passenger: 'bg-cyan-100 text-cyan-800',
    administration: 'bg-red-100 text-red-800',
    client_company_liaison: 'bg-green-100 text-green-800',
  };

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${roleColors[userRole.role]}`}>
      <svg
        className="w-4 h-4 mr-2"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
          clipRule="evenodd"
        />
      </svg>
      {roleInfo?.title || userRole.role}
    </div>
  );
}
