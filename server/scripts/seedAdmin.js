import 'dotenv/config';
import bcrypt from 'bcrypt';
import UsuarioRepository from '../repositories/usuarioRepository.js';
import UsuarioEntity from '../entities/usuarioEntity.js';

// Uso: node scripts/seedAdmin.js
// Cria o primeiro usuário ADMIN pra você conseguir logar e, dali, cadastrar os demais
// usuários normalmente pela tela (que exige estar logado como ADMIN).
//
// Pra trocar os dados, ajuste as constantes abaixo ou passe por variável de ambiente:
//   SEED_ADMIN_NOME, SEED_ADMIN_EMAIL, SEED_ADMIN_SENHA

const NOME  = process.env.SEED_ADMIN_NOME  || 'Administrador';
const EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@sgm.com';
const SENHA = process.env.SEED_ADMIN_SENHA || 'admin123';

async function seed() {
    const repo = new UsuarioRepository();

    const existente = await repo.obterPorEmail(EMAIL);
    if (existente) {
        console.log(`Já existe um usuário com o e-mail "${EMAIL}". Nada foi alterado.`);
        console.log(`Perfil atual: ${existente.perfil} | Ativo: ${existente.ativo}`);
        process.exit(0);
    }

    const senhaHash = await bcrypt.hash(SENHA, 10);
    const admin = new UsuarioEntity(0, NOME, EMAIL, senhaHash, 'ADMIN', true);

    if (!admin.validar()) {
        console.error('Dados de seed inválidos. Confira nome/e-mail/perfil.');
        process.exit(1);
    }

    await repo.gravar(admin);

    console.log('✅ Usuário ADMIN criado com sucesso!');
    console.log('----------------------------------------');
    console.log(`E-mail: ${EMAIL}`);
    console.log(`Senha:  ${SENHA}`);
    console.log('----------------------------------------');
    console.log('⚠️  Troque essa senha assim que possível (não tem tela de "trocar senha" ainda — dá pra fazer via UPDATE direto no banco por enquanto, ou eu já implemento a rota se quiser).');

    process.exit(0);
}

seed().catch((err) => {
    console.error('Erro ao rodar seed:', err);
    process.exit(1);
});
