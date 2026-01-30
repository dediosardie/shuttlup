import { supabase } from '../supabaseClient';

export interface AuditLog {
  id: string;
  timestamp: string;
  user_email: string;
  action: string;
  details: string;
}

class AuditLogService {
  async getRecentLogs(_limit: number = 50): Promise<AuditLog[]> {
    try {
      // Fetch from auth.audit_log_entries if available
      // const { data: authLogs, error } = await supabase.auth.admin.listUsers();
      
      // For now, return empty array as audit logs require admin privileges
      // In production, you'd query your custom audit_logs table
      return [];
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
  }

  async createLog(action: string, details: string, changes?: { before?: any; after?: any }) {
    try {
      // Get user from localStorage (custom auth)
      const userEmail = localStorage.getItem('user_email');
      
      if (!userEmail) {
        console.warn('No authenticated user for audit log');
        return null;
      }

      // Enhance details with change information if provided
      let enhancedDetails = details;
      if (changes) {
        const changesList: string[] = [];
        
        if (changes.before && changes.after) {
          // Compare before and after to find changed fields
          const beforeObj = changes.before;
          const afterObj = changes.after;
          
          for (const key in afterObj) {
            if (beforeObj.hasOwnProperty(key) && beforeObj[key] !== afterObj[key]) {
              // Skip system fields
              if (!['id', 'created_at', 'updated_at'].includes(key)) {
                changesList.push(`${key}: "${beforeObj[key]}" → "${afterObj[key]}"`);
              }
            }
          }
        } else if (changes.after) {
          // New record - show created values
          const afterObj = changes.after;
          for (const key in afterObj) {
            if (!['id', 'created_at', 'updated_at'].includes(key) && afterObj[key] !== null && afterObj[key] !== '') {
              changesList.push(`${key}: "${afterObj[key]}"`);
            }
          }
        }
        
        if (changesList.length > 0) {
          enhancedDetails += ' | Changes: ' + changesList.join(', ');
        }
      }
      
      const logEntry = {
        user_email: userEmail,
        action,
        details: enhancedDetails,
        timestamp: new Date().toISOString()
      };

      // Save to audit_logs table
      const { data, error } = await supabase
        .from('audit_logs')
        .insert(logEntry)
        .select()
        .single();
      
      if (error) {
        console.error('Error saving audit log to database:', error);
        console.error('Failed log entry:', logEntry);
      } else {
        console.log('✅ Audit Log Saved:', logEntry);
      }
      
      return data || logEntry;
    } catch (error) {
      console.error('Exception creating audit log:', error);
      return null;
    }
  }
}

export const auditLogService = new AuditLogService();
