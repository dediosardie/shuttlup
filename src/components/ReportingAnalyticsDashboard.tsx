// Reporting & Analytics Dashboard - Defined per reporting-analytics-module.md
import { useState, useEffect } from 'react';
import { Vehicle, Driver, Maintenance, Trip, FuelTransaction, Incident } from '../types';
import { vehicleStorage, driverStorage, maintenanceStorage } from '../storage';
import { tripService, fuelService, incidentService } from '../services/supabaseService';
import { Button, Card, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui';

// Format number with thousand separators
const formatNumber = (num: number, decimals: number = 2): string => {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

// Format currency with Php prefix
const formatCurrency = (amount: number): string => {
  return `Php ${formatNumber(amount, 2)}`;
};

export default function ReportingAnalyticsDashboard() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<Maintenance[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [fuelTransactions, setFuelTransactions] = useState<FuelTransaction[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedReport, setSelectedReport] = useState<string>('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data from storage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [vehiclesData, driversData, maintenanceData, tripsData, fuelData, incidentsData] = await Promise.all([
          vehicleStorage.getAll(),
          driverStorage.getAll(),
          maintenanceStorage.getAll(),
          tripService.getAll(),
          fuelService.getAllTransactions(),
          incidentService.getAll(),
        ]);
        setVehicles(vehiclesData);
        setDrivers(driversData);
        setMaintenanceRecords(maintenanceData);
        setTrips(tripsData);
        setFuelTransactions(fuelData);
        setIncidents(incidentsData);
        console.log('Loaded data for reports:', {
          vehicles: vehiclesData.length,
          drivers: driversData.length,
          maintenance: maintenanceData.length,
          trips: tripsData.length,
          fuelTransactions: fuelData.length,
          incidents: incidentsData.length,
        });
      } catch (error) {
        console.error('Error loading data for reports:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Listen for data updates from other modules
  useEffect(() => {
    const handleVehiclesUpdate = ((event: CustomEvent) => setVehicles(event.detail)) as EventListener;
    const handleDriversUpdate = ((event: CustomEvent) => setDrivers(event.detail)) as EventListener;
    const handleMaintenanceUpdate = ((event: CustomEvent) => setMaintenanceRecords(event.detail)) as EventListener;
    const handleTripsUpdate = ((event: CustomEvent) => setTrips(event.detail)) as EventListener;
    const handleFuelUpdate = ((event: CustomEvent) => setFuelTransactions(event.detail)) as EventListener;
    const handleIncidentsUpdate = ((event: CustomEvent) => setIncidents(event.detail)) as EventListener;
    
    window.addEventListener('vehiclesUpdated', handleVehiclesUpdate);
    window.addEventListener('driversUpdated', handleDriversUpdate);
    window.addEventListener('maintenanceUpdated', handleMaintenanceUpdate);
    window.addEventListener('tripsUpdated', handleTripsUpdate);
    window.addEventListener('fuelUpdated', handleFuelUpdate);
    window.addEventListener('incidentsUpdated', handleIncidentsUpdate);
    
    return () => {
      window.removeEventListener('vehiclesUpdated', handleVehiclesUpdate);
      window.removeEventListener('driversUpdated', handleDriversUpdate);
      window.removeEventListener('maintenanceUpdated', handleMaintenanceUpdate);
      window.removeEventListener('tripsUpdated', handleTripsUpdate);
      window.removeEventListener('fuelUpdated', handleFuelUpdate);
      window.removeEventListener('incidentsUpdated', handleIncidentsUpdate);
    };
  }, []);

  // Calculate Fleet Performance KPIs per markdown Section 1.1
  const totalVehicles = vehicles.length;
  const activeVehicles = vehicles.filter(v => v.status === 'active').length;
  const utilizationRate = totalVehicles > 0 ? ((activeVehicles / totalVehicles) * 100).toFixed(1) : '0';
  const averageAge = vehicles.length > 0
    ? (vehicles.reduce((sum, v) => sum + (new Date().getFullYear() - v.year), 0) / vehicles.length).toFixed(1)
    : '0';
  const totalMileage = 0; // Mileage tracking would need to be added to Vehicle type

  // Calculate Maintenance KPIs per markdown Section 1.2
  const scheduledMaintenance = maintenanceRecords.filter(m => m.status === 'pending').length;
  const inProgressMaintenance = 0; // Would need in_progress status in Maintenance type
  const completedMaintenance = maintenanceRecords.filter(m => m.status === 'completed').length;
  const totalMaintenanceCost = maintenanceRecords.reduce((sum, m) => sum + (m.cost || 0), 0);
  const averageMaintenanceCost = maintenanceRecords.length > 0
    ? (totalMaintenanceCost / maintenanceRecords.length).toFixed(2)
    : '0';
  const costPerVehicle = totalVehicles > 0 ? (totalMaintenanceCost / totalVehicles).toFixed(2) : '0';

  // Calculate Driver Performance KPIs per markdown Section 1.3
  const totalDrivers = drivers.length;
  const activeDrivers = drivers.filter(d => d.status === 'active').length;
  const availableDrivers = activeDrivers; // Simplified: using active drivers

  // Calculate Fuel Efficiency KPIs per markdown Section 1.4
  const totalFuelCost = fuelTransactions.reduce((sum, f) => sum + (f.cost || 0), 0);
  const totalLiters = fuelTransactions.reduce((sum, f) => sum + (f.liters || 0), 0);
  const averageCostPerLiter = totalLiters > 0 ? (totalFuelCost / totalLiters).toFixed(2) : '0';

  // Calculate Trip Analytics KPIs per markdown Section 1.8
  const totalTrips = trips.length;
  const completedTrips = trips.filter(t => t.status === 'completed').length;
  const totalDistance = trips.reduce((sum, t) => sum + (t.distance_km || 0), 0);
  const averageTripDistance = totalTrips > 0 ? (totalDistance / totalTrips).toFixed(1) : '0';

  // Calculate Incident KPIs per markdown Section 1.5
  const totalIncidents = incidents.length;
  const criticalIncidents = incidents.filter(i => i.severity === 'critical').length;
  const severeIncidents = incidents.filter(i => i.severity === 'severe').length;
  const incidentRate = totalTrips > 0 ? ((totalIncidents / totalTrips) * 100).toFixed(2) : '0';

  // Calculate Financial KPIs per markdown Section 1.7
  const totalOperatingCost = totalMaintenanceCost + totalFuelCost;
  const costPerKm = totalDistance > 0 ? (totalOperatingCost / totalDistance).toFixed(2) : '0';
  const costPerVehiclePerMonth = totalVehicles > 0 ? (totalOperatingCost / totalVehicles / 12).toFixed(2) : '0';

  // Calculate Insurance Status
  const getInsuranceStatusVehicles = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11
    
    return vehicles.filter(vehicle => {
      if (!vehicle.insurance_expiry) return false;
      
      const expiryDate = new Date(vehicle.insurance_expiry);
      const expiryYear = expiryDate.getFullYear();
      const expiryMonth = expiryDate.getMonth();
      
      // Previous months (past), current month, or next month
      if (expiryYear < currentYear) return true; // Expired (previous year)
      if (expiryYear === currentYear) {
        // Previous months, current month, or next month
        return expiryMonth <= currentMonth + 1;
      }
      if (expiryYear === currentYear + 1 && currentMonth === 11 && expiryMonth === 0) {
        // Next month when current is December
        return true;
      }
      
      return false;
    }).sort((a, b) => {
      // Sort by expiry date ascending (earliest first)
      return new Date(a.insurance_expiry!).getTime() - new Date(b.insurance_expiry!).getTime();
    });
  };

  const insuranceStatusVehicles = getInsuranceStatusVehicles();
  const expiredInsurance = insuranceStatusVehicles.filter(v => new Date(v.insurance_expiry!) < new Date()).length;
  const expiringThisMonth = insuranceStatusVehicles.filter(v => {
    const expiry = new Date(v.insurance_expiry!);
    const now = new Date();
    return expiry.getMonth() === now.getMonth() && expiry.getFullYear() === now.getFullYear() && expiry >= now;
  }).length;
  const expiringNextMonth = insuranceStatusVehicles.filter(v => {
    const expiry = new Date(v.insurance_expiry!);
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return expiry.getMonth() === nextMonth.getMonth() && expiry.getFullYear() === nextMonth.getFullYear();
  }).length;

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
            <p className="text-text-secondary mt-4">Loading report data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Report Type Selector */}
          <Card>
            <div className="flex items-center gap-2 overflow-x-auto">
              {/* Report types per markdown Section 2 */}
              {[
                // { id: 'dashboard', label: 'Dashboard Overview' },
                { id: 'fleet', label: 'Fleet Performance' },
                // { id: 'insurance', label: 'Insurance Status' },
                // { id: 'maintenance', label: 'Maintenance Report' },
                { id: 'driver', label: 'Driver Performance' },
                { id: 'fuel', label: 'Fuel Efficiency' },
                { id: 'incident', label: 'Incident Report' },
                // { id: 'financial', label: 'Financial Report' },
                { id: 'trip', label: 'Trip Analysis' },
              ].map(report => (
                <Button
                  key={report.id}
                  onClick={() => setSelectedReport(report.id)}
                  variant={selectedReport === report.id ? 'primary' : 'secondary'}
                  size="sm"
                  className="whitespace-nowrap"
                >
                  {report.label}
                </Button>
              ))}
            </div>
          </Card>

      {/* Real-Time Widgets per markdown Section 3.1 */}
      {selectedReport === 'dashboard' && (
        <>
          <div>
            <h2 className="text-xl font-semibold text-text-primary mb-4">Real-Time Fleet Status</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Widget 1: Active Vehicles */}
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">Active Vehicles</p>
                    <p className="text-2xl font-bold text-text-primary mt-1">{activeVehicles}/{totalVehicles}</p>
                  </div>
                  <div className="w-12 h-12 bg-accent-soft rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </Card>

              {/* Widget 2: Scheduled Maintenance */}
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">Scheduled Maintenance</p>
                    <p className="text-2xl font-bold text-text-primary mt-1">{scheduledMaintenance}</p>
                  </div>
                  <div className="w-12 h-12 bg-accent-soft rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </Card>

              {/* Widget 3: Available Drivers */}
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">Available Drivers</p>
                    <p className="text-2xl font-bold text-text-primary mt-1">{availableDrivers}/{totalDrivers}</p>
                  </div>
                  <div className="w-12 h-12 bg-accent-soft rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
              </Card>

              {/* Widget 4: Today's Fuel Cost */}
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">Total Fuel Cost</p>
                    <p className="text-2xl font-bold text-text-primary mt-1">{formatCurrency(totalFuelCost)}</p>
                  </div>
                  <div className="w-12 h-12 bg-accent-soft rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Performance Metrics Widgets per markdown Section 3.2 */}
          <div>
            <h2 className="text-xl font-semibold text-text-primary mb-4">Performance Metrics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Widget 5: Fleet Utilization Rate */}
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">Fleet Utilization Rate</p>
                    <p className="text-2xl font-bold text-text-primary mt-1">{utilizationRate}%</p>
                  </div>
                  <div className="w-12 h-12 bg-accent-soft rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
              </Card>

              {/* Widget 6: Average Maintenance Cost */}
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">Avg Maintenance Cost</p>
                    <p className="text-2xl font-bold text-text-primary mt-1">{formatCurrency(parseFloat(averageMaintenanceCost))}</p>
                  </div>
                  <div className="w-12 h-12 bg-accent-soft rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </Card>

              {/* Widget 7: Fuel Efficiency */}
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">Avg Cost Per Liter</p>
                    <p className="text-2xl font-bold text-text-primary mt-1">{formatCurrency(parseFloat(averageCostPerLiter))}</p>
                  </div>
                  <div className="w-12 h-12 bg-accent-soft rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Comparative Metrics Widgets per markdown Section 3.3 */}
          <div>
            <h2 className="text-xl font-semibold text-text-primary mb-4">Operational Overview</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Widget 8: Total Mileage */}
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">Total Mileage</p>
                    <p className="text-2xl font-bold text-text-primary mt-1">{formatNumber(totalMileage, 0)} km</p>
                  </div>
                  <div className="w-12 h-12 bg-accent-soft rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </div>
                </div>
              </Card>

              {/* Widget 9: Total Incidents */}
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">Total Incidents</p>
                    <p className="text-2xl font-bold text-text-primary mt-1">{totalIncidents}</p>
                    <p className="text-xs text-red-500 mt-1">{criticalIncidents + severeIncidents} critical/severe</p>
                  </div>
                  <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
              </Card>

              {/* Widget 10: Completed Trips */}
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">Completed Trips</p>
                    <p className="text-2xl font-bold text-text-primary mt-1">{completedTrips}</p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </Card>

              {/* Widget 11: Cost Per Km */}
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">Cost Per Km</p>
                    <p className="text-2xl font-bold text-text-primary mt-1">{formatCurrency(parseFloat(costPerKm))}</p>
                  </div>
                  <div className="w-12 h-12 bg-accent-soft rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Fleet Performance Report per markdown Section 2.1 */}
      {selectedReport === 'fleet' && (
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-text-primary">Fleet Performance Report</h2>
            {/* Export options per markdown Section 5 */}
            <Button variant="primary"
              size="md"
              className="inline-flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export PDF
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-bg-elevated rounded-lg p-4">
              <p className="text-sm text-text-secondary">Total Vehicles</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{totalVehicles}</p>
            </div>
            <div className="bg-bg-elevated rounded-lg p-4">
              <p className="text-sm text-text-secondary">Active Vehicles</p>
              <p className="text-2xl font-bold text-emerald-500 mt-1">{activeVehicles}</p>
            </div>
            <div className="bg-bg-elevated rounded-lg p-4">
              <p className="text-sm text-text-secondary">Utilization Rate</p>
              <p className="text-2xl font-bold text-accent mt-1">{utilizationRate}%</p>
            </div>
            <div className="bg-bg-elevated rounded-lg p-4">
              <p className="text-sm text-text-secondary">Average Age</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{averageAge} yrs</p>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mileage</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map(vehicle => (
                <TableRow key={vehicle.id}>
                  <TableCell className="font-medium">
                    {vehicle.plate_number}{vehicle.conduction_number ? ` (${vehicle.conduction_number})` : ''} - {vehicle.make} {vehicle.model}
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      vehicle.status === 'active' ? 'success' :
                      vehicle.status === 'maintenance' ? 'warning' :
                      'default'
                    }>
                      {vehicle.status}
                    </Badge>
                  </TableCell>
                  <TableCell>N/A</TableCell>
                  <TableCell>{new Date().getFullYear() - vehicle.year} yrs</TableCell>
                  <TableCell className="capitalize">{vehicle.ownership_type}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Insurance Status Report */}
      {selectedReport === 'insurance' && (
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-text-primary">Insurance Status Report</h2>
            <Button variant="primary"
              size="md"
              className="inline-flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export PDF
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-bg-elevated rounded-lg p-4">
              <p className="text-sm text-text-secondary">Total Vehicles</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{insuranceStatusVehicles.length}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-sm text-red-600">Expired</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{expiredInsurance}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <p className="text-sm text-amber-600">Expiring This Month</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{expiringThisMonth}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600">Expiring Next Month</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{expiringNextMonth}</p>
            </div>
          </div>

          {insuranceStatusVehicles.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-bg-elevated mb-4">
                <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-text-primary mb-1">All Insurance Up to Date</h3>
              <p className="text-text-secondary">No vehicles with expired or expiring insurance</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Plate Number</TableHead>
                  <TableHead>Conduction #</TableHead>
                  <TableHead>Insurance Expiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Days Until Expiry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insuranceStatusVehicles.map(vehicle => {
                  const expiryDate = new Date(vehicle.insurance_expiry!);
                  const now = new Date();
                  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  const isExpired = daysUntilExpiry < 0;
                  const isExpiringThisMonth = !isExpired && expiryDate.getMonth() === now.getMonth() && expiryDate.getFullYear() === now.getFullYear();

                  return (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-medium">
                        {vehicle.make} {vehicle.model} {vehicle.variant ? `(${vehicle.variant})` : ''}
                      </TableCell>
                      <TableCell>
                        {vehicle.plate_number || '-'}
                      </TableCell>
                      <TableCell className="font-mono">
                        {vehicle.conduction_number || '-'}
                      </TableCell>
                      <TableCell>
                        {vehicle.insurance_expiry}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          isExpired ? 'danger' :
                          isExpiringThisMonth ? 'warning' :
                          'default'
                        }>
                          {isExpired ? 'Expired' : isExpiringThisMonth ? 'Expiring This Month' : 'Expiring Next Month'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${
                          isExpired ? 'text-red-600' :
                          isExpiringThisMonth ? 'text-amber-600' :
                          'text-blue-600'
                        }`}>
                          {isExpired ? `${Math.abs(daysUntilExpiry)} days ago` : `${daysUntilExpiry} days`}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {/* Maintenance Report per markdown Section 2.2 */}
      {selectedReport === 'maintenance' && (
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-text-primary">Maintenance Report</h2>
            <Button variant="primary"
              size="md"
              className="inline-flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Excel
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-bg-elevated rounded-lg p-4">
              <p className="text-sm text-text-secondary">Total Cost</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{formatCurrency(totalMaintenanceCost)}</p>
            </div>
            <div className="bg-bg-elevated rounded-lg p-4">
              <p className="text-sm text-text-secondary">Scheduled</p>
              <p className="text-2xl font-bold text-accent mt-1">{scheduledMaintenance}</p>
            </div>
            <div className="bg-bg-elevated rounded-lg p-4">
              <p className="text-sm text-text-secondary">In Progress</p>
              <p className="text-2xl font-bold text-amber-500 mt-1">{inProgressMaintenance}</p>
            </div>
            <div className="bg-bg-elevated rounded-lg p-4">
              <p className="text-sm text-text-secondary">Completed</p>
              <p className="text-2xl font-bold text-emerald-500 mt-1">{completedMaintenance}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-accent-soft border border-accent/20 rounded-lg p-4">
              <p className="text-sm text-text-secondary">Average Cost Per Maintenance</p>
              <p className="text-3xl font-bold text-accent mt-1">{formatCurrency(parseFloat(averageMaintenanceCost))}</p>
            </div>
            <div className="bg-accent-soft border border-accent/20 rounded-lg p-4">
              <p className="text-sm text-text-secondary">Cost Per Vehicle</p>
              <p className="text-3xl font-bold text-accent mt-1">{formatCurrency(parseFloat(costPerVehicle))}</p>
            </div>
          </div>

          {/* Maintenance Records Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Scheduled Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {maintenanceRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-text-muted">
                    No maintenance records found
                  </TableCell>
                </TableRow>
              ) : (
                maintenanceRecords.map(record => {
                  const vehicle = vehicles.find(v => v.id === record.vehicle_id);
                  return (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {vehicle ? `${vehicle.plate_number || vehicle.conduction_number} - ${vehicle.make} ${vehicle.model}` : 'N/A'}
                      </TableCell>
                      <TableCell className="capitalize">
                        {record.maintenance_type.replace('_', ' ')}
                      </TableCell>
                      <TableCell>
                        {new Date(record.scheduled_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          record.status === 'completed' ? 'success' :
                          record.status === 'pending' ? 'accent' :
                          'default'
                        }>
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.cost ? formatCurrency(record.cost) : '-'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {record.description || '-'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Financial Report per markdown Section 2.7 */}
      {selectedReport === 'financial' && (
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-text-primary">Financial Report</h2>
            <Button variant="primary"
              size="md"
              className="inline-flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export PDF
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-accent to-accent-hover text-white rounded-xl p-6">
              <p className="text-sm opacity-90">Total Operating Cost</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(totalOperatingCost)}</p>
              <p className="text-xs opacity-75 mt-1">Maintenance + Fuel</p>
            </div>
            <div className="bg-gradient-to-br from-accent to-accent-hover text-white rounded-xl p-6">
              <p className="text-sm opacity-90">Cost Per Kilometer</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(parseFloat(costPerKm))}</p>
              <p className="text-xs opacity-75 mt-1">Average across {formatNumber(totalDistance, 0)} km</p>
            </div>
            <div className="bg-gradient-to-br from-accent to-accent-hover text-white rounded-xl p-6">
              <p className="text-sm opacity-90">Cost Per Vehicle/Month</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(parseFloat(costPerVehiclePerMonth))}</p>
              <p className="text-xs opacity-75 mt-1">Estimated monthly average</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-bg-elevated rounded-lg p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Cost Breakdown</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">Maintenance</span>
                  <span className="text-lg font-bold text-text-primary">{formatCurrency(totalMaintenanceCost)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">Fuel</span>
                  <span className="text-lg font-bold text-text-primary">{formatCurrency(totalFuelCost)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-border-muted">
                  <span className="text-sm font-semibold text-text-secondary">Total</span>
                  <span className="text-xl font-bold text-accent">{formatCurrency(totalOperatingCost)}</span>
                </div>
              </div>
            </div>

            <div className="bg-bg-elevated rounded-lg p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Cost Distribution</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text-secondary">Maintenance</span>
                    <span className="font-medium text-text-primary">{totalOperatingCost > 0 ? ((totalMaintenanceCost / totalOperatingCost) * 100).toFixed(1) : 0}%</span>
                  </div>
                  <div className="w-full bg-bg-primary rounded-full h-2 overflow-hidden">
                    <div 
                      className={`bg-accent h-2 rounded-full transition-all duration-300 ${
                        totalOperatingCost === 0 ? 'w-0' :
                        (totalMaintenanceCost / totalOperatingCost) >= 0.95 ? 'w-full' :
                        (totalMaintenanceCost / totalOperatingCost) >= 0.75 ? 'w-11/12' :
                        (totalMaintenanceCost / totalOperatingCost) >= 0.66 ? 'w-2/3' :
                        (totalMaintenanceCost / totalOperatingCost) >= 0.50 ? 'w-1/2' :
                        (totalMaintenanceCost / totalOperatingCost) >= 0.33 ? 'w-1/3' :
                        (totalMaintenanceCost / totalOperatingCost) >= 0.25 ? 'w-1/4' :
                        (totalMaintenanceCost / totalOperatingCost) >= 0.10 ? 'w-1/12' : 'w-0'
                      }`}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text-secondary">Fuel</span>
                    <span className="font-medium text-text-primary">{totalOperatingCost > 0 ? ((totalFuelCost / totalOperatingCost) * 100).toFixed(1) : 0}%</span>
                  </div>
                  <div className="w-full bg-bg-primary rounded-full h-2 overflow-hidden">
                    <div 
                      className={`bg-amber-500 h-2 rounded-full transition-all duration-300 ${
                        totalOperatingCost === 0 ? 'w-0' :
                        (totalFuelCost / totalOperatingCost) >= 0.95 ? 'w-full' :
                        (totalFuelCost / totalOperatingCost) >= 0.75 ? 'w-11/12' :
                        (totalFuelCost / totalOperatingCost) >= 0.66 ? 'w-2/3' :
                        (totalFuelCost / totalOperatingCost) >= 0.50 ? 'w-1/2' :
                        (totalFuelCost / totalOperatingCost) >= 0.33 ? 'w-1/3' :
                        (totalFuelCost / totalOperatingCost) >= 0.25 ? 'w-1/4' :
                        (totalFuelCost / totalOperatingCost) >= 0.10 ? 'w-1/12' : 'w-0'
                      }`}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Fuel Efficiency Report per markdown Section 2.4 */}
      {selectedReport === 'fuel' && (
        <Card>
          <h2 className="text-xl font-semibold text-text-primary mb-6">Fuel Efficiency Report</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-amber-500/10 border border-accent/20 rounded-lg p-6 text-center">
              <p className="text-sm text-text-secondary">Total Fuel Cost</p>
              <p className="text-2xl font-bold text-accent mt-1">{formatCurrency(totalFuelCost)}</p>
            </div>
            <div className="bg-accent-soft border border-accent/20 rounded-lg p-6 text-center">
              <p className="text-sm text-text-secondary">Total Liters</p>
              <p className="text-2xl font-bold text-accent mt-1">{formatNumber(totalLiters, 2)} L</p>
            </div>
            <div className="bg-accent-soft border border-accent/20 rounded-lg p-6 text-center">
              <p className="text-sm text-text-secondary">Avg Cost Per Liter</p>
              <p className="text-2xl font-bold text-accent mt-1">{formatCurrency(parseFloat(averageCostPerLiter))}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Trip Analysis Report per markdown Section 2.8 */}
      {selectedReport === 'trip' && (
        <Card>
          <h2 className="text-xl font-semibold text-text-primary mb-6">Trip Analysis Report</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-accent-soft rounded-lg p-4">
              <p className="text-sm text-text-secondary">Total Trips</p>
              <p className="text-2xl font-bold text-accent mt-1">{totalTrips}</p>
            </div>
            <div className="bg-accent-soft rounded-lg p-4">
              <p className="text-sm text-text-secondary">Completed</p>
              <p className="text-2xl font-bold text-accent mt-1">{completedTrips}</p>
            </div>
            <div className="bg-accent-soft rounded-lg p-4">
              <p className="text-sm text-text-secondary">Total Distance</p>
              <p className="text-2xl font-bold text-accent mt-1">{formatNumber(totalDistance, 0)} km</p>
            </div>
            <div className="bg-accent-soft rounded-lg p-4">
              <p className="text-sm text-text-secondary">Avg Distance</p>
              <p className="text-2xl font-bold text-accent mt-1">{formatNumber(parseFloat(averageTripDistance), 1)} km</p>
            </div>
          </div>
        </Card>
      )}

      {/* Incident Report per markdown Section 2.5 */}
      {selectedReport === 'incident' && (
        <Card>
          <h2 className="text-xl font-semibold text-text-primary mb-6">Incident Report</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
              <p className="text-sm text-text-secondary">Total Incidents</p>
              <p className="text-3xl font-bold text-red-500 mt-2">{totalIncidents}</p>
            </div>
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-6 text-center">
              <p className="text-sm text-text-secondary">Critical</p>
              <p className="text-3xl font-bold text-orange-500 mt-2">{criticalIncidents}</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-6 text-center">
              <p className="text-sm text-text-secondary">Severe</p>
              <p className="text-3xl font-bold text-amber-500 mt-2">{severeIncidents}</p>
            </div>
            <div className="bg-bg-elevated border border-border-muted rounded-lg p-6 text-center">
              <p className="text-sm text-text-secondary">Incident Rate</p>
              <p className="text-3xl font-bold text-text-primary mt-2">{incidentRate}%</p>
            </div>
          </div>
        </Card>
      )}

      {/* Driver Performance Report per markdown Section 2.3 */}
      {selectedReport === 'driver' && (
        <Card>
          <h2 className="text-xl font-semibold text-text-primary mb-6">Driver Performance Report</h2>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-bg-elevated rounded-lg p-4">
              <p className="text-sm text-text-secondary">Total Drivers</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{totalDrivers}</p>
            </div>
            <div className="bg-emerald-500/10 rounded-lg p-4">
              <p className="text-sm text-text-secondary">Active</p>
              <p className="text-2xl font-bold text-emerald-500 mt-1">{activeDrivers}</p>
            </div>
            <div className="bg-accent-soft rounded-lg p-4">
              <p className="text-sm text-text-secondary">Available</p>
              <p className="text-2xl font-bold text-accent mt-1">{availableDrivers}</p>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>License Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expiry Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map(driver => (
                <TableRow key={driver.id}>
                  <TableCell className="font-medium">{driver.full_name}</TableCell>
                  <TableCell>{driver.license_number}</TableCell>
                  <TableCell>
                    <Badge variant={driver.status === 'active' ? 'success' : 'default'}>
                      {driver.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(driver.license_expiry).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
        </>
      )}
    </div>
  );
}
