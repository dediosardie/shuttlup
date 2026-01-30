import { useState, useEffect } from 'react';
import { PageRestriction } from '../types';

interface PageRestrictionFormProps {
  initialData?: PageRestriction;
  onSubmit: (data: Omit<PageRestriction, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
}

export default function PageRestrictionForm({ initialData, onSubmit, onCancel }: PageRestrictionFormProps) {
  const [formData, setFormData] = useState({
    page_name: '',
    page_path: '',
    description: '',
    fleet_manager_access: false,
    maintenance_team_access: false,
    driver_access: false,
    administration_access: false,
    client_company_liaison_access: false,
    is_active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        page_name: initialData.page_name,
        page_path: initialData.page_path,
        description: initialData.description || '',
        fleet_manager_access: initialData.fleet_manager_access,
        maintenance_team_access: initialData.maintenance_team_access,
        driver_access: initialData.driver_access,
        administration_access: initialData.administration_access,
        client_company_liaison_access: initialData.client_company_liaison_access,
        is_active: initialData.is_active,
      });
    }
  }, [initialData]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.page_name.trim()) {
      newErrors.page_name = 'Page name is required';
    }

    if (!formData.page_path.trim()) {
      newErrors.page_path = 'Page path is required';
    } else if (!formData.page_path.startsWith('/')) {
      newErrors.page_path = 'Page path must start with /';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Page Name */}
        <div>
          <label htmlFor="page_name" className="block text-sm font-medium text-slate-700">
            Page Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="page_name"
            value={formData.page_name}
            onChange={(e) => handleChange('page_name', e.target.value)}
            className={`mt-1 block w-full rounded-md shadow-sm ${
              errors.page_name
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500'
            }`}
            placeholder="e.g., Dashboard"
          />
          {errors.page_name && (
            <p className="mt-1 text-sm text-red-600">{errors.page_name}</p>
          )}
        </div>

        {/* Page Path */}
        <div>
          <label htmlFor="page_path" className="block text-sm font-medium text-slate-700">
            Page Path <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="page_path"
            value={formData.page_path}
            onChange={(e) => handleChange('page_path', e.target.value)}
            className={`mt-1 block w-full rounded-md shadow-sm font-mono ${
              errors.page_path
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500'
            }`}
            placeholder="/example-page"
          />
          {errors.page_path && (
            <p className="mt-1 text-sm text-red-600">{errors.page_path}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Brief description of this page and its purpose"
        />
      </div>

      {/* Role Access Controls */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">
          Role Access Permissions
        </label>
        <div className="space-y-3 bg-slate-50 p-4 rounded-md">
          {/* Fleet Manager */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="fleet_manager_access"
              checked={formData.fleet_manager_access}
              onChange={(e) => handleChange('fleet_manager_access', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="fleet_manager_access" className="ml-3 text-sm text-slate-700">
              <span className="font-medium">Fleet Manager</span>
              <span className="text-slate-500 ml-2">- Oversee fleet operations</span>
            </label>
          </div>

          {/* Maintenance Team */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="maintenance_team_access"
              checked={formData.maintenance_team_access}
              onChange={(e) => handleChange('maintenance_team_access', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="maintenance_team_access" className="ml-3 text-sm text-slate-700">
              <span className="font-medium">Maintenance Team</span>
              <span className="text-slate-500 ml-2">- Perform maintenance and repairs</span>
            </label>
          </div>

          {/* Driver */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="driver_access"
              checked={formData.driver_access}
              onChange={(e) => handleChange('driver_access', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="driver_access" className="ml-3 text-sm text-slate-700">
              <span className="font-medium">Driver</span>
              <span className="text-slate-500 ml-2">- Operate vehicles and log activities</span>
            </label>
          </div>

          {/* Administration */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="administration_access"
              checked={formData.administration_access}
              onChange={(e) => handleChange('administration_access', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="administration_access" className="ml-3 text-sm text-slate-700">
              <span className="font-medium">Administration</span>
              <span className="text-slate-500 ml-2">- Manage backend operations</span>
            </label>
          </div>

          {/* Client-Company Liaison */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="client_company_liaison_access"
              checked={formData.client_company_liaison_access}
              onChange={(e) => handleChange('client_company_liaison_access', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="client_company_liaison_access" className="ml-3 text-sm text-slate-700">
              <span className="font-medium">Client-Company Liaison</span>
              <span className="text-slate-500 ml-2">- Coordinate with client companies</span>
            </label>
          </div>
        </div>
      </div>

      {/* Active Status */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) => handleChange('is_active', e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="is_active" className="ml-3 text-sm text-slate-700">
          <span className="font-medium">Active</span>
          <span className="text-slate-500 ml-2">- Enable this restriction</span>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {initialData ? 'Update Restriction' : 'Create Restriction'}
        </button>
      </div>
    </form>
  );
}
