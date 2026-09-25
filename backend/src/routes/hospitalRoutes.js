import { Router } from 'express';
import { HospitalController } from '../controllers/hospitalController.js';

const router = Router();

// Public routes for portal
router.get('/', HospitalController.getActiveHospitals);
router.post('/validate', HospitalController.validateHospital);

// Dynamic Hospital ID management (Add / Delete / Update)
router.get('/all', HospitalController.getAllHospitals);
router.post('/', HospitalController.addHospital);
router.put('/:code', HospitalController.updateHospital);
router.delete('/:code', HospitalController.deleteHospital);

export default router;
