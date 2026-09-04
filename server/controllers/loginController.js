import AuthMiddleware from "../middlewares/authMiddleware.js";
import UsuarioService from "../services/usuarioService.js";

export default class LoginController {

    #service;

    constructor() {
        this.#service = new UsuarioService();
    }

    async token(req, res) {
        try {
            let { email, senha } = req.body;

            if (!email || !senha) {
                return res.status(400).json({ msg: "Informe e-mail e senha!" });
            }

            let usuario = await this.#service.validarLogin(email, senha);

            if (!usuario) {
                return res.status(401).json({ msg: "E-mail ou senha inválidos" });
            }

            let auth = new AuthMiddleware();
            let token = auth.token(usuario.id, usuario.nome, usuario.email, usuario.perfil);

            res.cookie("token", token, {
                httpOnly: true,
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
                maxAge: 8 * 60 * 60 * 1000 // 8h
            });

            return res.status(200).json({ usuario });
        } catch (error) {
            if (error?.status) return res.status(error.status).json({ msg: error.msg });
            console.error(error);
            return res.status(500).json({ msg: "Erro ao gerar token de acesso" });
        }
    }

    logout(req, res) {
        res.clearCookie("token", { httpOnly: true });
        return res.status(200).json({ msg: "Logout realizado" });
    }
}
