import express from 'express';
import PagamentoController from '../controllers/pagamentoController.js';
import AuthMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();
const auth = new AuthMiddleware();
const controller = new PagamentoController();

const acesso = [auth.validar.bind(auth), auth.permitir('ADMIN', 'ATENDENTE')];
router.get('/', ...acesso, (req, res) => controller.listar(req, res));
router.get('/fiado', ...acesso, (req, res) => controller.listarFiado(req, res));
router.post('/:id/quitar', ...acesso, (req, res) => controller.quitar(req, res));
router.post('/cliente/:idCliente/quitar', ...acesso, (req, res) => controller.quitarCliente(req, res));

export default router;
