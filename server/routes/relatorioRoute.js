import express from 'express';
import RelatorioController from '../controllers/relatorioController.js';
import AuthMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();
const auth = new AuthMiddleware();
const controller = new RelatorioController();

router.use(auth.validar.bind(auth), auth.permitir('ADMIN', 'ATENDENTE'));

router.get('/vendas', (req, res) => controller.vendas(req, res));
router.get('/estoque', (req, res) => controller.estoque(req, res));
router.get('/produtos-mais-vendidos', (req, res) => controller.produtosMaisVendidos(req, res));

export default router;
