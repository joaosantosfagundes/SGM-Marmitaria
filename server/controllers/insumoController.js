import InsumoService from "../services/insumoService.js";

export default class InsumoController {

    #service;

    constructor() {
        this.#service = new InsumoService();
    }

    // Lista já com nome da categoria/unidade (pra tabela na tela)
    async listar(req, res) {
        try {
            let insumos = await this.#service.listarComDetalhes();
            return res.status(200).json(insumos);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ msg: "Erro ao processar requisição" });
        }
    }

    async obter(req, res) {
        try {
            let { id } = req.params;
            let insumo = await this.#service.obter(id);

            if (!insumo) return res.status(404).json({ msg: "Insumo não encontrado!" });

            return res.status(200).json(insumo);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ msg: "Erro ao processar requisição" });
        }
    }

    async gravar(req, res) {
        try {
            let insumo = await this.#service.gravar(req.body);
            return res.status(201).json(insumo);
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    async atualizar(req, res) {
        try {
            let { id } = req.params;
            let insumo = await this.#service.atualizar(id, req.body);
            return res.status(200).json(insumo);
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    async inativar(req, res) {
        try {
            let { id } = req.params;
            await this.#service.inativar(id);
            return res.status(200).json({ msg: "Insumo inativado com sucesso" });
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    #tratarErro(res, error) {
        if (error?.status) {
            return res.status(error.status).json({ msg: error.msg });
        }
        console.error(error);
        return res.status(500).json({ msg: "Erro ao processar requisição" });
    }
}