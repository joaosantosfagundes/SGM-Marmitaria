import express from 'express';
import UnidadeController from '../controllers/unidadeController.js';
import AuthMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();
const auth = new AuthMiddleware();
const controller = new UnidadeController();

// Só leitura — qualquer usuário logado pode ver (é usado pra popular <select> no front)
router.get("/", auth.validar.bind(auth), (req, res) => controller.listar(req, res));

export default router;
