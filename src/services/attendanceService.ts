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
   * Create attendance record with structured image upload
   */
  async createAttendance(
    driverId: string,
    actionType: 'login' | 'logout',
    imageFile?: File,
    latitude?: number,
    longitude?: number
  ): Promise<DriverAttendance> {
    let imageUrl: string | undefined;

    // Upload image to Supabase Storage with proper structure if provided
    if (imageFile) {
      try {
        // Get current date components for organized folder structure
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        
        // Create structured path: attendance/{year}/{month}/{day}/{driverId}_{timestamp}_{action}.jpg
        // Example: attendance/2026/02/04/driver-123_1707064325847_login.jpg
        const timestamp = now.getTime();
        const fileExt = imageFile.type.split('/')[1] || 'jpg';
        const fileName = `${driverId}_${timestamp}_${actionType}.${fileExt}`;
        const filePath = `attendance/${year}/${month}/${day}/${fileName}`;

        console.log('📤 Uploading attendance image:', filePath);

        // Upload to Supabase Storage bucket
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('driver-attendance')
          .upload(filePath, imageFile, {
            cacheControl: '31536000', // Cache for 1 year
            upsert: false,
            contentType: imageFile.type,
          });

        if (uploadError) {
          console.error('❌ Image upload error:', uploadError);
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        }

        console.log('✅ Image uploaded successfully:', uploadData);

        // Get public URL for the uploaded image
        const { data: urlData } = supabase.storage
          .from('driver-attendance')
          .getPublicUrl(filePath);

        imageUrl = urlData.publicUrl;
        console.log('🔗 Image URL:', imageUrl);
      } catch (error) {
        console.error('❌ Image upload failed:', error);
        throw new Error('Failed to upload attendance image. Please try again.');
      }
    }

    // Create attendance record in database
    const attendanceData = {
      driver_id: driverId,
      action_type: actionType,
      attendance_date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      image_url: imageUrl,
      latitude,
      longitude,
    };

    console.log('💾 Creating attendance record:', attendanceData);

    const { data, error } = await supabase
      .from('driver_attendance')
      .insert([attendanceData])
      .select()
      .single();

    if (error) {
      console.error('❌ Database insert error:', error);
      throw error;
    }

    console.log('✅ Attendance record created:', data);
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
