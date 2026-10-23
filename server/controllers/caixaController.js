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

    async obterResumo(req, res) {
        try {
            return res.status(200).json(await this.#service.obterResumo(req.params.id));
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

    async fechar(req, res) {
        try {
            let caixa = await this.#service.fechar(req.body, req.usuarioLogado.id);
            return res.status(200).json(caixa);
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
