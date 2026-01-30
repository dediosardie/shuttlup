import { useState, useEffect } from 'react';
import { User } from '../types';

interface UserFormProps {
  onSave: (user: Omit<User, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdate?: (user: User) => void;
  initialData?: User;
}

export default function UserForm({ onSave, onUpdate, initialData }: UserFormProps) {
  const [formData, setFormData] = useState<Omit<User, 'id' | 'created_at' | 'updated_at'> & { password?: string }>({
    email: initialData?.email || '',
    full_name: initialData?.full_name || '',
    role: initialData?.role || 'driver',
    is_active: initialData?.is_active ?? true,
    password: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        email: initialData.email,
        full_name: initialData.full_name,
        role: initialData.role,
        is_active: initialData.is_active,
        password: '',
      });
    } else {
      setFormData({
        email: '',
        full_name: '',
        role: 'driver',
        is_active: true,
        password: '',
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (initialData && onUpdate) {
      onUpdate({
        ...initialData,
        ...formData,
      });
    } else {
      onSave(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {/* Full Name */}
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-slate-700 mb-1.5">
            Full Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            id="full_name"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="Enter full name"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
            Email Address <span className="text-red-600">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="user@example.com"
          />
          <p className="mt-1 text-xs text-slate-500">Will be used for authentication</p>
        </div>

        {/* Password - Only for new users */}
        {!initialData && (
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
              Password <span className="text-red-600">*</span>
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required={!initialData}
              minLength={6}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Minimum 6 characters"
            />
            <p className="mt-1 text-xs text-slate-500">User will use this password to log in</p>
          </div>
        )}

        {/* Role */}
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-1.5">
            Role <span className="text-red-600">*</span>
          </label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            <option value="">Select a role</option>
            <option value="driver">Driver</option>
            <option value="maintenance_team">Maintenance Team</option>
            <option value="fleet_manager">Fleet Manager</option>
            <option value="administration">Administration</option>
            <option value="client_company_liaison">Client Company Liaison</option>
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Determines access level and permissions
          </p>
        </div>

        {/* Active Status */}
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500"
            />
          </div>
          <div className="ml-3">
            <label htmlFor="is_active" className="font-medium text-sm text-slate-700">
              Active User
            </label>
            <p className="text-xs text-slate-500">
              Inactive users cannot access the system
            </p>
          </div>
        </div>
      </div>

      {/* Role Permissions Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Role Permissions</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li><strong>Admin:</strong> Full system access, can manage users</li>
          <li><strong>Fleet Manager:</strong> Manage vehicles, trips, fuel tracking</li>
          <li><strong>Maintenance Manager:</strong> Manage maintenance, incidents, insurance</li>
          <li><strong>Driver:</strong> View assigned trips, log fuel transactions</li>
          <li><strong>Viewer:</strong> Read-only access to reports and data</li>
        </ul>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <button
          type="submit"
          className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-md hover:shadow-lg font-medium text-sm"
        >
          {initialData ? 'Update User' : 'Create User'}
        </button>
      </div>
    </form>
  );
}
