import { useState, useEffect } from 'react';
import { pageRestrictionService } from '../services/pageRestrictionService';
import { useRoleAccess } from './useRoleAccess';

/**
 * Hook to check page access based on database page restrictions
 */
export function usePageAccess() {
  const { userRole } = useRoleAccess();
  const [pageAccessMap, setPageAccessMap] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPageAccess() {
      if (!userRole) {
        setLoading(false);
        return;
      }

      try {
        const accessiblePages = await pageRestrictionService.getAccessiblePagesByRole(userRole.role);
        const accessMap = new Map<string, boolean>();
        
        // Mark all accessible pages
        accessiblePages.forEach(page => {
          accessMap.set(page.page_path, true);
        });

        setPageAccessMap(accessMap);
      } catch (error) {
        console.error('Error loading page access:', error);
      } finally {
        setLoading(false);
      }
    }

    loadPageAccess();
  }, [userRole]);

  /**
   * Check if user has access to a specific page path
   */
  function hasPageAccess(pagePath: string): boolean {
    // If not loaded yet or no restrictions found, allow access (fail-open)
    if (loading || pageAccessMap.size === 0) {
      return true;
    }
    
    return pageAccessMap.get(pagePath) === true;
  }

  /**
   * Get all accessible page paths
   */
  function getAccessiblePages(): string[] {
    return Array.from(pageAccessMap.keys());
  }

  return {
    hasPageAccess,
    getAccessiblePages,
    loading,
  };
}
