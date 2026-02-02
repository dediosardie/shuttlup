import { Vehicle, Driver, Maintenance } from './types';
import { supabase } from './supabaseClient';

// Vehicle operations
export const vehicleStorage = {
  async getAll(): Promise<Vehicle[]> {
    try {
      console.log('Fetching vehicles from Supabase...');
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Supabase error fetching vehicles:', error);
        throw error;
      }
      console.log('Successfully fetched vehicles:', data?.length || 0);
      return (data || []) as Vehicle[];
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      return [];
    }
  },

  async save(vehicle: Vehicle): Promise<Vehicle> {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .insert([vehicle as any])
        .select()
        .single();
      
      if (error) throw error;
      return data as Vehicle;
    } catch (error) {
      console.error('Error saving vehicle:', error);
      throw error;
    }
  },

  async update(vehicle: Vehicle): Promise<Vehicle> {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .update(vehicle as any)
        .eq('id', vehicle.id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Vehicle;
    } catch (error) {
      console.error('Error updating vehicle:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      throw error;
    }
  },
};

// Driver operations
export const driverStorage = {
  async getAll(): Promise<Driver[]> {
    try {
      console.log('Fetching drivers from Supabase...');
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Supabase error fetching drivers:', error);
        throw error;
      }
      console.log('Successfully fetched drivers:', data?.length || 0);
      return (data || []) as Driver[];
    } catch (error) {
      console.error('Error fetching drivers:', error);
      return [];
    }
  },

  async save(driver: Omit<Driver, 'id'>): Promise<Driver> {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .insert([driver as any])
        .select()
        .single();
      
      if (error) throw error;
      return data as Driver;
    } catch (error) {
      console.error('Error saving driver:', error);
      throw error;
    }
  },

  async update(driver: Driver): Promise<Driver> {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .update(driver as any)
        .eq('id', driver.id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Driver;
    } catch (error) {
      console.error('Error updating driver:', error);
      throw error;
    }
  },

  async suspend(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('drivers')
        .update({ status: 'suspended' } as any)
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error suspending driver:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting driver:', error);
      throw error;
    }
  },
};

// Maintenance operations
export const maintenanceStorage = {
  async getAll(): Promise<Maintenance[]> {
    try {
      console.log('Fetching maintenance records from Supabase...');
      const { data, error } = await supabase
        .from('maintenance')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Supabase error fetching maintenance records:', error);
        throw error;
      }
      console.log('Successfully fetched maintenance records:', data?.length || 0);
      return (data || []) as Maintenance[];
    } catch (error) {
      console.error('Error fetching maintenance records:', error);
      return [];
    }
  },

  async save(maintenance: Omit<Maintenance, 'id'>): Promise<Maintenance> {
    try {
      const { data, error } = await supabase
        .from('maintenance')
        .insert([maintenance as any])
        .select()
        .single();
      
      if (error) throw error;
      return data as Maintenance;
    } catch (error) {
      console.error('Error saving maintenance:', error);
      throw error;
    }
  },

  async update(maintenance: Maintenance): Promise<Maintenance> {
    try {
      const { data, error } = await supabase
        .from('maintenance')
        .update(maintenance as any)
        .eq('id', maintenance.id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Maintenance;
    } catch (error) {
      console.error('Error updating maintenance:', error);
      throw error;
    }
  },

  async markCompleted(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('maintenance')
        .update({ status: 'completed' } as any)
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error marking maintenance as completed:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('maintenance')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting maintenance:', error);
      throw error;
    }
  },
};
