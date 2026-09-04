import jwt from 'jsonwebtoken';
import UsuarioRepository from '../repositories/usuarioRepository.js';

const SEGREDO_JWT = process.env.JWT_SECRET;

export default class AuthMiddleware {

    token(id, nome, email, perfil) {
        return jwt.sign({ id, nome, email, perfil }, SEGREDO_JWT, { expiresIn: '8h' });
    }

    async validar(req, res, next) {
        let token = req.cookies?.token;

        if (!token) {
            return res.status(401).json({ msg: "Necessário login!" });
        }

        try {
            let payload = jwt.verify(token, SEGREDO_JWT);
            let usuarioRepository = new UsuarioRepository();
            let usuario = await usuarioRepository.obter(payload.id);

            if (!usuario) {
                return res.status(404).json({ msg: "Usuário não encontrado" });
            }
            if (!usuario.ativo) {
                return res.status(401).json({ msg: "Usuário inativo" });
            }

            req.usuarioLogado = usuario;
            next();
        } catch (ex) {
            console.error(ex);
            return res.status(401).json({ msg: "Token inválido!" });
        }
    }

    // Uso: auth.permitir('ADMIN') ou auth.permitir('ADMIN', 'ATENDENTE')
    permitir(...perfisPermitidos) {
        return (req, res, next) => {
            if (!req.usuarioLogado) {
                return res.status(401).json({ msg: "Necessário login!" });
            }
            if (!perfisPermitidos.includes(req.usuarioLogado.perfil)) {
                return res.status(403).json({ msg: "Sem permissão para esta ação" });
            }
            next();
        };
    }
}
