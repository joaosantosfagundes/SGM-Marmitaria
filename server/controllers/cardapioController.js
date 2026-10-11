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
        return res.status(500).json({ msg: "Erro ao processar requisição" });
    }
}
