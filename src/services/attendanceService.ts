import { supabase } from '../supabaseClient';
import { DriverAttendance } from '../types';

export const attendanceService = {
  /**
   * Get all attendance records for a specific driver
   */
  async getDriverAttendance(driverId: string): Promise<DriverAttendance[]> {
    const { data, error } = await supabase
      .from('driver_attendance')
      .select('*')
      .eq('driver_id', driverId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get today's attendance records for a driver
   */
  async getTodayAttendance(driverId: string): Promise<DriverAttendance[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('driver_attendance')
      .select('*')
      .eq('driver_id', driverId)
      .eq('attendance_date', today)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Check if driver has already logged in today (without logging out)
   */
  async hasActiveLogin(driverId: string): Promise<boolean> {
    const todayRecords = await this.getTodayAttendance(driverId);
    
    if (todayRecords.length === 0) return false;
    
    // Check if the latest record is a login
    const latestRecord = todayRecords[0];
    return latestRecord.action_type === 'login';
  },

  /**
   * Create attendance record
   */
  async createAttendance(
    driverId: string,
    actionType: 'login' | 'logout',
    imageFile?: File,
    latitude?: number,
    longitude?: number
  ): Promise<DriverAttendance> {
    let imageUrl: string | undefined;

    // Upload image to Supabase Storage if provided
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${driverId}_${Date.now()}.${fileExt}`;
      const filePath = `attendance/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('driver-attendance')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Image upload error:', uploadError);
        throw new Error('Failed to upload image');
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('driver-attendance')
        .getPublicUrl(filePath);

      imageUrl = urlData.publicUrl;
    }

    // Create attendance record
    const attendanceData = {
      driver_id: driverId,
      action_type: actionType,
      attendance_date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      image_url: imageUrl,
      latitude,
      longitude,
    };

    const { data, error } = await supabase
      .from('driver_attendance')
      .insert([attendanceData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get attendance records for a date range
   */
  async getAttendanceByDateRange(
    driverId: string,
    startDate: string,
    endDate: string
  ): Promise<DriverAttendance[]> {
    const { data, error } = await supabase
      .from('driver_attendance')
      .select('*')
      .eq('driver_id', driverId)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get all attendance records (for admin/manager)
   */
  async getAllAttendance(): Promise<DriverAttendance[]> {
    const { data, error } = await supabase
      .from('driver_attendance')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};
