import UnidadeRepository from "../repositories/unidadeRepository.js";

export default class UnidadeController {

    #repo;

    constructor() {
        this.#repo = new UnidadeRepository();
    }

    async listar(req, res) {
        try {
            let unidades = await this.#repo.listar();
            return res.status(200).json(unidades);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ msg: "Erro ao processar requisição" });
        }
    }
}
