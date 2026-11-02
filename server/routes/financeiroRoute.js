import express from 'express';
import FinanceiroController from '../controllers/financeiroController.js';
import AuthMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router(), auth = new AuthMiddleware(), controller = new FinanceiroController();
router.get('/', auth.validar.bind(auth), auth.permitir('ADMIN', 'ATENDENTE'), (req, res) => controller.listar(req, res));
router.post('/', auth.validar.bind(auth), auth.permitir('ADMIN'), (req, res) => controller.criar(req, res));
router.put('/:id', auth.validar.bind(auth), auth.permitir('ADMIN'), (req, res) => controller.atualizar(req, res));
router.delete('/:id', auth.validar.bind(auth), auth.permitir('ADMIN'), (req, res) => controller.excluir(req, res));
export default router;
