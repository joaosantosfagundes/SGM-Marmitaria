import BackupRepository, { identificadorSql } from '../repositories/backupRepository.js';

const TAMANHO_LOTE = 500;

function literalSql(valor) {
    if (valor === null) return 'NULL';
    if (typeof valor === 'boolean') return valor ? '1' : '0';
    if (typeof valor === 'number' && Number.isFinite(valor)) return String(valor);
    if (Buffer.isBuffer(valor)) return `X'${valor.toString('hex')}'`;
    // Hexadecimal preserva o texto sem depender das regras de escape da sessão.
    if (typeof valor === 'string') return `CONVERT(X'${Buffer.from(valor, 'utf8').toString('hex')}' USING utf8mb4)`;
    throw new Error('Tipo de valor não suportado no backup.');
}

function comentario(texto) {
    return texto.replace(/[\r\n]/g, ' ');
}

export default class BackupService {
    #repo = new BackupRepository();

    async *gerar({ sinal, verificarTotais = false } = {}) {
        sinal?.throwIfAborted();
        const conexao = await this.#repo.abrirSnapshot();
        const contagens = new Map();
        let totais;
        const data = new Date().toISOString();

        try {
            const { banco, fuso, modo } = await this.#repo.contexto(conexao);
            const tabelas = await this.#repo.tabelas(conexao);
            const modoRestauro = [...new Set([...modo.split(',').filter(Boolean), 'NO_AUTO_VALUE_ON_ZERO'])].join(',');
            sinal?.throwIfAborted();
            yield `-- Backup SGM | ${data} | Banco: ${comentario(banco)}
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;
SET @sgm_modo_anterior = @@session.sql_mode, @sgm_fuso_anterior = @@session.time_zone;
SET SESSION sql_mode = ${literalSql(modoRestauro)};
SET SESSION time_zone = ${literalSql(fuso)};
`;

            for (const tabela of tabelas) {
                sinal?.throwIfAborted();
                const colunas = (await this.#repo.colunas(conexao, tabela))
                    .filter(coluna => !/\b(?:VIRTUAL|STORED) GENERATED\b/i.test(coluna.extra))
                    .map(coluna => coluna.nome);
                const primaria = await this.#repo.primaria(conexao, tabela);
                if (!primaria.length || primaria.some(chave => !colunas.includes(chave))) {
                    throw new Error('Tabela sem chave primária restaurável no backup.');
                }
                const nomeTabela = identificadorSql(tabela);
                const ddl = await this.#repo.ddl(conexao, tabela);
                yield `\nDROP TABLE IF EXISTS ${nomeTabela};\n${ddl};\n`;

                const prefixo = `INSERT INTO ${nomeTabela} (${colunas.map(identificadorSql).join(', ')}) VALUES\n`;
                let cursor, quantidade = 0n;
                while (true) {
                    sinal?.throwIfAborted();
                    const linhas = await this.#repo.lote(conexao, tabela, colunas, primaria, cursor, TAMANHO_LOTE);
                    if (!linhas.length) break;
                    const tuplas = linhas.map(linha => '(' + colunas.map(coluna => literalSql(linha[coluna])).join(', ') + ')');
                    yield prefixo + tuplas.join(',\n') + ';\n';
                    quantidade += BigInt(linhas.length);
                    if (linhas.length < TAMANHO_LOTE) break;
                    cursor = primaria.map(chave => linhas.at(-1)[chave]);
                }
                contagens.set(tabela, String(quantidade));
            }
            sinal?.throwIfAborted();
            if (verificarTotais) totais = await this.#repo.totais(conexao);
        } finally {
            await this.#repo.fecharSnapshot(conexao);
        }

        const linhas = [...contagens].map(([tabela, quantidade]) => `-- ${comentario(tabela)}: ${quantidade}`);
        yield `\nSET FOREIGN_KEY_CHECKS=1;
SET SESSION sql_mode = @sgm_modo_anterior, time_zone = @sgm_fuso_anterior;
-- Linhas exportadas por tabela em ${data}
${linhas.join('\n')}\n`;
        return { contagens, totais };
    }
}
