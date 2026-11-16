import express from 'express';
import BackupController from '../controllers/backupController.js';
import AuthMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router(), auth = new AuthMiddleware(), controller = new BackupController();
router.get('/', auth.validar.bind(auth), auth.permitir('ADMIN'), (req, res) => controller.baixar(req, res));

export default router;
