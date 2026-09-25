import { supabase } from '../config/supabase.js';

export class HospitalService {
  /**
   * Normalize hospital code (uppercase, trim)
   */
  static normalizeCode(code) {
    return (code || '').trim().toUpperCase();
  }

  /**
   * Get all active hospitals
   */
  static async getActiveHospitals() {
    const { data, error } = await supabase
      .from('hospitals')
      .select('id, hospital_code, name, is_active, created_at')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch active hospitals: ${error.message}`);
    }
    return data || [];
  }

  /**
   * Get all hospitals (active & inactive) - for admin management
   */
  static async getAllHospitals() {
    const { data, error } = await supabase
      .from('hospitals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch hospitals: ${error.message}`);
    }
    return data || [];
  }

  /**
   * Check if a hospital ID is valid and currently active
   */
  static async validateHospitalCode(hospitalCode) {
    const code = this.normalizeCode(hospitalCode);
    if (!code) {
      return { isValid: false, message: 'Hospital ID is required.' };
    }

    const { data, error } = await supabase
      .from('hospitals')
      .select('id, hospital_code, name, is_active')
      .eq('hospital_code', code)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      throw new Error(`Database error verifying hospital code: ${error.message}`);
    }

    if (!data) {
      return {
        isValid: false,
        message: `Hospital ID '${code}' is invalid or currently inactive. Please contact hospital administration.`
      };
    }

    return {
      isValid: true,
      hospital: data
    };
  }

  /**
   * Add a new hospital ID
   */
  static async addHospital({ hospitalCode, name, isActive = true }) {
    const code = this.normalizeCode(hospitalCode);
    if (!code || !name) {
      throw new Error('Hospital ID and Name are required.');
    }

    const { data, error } = await supabase
      .from('hospitals')
      .insert([
        {
          hospital_code: code,
          name: name.trim(),
          is_active: isActive
        }
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error(`Hospital ID '${code}' already exists.`);
      }
      throw new Error(`Failed to add hospital: ${error.message}`);
    }

    return data;
  }

  /**
   * Update hospital status (enable/disable) or name
   */
  static async updateHospital(hospitalCode, { name, isActive }) {
    const code = this.normalizeCode(hospitalCode);
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (isActive !== undefined) updates.is_active = Boolean(isActive);

    const { data, error } = await supabase
      .from('hospitals')
      .update(updates)
      .eq('hospital_code', code)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to update hospital '${code}': ${error.message}`);
    }

    if (!data) {
      throw new Error(`Hospital ID '${code}' not found.`);
    }

    return data;
  }

  /**
   * Delete hospital ID from the database
   */
  static async deleteHospital(hospitalCode) {
    const code = this.normalizeCode(hospitalCode);
    const { data, error } = await supabase
      .from('hospitals')
      .delete()
      .eq('hospital_code', code)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to delete hospital '${code}': ${error.message}`);
    }

    if (!data) {
      throw new Error(`Hospital ID '${code}' not found.`);
    }

    return data;
  }
}
