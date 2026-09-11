import express from 'express';
import RedefinicaoSenhaController from '../controllers/redefinicaosenhaController.js';

const router = express.Router();
const controller = new RedefinicaoSenhaController();

// Sem auth.validar aqui de propósito — quem tá pedindo isso NÃO está logado.
router.post("/esqueci-senha", (req, res) => controller.solicitar(req, res));
router.post("/redefinir-senha", (req, res) => controller.redefinir(req, res));

export default router;