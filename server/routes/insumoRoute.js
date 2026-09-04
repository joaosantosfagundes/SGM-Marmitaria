import express from 'express';
import InsumoController from '../controllers/insumoController.js';
import AuthMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();
const auth = new AuthMiddleware();
const controller = new InsumoController();

router.get("/", auth.validar.bind(auth), (req, res) => {
    controller.listar(req, res);
});

router.get("/:id", auth.validar.bind(auth), (req, res) => {
    controller.obter(req, res);
});

router.post("/", auth.validar.bind(auth), auth.permitir('ADMIN'), (req, res) => {
    controller.gravar(req, res);
});

router.put("/:id", auth.validar.bind(auth), auth.permitir('ADMIN'), (req, res) => {
    controller.atualizar(req, res);
});

router.delete("/:id", auth.validar.bind(auth), auth.permitir('ADMIN'), (req, res) => {
    controller.inativar(req, res);
});

export default router;