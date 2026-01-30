import { useState, useEffect } from 'react';
import { PageRestriction } from '../types';
import PageRestrictionTable from './PageRestrictionTable';
import PageRestrictionForm from './PageRestrictionForm';
import Modal from './Modal';
import { pageRestrictionService } from '../services/pageRestrictionService';
import { notificationService } from '../services/notificationService';
import { auditLogService } from '../services/auditLogService';
import { useRoleAccess } from '../hooks/useRoleAccess';

export default function PageRestrictionModule() {
  const [restrictions, setRestrictions] = useState<PageRestriction[]>([]);
  const [editingRestriction, setEditingRestriction] = useState<PageRestriction | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { userRole } = useRoleAccess();
  const currentUserRole = userRole?.role || '';

  // Check if user can add/edit/delete
  const canModify = currentUserRole === 'fleet_manager' || currentUserRole === 'administration';

  useEffect(() => {
    loadRestrictions();
  }, []);

  const loadRestrictions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await pageRestrictionService.getAll();
      setRestrictions(data);
    } catch (error) {
      console.error('Error loading page restrictions:', error);
      setError('Failed to load page restrictions. Please try again.');
      notificationService.error('Load Failed', 'Unable to load page restrictions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRestriction = async (
    data: Omit<PageRestriction, 'id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      const newRestriction = await pageRestrictionService.create(data);
      setRestrictions([newRestriction, ...restrictions]);
      setIsModalOpen(false);
      
      notificationService.success(
        'Restriction Created',
        `Page restriction for "${newRestriction.page_name}" has been created`
      );
      await auditLogService.createLog(
        'Page Restriction Created',
        `Created page restriction for ${newRestriction.page_name} (${newRestriction.page_path})`
      );
    } catch (error: any) {
      console.error('Failed to save page restriction:', error);
      notificationService.error(
        'Failed to Create Restriction',
        error.message || 'Unable to create page restriction.'
      );
      alert(error.message || 'Failed to save restriction. Please try again.');
    }
  };

  const handleUpdateRestriction = async (
    data: Omit<PageRestriction, 'id' | 'created_at' | 'updated_at'>
  ) => {
    if (!editingRestriction) return;

    try {
      const updated = await pageRestrictionService.update(editingRestriction.id, data);
      setRestrictions(restrictions.map(r => r.id === updated.id ? updated : r));
      setIsModalOpen(false);
      setEditingRestriction(undefined);
      
      notificationService.success(
        'Restriction Updated',
        `Page restriction for "${updated.page_name}" has been updated`
      );
      await auditLogService.createLog(
        'Page Restriction Updated',
        `Updated page restriction for ${updated.page_name} (${updated.page_path})`,
        { before: editingRestriction, after: updated }
      );
    } catch (error: any) {
      console.error('Failed to update page restriction:', error);
      notificationService.error(
        'Failed to Update Restriction',
        error.message || 'Unable to update page restriction.'
      );
      alert(error.message || 'Failed to update restriction. Please try again.');
    }
  };

  const handleDeleteRestriction = async (id: string) => {
    const restriction = restrictions.find(r => r.id === id);
    if (!restriction) return;

    try {
      await pageRestrictionService.delete(id);
      setRestrictions(restrictions.filter(r => r.id !== id));
      
      notificationService.success(
        'Restriction Deleted',
        `Page restriction for "${restriction.page_name}" has been deleted`
      );
      await auditLogService.createLog(
        'Page Restriction Deleted',
        `Deleted page restriction for ${restriction.page_name} (${restriction.page_path})`
      );
    } catch (error: any) {
      console.error('Failed to delete page restriction:', error);
      notificationService.error(
        'Failed to Delete Restriction',
        error.message || 'Unable to delete page restriction.'
      );
      alert(error.message || 'Failed to delete restriction. Please try again.');
    }
  };

  const handleEdit = (restriction: PageRestriction) => {
    setEditingRestriction(restriction);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingRestriction(undefined);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRestriction(undefined);
  };

  const handleFormSubmit = (data: Omit<PageRestriction, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingRestriction) {
      handleUpdateRestriction(data);
    } else {
      handleSaveRestriction(data);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading page restrictions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Page Restrictions</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage page-level access control for different user roles
          </p>
        </div>
        {canModify && (
          <button
            onClick={handleAddNew}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Add New Restriction
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              Page restrictions control which user roles can access specific pages in the system. 
              Enable or disable access for each role individually. Changes take effect immediately.
            </p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">Total Pages</dt>
                  <dd className="text-lg font-semibold text-slate-900">{restrictions.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">Active</dt>
                  <dd className="text-lg font-semibold text-slate-900">
                    {restrictions.filter(r => r.is_active).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">Inactive</dt>
                  <dd className="text-lg font-semibold text-slate-900">
                    {restrictions.filter(r => !r.is_active).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">Your Role</dt>
                  <dd className="text-sm font-medium text-slate-900 capitalize">
                    {currentUserRole.replace(/_/g, ' ')}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <PageRestrictionTable
          restrictions={restrictions}
          onEdit={handleEdit}
          onDelete={handleDeleteRestriction}
          currentUserRole={currentUserRole}
        />
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingRestriction ? 'Edit Page Restriction' : 'Add New Page Restriction'}
      >
        <PageRestrictionForm
          initialData={editingRestriction}
          onSubmit={handleFormSubmit}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
}
