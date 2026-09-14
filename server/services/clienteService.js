import ClienteEntity from "../entities/clienteEntity.js"
import ClienteRepository from "../repositories/clienteRepository.js"

export default class ClienteService{
    #repo;

    constructor(){
        this.#repo = new ClienteRepository();
    }

    async listar(){
        return await this.#repo.listar();
    }

    async obter(id){
        return await this.#repo.obter(id);
    }

    async criar({ nome, telefone, ativo }) {
        if (telefone) {
            let existente = await this.#repo.obterPorTelefone(telefone);
            if (existente) {
                throw { status: 409, msg: "Já existe um cliente com esse telefone" };
            }
        }

        let entidade = new ClienteEntity(0, nome, telefone, true);

        if (!entidade.validar()) {
            throw { status: 400, msg: "Nome deve ser preenchido" };
        }

        await this.#repo.gravar(entidade);
        return entidade;
    }

    async atualizar(id,{nome,telefone,ativo}){
        let atual = await this.#repo.obter(id);
        if(!atual){
            throw { status:404, msg:"Cliente não encontrado"};
        }

        atual.nome = nome ?? atual.nome;
        atual.telefone = telefone ?? atual.telefone;
        atual.ativo = ativo ?? atual.ativo;

        if(!atual.validar()){
            throw {status:400,msg:"Nome e Telefone deve ser preenchidos"};
        }

        await this.#repo.atualizar(atual);
        return atual;
    }

    async inativar(id) {
        let atual = await this.#repo.obter(id);
        if (!atual) {
            throw { status: 404, msg: "Cliente não encontrado" };
        }
        return await this.#repo.inativar(id);
    }
}