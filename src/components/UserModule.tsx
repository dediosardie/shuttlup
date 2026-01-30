import { useState, useEffect } from 'react';
import { User } from '../types';
import UserTable from './UserTable';
import UserForm from './UserForm';
import Modal from './Modal';
import { userService } from '../services/supabaseService';
import { notificationService } from '../services/notificationService';
import { auditLogService } from '../services/auditLogService';

export default function UserModule() {
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');

  useEffect(() => {
    loadUsers();
    getCurrentUserRole();
  }, []);

  const getCurrentUserRole = async () => {
    try {
      const userRole = localStorage.getItem('user_role');
      if (userRole) {
        setCurrentUserRole(userRole);
      }
    } catch (error) {
      console.error('Error getting current user role:', error);
    }
  };

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await userService.getAll();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Failed to load users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveUser = async (userData: Omit<User, 'id' | 'created_at' | 'updated_at'> & { password?: string }) => {
    try {
      // Validate password for new users
      if (!userData.password) {
        throw new Error('Password is required for new users');
      }
      
      const newUser = await userService.create(userData);
      setUsers([newUser, ...users]);
      setIsModalOpen(false);
      
      notificationService.success(
        'User Created',
        `${newUser.full_name} has been added to the system with login credentials`
      );
      await auditLogService.createLog(
        'User Created',
        `Created user ${newUser.full_name} (${newUser.email}) with role ${newUser.role}`
      );
    } catch (error: any) {
      console.error('Failed to save user:', error);
      notificationService.error('Failed to Create User', error.message || 'Unable to create user.');
      alert(error.message || 'Failed to save user. Please try again.');
    }
  };

  const handleUpdateUser = async (user: User) => {
    try {
      const { id, created_at, updated_at, ...updateData } = user;
      const updated = await userService.update(user.id, updateData);
      setUsers(users.map(u => u.id === updated.id ? updated : u));
      setIsModalOpen(false);
      setEditingUser(undefined);
      
      notificationService.success(
        'User Updated',
        `${updated.full_name}'s information has been updated`
      );
      await auditLogService.createLog(
        'User Updated',
        `Updated user ${updated.full_name} (${updated.email})`,
        { before: user, after: updated }
      );
    } catch (error: any) {
      console.error('Failed to update user:', error);
      notificationService.error('Failed to Update User', error.message || 'Unable to update user.');
      alert(error.message || 'Failed to update user. Please try again.');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    try {
      const user = users.find(u => u.id === id);
      await userService.delete(id);
      setUsers(users.filter(u => u.id !== id));
      
      notificationService.info(
        'User Deleted',
        `${user?.full_name || 'User'} has been removed from the system`
      );
      await auditLogService.createLog(
        'User Deleted',
        `Deleted user ${user?.full_name} (${user?.email})`
      );
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      notificationService.error('Failed to Delete User', error.message || 'Unable to delete user.');
      alert(error.message || 'Failed to delete user. Please try again.');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleAddUser = () => {
    setEditingUser(undefined);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(undefined);
  };

  const handleToggleStatus = async (user: User) => {
    try {
      const updated = await userService.update(user.id, { is_active: !user.is_active });
      setUsers(users.map(u => u.id === updated.id ? updated : u));
    } catch (error: any) {
      console.error('Failed to toggle user status:', error);
      alert(error.message || 'Failed to update user status. Please try again.');
    }
  };

  // Check if current user is admin (only admins can manage users based on RLS)
  const canManageUsers = currentUserRole === 'administration';

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Users</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{users.length}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Active</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{users.filter(u => u.is_active).length}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Admins</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{users.filter(u => u.role === 'admin').length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Inactive</p>
              <p className="text-2xl font-bold text-slate-600 mt-1">{users.filter(u => !u.is_active).length}</p>
            </div>
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">User Management</h2>
            <p className="text-sm text-slate-600 mt-1">Manage system users and access control</p>
          </div>
          {canManageUsers && (
            <button
              onClick={handleAddUser}
              className="inline-flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-md hover:shadow-lg font-medium text-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add User
            </button>
          )}
        </div>
        
        {!canManageUsers && (
          <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">You do not have permission to manage users. Only administrators can add, edit, or delete users.</p>
          </div>
        )}
        
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
        
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
              <p className="text-slate-600 mt-4">Loading users...</p>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <UserTable
              users={users}
              onDelete={canManageUsers ? handleDeleteUser : undefined}
              onEdit={canManageUsers ? handleEditUser : undefined}
              onToggleStatus={canManageUsers ? handleToggleStatus : undefined}
            />
          </div>
        )}
      </div>

      {canManageUsers && (
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingUser ? 'Edit User' : 'Add New User'}
        >
          <UserForm
            onSave={handleSaveUser}
            onUpdate={handleUpdateUser}
            initialData={editingUser}
          />
        </Modal>
      )}
    </div>
  );
}
