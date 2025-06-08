import { Router } from 'express';
import * as adminController from '../controllers/adminController';

const router = Router();
router.post('/sync-videos', adminController.triggerSync);
export default router;