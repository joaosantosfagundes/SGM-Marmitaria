import Repository from './repository.js';

export function identificadorSql(nome) {
    return '`' + nome.replaceAll('`', '``') + '`';
}

export default class BackupRepository extends Repository {
    async abrirSnapshot() {
        const conexao = await this.banco.conexao.promise().getConnection();
        try {
            await conexao.query('set transaction isolation level repeatable read');
            await conexao.query('start transaction with consistent snapshot, read only');
            return conexao;
        } catch (erro) {
            conexao.destroy();
            throw erro;
        }
    }

    async fecharSnapshot(conexao) {
        try {
            await conexao.rollback();
        } catch (erro) {
            conexao.destroy();
            throw erro;
        }
        conexao.release();
    }

    async contexto(conexao) {
        const [[contexto]] = await conexao.query('select database() as banco, @@session.time_zone as fuso, @@session.sql_mode as modo');
        return contexto;
    }

    async tabelas(conexao) {
        const [tabelas] = await conexao.query("show full tables where Table_type = 'BASE TABLE'");
        return tabelas.map(tabela => Object.values(tabela)[0]);
    }

    async colunas(conexao, tabela) {
        const [colunas] = await conexao.execute(`select column_name as nome, extra as extra
            from information_schema.columns where binary table_schema = database() and binary table_name = ?
            order by ordinal_position`, [tabela]);
        return colunas;
    }

    async primaria(conexao, tabela) {
        const [colunas] = await conexao.execute(`select column_name as nome from information_schema.key_column_usage
            where binary table_schema = database() and binary table_name = ? and constraint_name = 'PRIMARY'
            order by ordinal_position`, [tabela]);
        return colunas.map(coluna => coluna.nome);
    }

    async ddl(conexao, tabela) {
        const [linhas] = await conexao.query(`show create table ${identificadorSql(tabela)}`);
        return linhas[0]['Create Table'];
    }

    async lote(conexao, tabela, colunas, primaria, cursor, tamanho) {
        const chaves = primaria.map(identificadorSql);
        const valores = [];
        // A ordem lexicográfica também permite percorrer tabelas com chave composta.
        const limites = cursor ? chaves.map((chave, indice) => {
            valores.push(...cursor.slice(0, indice + 1));
            return '(' + [...chaves.slice(0, indice).map(anterior => anterior + ' = ?'), chave + ' > ?'].join(' and ') + ')';
        }) : [];
        const filtro = limites.length ? ` where ${limites.join(' or ')}` : '';

        const [linhas] = await conexao.execute({
            sql: `select ${colunas.map(identificadorSql).join(', ')} from ${identificadorSql(tabela)}${filtro}
                order by ${chaves.join(', ')} limit ?`,
            supportBigNumbers: true,
            bigNumberStrings: true,
            typeCast(campo, padrao) {
                return campo.type === 'JSON' ? campo.string('utf8') : padrao();
            }
        }, [...valores, tamanho]);
        return linhas;
    }

    async totais(conexao) {
        const [[totais]] = await conexao.query(`select
            (select cast(coalesce(sum(valor_total), 0) as char) from pedido) as pedidos,
            (select cast(coalesce(sum(valor), 0) as char) from pagamento) as pagamentos`);
        return totais;
    }
}
