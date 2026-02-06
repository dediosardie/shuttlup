import { useState, useEffect } from 'react';
import { PageRestriction } from '../types';
import { Input, Textarea, Button } from './ui';

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
    passenger_access: false,
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
        passenger_access: initialData.passenger_access,
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
          <Input
            label={<>Page Name <span className="text-red-600">*</span></>}
            type="text"
            id="page_name"
            value={formData.page_name}
            onChange={(e) => handleChange('page_name', e.target.value)}
            placeholder="e.g., Dashboard"
            error={errors.page_name}
          />
        </div>

        {/* Page Path */}
        <div>
          <Input
            label={<>Page Path <span className="text-red-600">*</span></>}
            type="text"
            id="page_path"
            value={formData.page_path}
            onChange={(e) => handleChange('page_path', e.target.value)}
            className="font-mono"
            placeholder="/example-page"
            error={errors.page_path}
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <Textarea
          label="Description"
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
          placeholder="Brief description of this page and its purpose"
        />
      </div>

      {/* Role Access Controls */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-3">
          Role Access Permissions
        </label>
        <div className="space-y-3 bg-bg-elevated p-4 rounded-md">
          {/* Fleet Manager */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="fleet_manager_access"
              checked={formData.fleet_manager_access}
              onChange={(e) => handleChange('fleet_manager_access', e.target.checked)}
              className="h-4 w-4 rounded border-border-muted text-accent focus:ring-accent"
            />
            <label htmlFor="fleet_manager_access" className="ml-3 text-sm text-text-primary">
              <span className="font-medium">Fleet Manager</span>
              <span className="text-text-muted ml-2">- Oversee fleet operations</span>
            </label>
          </div>

          {/* Maintenance Team */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="maintenance_team_access"
              checked={formData.maintenance_team_access}
              onChange={(e) => handleChange('maintenance_team_access', e.target.checked)}
              className="h-4 w-4 rounded border-border-muted text-accent focus:ring-accent"
            />
            <label htmlFor="maintenance_team_access" className="ml-3 text-sm text-text-primary">
              <span className="font-medium">Maintenance Team</span>
              <span className="text-text-muted ml-2">- Perform maintenance and repairs</span>
            </label>
          </div>

          {/* Driver */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="driver_access"
              checked={formData.driver_access}
              onChange={(e) => handleChange('driver_access', e.target.checked)}
              className="h-4 w-4 rounded border-border-muted text-accent focus:ring-accent"
            />
            <label htmlFor="driver_access" className="ml-3 text-sm text-text-primary">
              <span className="font-medium">Driver</span>
              <span className="text-text-muted ml-2">- Operate vehicles and log activities</span>
            </label>
          </div>

          {/* Administration */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="administration_access"
              checked={formData.administration_access}
              onChange={(e) => handleChange('administration_access', e.target.checked)}
              className="h-4 w-4 rounded border-border-muted text-accent focus:ring-accent"
            />
            <label htmlFor="administration_access" className="ml-3 text-sm text-text-primary">
              <span className="font-medium">Administration</span>
              <span className="text-text-muted ml-2">- Manage backend operations</span>
            </label>
          </div>

          {/* Client-Company Liaison */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="client_company_liaison_access"
              checked={formData.client_company_liaison_access}
              onChange={(e) => handleChange('client_company_liaison_access', e.target.checked)}
              className="h-4 w-4 rounded border-border-muted text-accent focus:ring-accent"
            />
            <label htmlFor="client_company_liaison_access" className="ml-3 text-sm text-text-primary">
              <span className="font-medium">Client-Company Liaison</span>
              <span className="text-text-muted ml-2">- Coordinate with client companies</span>
            </label>
          </div>

          {/* Passenger */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="passenger_access"
              checked={formData.passenger_access}
              onChange={(e) => handleChange('passenger_access', e.target.checked)}
              className="h-4 w-4 rounded border-border-muted text-accent focus:ring-accent"
            />
            <label htmlFor="passenger_access" className="ml-3 text-sm text-text-primary">
              <span className="font-medium">Passenger</span>
              <span className="text-text-muted ml-2">- View transportation services and trip information</span>
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
          className="h-4 w-4 rounded border-border-muted text-accent focus:ring-accent"
        />
        <label htmlFor="is_active" className="ml-3 text-sm text-text-primary">
          <span className="font-medium">Active</span>
          <span className="text-text-muted ml-2">- Enable this restriction</span>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border-muted">
        <Button
          type="button"
          onClick={onCancel}
          variant="secondary"
          size="md"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="md"
        >
          {initialData ? 'Update Restriction' : 'Create Restriction'}
        </Button>
      </div>
    </form>
  );
}
