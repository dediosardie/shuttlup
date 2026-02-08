import { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Vehicle } from './types';
import { notificationService, Notification } from './services/notificationService';
import VehicleModule from './components/VehicleModule';
import DriverModule from './components/DriverModule';
import MaintenanceModule from './components/MaintenanceModule';
import TripModule from './components/TripModule';
import FuelTrackingModule from './components/FuelTrackingModule';
import IncidentInsuranceModule from './components/IncidentInsuranceModule';
import ComplianceDocumentModule from './components/ComplianceDocumentModule';
import VehicleDisposalModule from './components/VehicleDisposalModule';
import ReportingAnalyticsDashboard from './components/ReportingAnalyticsDashboard';
import UserModule from './components/UserModule';
import PageRestrictionModule from './components/PageRestrictionModule';
import LiveDriverTrackingMap from './components/LiveDriverTrackingMap';
import DriverAttendancePage from './components/DriverAttendancePage';
import TripRequestPage from './components/TripRequestPage';
import BookingRequestPage from './components/BookingRequestPage';
import RouteModule from './components/RouteModule';
import RatesModule from './components/RatesModule';
import FleetDetailsModule from './components/FleetDetailsModule';
import AuditLogPage from './components/AuditLogPage';
import LoginPage from './components/LoginPage';
import ChangePasswordModal from './components/ChangePasswordModal';
import { ProtectedRoute, RoleBadge } from './components/ProtectedRoute';
import { useRoleAccess } from './hooks/useRoleAccess';
import { usePageAccess } from './hooks/usePageAccess';
import { authService } from './services/authService';
import { Module } from './config/rolePermissions';
import { getRoleDefaultPage, checkRoleAccess } from './utils/roleRedirects';

type ActiveModule = 'vehicles' | 'drivers' | 'maintenance' | 'trips' | 'fuel' | 'incidents' | 'compliance' | 'disposal' | 'reporting' | 'users' | 'page_restrictions' | 'live_tracking' | 'attendance' | 'trip_request' | 'booking_request' | 'routes' | 'rates' | 'fleet_details' | 'audit_logs';

function App() {
  const [user, setUser] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeModule, setActiveModule] = useState<ActiveModule>('trip_request');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Role-based access control
  const { userRole, loading: roleLoading } = useRoleAccess();
  const { hasPageAccess, loading: pageAccessLoading } = usePageAccess();

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      // Check if there's a valid session
      const { user: sessionUser } = await authService.getSession();
      setUser(sessionUser);
      setAuthLoading(false);
    };

    checkAuth();

    // Handle session expiration
    const handleSessionExpired = async () => {
      console.log('Session expired event received');
      await authService.clearSession();
      setUser(null);
      alert('Your session has expired. Please log in again.');
    };

    // Handle session replacement (logged in from another device)
    const handleSessionReplaced = async () => {
      console.log('Session replaced event received');
      await authService.clearSession();
      setUser(null);
      alert('Your account has been logged in from another device. You have been logged out.');
    };

    // Add event listeners
    window.addEventListener('session-expired', handleSessionExpired as any);
    window.addEventListener('session-replaced', handleSessionReplaced as any);

    // Cleanup
    return () => {
      window.removeEventListener('session-expired', handleSessionExpired as any);
      window.removeEventListener('session-replaced', handleSessionReplaced as any);
    };
  }, []);

  useEffect(() => {
    const handleVehiclesUpdate = (event: CustomEvent<Vehicle[]>) => {
      setVehicles(event.detail);
      console.log('Vehicles updated:', event.detail.length); // Using vehicles state for sync
    };

    window.addEventListener('vehiclesUpdated' as any, handleVehiclesUpdate as any);
    return () => {
      window.removeEventListener('vehiclesUpdated' as any, handleVehiclesUpdate as any);
    };
  }, []);

  // Subscribe to notification service
  useEffect(() => {
    const unsubscribe = notificationService.subscribe((notification) => {
      setNotifications(prev => [notification, ...prev]);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Role-based redirect on login
  useEffect(() => {
    if (!authLoading && !roleLoading && user && userRole) {
      // Get the appropriate module for the user's role
      const defaultPage = getRoleDefaultPage(userRole.role);
      
      // Map paths to activeModule values
      const pathToModule: Record<string, ActiveModule> = {
        '/reports': 'reporting',
        '/trips': 'trips',
        '/trip-request': 'trip_request',
        '/booking-request': 'booking_request',
        '/routes': 'routes',
        '/rates': 'rates',
        '/fleet-details': 'fleet_details',
        '/vehicles': 'vehicles',
        '/live-tracking': 'live_tracking',
        '/audit-logs': 'audit_logs',
      };

      const targetModule = pathToModule[defaultPage];
      if (targetModule && activeModule !== targetModule) {
        setActiveModule(targetModule);
      }
    }
  }, [authLoading, roleLoading, user, userRole]);

  // Check and enforce role-based access for current active module
  useEffect(() => {
    async function checkAccess() {
      // Only check access if user is logged in and all data is loaded
      if (!authLoading && !roleLoading && !pageAccessLoading && user && userRole) {
        // Map activeModule to paths
        const moduleToPat: Record<ActiveModule, string> = {
          'reporting': '/reports',
          'vehicles': '/vehicles',
          'drivers': '/drivers',
          'trips': '/trips',
          'trip_request': '/trip-request',
          'booking_request': '/booking-request',
          'routes': '/routes',
          'rates': '/rates',
          'fleet_details': '/fleet-details',
          'fuel': '/fuel',
          'incidents': '/incidents',
          'compliance': '/compliance',
          'disposal': '/disposal',
          'maintenance': '/maintenance',
          'users': '/users',
          'page_restrictions': '/page-restrictions',
          'live_tracking': '/live-tracking',
          'attendance': '/attendance',
          'audit_logs': '/audit-logs',
        };

        const currentPath = moduleToPat[activeModule];
        const redirectPath = await checkRoleAccess(userRole.role, currentPath);

        if (redirectPath && redirectPath !== currentPath) {
          // Find the module that corresponds to the redirect path
          const redirectModule = Object.entries(moduleToPat).find(
            ([, path]) => path === redirectPath
          )?.[0] as ActiveModule | undefined;

          if (redirectModule && redirectModule !== activeModule) {
            setActiveModule(redirectModule);
            
            // Only show notification if user attempted to access a page (not on initial load)
            // Skip notification if this is the first check after login
            if (sessionStorage.getItem('login_completed')) {
              notificationService.warning(
                'Access Denied',
                `You don't have access to that page. Redirected to your default page.`
              );
            }
          }
        }
      }
    }

    checkAccess();
  }, [activeModule, authLoading, roleLoading, pageAccessLoading, user, userRole]);

  const handleSignOut = async () => {
    await authService.signOut();
    setUser(null);
    setShowUserMenu(false);
  };

  const handleLoginSuccess = async () => {
    // Fetch the current user session after successful login
    console.log('handleLoginSuccess called');
    const { user: sessionUser, error } = await authService.getSession();
    console.log('Session result:', { user: sessionUser, error });
    setUser(sessionUser);
    setAuthLoading(false);
    
    // Mark login as completed to enable access denied notifications
    sessionStorage.setItem('login_completed', 'true');
    
    // Trigger storage event manually to update useRoleAccess hook
    // (storage events don't fire in the same tab that made the change)
    window.dispatchEvent(new Event('storage'));
  };

  const handleDismissNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const handleMarkAsRead = (id: number) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, unread: false } : n
    ));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  // Show loading spinner while checking auth
  if (authLoading || roleLoading || pageAccessLoading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          <p className="text-text-secondary mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Show access denied if user has no role assigned
  if (!userRole) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-bg-secondary rounded-lg shadow-xl border border-border-muted p-8">
          <div className="text-center">
            <svg
              className="mx-auto h-16 w-16 text-accent mb-4"
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
            <h2 className="text-2xl font-semibold text-text-primary mb-2">No Role Assigned</h2>
            <p className="text-text-secondary mb-6">
              Your account does not have a role assigned. Please contact your administrator.
            </p>
            <button
              onClick={handleSignOut}
              className="w-full bg-accent text-black font-medium px-4 py-2.5 rounded-lg hover:bg-accent-hover transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }


  const navItems = [
    //     { id: 'reporting' as ActiveModule, module: 'analytics' as Module, path: '/reports', label: 'Dashboard', icon: (
    //   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    //     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    //   </svg>
    // )},
    // { id: 'vehicles' as ActiveModule, module: 'vehicles' as Module, path: '/vehicles', label: 'Vehicles', icon: (
    //   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    //     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    //   </svg>
    // )},

    // { id: 'drivers' as ActiveModule, module: 'drivers' as Module, path: '/drivers', label: 'Drivers', icon: (
    //   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    //     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    //   </svg>
    // )},
    // { id: 'trips' as ActiveModule, module: 'trips' as Module, path: '/trips', label: 'Trips', icon: (
    //   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    //     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    //   </svg>
    // )},
    { id: 'trip_request' as ActiveModule, module: 'trips' as Module, path: '/trip-request', label: 'Trip Request', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    )},
    { id: 'booking_request' as ActiveModule, module: 'trips' as Module, path: '/booking-request', label: 'Booking Request', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )},
    // { id: 'live_tracking' as ActiveModule, module: 'trips' as Module, path: '/live-tracking', label: 'Live Tracking', icon: (
    //   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    //     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    //     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    //   </svg>
    // )},
    { id: 'fleet_details' as ActiveModule, module: 'vehicles' as Module, path: '/fleet-details', label: 'Fleet Details', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    )},
    { id: 'rates' as ActiveModule, module: 'users' as Module, path: '/rates', label: 'Rates', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
    { id: 'users' as ActiveModule, module: 'users' as Module, path: '/users', label: 'Users', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )},
    { id: 'page_restrictions' as ActiveModule, module: 'users' as Module, path: '/page-restrictions', label: 'Page Access', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    )},
    { id: 'audit_logs' as ActiveModule, module: 'users' as Module, path: '/audit-logs', label: 'Audit Logs', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )},

    // { id: 'maintenance' as ActiveModule, module: 'maintenance' as Module, path: '/maintenance', label: 'Maintenance', icon: (
    //   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    //     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    //     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    //   </svg>
    // )},
    // { id: 'fuel' as ActiveModule, module: 'fuel' as Module, path: '/fuel', label: 'Fuel Tracking', icon: (
    //   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    //     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    //   </svg>
    // )},
    { id: 'incidents' as ActiveModule, module: 'incidents' as Module, path: '/incidents', label: 'Incidents', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )},
    { id: 'routes' as ActiveModule, module: 'maintenance' as Module, path: '/routes', label: 'Routes', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    )},
    // { id: 'compliance' as ActiveModule, module: 'compliance' as Module, path: '/compliance', label: 'Compliance', icon: (
    //   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    //     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    //   </svg>
    // )},
    // { id: 'disposal' as ActiveModule, module: 'disposal' as Module, path: '/disposal', label: 'Disposal', icon: (
    //   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    //     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    //   </svg>
    // )},
    { id: 'attendance' as ActiveModule, module: 'drivers' as Module, path: '/attendance', label: 'Attendance', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    )},
  ];

  // Filter nav items based on page_restrictions (PRIMARY) from database
  // page_restrictions table is the ONLY authoritative source for access control
  const accessibleNavItems = navItems.filter(item => {
    // ONLY CHECK: Database page restrictions (authoritative and exclusive)
    const pageAllowed = hasPageAccess(item.path);
    
    console.log(`🔍 [Nav Filter] Checking ${item.label} (${item.path}): ${pageAllowed ? '✅ ALLOWED' : '❌ DENIED'}`);
    
    return pageAllowed; // Database is the single source of truth
  });

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-bg-secondary border-b border-border-muted shadow-lg">
        <div className="flex items-center justify-between px-4 lg:px-6 h-16">
          {/* Left: Hamburger + Logo */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-bg-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
              className="hidden lg:block p-2 rounded-lg hover:bg-bg-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label="Toggle sidebar"
            >
              <svg className="w-5 h-5 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-text-primary hidden sm:block">
              {activeModule === 'vehicles' && 'Vehicle Management'}
              {activeModule === 'drivers' && 'Driver Management'}
              {activeModule === 'maintenance' && 'Maintenance'}
              {activeModule === 'trips' && 'Trip Scheduling'}
              {activeModule === 'trip_request' && 'Trip Request'}
              {activeModule === 'booking_request' && 'Booking Request'}
              {activeModule === 'routes' && 'Routes'}
              {activeModule === 'rates' && 'Rates'}
              {activeModule === 'fleet_details' && 'Fleet Details'}
              {activeModule === 'live_tracking' && 'Live Driver Tracking'}
              {activeModule === 'fuel' && 'Fuel Tracking'}
              {activeModule === 'incidents' && 'Incidents & Insurance'}
              {activeModule === 'compliance' && 'Compliance Documents'}
              {activeModule === 'disposal' && 'Vehicle Disposal'}
              {activeModule === 'reporting' && 'Reporting & Analytics'}
              {activeModule === 'users' && 'User Management'}
              {activeModule === 'page_restrictions' && 'Page Restrictions'}
              {activeModule === 'attendance' && 'Driver Attendance'}
              <span className="hidden">{vehicles.length}</span>
            </h1>
          </div>

          {/* Center: Search */}
           <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <input
                type="search"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
              <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div> 

          {/* Right: Notifications + Profile */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg hover:bg-bg-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <svg className="w-5 h-5 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-accent text-black text-xs rounded-full flex items-center justify-center font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowNotifications(false)}
                  />
                  <div className="absolute right-0 top-12 w-96 bg-bg-elevated rounded-lg shadow-2xl border border-border-muted z-50 max-h-[32rem] flex flex-col">
                    <div className="px-4 py-3 border-b border-border-muted flex items-center justify-between sticky top-0 bg-bg-elevated">
                      <div>
                        <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
                        {unreadCount > 0 && (
                          <p className="text-xs text-text-muted">{unreadCount} unread</p>
                        )}
                      </div>
                      {notifications.length > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-xs text-accent hover:text-accent-hover font-medium transition-colors"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="overflow-y-auto flex-1">
                      {notifications.length === 0 ? (
                        <div className="py-12 text-center">
                          <svg className="w-12 h-12 text-text-muted mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                          <p className="text-sm text-text-secondary">No notifications</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-border-muted">
                          {notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`p-4 hover:bg-bg-secondary transition-colors ${notification.unread ? 'bg-accent-soft' : ''}`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-1">
                                  {notification.type === 'success' && (
                                    <div className="w-8 h-8 bg-accent-soft rounded-full flex items-center justify-center">
                                      <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                  )}
                                  {notification.type === 'error' && (
                                    <div className="w-8 h-8 bg-accent-soft rounded-full flex items-center justify-center">
                                      <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </div>
                                  )}
                                  {notification.type === 'warning' && (
                                    <div className="w-8 h-8 bg-accent-soft rounded-full flex items-center justify-center">
                                      <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                      </svg>
                                    </div>
                                  )}
                                  {notification.type === 'info' && (
                                    <div className="w-8 h-8 bg-accent-soft rounded-full flex items-center justify-center">
                                      <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    </div>
                                  )}
                                  {notification.unread && !notification.type && (
                                    <div className="w-2 h-2 bg-accent rounded-full"></div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-text-primary">{notification.title}</p>
                                      <p className="text-sm text-text-secondary mt-1">{notification.message}</p>
                                      <p className="text-xs text-text-muted mt-2">{notification.time}</p>
                                    </div>
                                    <button
                                      onClick={() => handleDismissNotification(notification.id)}
                                      className="flex-shrink-0 p-1 rounded hover:bg-bg-elevated transition-colors"
                                      title="Dismiss"
                                    >
                                      <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                  {notification.unread && (
                                    <button
                                      onClick={() => handleMarkAsRead(notification.id)}
                                      className="text-xs text-accent hover:text-accent-hover font-medium mt-2 transition-colors"
                                    >
                                      Mark as read
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <div className="px-4 py-3 border-t border-border-muted bg-bg-secondary">
                        <button className="text-sm text-accent hover:text-accent-hover font-medium w-full text-center transition-colors">
                          View all notifications
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="relative flex items-center gap-2 ml-2 pl-2 border-l border-border-muted">
              <div className="hidden sm:block text-right mr-2">
                <div className="flex items-center justify-end gap-2 mb-1">
                  <div className="text-sm font-medium text-text-primary">{user.email?.split('@')[0] || 'User'}</div>
                  <RoleBadge />
                </div>
                <div className="text-xs text-text-muted">{user.email}</div>
              </div>
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-8 h-8 rounded-full bg-gradient-to-r from-accent to-accent-hover text-black flex items-center justify-center text-sm font-bold hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-secondary"
              >
                {user.email?.[0].toUpperCase() || 'U'}
              </button>
              
              {/* User Dropdown Menu */}
              {showUserMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 top-12 w-56 bg-bg-elevated rounded-lg shadow-2xl border border-border-muted py-2 z-50">
                    <div className="px-4 py-2 border-b border-border-muted">
                      <p className="text-sm font-medium text-text-primary">{user.email}</p>
                      <p className="text-xs text-text-muted">Signed in</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowChangePassword(true);
                        setShowUserMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary flex items-center gap-2 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      Change Password
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 text-left text-sm text-accent hover:bg-accent-soft flex items-center gap-2 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-70 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-50
            bg-bg-secondary border-r border-border-muted shadow-2xl lg:shadow-none
            transition-all duration-300 ease-in-out
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            ${isSidebarExpanded ? 'w-64' : 'lg:w-20 w-64'}
            flex flex-col
          `}
        >
          {/* Mobile Close Button */}
          <div className="h-16 flex items-center justify-end px-4 border-b border-border-muted lg:hidden">
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 rounded-lg hover:bg-bg-elevated transition-colors"
            >
              <svg className="w-5 h-5 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
            {/* Main Pages Section */}
            <div>
              {isSidebarExpanded && (
                <div className="px-3 mb-2">
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Main Pages</h3>
                </div>
              )}
              <div className="space-y-1">
                {accessibleNavItems
                  .filter(item => ['reporting', 'vehicles', 'fleet_details', 'drivers', 'trips', 'trip_request', 'booking_request', 'routes', 'live_tracking', 'attendance', 'maintenance', 'fuel', 'incidents', 'compliance', 'disposal'].includes(item.id))
                  .map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveModule(item.id);
                        setIsSidebarOpen(false);
                      }}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
                        ${activeModule === item.id
                          ? 'bg-gradient-to-r from-accent to-accent-hover text-black shadow-lg font-medium'
                          : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                        }
                        ${!isSidebarExpanded ? 'justify-center lg:px-2' : ''}
                      `}
                    >
                      <span className={`flex-shrink-0 ${activeModule === item.id ? 'text-black' : 'text-text-muted'}`}>
                        {item.icon}
                      </span>
                      {isSidebarExpanded && (
                        <span className="text-sm">{item.label}</span>
                      )}
                    </button>
                  ))}
              </div>
            </div>

            {/* Administration Section */}
            {accessibleNavItems.some(item => ['users', 'page_restrictions', 'rates', 'audit_logs'].includes(item.id)) && (
              <div>
                {isSidebarExpanded && (
                  <div className="px-3 mb-2 pt-2 border-t border-border-muted">
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Administration</h3>
                  </div>
                )}
                {!isSidebarExpanded && (
                  <div className="border-t border-border-muted pt-3"></div>
                )}
                <div className="space-y-1">
                  {accessibleNavItems
                    .filter(item => ['users', 'page_restrictions', 'rates', 'audit_logs'].includes(item.id))
                    .map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveModule(item.id);
                          setIsSidebarOpen(false);
                        }}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
                          ${activeModule === item.id
                            ? 'bg-gradient-to-r from-accent to-accent-hover text-black shadow-lg font-medium'
                            : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                          }
                          ${!isSidebarExpanded ? 'justify-center lg:px-2' : ''}
                        `}
                      >
                        <span className={`flex-shrink-0 ${activeModule === item.id ? 'text-black' : 'text-text-muted'}`}>
                          {item.icon}
                        </span>
                        {isSidebarExpanded && (
                          <span className="text-sm">{item.label}</span>
                        )}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </nav>

          {/* Footer */}
          <div className="p-3 border-t border-border-muted">
            <button className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-all ${!isSidebarExpanded ? 'justify-center lg:px-2' : ''}`}>
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {isSidebarExpanded && (
                <span className="text-sm font-medium">Settings</span>
              )}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-bg-primary">
          <div className="p-4 md:p-6 lg:p-8">
            {activeModule === 'vehicles' && (
              <ProtectedRoute pagePath="/vehicles">
                <VehicleModule />
              </ProtectedRoute>
            )}
            {activeModule === 'drivers' && (
              <ProtectedRoute pagePath="/drivers">
                <DriverModule />
              </ProtectedRoute>
            )}
            {activeModule === 'maintenance' && (
              <ProtectedRoute pagePath="/maintenance">
                <MaintenanceModule />
              </ProtectedRoute>
            )}
            {activeModule === 'trips' && (
              <ProtectedRoute pagePath="/trips">
                <TripModule />
              </ProtectedRoute>
            )}
            {activeModule === 'trip_request' && (
              <ProtectedRoute pagePath="/trip-request">
                <TripRequestPage />
              </ProtectedRoute>
            )}
            {activeModule === 'booking_request' && (
              <ProtectedRoute pagePath="/booking-request">
                <BookingRequestPage />
              </ProtectedRoute>
            )}
            {activeModule === 'routes' && (
              <ProtectedRoute pagePath="/routes">
                <RouteModule />
              </ProtectedRoute>
            )}
            {activeModule === 'rates' && (
              <ProtectedRoute pagePath="/rates">
                <RatesModule />
              </ProtectedRoute>
            )}
            {activeModule === 'fleet_details' && (
              <ProtectedRoute pagePath="/fleet-details">
                <FleetDetailsModule />
              </ProtectedRoute>
            )}
            {activeModule === 'fuel' && (
              <ProtectedRoute pagePath="/fuel">
                <FuelTrackingModule />
              </ProtectedRoute>
            )}
            {activeModule === 'incidents' && (
              <ProtectedRoute pagePath="/incidents">
                <IncidentInsuranceModule />
              </ProtectedRoute>
            )}
            {activeModule === 'compliance' && (
              <ProtectedRoute pagePath="/compliance">
                <ComplianceDocumentModule />
              </ProtectedRoute>
            )}
            {activeModule === 'disposal' && (
              <ProtectedRoute pagePath="/disposal">
                <VehicleDisposalModule />
              </ProtectedRoute>
            )}
            {activeModule === 'reporting' && (
              <ProtectedRoute pagePath="/reports">
                <ReportingAnalyticsDashboard />
              </ProtectedRoute>
            )}
            {activeModule === 'users' && (
              <ProtectedRoute pagePath="/users">
                <UserModule />
              </ProtectedRoute>
            )}
            {activeModule === 'page_restrictions' && (
              <ProtectedRoute pagePath="/page-restrictions">
                <PageRestrictionModule />
              </ProtectedRoute>
            )}
            {activeModule === 'live_tracking' && (
              <ProtectedRoute pagePath="/live-tracking">
                <LiveDriverTrackingMap />
              </ProtectedRoute>
            )}
            {activeModule === 'attendance' && (
              <ProtectedRoute pagePath="/attendance">
                <DriverAttendancePage />
              </ProtectedRoute>
            )}
            {activeModule === 'audit_logs' && (
              <ProtectedRoute pagePath="/audit-logs">
                <AuditLogPage />
              </ProtectedRoute>
            )}
          </div>
        </main>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal 
        isOpen={showChangePassword} 
        onClose={() => setShowChangePassword(false)} 
      />
      
      {/* Vercel Analytics */}
      <Analytics />
    </div>
  );
}

export default App;
