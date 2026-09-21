import Entity from "./entity.js";

export default class CardapioEntity extends Entity{

    #idcardapioitem;
    #idcardapio;
    #nome;
    #disponivel;

    get idcardapioitem() {return this.#idcardapioitem;}
    set idcardapioitem(value) { this.#idcardapioitem = value;}

    get idcardapio() {return this.#idcardapio;}
    set idcardapio(value) { this.#idcardapio = value;}

    get nome() {return this.#nome;}
    set nome(value) { this.#nome = value;}

    get disponivel() {return this.#disponivel;}
    set disponivel(value) { this.#disponivel = value;}

    constructor(idcardapioitem, idcardapio, nome, disponivel){
        super();
        this.#idcardapioitem = idcardapioitem;
        this.#idcardapio = idcardapio;
        this.#nome = nome;
        this.#disponivel = disponivel;
    }
    
    static toMap(row){
        return new CardapioEntity(row["id_cardapio_item"],row["id_cardapio"],row["nome"],row["disponivel"]);
    }



}