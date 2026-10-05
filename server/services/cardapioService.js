import CardapioRepository from "../repositories/cardapioRepository.js";

function validarData(data) {
    if (typeof data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
    let [ano, mes, dia] = data.split("-").map(Number);
    let dataVerificada = new Date(Date.UTC(ano, mes - 1, dia));
    return dataVerificada.getUTCFullYear() === ano && dataVerificada.getUTCMonth() === mes - 1 && dataVerificada.getUTCDate() === dia;
}

export default class CardapioService {
    #repo;

    constructor() {
        this.#repo = new CardapioRepository();
    }

    async obterPorData(data) {
        if (!validarData(data)) throw { status: 400, msg: "Informe uma data válida." };
        return this.#repo.obterPorData(data);
    }

    async salvar({ data, preparacoes }) {
        if (!validarData(data)) throw { status: 400, msg: "Informe uma data válida." };
        if (!Array.isArray(preparacoes) || preparacoes.some(nome => typeof nome !== "string" || nome.trim().length > 150)) {
            throw { status: 400, msg: "Informe preparações válidas, com até 150 caracteres cada." };
        }
        let nomesVistos = new Set();
        let nomes = preparacoes.map(nome => nome.trim()).filter(nome => {
            if (!nome) return false;
            let chave = nome.toLocaleLowerCase("pt-BR");
            if (nomesVistos.has(chave)) return false;
            nomesVistos.add(chave);
            return true;
        });
        await this.#repo.salvar(data, nomes);
        return this.#repo.obterPorData(data);
    }

    async copiar({ dataOrigem, dataDestino }) {
        if (!validarData(dataOrigem) || !validarData(dataDestino)) {
            throw { status: 400, msg: "Informe datas válidas." };
        }
        if (dataOrigem === dataDestino) {
            throw { status: 400, msg: "Escolha uma data de destino diferente da origem." };
        }
        if (!(await this.#repo.copiar(dataOrigem, dataDestino))) {
            throw { status: 404, msg: "Não existe cardápio cadastrado para a data de origem." };
        }
        return this.#repo.obterPorData(dataDestino);
    }
}
