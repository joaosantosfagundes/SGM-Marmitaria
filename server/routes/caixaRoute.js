import express from 'express';
import CaixaController from '../controllers/caixaController.js';
import AuthMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();
const auth = new AuthMiddleware();
const controller = new CaixaController();

router.get('/', auth.validar.bind(auth), auth.permitir('ADMIN', 'ATENDENTE'), (req, res) => {
    controller.listar(req, res);
});

router.get('/atual', auth.validar.bind(auth), auth.permitir('ADMIN', 'ATENDENTE'), (req, res) => {
    controller.obterAtual(req, res);
});

router.post('/abrir', auth.validar.bind(auth), auth.permitir('ADMIN', 'ATENDENTE'), (req, res) => {
    controller.abrir(req, res);
});

router.post('/fechar', auth.validar.bind(auth), auth.permitir('ADMIN', 'ATENDENTE'), (req, res) => {
    controller.fechar(req, res);
});

export default router;
