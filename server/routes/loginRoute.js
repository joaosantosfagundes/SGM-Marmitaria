import express from 'express';
import LoginController from '../controllers/loginController.js';
import AuthMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();
const controller = new LoginController();
const auth = new AuthMiddleware();

router.post("/", (req, res) => controller.token(req, res));

router.get("/usuario", auth.validar.bind(auth), (req, res) => {
    res.json(req.usuarioLogado);
});

router.post("/logout", (req, res) => controller.logout(req, res));

export default router;
