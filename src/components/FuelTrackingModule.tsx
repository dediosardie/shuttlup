// Fuel Tracking Module - Defined per fuel-tracking-module.md
import { useState, useEffect } from 'react';
import { FuelTransaction, Vehicle, Driver } from '../types';
import FuelTransactionTable from './FuelTransactionTable';
import FuelTransactionForm from './FuelTransactionForm';
import Modal from './Modal';
import FuelEfficiencyReport from './FuelEfficiencyReport';
import OpenAIConfigModal from './OpenAIConfigModal';
import { Card, Button } from './ui';
import { fuelService, vehicleService, driverService } from '../services/supabaseService';
import { notificationService } from '../services/notificationService';
import { auditLogService } from '../services/auditLogService';
import { openaiService } from '../services/openaiService';
import { authService } from '../services/authService';
import { useRoleAccess } from '../hooks/useRoleAccess';
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
export default function FuelTrackingModule() {
  const [transactions, setTransactions] = useState<FuelTransaction[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<FuelTransaction | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const { userRole } = useRoleAccess();
  
  // AI Analysis state
  const [showEfficiencyReport, setShowEfficiencyReport] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string>('');
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Get current user email
  useEffect(() => {
    const getCurrentUser = async () => {
      const { user } = await authService.getSession();
      if (user?.email) {
        setCurrentUserEmail(user.email);
      }
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [transactionsData, vehiclesData, driversData] = await Promise.all([
          fuelService.getAllTransactions(),
          vehicleService.getAll(),
          driverService.getAll(),
        ]);
        setTransactions(transactionsData);
        setVehicles(vehiclesData);
        setDrivers(driversData);
        console.log('Loaded fuel data:', {
          transactions: transactionsData.length,
          vehicles: vehiclesData.length,
          drivers: driversData.length,
        });
      } catch (error) {
        console.error('Error loading fuel transactions:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
    
    const handleVehiclesUpdate = ((event: CustomEvent) => {
      setVehicles(event.detail);
    }) as EventListener;
    
    const handleDriversUpdate = ((event: CustomEvent) => {
      setDrivers(event.detail);
    }) as EventListener;

    window.addEventListener('vehiclesUpdated', handleVehiclesUpdate);
    window.addEventListener('driversUpdated', handleDriversUpdate);

    return () => {
      window.removeEventListener('vehiclesUpdated', handleVehiclesUpdate);
      window.removeEventListener('driversUpdated', handleDriversUpdate);
    };
  }, []);

  // Dispatch event when transactions update so other modules can react
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('fuelUpdated', { detail: transactions }));
  }, [transactions]);

  // Action: Record Fuel Transaction (primary, submit)
  const handleSaveTransaction = async (transactionData: Omit<FuelTransaction, 'id' | 'created_at'>) => {
    try {
      const newTransaction = await fuelService.createTransaction(transactionData);
      setTransactions([newTransaction, ...transactions]);
      setIsModalOpen(false);
      
      notificationService.success(
        'Fuel Transaction Recorded',
        `${newTransaction.liters}L fuel recorded for vehicle`
      );
      await auditLogService.createLog(
        'Fuel Transaction Created',
        `Recorded ${newTransaction.liters}L fuel at ${newTransaction.cost_per_liter}/L`
      );
    } catch (error: any) {
      console.error('Failed to save fuel transaction:', error);
      notificationService.error('Failed to Record', error.message || 'Unable to save fuel transaction.');
      alert(error.message || 'Failed to save fuel transaction. Please try again.');
    }
  };

  // Action: Update Transaction (primary, submit)
  const handleUpdateTransaction = async (transaction: FuelTransaction) => {
    const oldTransaction = transactions.find(t => t.id === transaction.id);
    try {
      const { id, created_at, ...updateData } = transaction;
      const updated = await fuelService.updateTransaction(id, updateData);
      setTransactions(transactions.map(t => t.id === updated.id ? updated : t));
      setIsModalOpen(false);
      setEditingTransaction(undefined);
      
      notificationService.success(
        'Fuel Transaction Updated',
        'Transaction details have been updated'
      );
      await auditLogService.createLog(
        'Fuel Transaction Updated',
        `Updated fuel transaction (${updated.liters}L)`,
        { before: oldTransaction, after: updated }
      );
    } catch (error: any) {
      console.error('Failed to update fuel transaction:', error);
      notificationService.error('Failed to Update', error.message || 'Unable to update transaction.');
      alert(error.message || 'Failed to update fuel transaction. Please try again.');
    }
  };

  // Action: Delete Transaction (danger, confirmation required)
  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fuel transaction?')) {
      return;
    }
    try {
      const transaction = transactions.find(t => t.id === id);
      await fuelService.deleteTransaction(id);
      setTransactions(transactions.filter(t => t.id !== id));
      
      notificationService.info(
        'Transaction Deleted',
        'Fuel transaction has been removed'
      );
      await auditLogService.createLog(
        'Fuel Transaction Deleted',
        `Deleted fuel transaction (${transaction?.liters}L)`
      );
    } catch (error: any) {
      console.error('Failed to delete fuel transaction:', error);
      notificationService.error('Failed to Delete', error.message || 'Unable to delete transaction.');
      alert(error.message || 'Failed to delete fuel transaction. Please try again.');
    }
  };

  // Action: View Efficiency Report (secondary, opens analytics view with AI analysis)
  const handleViewEfficiency = async () => {
    // Check if OpenAI is configured
    if (!openaiService.isConfigured()) {
      setShowConfigModal(true);
      return;
    }

    try {
      setShowEfficiencyReport(true);
      setIsAnalyzing(true);
      setAnalysisError('');
      setAiAnalysis(null);

      // Run AI-driven analysis using ChatGPT-4o
      const analysis = await openaiService.analyzeFuelEfficiency(
        transactions,
        vehicles,
        drivers
      );

      setAiAnalysis(analysis);
      
      notificationService.success(
        'AI Analysis Complete',
        'Fuel efficiency report generated successfully'
      );
      
      await auditLogService.createLog(
        'AI Fuel Analysis Generated',
        `Generated AI-driven fuel efficiency report with ${analysis.insights.length} insights`
      );
    } catch (error: any) {
      console.error('AI Analysis failed:', error);
      setAnalysisError(error.message || 'Failed to generate AI analysis');
      notificationService.error(
        'Analysis Failed',
        error.message || 'Unable to generate AI analysis'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfigureOpenAI = (apiKey: string) => {
    openaiService.setApiKey(apiKey);
    setShowConfigModal(false);
    notificationService.success(
      'GitHub AI Configured',
      'Token saved successfully. You can now use AI analysis with your Copilot subscription.'
    );
    // Automatically trigger analysis after configuration
    handleViewEfficiency();
  };

  const handleCloseReport = () => {
    setShowEfficiencyReport(false);
    setAiAnalysis(null);
    setAnalysisError('');
  };

  const handleEditTransaction = (transaction: FuelTransaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleAddTransaction = () => {
    setEditingTransaction(undefined);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(undefined);
  };

  // Filter transactions for driver role - only show transactions assigned to them
  const filteredTransactions = userRole?.role === 'driver' && currentUserEmail
    ? transactions.filter(transaction => {
        const driver = drivers.find(d => d.id === transaction.driver_id);
        return driver?.email === currentUserEmail;
      })
    : transactions;

  // Calculate stats based on filtered transactions
  const totalLiters = filteredTransactions.reduce((sum, t) => sum + t.liters, 0);
  const totalCost = filteredTransactions.reduce((sum, t) => sum + t.cost, 0);
  const avgCostPerLiter = totalLiters > 0 ? totalCost / totalLiters : 0;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary">Total Transactions</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{filteredTransactions.length}</p>
            </div>
            <div className="w-12 h-12 bg-accent-soft rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary">Total Liters</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{formatNumber(totalLiters, 2)} L</p>
            </div>
            <div className="w-12 h-12 bg-accent-soft rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary">Total Cost</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{formatCurrency(totalCost)}</p>
            </div>
            <div className="w-12 h-12 bg-accent-soft rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary">Avg Cost/Liter</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{formatCurrency(avgCostPerLiter)}</p>
            </div>
            <div className="w-12 h-12 bg-accent-soft rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <div className="p-6 border-b border-border-muted">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">Fuel Transactions</h2>
              <p className="text-sm text-text-secondary mt-1">Track fuel usage and monitor efficiency</p>
            </div>
            <div className="flex gap-2">
              {/* Action: View Efficiency Report (secondary) */}
              <Button
                onClick={handleViewEfficiency}
                variant="secondary"
                size="md"
                className="inline-flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Efficiency Report
              </Button>
              {/* Action: Record Fuel Transaction (primary) */}
              <Button
                onClick={handleAddTransaction}
                variant="primary"
                size="md"
                className="inline-flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Transaction
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              <p className="mt-2 text-slate-600">Loading transactions...</p>
            </div>
          ) : (
            <FuelTransactionTable
              transactions={filteredTransactions}
              vehicles={vehicles}
              drivers={drivers}
              onEdit={handleEditTransaction}
              onDelete={handleDeleteTransaction}
              onViewEfficiency={handleViewEfficiency}
            />
          )}
        </div>
      </Card>

      {/* Modal for Create/Edit Transaction */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingTransaction ? 'Edit Fuel Transaction' : 'Record Fuel Transaction'}
      >
        <FuelTransactionForm
          onSave={handleSaveTransaction}
          onUpdate={handleUpdateTransaction}
          initialData={editingTransaction}
          vehicles={vehicles}
          drivers={drivers}
        />
      </Modal>

      {/* AI-Driven Efficiency Report Modal */}
      {showEfficiencyReport && (
        <Modal
          isOpen={showEfficiencyReport}
          onClose={handleCloseReport}
          title="AI-Driven Fuel Efficiency Analysis"
          size="large"
        >
          <FuelEfficiencyReport
            analysis={aiAnalysis}
            isLoading={isAnalyzing}
            error={analysisError}
            onClose={handleCloseReport}
            onConfigure={() => {
              handleCloseReport();
              setShowConfigModal(true);
            }}
          />
        </Modal>
      )}

      {/* OpenAI Configuration Modal */}
      {showConfigModal && (
        <OpenAIConfigModal
          onSave={handleConfigureOpenAI}
          onClose={() => setShowConfigModal(false)}
        />
      )}
    </div>
  );
}
