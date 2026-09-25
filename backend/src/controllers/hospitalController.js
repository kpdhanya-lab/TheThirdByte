import { HospitalService } from '../services/hospitalService.js';

export class HospitalController {
  static async getActiveHospitals(req, res) {
    try {
      const hospitals = await HospitalService.getActiveHospitals();
      return res.status(200).json({ success: true, data: hospitals });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getAllHospitals(req, res) {
    try {
      const hospitals = await HospitalService.getAllHospitals();
      return res.status(200).json({ success: true, data: hospitals });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  static async validateHospital(req, res) {
    try {
      const { hospitalCode } = req.body;
      const result = await HospitalService.validateHospitalCode(hospitalCode);
      if (!result.isValid) {
        return res.status(400).json({ success: false, message: result.message });
      }
      return res.status(200).json({ success: true, data: result.hospital });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  static async addHospital(req, res) {
    try {
      const { hospitalCode, name, isActive } = req.body;
      const created = await HospitalService.addHospital({ hospitalCode, name, isActive });
      return res.status(201).json({ success: true, message: 'Hospital added successfully', data: created });
    } catch (err) {
      const status = err.message.includes('already exists') ? 409 : 400;
      return res.status(status).json({ success: false, error: err.message });
    }
  }

  static async updateHospital(req, res) {
    try {
      const { code } = req.params;
      const updated = await HospitalService.updateHospital(code, req.body);
      return res.status(200).json({ success: true, message: 'Hospital updated successfully', data: updated });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  static async deleteHospital(req, res) {
    try {
      const { code } = req.params;
      const deleted = await HospitalService.deleteHospital(code);
      return res.status(200).json({ success: true, message: `Hospital '${code}' removed successfully`, data: deleted });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }
}
