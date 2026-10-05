import express from 'express';
import CardapioController from '../controllers/cardapioController.js';
import AuthMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();
const auth = new AuthMiddleware();
const controller = new CardapioController();

router.get('/', auth.validar.bind(auth), auth.permitir('ADMIN', 'ATENDENTE'), (req, res) => {
    controller.obterPorData(req, res);
});

router.put('/', auth.validar.bind(auth), auth.permitir('ADMIN', 'ATENDENTE'), (req, res) => {
    controller.salvar(req, res);
});

router.post('/copiar', auth.validar.bind(auth), auth.permitir('ADMIN', 'ATENDENTE'), (req, res) => {
    controller.copiar(req, res);
});

export default router;
