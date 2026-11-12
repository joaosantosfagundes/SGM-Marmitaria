import express from 'express';
import DashboardController from '../controllers/dashboardController.js';
import AuthMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();
const auth = new AuthMiddleware();
const controller = new DashboardController();

router.get('/resumo', auth.validar.bind(auth), auth.permitir('ADMIN', 'ATENDENTE', 'COZINHA'),
    (req, res) => controller.resumo(req, res));

export default router;
