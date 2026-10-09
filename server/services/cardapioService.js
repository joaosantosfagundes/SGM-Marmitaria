import CardapioRepository from "../repositories/cardapioRepository.js";
import AdicionalRepository from "../repositories/adicionalRepository.js";

function validarData(data) {
    if (typeof data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
    let [ano, mes, dia] = data.split("-").map(Number);
    let dataVerificada = new Date(Date.UTC(ano, mes - 1, dia));
    return dataVerificada.getUTCFullYear() === ano && dataVerificada.getUTCMonth() === mes - 1 && dataVerificada.getUTCDate() === dia;
}

export default class CardapioService {
    #repo;
    #adicionalRepo;

    constructor() {
        this.#repo = new CardapioRepository();
        this.#adicionalRepo = new AdicionalRepository();
    }

    async obterPorData(data) {
        if (!validarData(data)) throw { status: 400, msg: "Informe uma data válida." };
        return this.#repo.obterPorData(data);
    }

    async salvar({ data, preparacoes, adicionais } = {}) {
        if (!validarData(data)) throw { status: 400, msg: "Informe uma data válida." };
        if (!Array.isArray(preparacoes)) {
            throw { status: 400, msg: "Informe uma lista de preparações." };
        }
        let nomesVistos = new Set();
        let itens = preparacoes.map(item => {
            if (!item || typeof item.nome !== "string" || !item.nome.trim() || item.nome.trim().length > 150) {
                throw { status: 400, msg: "Informe o nome de cada preparação, com até 150 caracteres." };
            }
            if (item.grupo !== null && item.grupo !== "Mistura") {
                throw { status: 400, msg: "O grupo da preparação deve ser null (item fixo) ou Mistura." };
            }
            let nome = item.nome.trim().replace(/\s+/g, " ");
            let chave = `${item.grupo ?? "Fixo"}:${nome.toLocaleLowerCase("pt-BR").replace(/\s/g, "")}`;
            if (nomesVistos.has(chave)) {
                throw { status: 400, msg: "Não repita nomes de preparações dentro do mesmo grupo." };
            }
            nomesVistos.add(chave);
            return { nome, grupo: item.grupo };
        });
        if (!Array.isArray(adicionais) || adicionais.some(id => !Number.isSafeInteger(id) || id <= 0)) {
            throw { status: 400, msg: "Informe uma lista de IDs válidos para os adicionais." };
        }
        if (new Set(adicionais).size !== adicionais.length) {
            throw { status: 400, msg: "Não repita adicionais no cardápio." };
        }
        for (let id of adicionais) {
            let adicional = await this.#adicionalRepo.obter(id);
            if (!adicional) throw { status: 400, msg: `O adicional ${id} não existe. Atualize a seleção de adicionais.` };
            if (!adicional.ativo) throw { status: 400, msg: `O adicional ${adicional.nome} está inativo. Remova-o do cardápio ou reative seu cadastro.` };
        }
        await this.#repo.salvar(data, itens, adicionais);
        return this.#repo.obterPorData(data);
    }

    async copiar({ dataOrigem, dataDestino } = {}) {
        if (!validarData(dataOrigem) || !validarData(dataDestino)) {
            throw { status: 400, msg: "Informe datas válidas." };
        }
        if (dataOrigem === dataDestino) {
            throw { status: 400, msg: "Escolha uma data de destino diferente da origem." };
        }
        let origem = await this.#repo.obterPorData(dataOrigem);
        if (!origem.existe) {
            throw { status: 404, msg: "Não existe cardápio cadastrado para a data de origem." };
        }
        // A cópia passa pelas mesmas regras e transação do salvamento.
        return this.salvar({ data: dataDestino, preparacoes: origem.preparacoes, adicionais: origem.adicionais.map(item => item.id) });
    }
}
