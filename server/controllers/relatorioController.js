import RelatorioService from '../services/relatorioService.js';

export default class RelatorioController {
    #service = new RelatorioService();

    async vendas(req, res) {
        try {
            return res.status(200).json(await this.#service.vendas(req.query));
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    async estoque(req, res) {
        try {
            return res.status(200).json(await this.#service.estoque(req.query));
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    async financeiro(req, res) {
        try {
            return res.status(200).json(await this.#service.financeiro(req.query));
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    async produtosMaisVendidos(req, res) {
        try {
            return res.status(200).json(await this.#service.produtosMaisVendidos(req.query));
        } catch (error) {
            return this.#tratarErro(res, error);
        }
    }

    async fiado(req, res) {
        try {
            return res.status(200).json(await this.#service.fiado(req.query));
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
