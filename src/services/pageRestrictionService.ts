import { supabase } from '../supabaseClient';
import { PageRestriction } from '../types';

/**
 * Page Restriction Service
 * Manages page-level access control for different user roles
 */

export const pageRestrictionService = {
  /**
   * Get all page restrictions
   */
  async getAll(): Promise<PageRestriction[]> {
    const { data, error } = await supabase
      .from('page_restrictions')
      .select('*')
      .order('page_name', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  /**
   * Get active page restrictions only
   */
  async getActive(): Promise<PageRestriction[]> {
    const { data, error } = await supabase
      .from('page_restrictions')
      .select('*')
      .eq('is_active', true)
      .order('page_name', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  /**
   * Get page restriction by ID
   */
  async getById(id: string): Promise<PageRestriction | null> {
    const { data, error } = await supabase
      .from('page_restrictions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Get page restriction by page name
   */
  async getByPageName(pageName: string): Promise<PageRestriction | null> {
    const { data, error } = await supabase
      .from('page_restrictions')
      .select('*')
      .eq('page_name', pageName)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  /**
   * Get page restriction by page path
   */
  async getByPagePath(pagePath: string): Promise<PageRestriction | null> {
    const { data, error } = await supabase
      .from('page_restrictions')
      .select('*')
      .eq('page_path', pagePath)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  /**
   * Check if a role has access to a specific page
   */
  async checkRoleAccess(pagePath: string, role: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('page_restrictions')
      .select('*')
      .eq('page_path', pagePath)
      .eq('is_active', true)
      .maybeSingle();
    
    if (error) throw error;
    if (!data) return false;

    // Map role to the corresponding access column
    const roleAccessMap: Record<string, keyof PageRestriction> = {
      'fleet_manager': 'fleet_manager_access',
      'maintenance_team': 'maintenance_team_access',
      'driver': 'driver_access',
      'administration': 'administration_access',
      'client_company_liaison': 'client_company_liaison_access',
    };

    const accessColumn = roleAccessMap[role];
    if (!accessColumn) return false;

    return data[accessColumn] === true;
  },

  /**
   * Create a new page restriction
   */
  async create(restriction: Omit<PageRestriction, 'id' | 'created_at' | 'updated_at'>): Promise<PageRestriction> {
    const { data, error } = await supabase
      .from('page_restrictions')
      .insert([restriction])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Update an existing page restriction
   */
  async update(id: string, restriction: Partial<Omit<PageRestriction, 'id' | 'created_at' | 'updated_at'>>): Promise<PageRestriction> {
    const { data, error } = await supabase
      .from('page_restrictions')
      .update(restriction)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Delete a page restriction
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('page_restrictions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  /**
   * Toggle active status of a page restriction
   */
  async toggleActive(id: string, isActive: boolean): Promise<PageRestriction> {
    return this.update(id, { is_active: isActive });
  },

  /**
   * Get pages accessible by a specific role
   */
  async getAccessiblePagesByRole(role: string): Promise<PageRestriction[]> {
    const roleAccessMap: Record<string, string> = {
      'fleet_manager': 'fleet_manager_access',
      'maintenance_team': 'maintenance_team_access',
      'driver': 'driver_access',
      'administration': 'administration_access',
      'client_company_liaison': 'client_company_liaison_access',
    };

    const accessColumn = roleAccessMap[role];
    if (!accessColumn) return [];

    const { data, error } = await supabase
      .from('page_restrictions')
      .select('*')
      .eq('is_active', true)
      .eq(accessColumn, true)
      .order('page_name', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  /**
   * Bulk update access for multiple pages
   */
  async bulkUpdateRoleAccess(
    pageIds: string[], 
    role: string, 
    hasAccess: boolean
  ): Promise<void> {
    const roleAccessMap: Record<string, string> = {
      'fleet_manager': 'fleet_manager_access',
      'maintenance_team': 'maintenance_team_access',
      'driver': 'driver_access',
      'administration': 'administration_access',
      'client_company_liaison': 'client_company_liaison_access',
    };

    const accessColumn = roleAccessMap[role];
    if (!accessColumn) throw new Error('Invalid role specified');

    const updates = pageIds.map(id => 
      this.update(id, { [accessColumn]: hasAccess })
    );

    await Promise.all(updates);
  },
};
