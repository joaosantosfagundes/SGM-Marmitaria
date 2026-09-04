import UsuarioService from "../services/usuarioService.js";

export default class UsuarioController {

    #service;

    constructor() {
        this.#service = new UsuarioService();
    }

    async listar(req, res) {
        try {
            let usuarios = await this.#service.listar();
            return res.status(200).json(usuarios);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ msg: "Erro ao processar requisição" });
        }
    }

    async obter(req, res) {
        try {
            let { id } = req.params;
            let usuario = await this.#service.obter(id);

            if (!usuario) return res.status(404).json({ msg: "Usuário não encontrado!" });

            return res.status(200).json(usuario);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ msg: "Erro ao processar requisição" });
        }
    }

    async gravar(req, res) {
        try {
            let usuario = await this.#service.criar(req.body);
            return res.status(201).json(usuario);
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    async atualizar(req, res) {
        try {
            let { id } = req.params;
            let usuario = await this.#service.atualizar(id, req.body);
            return res.status(200).json(usuario);
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    async inativar(req, res) {
        try {
            let { id } = req.params;
            await this.#service.inativar(id);
            return res.status(200).json({ msg: "Usuário inativado com sucesso" });
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
