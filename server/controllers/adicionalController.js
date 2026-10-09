import AdicionalService from "../services/adicionalService.js";

export default class AdicionalController {

    #service;

    constructor() {
        this.#service = new AdicionalService();
    }

    async listar(req, res) {
        try {
            let adicionais = await this.#service.listar();
            return res.status(200).json(adicionais);
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    async obter(req, res) {
        try {
            let { id } = req.params;
            let adicional = await this.#service.obter(id);

            if (!adicional) return res.status(404).json({ msg: "Adicional não encontrado!" });

            return res.status(200).json(adicional);
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    async gravar(req, res) {
        try {
            let adicional = await this.#service.gravar(req.body);
            return res.status(201).json(adicional);
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    async atualizar(req, res) {
        try {
            let { id } = req.params;
            let adicional = await this.#service.atualizar(id, req.body);
            return res.status(200).json(adicional);
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    async inativar(req, res) {
        try {
            let { id } = req.params;
            await this.#service.inativar(id);
            return res.status(200).json({ msg: "Adicional inativado com sucesso" });
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    async excluir(req, res) {
        try {
            let { id } = req.params;
            await this.#service.excluir(id);
            return res.status(200).json({ msg: "Adicional excluído com sucesso" });
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    #tratarErro(res, error) {
        if (error?.status) {
            return res.status(error.status).json({ msg: error.msg });
        }
        console.error(error);
        if (error?.code === 'ER_NO_SUCH_TABLE' || error?.code === 'ER_BAD_FIELD_ERROR') {
            return res.status(503).json({ msg: "O banco ainda não tem a estrutura atual de adicionais. Confira o schema e aplique server/db/migrations/002-cardapio-opcoes-adicionais.sql no MySQL." });
        }
        return res.status(500).json({ msg: "Erro ao processar requisição" });
    }
}
