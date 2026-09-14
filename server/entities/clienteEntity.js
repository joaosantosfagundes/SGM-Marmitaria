import Entity from "./entity.js";

export default class ClienteEntity extends Entity{

    #id;
    #nome;
    #telefone;
    #ativo;
    #criadoEm;

    get id() { return this.#id; }
    set id(value) { this.#id = value; }

    get nome() { return this.#nome; }
    set nome(value) { this.#nome = value; }

    get telefone() { return this.#telefone; }
    set telefone(value) { this.#telefone = value; }

    get ativo() { return this.#ativo; }
    set ativo(value) { this.#ativo = value; }

    get criadoEm() { return this.#criadoEm; }
    set criadoEm(value) { this.#criadoEm = value; }

    constructor(id,nome,telefone,ativo,criadoEm){
        super();
        this.#id = id;
        this.#nome = nome;
        this.#telefone = telefone;
        this.#ativo = ativo;
        this.#criadoEm = criadoEm;
    }

    static toMap(row){
        return new ClienteEntity(
            row["id_cliente"],
            row["nome"],
            row["telefone"],
            row["ativo"],
            row["criado_em"]
        );
    }

    validar(){
    if (!this.#nome || this.#nome.trim() === "") return false;
    return true;
    }


}