import { Router } from 'express';
import * as videoController from '../controllers/videoController';

const router = Router();

router.get('/', videoController.getAllVideos);
router.get('/:filename/download', videoController.downloadVideo);
// Futuro: router.get('/:filename/stream', videoController.streamVideo);

export default router;