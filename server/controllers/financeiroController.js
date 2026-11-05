import FinanceiroService from '../services/financeiroService.js';

export default class FinanceiroController {
    #service = new FinanceiroService();

    async listar(req, res) {
        try {
            return res.status(200).json(await this.#service.listar(req.query));
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
    async atualizar(req, res) {
        try {
            return res.status(200).json(await this.#service.atualizar(req.params.id, req.body));
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }
    async excluir(req, res) {
        try {
            return res.status(200).json(await this.#service.excluir(req.params.id));
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
