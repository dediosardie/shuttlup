import { PageRestriction } from '../types';

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
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
          ✓ Allowed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800">
        ✗ Denied
      </span>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
        Inactive
      </span>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Page Name
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Path
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Fleet Manager
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Maintenance Team
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Driver
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Administration
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Client Liaison
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Status
            </th>
            {canModify && (
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {restrictions.length === 0 ? (
            <tr>
              <td colSpan={canModify ? 9 : 8} className="px-6 py-4 text-center text-sm text-slate-500">
                No page restrictions found
              </td>
            </tr>
          ) : (
            restrictions.map((restriction) => (
              <tr key={restriction.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-slate-900">
                    {restriction.page_name}
                  </div>
                  {restriction.description && (
                    <div className="text-xs text-slate-500 mt-1">
                      {restriction.description}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-600 font-mono">
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
                  {getStatusBadge(restriction.is_active)}
                </td>
                {canModify && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onEdit(restriction)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete the restriction for "${restriction.page_name}"?`)) {
                          onDelete(restriction.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
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
