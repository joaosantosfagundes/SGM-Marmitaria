import PedidoService from "../services/pedidoService.js";

export default class PedidoController {
    #service;

    constructor() {
        this.#service = new PedidoService();
    }

    async listar(req, res) {
        try {
            return res.status(200).json(await this.#service.listar(req.query));
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    async obter(req, res) {
        try {
            return res.status(200).json(await this.#service.obter(req.params.id));
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    async criar(req, res) {
        try {
            return res.status(201).json(await this.#service.criar(req.body, req.usuarioLogado.id));
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    async alterarStatus(req, res) {
        try {
            return res.status(200).json(await this.#service.alterarStatus(req.params.id, req.body?.status, req.usuarioLogado.perfil));
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    async cancelar(req, res) {
        try {
            return res.status(200).json(await this.#service.cancelar(req.params.id, req.body?.motivo, req.usuarioLogado.id));
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
