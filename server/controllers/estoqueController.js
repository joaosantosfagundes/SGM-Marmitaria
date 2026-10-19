import EstoqueService from "../services/estoqueService.js";

export default class EstoqueController {
    #service;

    constructor() {
        this.#service = new EstoqueService();
    }

    async listar(req, res) {
        try {
            return res.status(200).json(await this.#service.listar());
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    async listarMovimentacoes(req, res) {
        try {
            let { idInsumo, limite } = req.query;
            return res.status(200).json(await this.#service.listarMovimentacoes(idInsumo, limite));
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    async registrar(req, res) {
        try {
            let resultado = await this.#service.registrar(req.body, req.usuarioLogado.id);
            return res.status(201).json(resultado);
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
