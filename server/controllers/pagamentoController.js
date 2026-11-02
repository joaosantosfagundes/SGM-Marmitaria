import PagamentoService from '../services/pagamentoService.js';

export default class PagamentoController {
    #service = new PagamentoService();

    async listar(req, res) {
        try {
            return res.status(200).json(await this.#service.listar(req.query));
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    async listarFiado(req, res) {
        try {
            return res.status(200).json(await this.#service.listarFiado());
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    async quitar(req, res) {
        try {
            return res.status(200).json(await this.#service.quitar(req.params.id, req.body, req.usuarioLogado.id));
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    async quitarCliente(req, res) {
        try {
            return res.status(200).json(await this.#service.quitarCliente(req.params.idCliente, req.body, req.usuarioLogado.id));
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    #tratarErro(res, error) {
        if (error?.status) return res.status(error.status).json({ msg: error.msg });
        console.error(error);
        return res.status(500).json({ msg: 'Erro ao processar requisição' });
    }
}
