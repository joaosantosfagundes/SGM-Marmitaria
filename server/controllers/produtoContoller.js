import ProdutoService from "../services/produtoService.js";

export default class ProdutoController {

    #service;

    constructor() {
        this.#service = new ProdutoService();
    }

    async listar(req, res) {
        try {
            let produtos = await this.#service.listar();
            return res.status(200).json(produtos);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ msg: "Erro ao processar requisição" });
        }
    }

    async obter(req, res) {
        try {
            let { id } = req.params;
            let produto = await this.#service.obter(id);

            if (!produto) return res.status(404).json({ msg: "Produto não encontrado!" });

            return res.status(200).json(produto);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ msg: "Erro ao processar requisição" });
        }
    }

    async gravar(req, res) {
        try {
            let produto = await this.#service.gravar(req.body);
            return res.status(201).json(produto);
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    async atualizar(req, res) {
        try {
            let { id } = req.params;
            let produto = await this.#service.atualizar(id, req.body);
            return res.status(200).json(produto);
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    async inativar(req, res) {
        try {
            let { id } = req.params;
            await this.#service.inativar(id);
            return res.status(200).json({ msg: "Produto inativado com sucesso" });
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