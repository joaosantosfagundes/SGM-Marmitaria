import 'dotenv/config';
import mysql from 'mysql2/promise';

async function testarBackup() {
    if (process.env.NODE_ENV?.trim().toLowerCase() === 'production') {
        throw new Error('O teste de restauração está desativado em produção.');
    }
    if (!process.env.DB_NAME?.trim()) throw new Error('Configure DB_NAME antes de rodar o teste.');

    const { default: BackupService } = await import('../services/backupService.js');
    const { default: BackupRepository, identificadorSql } = await import('../repositories/backupRepository.js');
    const { default: Database } = await import('../db/database.js');
    const banco = identificadorSql(`sgm_teste_restauro_${Date.now()}`);
    const dump = new BackupService().gerar({ verificarTotais: true });
    const pool = new Database().conexao.promise();
    let destino, criado = false;
    try {
        destino = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            multipleStatements: true,
        });
        await destino.query(`create database ${banco} character set utf8mb4`);
        criado = true;
        await destino.query(`use ${banco}`);

        let parte = await dump.next();
        while (!parte.done) {
            await destino.query(parte.value);
            parte = await dump.next();
        }
        const { contagens, totais } = parte.value;
        const linhas = [];
        for (const [tabela, original] of contagens) {
            const [[dados]] = await destino.query(`select cast(count(*) as char) as restaurado from ${identificadorSql(tabela)}`);
            linhas.push({ tabela, original, restaurado: dados.restaurado, ok: original === dados.restaurado });
        }
        const restaurados = await new BackupRepository().totais(destino);
        for (const [tabela, chave] of [['soma pedido.valor_total', 'pedidos'], ['soma pagamento.valor', 'pagamentos']]) {
            linhas.push({ tabela, original: totais[chave], restaurado: restaurados[chave], ok: totais[chave] === restaurados[chave] });
        }
        console.table(linhas);
        if (linhas.some(linha => !linha.ok)) throw new Error('O teste encontrou diferenças na restauração.');
        console.log('Restauração conferida.');
    } finally {
        try {
            await dump.return();
        } finally {
            try {
                if (criado) await destino.query(`drop database ${banco}`);
            } finally {
                try { await destino?.end(); }
                finally { await pool.end(); }
            }
        }
    }
}

try {
    await testarBackup();
} catch (erro) {
    console.error('O teste de restauração falhou.', erro.code ?? (erro.sql === undefined ? erro.message : 'Erro no MySQL.'));
    process.exitCode = 1;
}
