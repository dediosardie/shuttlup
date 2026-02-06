import { PageRestriction } from '../types';
import { Badge, Button } from './ui';

interface PageRestrictionTableProps {
  restrictions: PageRestriction[];
  onEdit: (restriction: PageRestriction) => void;
  onDelete: (id: string) => void;
  currentUserRole: string;
}

export default function PageRestrictionTable({ 
  restrictions, 
  onEdit, 
  onDelete,
  currentUserRole 
}: PageRestrictionTableProps) {
  
  const canModify = currentUserRole === 'fleet_manager' || currentUserRole === 'administration';

  const getRoleAccessBadge = (hasAccess: boolean) => {
    if (hasAccess) {
      return (
        <Badge variant="success">
          ✓ Allowed
        </Badge>
      );
    }
    return (
      <Badge variant="danger">
        ✗ Denied
      </Badge>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <Badge variant="accent">
          Active
        </Badge>
      );
    }
    return (
      <Badge variant="default">
        Inactive
      </Badge>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border-muted">
        <thead className="bg-bg-elevated">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              Page Name
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              Path
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              Fleet Manager
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              Maintenance Team
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              Driver
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              Administration
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              Client Liaison
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              Passenger
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              Status
            </th>
            {canModify && (
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-bg-secondary divide-y divide-border-muted">
          {restrictions.length === 0 ? (
            <tr>
              <td colSpan={canModify ? 10 : 9} className="px-6 py-4 text-center text-sm text-text-muted">
                No page restrictions found
              </td>
            </tr>
          ) : (
            restrictions.map((restriction) => (
              <tr 
                key={restriction.id} 
                className="hover:bg-bg-elevated cursor-pointer transition-colors"
                onDoubleClick={() => onEdit(restriction)}
                title="Double-click to edit"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-text-primary">
                    {restriction.page_name}
                  </div>
                  {restriction.description && (
                    <div className="text-xs text-text-muted mt-1">
                      {restriction.description}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-text-primary font-mono">
                    {restriction.page_path}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getRoleAccessBadge(restriction.fleet_manager_access)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getRoleAccessBadge(restriction.maintenance_team_access)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getRoleAccessBadge(restriction.driver_access)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getRoleAccessBadge(restriction.administration_access)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getRoleAccessBadge(restriction.client_company_liaison_access)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getRoleAccessBadge(restriction.passenger_access)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(restriction.is_active)}
                </td>
                {canModify && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        onClick={() => onEdit(restriction)}
                        variant="ghost"
                        size="sm"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete the restriction for "${restriction.page_name}"?`)) {
                            onDelete(restriction.id);
                          }
                        }}
                        variant="danger"
                        size="sm"
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
