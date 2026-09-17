import bcrypt from "bcrypt";
import crypto from "crypto";
import UsuarioEntity from "../entities/usuarioEntity.js";
import UsuarioRepository from "../repositories/usuarioRepository.js";
import EmailService from "./emailService.js";

const SALT_ROUNDS = 10;
const VALIDADE_TOKEN_MS = 60 * 60 * 1000; // 1 hora

export default class UsuarioService {

    #repo;
    #email;

    constructor() {
        this.#repo = new UsuarioRepository();
        this.#email = new EmailService();
    }

    async listar() {
        return await this.#repo.listar();
    }

    async obter(id) {
        return await this.#repo.obter(id);
    }

    async criar({ nome, email, senha, perfil }) {
        let existente = await this.#repo.obterPorEmail(email);
        if (existente) {
            throw { status: 409, msg: "Já existe um usuário com esse e-mail" };
        }

        let senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);
        let entidade = new UsuarioEntity(0, nome, email, senhaHash, perfil, true);

        if (!entidade.validar()) {
            throw { status: 400, msg: "Dados inválidos. Confira nome, e-mail e perfil." };
        }

        await this.#repo.gravar(entidade);
        return entidade;
    }

    async atualizar(id, { nome, email, perfil, ativo }, idLogado) {
        let atual = await this.#repo.obter(id);
        if (!atual) {
            throw { status: 404, msg: "Usuário não encontrado" };
        }

        let ehVoceMesmo = String(id) === String(idLogado);

        if (ehVoceMesmo && perfil !== undefined && perfil !== atual.perfil) {
            throw { status: 403, msg: "Você não pode alterar o seu próprio perfil" };
        }

        if (ehVoceMesmo && ativo === false) {
            throw { status: 403, msg: "Você não pode desativar sua própria conta" };
        }

        atual.nome = nome ?? atual.nome;
        atual.email = email ?? atual.email;
        atual.perfil = perfil ?? atual.perfil;
        atual.ativo = ativo ?? atual.ativo;

        if (!atual.validar()) {
            throw { status: 400, msg: "Dados inválidos. Confira nome, e-mail e perfil." };
        }

        await this.#repo.atualizar(atual);
        return atual;
    }

    async validarLogin(email, senha) {
        let usuario = await this.#repo.obterPorEmail(email);
        if (!usuario) return null;

        let senhaConfere = await bcrypt.compare(senha, usuario.senha);
        if (!senhaConfere) return null;

        if (!usuario.ativo) {
            throw { status: 401, msg: "Usuário inativo" };
        }

        return usuario;
    }

    async inativar(id, idLogado) {
        if (String(id) === String(idLogado)) {
            throw { status: 403, msg: "Você não pode inativar sua própria conta" };
        }

        let atual = await this.#repo.obter(id);
        if (!atual) {
            throw { status: 404, msg: "Usuário não encontrado" };
        }
        return await this.#repo.inativar(id);
    }

    async excluir(id, idLogado) {
        if (String(id) === String(idLogado)) {
            throw { status: 403, msg: "Você não pode excluir sua própria conta" };
        }

        let atual = await this.#repo.obter(id);
        if (!atual) {
            throw { status: 404, msg: "Usuário não encontrado" };
        }

        try {
            return await this.#repo.excluir(id);
        } catch (erro) {
            if (erro?.code === 'ER_ROW_IS_REFERENCED_2' || erro?.code === 'ER_ROW_IS_REFERENCED') {
                throw {
                    status: 409,
                    msg: "Não é possível excluir: esse usuário já tem pedidos ou movimentações vinculadas. Use \"Desativar\" em vez disso."
                };
            }
            throw erro;
        }
    }

    // Esqueci minha senha

    async solicitarRedefinicao(email) {
        let usuario = await this.#repo.obterPorEmail(email);

        if (!usuario) return;

        let tokenBruto = crypto.randomBytes(32).toString('hex');
        let tokenHash = crypto.createHash('sha256').update(tokenBruto).digest('hex');
        let expiraEm = new Date(Date.now() + VALIDADE_TOKEN_MS);

        await this.#repo.salvarTokenReset(usuario.id, tokenHash, expiraEm);

        let link = `${process.env.FRONTEND_URL}/redefinir-senha?token=${tokenBruto}`;
        await this.#email.enviarRedefinicaoSenha(usuario.email, usuario.nome, link);
    }

    async redefinirSenha(tokenBruto, novaSenha) {
        if (!tokenBruto || !novaSenha || novaSenha.length < 6) {
            throw { status: 400, msg: "Senha precisa ter pelo menos 6 caracteres" };
        }

        let tokenHash = crypto.createHash('sha256').update(tokenBruto).digest('hex');
        let usuario = await this.#repo.obterPorTokenResetValido(tokenHash);

        if (!usuario) {
            throw { status: 400, msg: "Link inválido ou expirado. Solicite um novo." };
        }

        let senhaHash = await bcrypt.hash(novaSenha, SALT_ROUNDS);
        await this.#repo.atualizarSenha(usuario.id, senhaHash);
        await this.#repo.limparTokenReset(usuario.id);
    }
}