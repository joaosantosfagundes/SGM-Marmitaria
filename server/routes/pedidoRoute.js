import express from 'express';
import PedidoController from '../controllers/pedidoController.js';
import AuthMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();
const auth = new AuthMiddleware();
const controller = new PedidoController();

router.get('/', auth.validar.bind(auth), auth.permitir('ADMIN', 'ATENDENTE', 'COZINHA'), (req, res) => {
    controller.listar(req, res);
});
router.get('/:id', auth.validar.bind(auth), auth.permitir('ADMIN', 'ATENDENTE', 'COZINHA'), (req, res) => {
    controller.obter(req, res);
});
router.post('/', auth.validar.bind(auth), auth.permitir('ADMIN', 'ATENDENTE'), (req, res) => {
    controller.criar(req, res);
});

export default router;
