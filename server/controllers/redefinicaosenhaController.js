import UsuarioService from "../services/usuarioService.js";

export default class RedefinicaoSenhaController {

    #service;

    constructor() {
        this.#service = new UsuarioService();
    }

    async solicitar(req, res) {
        try {
            let { email } = req.body;

            if (!email) {
                return res.status(400).json({ msg: "Informe o e-mail" });
            }

            await this.#service.solicitarRedefinicao(email);

            // Mensagem sempre igual, exista o e-mail ou não (ver comentário no service)
            return res.status(200).json({
                msg: "Se esse e-mail estiver cadastrado, enviamos um link de redefinição."
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ msg: "Erro ao processar requisição" });
        }
    }

    async redefinir(req, res) {
        try {
            let { token, novaSenha } = req.body;

            await this.#service.redefinirSenha(token, novaSenha);

            return res.status(200).json({ msg: "Senha redefinida com sucesso. Faça login com a nova senha." });
        } catch (error) {
            if (error?.status) {
                return res.status(error.status).json({ msg: error.msg });
            }
            console.error(error);
            return res.status(500).json({ msg: "Erro ao processar requisição" });
        }
    }
}