import ClienteService from "../services/clienteService.js";

export default class ClienteController{

    #service;

    constructor(){
        this.#service = new ClienteService();
    }

    async listar(req, res) {
        try {
            let cliente = await this.#service.listar();
            return res.status(200).json(cliente);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ msg: "Erro ao processar requisição" });
        }
    }

    async obter(req, res) {
        try {
            let { id } = req.params;
            let cliente = await this.#service.obter(id);

            if (!cliente) return res.status(404).json({ msg: "Cliente não encontrado!" });

            return res.status(200).json(cliente);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ msg: "Erro ao processar requisição" });
        }
    }

    async gravar(req, res) {
        try {
            let cliente = await this.#service.criar(req.body);
            return res.status(201).json(cliente);
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    async atualizar(req, res) {
        try {
            let { id } = req.params;
            let cliente = await this.#service.atualizar(id, req.body);
            return res.status(200).json(cliente);
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    async inativar(req, res) {
        try {
            let { id } = req.params;
            await this.#service.inativar(id);
            return res.status(200).json({ msg: "Cliente inativado com sucesso" });
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    async excluir(req, res) {
        try {
            let { id } = req.params;
            await this.#service.excluir(id);
            return res.status(200).json({ msg: "Cliente excluído com sucesso" });
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