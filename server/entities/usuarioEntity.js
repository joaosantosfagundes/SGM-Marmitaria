import Entity from "./entity.js";

// Perfis válidos conforme schema (usuario.perfil ENUM)
export const PERFIS_VALIDOS = ["ADMIN", "ATENDENTE", "COZINHA"];

export default class UsuarioEntity extends Entity {

    #id;
    #nome;
    #email;
    #senha;
    #perfil;
    #ativo;
    #criadoEm;

    get id() { return this.#id; }
    set id(value) { this.#id = value; }

    get nome() { return this.#nome; }
    set nome(value) { this.#nome = value; }

    get email() { return this.#email; }
    set email(value) { this.#email = value; }

    get senha() { return this.#senha; }
    set senha(value) { this.#senha = value; }

    get perfil() { return this.#perfil; }
    set perfil(value) { this.#perfil = value; }

    get ativo() { return this.#ativo; }
    set ativo(value) { this.#ativo = value; }

    get criadoEm() { return this.#criadoEm; }
    set criadoEm(value) { this.#criadoEm = value; }

    constructor(id, nome, email, senha, perfil, ativo, criadoEm) {
        super();
        this.#id = id;
        this.#nome = nome;
        this.#email = email;
        this.#senha = senha;
        this.#perfil = perfil;
        this.#ativo = ativo;
        this.#criadoEm = criadoEm;
    }

    // Mapeia uma linha do banco (colunas da tabela `usuario`) para a Entity
    static toMap(row) {
        return new UsuarioEntity(
            row["id_usuario"],
            row["nome"],
            row["email"],
            row["senha"],
            row["perfil"],
            row["ativo"],
            row["criado_em"]
        );
    }

    // Nunca devolve a senha (hash) pro front
    toJSON() {
        let json = super.toJSON();
        delete json.senha;
        return json;
    }

    validar() {
        if (!this.#nome || this.#nome.trim().length < 2) return false;
        if (!this.#email || !this.#email.includes("@")) return false;
        if (!PERFIS_VALIDOS.includes(this.#perfil)) return false;
        return true;
    }
}
