import { useState, useEffect } from 'react';
import { Card, Button, Input } from './ui';
import { supabase } from '../supabaseClient';

interface AuditLog {
  id: string;
  user_email: string;
  action: string;
  details: string;
  timestamp: string;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      alert('Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Timestamp', 'User Email', 'Action', 'Details'],
      ...filteredLogs.map(log => [
        new Date(log.timestamp).toLocaleString(),
        log.user_email,
        log.action,
        log.details.replace(/,/g, ';') // Replace commas to avoid CSV issues
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-900/30 text-green-400';
      case 'UPDATE':
        return 'bg-blue-900/30 text-blue-400';
      case 'DELETE':
        return 'bg-red-900/30 text-red-400';
      case 'STATUS_CHANGE':
        return 'bg-purple-900/30 text-purple-400';
      case 'BULK_IMPORT':
        return 'bg-yellow-900/30 text-yellow-400';
      case 'AUTO_UPDATE':
        return 'bg-cyan-900/30 text-cyan-400';
      default:
        return 'bg-gray-900/30 text-gray-400';
    }
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    
    const logDate = new Date(log.timestamp);
    const matchesDateFrom = !dateFrom || logDate >= new Date(dateFrom);
    const matchesDateTo = !dateTo || logDate <= new Date(dateTo + 'T23:59:59');

    return matchesSearch && matchesAction && matchesDateFrom && matchesDateTo;
  });

  // Get unique actions for filter
  const uniqueActions = Array.from(new Set(logs.map(log => log.action))).sort();

  // Stats
  const totalLogs = filteredLogs.length;
  const uniqueUsers = new Set(filteredLogs.map(log => log.user_email)).size;
  const todayLogs = filteredLogs.filter(log => {
    const logDate = new Date(log.timestamp);
    const today = new Date();
    return logDate.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="min-h-screen bg-bg-primary p-2 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <Card className="p-4 bg-bg-secondary border border-border-muted">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Audit Logs</h1>
              <p className="text-xs sm:text-sm text-text-secondary mt-1">System activity tracking and audit trail</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={loadLogs}
                className="bg-bg-elevated text-text-primary px-4 py-2 rounded-lg font-medium text-sm border border-border-muted hover:bg-bg-primary transition-all"
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </Button>
              <Button
                onClick={handleExport}
                className="bg-gradient-to-r from-accent to-accent-hover text-white px-4 py-2 rounded-lg font-medium text-sm hover:shadow-lg transition-all"
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </Button>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-4 bg-bg-secondary border border-border-muted">
            <div className="flex items-center gap-3">
              <div className="bg-accent-soft rounded-lg p-3">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-text-muted">Total Logs</p>
                <p className="text-2xl font-bold text-text-primary">{totalLogs}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-bg-secondary border border-border-muted">
            <div className="flex items-center gap-3">
              <div className="bg-accent-soft rounded-lg p-3">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-text-muted">Unique Users</p>
                <p className="text-2xl font-bold text-text-primary">{uniqueUsers}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-bg-secondary border border-border-muted">
            <div className="flex items-center gap-3">
              <div className="bg-accent-soft rounded-lg p-3">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-text-muted">Today's Logs</p>
                <p className="text-2xl font-bold text-text-primary">{todayLogs}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 bg-bg-secondary border border-border-muted">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-text-muted mb-2">Search</label>
              <Input
                type="text"
                placeholder="Search by user, action, or details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-bg-elevated border-border-muted text-text-primary"
              />
            </div>

            {/* Action Filter */}
            <div>
              <label className="block text-xs font-medium text-text-muted mb-2">Action Type</label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full bg-bg-elevated border border-border-muted text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="all">All Actions</option>
                {uniqueActions.map(action => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-xs font-medium text-text-muted mb-2">Date From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full bg-bg-elevated border-border-muted text-text-primary"
              />
            </div>

            {/* Date To */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-medium text-text-muted mb-2">Date To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full bg-bg-elevated border-border-muted text-text-primary"
              />
            </div>

            {/* Clear Filters */}
            <div className="sm:col-span-2 lg:col-span-3 flex items-end">
              <Button
                onClick={() => {
                  setSearchQuery('');
                  setFilterAction('all');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="w-full bg-bg-elevated text-text-primary px-4 py-2 rounded-lg font-medium text-sm border border-border-muted hover:bg-bg-primary transition-all"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card className="bg-bg-secondary border border-border-muted overflow-hidden">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-bg-elevated border-b border-border-muted sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider whitespace-nowrap">Timestamp</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider whitespace-nowrap">User</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider whitespace-nowrap">Action</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-muted">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-text-secondary">
                      Loading audit logs...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-text-secondary">
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-bg-elevated transition-colors"
                    >
                      <td className="px-3 py-3 text-sm text-text-secondary whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-sm text-text-primary whitespace-nowrap">
                        {log.user_email}
                      </td>
                      <td className="px-3 py-3 text-sm whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionBadgeColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-text-secondary">
                        <div className="max-w-2xl">
                          {log.details}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Footer Info */}
        <Card className="p-4 bg-bg-secondary border border-border-muted">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <p>Showing {filteredLogs.length} of {logs.length} total logs (last 500 entries)</p>
            <p>Auto-refresh: Disabled</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
