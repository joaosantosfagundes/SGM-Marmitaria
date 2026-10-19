import express from 'express';
import EstoqueController from '../controllers/estoqueController.js';
import AuthMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();
const auth = new AuthMiddleware();
const controller = new EstoqueController();

router.get('/', auth.validar.bind(auth), auth.permitir('ADMIN', 'ATENDENTE', 'COZINHA'), (req, res) => {
    controller.listar(req, res);
});

router.get('/movimentacoes', auth.validar.bind(auth), auth.permitir('ADMIN', 'ATENDENTE', 'COZINHA'), (req, res) => {
    controller.listarMovimentacoes(req, res);
});

router.post('/movimentacoes', auth.validar.bind(auth), auth.permitir('ADMIN', 'COZINHA'), (req, res) => {
    controller.registrar(req, res);
});

export default router;
