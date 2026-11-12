import DashboardService from '../services/dashboardService.js';

export default class DashboardController {
    #service = new DashboardService();

    async resumo(req, res) {
        try {
            return res.status(200).json(await this.#service.resumo(req.usuarioLogado.perfil));
        } catch (error) {
            if (error?.status) return res.status(error.status).json({ msg: error.msg });
            console.error(error);
            return res.status(500).json({ msg: 'Erro ao processar requisição' });
        }
    }
}
