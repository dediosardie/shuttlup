import { User } from '../types';

interface UserTableProps {
  users: User[];
  onDelete?: (id: string) => void;
  onEdit?: (user: User) => void;
  onToggleStatus?: (user: User) => void;
}

export default function UserTable({ users, onDelete, onEdit, onToggleStatus }: UserTableProps) {
  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-slate-900">No users</h3>
        <p className="mt-1 text-sm text-slate-500">Get started by creating a new user.</p>
      </div>
    );
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'fleet_manager':
        return 'bg-blue-100 text-blue-800';
      case 'maintenance_team':
        return 'bg-emerald-100 text-emerald-800';
      case 'driver':
        return 'bg-amber-100 text-amber-800';
      case 'administration':
        return 'bg-purple-100 text-purple-800';
      case 'client_company_liaison':
        return 'bg-cyan-100 text-cyan-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const formatRoleName = (role: string) => {
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
              Full Name
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
              Email
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
              Role
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
              Created
            </th>
            {(onEdit || onDelete || onToggleStatus) && (
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-slate-900">{user.full_name}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-slate-700">{user.email}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                  {formatRoleName(user.role)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {user.is_active ? (
                  <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                ) : (
                  <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-800">
                    Inactive
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
              </td>
              {(onEdit || onDelete || onToggleStatus) && (
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    {onToggleStatus && (
                      <button
                        onClick={() => onToggleStatus(user)}
                        className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded ${
                          user.is_active
                            ? 'text-slate-700 bg-slate-100 hover:bg-slate-200'
                            : 'text-emerald-700 bg-emerald-100 hover:bg-emerald-200'
                        }`}
                        title={user.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                    {onEdit && (
                      <button
                        onClick={() => onEdit(user)}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                        title="Edit User"
                      >
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(user.id)}
                        className="text-red-600 hover:text-red-900 font-medium"
                        title="Delete User"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
