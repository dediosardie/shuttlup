import { User } from '../types';
import { Button, Badge } from './ui';

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
        <svg className="mx-auto h-12 w-12 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-text-primary">No users</h3>
        <p className="mt-1 text-sm text-text-secondary">Get started by creating a new user.</p>
      </div>
    );
  }

  const formatRoleName = (role: string) => {
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border-muted">
        <thead className="bg-bg-elevated">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              Full Name
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              Email
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              Role
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              Created
            </th>
            {(onEdit || onDelete || onToggleStatus) && (
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-bg-secondary divide-y divide-border-muted">
          {users.map((user) => (
            <tr 
              key={user.id} 
              className="hover:bg-bg-elevated transition-colors cursor-pointer"
              onDoubleClick={() => onEdit?.(user)}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-accent to-accent-hover rounded-full flex items-center justify-center">
                    <span className="text-black font-semibold text-sm">
                      {user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-text-primary">{user.full_name}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-text-primary">{user.email}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge variant={
                  user.role === 'fleet_manager' ? 'accent' :
                  user.role === 'maintenance_team' ? 'success' :
                  user.role === 'driver' ? 'warning' :
                  user.role === 'administration' ? 'accent' :
                  user.role === 'client_company_liaison' ? 'accent' :
                  'default'
                }>
                  {formatRoleName(user.role)}
                </Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {user.is_active ? (
                  <Badge variant="success">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="danger">
                    Inactive
                  </Badge>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
              </td>
              {(onEdit || onDelete || onToggleStatus) && (
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {user.email !== 'dediosardie11@gmail.com' ? (
                    <div className="flex items-center justify-end gap-2">
                      {onToggleStatus && (
                        <Button
                          onClick={() => onToggleStatus(user)}
                          variant={user.is_active ? 'secondary' : 'primary'}
                          size="sm"
                          title={user.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {user.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      )}
                      {onEdit && (
                        <Button
                          onClick={() => onEdit(user)}
                          variant="ghost"
                          size="sm"
                          title="Edit User"
                        >
                          Edit
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          onClick={() => onDelete(user.id)}
                          variant="danger"
                          size="sm"
                          title="Delete User"
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-text-muted italic">Protected</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
