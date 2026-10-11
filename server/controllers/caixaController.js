import CaixaService from "../services/caixaService.js";

export default class CaixaController {
    #service;

    constructor() {
        this.#service = new CaixaService();
    }

    async listar(req, res) {
        try {
            return res.status(200).json(await this.#service.listar());
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    async obterAtual(req, res) {
        try {
            return res.status(200).json(await this.#service.obterAtual());
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    async abrir(req, res) {
        try {
            let caixa = await this.#service.abrir(req.body, req.usuarioLogado.id);
            return res.status(201).json(caixa);
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    #tratarErro(res, error) {
        if (error?.status) return res.status(error.status).json({ msg: error.msg });
        console.error(error);
        if (error?.code === 'ER_NO_SUCH_TABLE' || error?.code === 'ER_BAD_FIELD_ERROR') {
            return res.status(503).json({ msg: "O banco ainda não tem a estrutura atual do caixa. Aplique server/db/migrations/004-caixa.sql no banco configurado e tente novamente." });
        }
        return res.status(500).json({ msg: "Erro ao processar requisição" });
    }
}
