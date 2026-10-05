import CardapioService from "../services/cardapioService.js";

export default class CardapioController {
    #service;

    constructor() {
        this.#service = new CardapioService();
    }

    async obterPorData(req, res) {
        try {
            return res.status(200).json(await this.#service.obterPorData(req.query.data));
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    async salvar(req, res) {
        try {
            return res.status(200).json(await this.#service.salvar(req.body));
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    async copiar(req, res) {
        try {
            return res.status(200).json(await this.#service.copiar(req.body));
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    #tratarErro(res, error) {
        if (error?.status) return res.status(error.status).json({ msg: error.msg });
        console.error(error);
        if (error?.code === 'ER_NO_SUCH_TABLE' || error?.code === 'ER_BAD_FIELD_ERROR') {
            return res.status(503).json({
                msg: "O banco ainda não tem a estrutura atual do cardápio. Execute server/db/migrations/001-cardapio-preparacoes.sql no MySQL e tente novamente."
            });
        }
        return res.status(500).json({ msg: "Erro ao processar requisição" });
    }
}
