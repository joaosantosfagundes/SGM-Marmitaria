import Repository from './repository.js';
import MovimentacaoFinanceiraEntity from '../entities/movimentacaoFinanceiraEntity.js';

const CONSULTA = `select m.*, u.nome as nome_usuario from movimentacao_financeira m
    inner join usuario u on u.id_usuario = m.id_usuario`;

export default class FinanceiroRepository extends Repository {
    async listar({ dataInicio, dataFim, tipo, categoria }) {
        let sql = `${CONSULTA} where m.id_pedido is null`, valores = [];
        if (dataInicio !== undefined) { sql += ' and m.data_hora >= ?'; valores.push(dataInicio); }
        if (dataFim !== undefined) { sql += ' and m.data_hora < date_add(?, interval 1 day)'; valores.push(dataFim); }
        if (tipo !== undefined) { sql += ' and m.tipo = ?'; valores.push(tipo); }
        if (categoria !== undefined) { sql += ' and m.categoria = ?'; valores.push(categoria); }
        sql += ' order by m.data_hora desc, m.id_movimentacao_financeira desc';
        let rows = await this.banco.ExecutaComando(sql, valores);
        return rows.map(row => MovimentacaoFinanceiraEntity.toMap(row));
    }

    async obter(id, consultar, bloquear = false) {
        let rows = await consultar(bloquear
            ? 'select * from movimentacao_financeira where id_movimentacao_financeira = ? for update'
            : `${CONSULTA} where m.id_movimentacao_financeira = ?`, [id]);
        return rows.length ? MovimentacaoFinanceiraEntity.toMap(rows[0]) : null;
    }

    async inserir(entidade, consultar) {
        let resultado = await consultar(`insert into movimentacao_financeira
            (id_usuario, tipo, categoria, descricao, valor, data_hora, recorrente, quantidade_meses, id_movimentacao_estoque)
            values (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [entidade.idUsuario, entidade.tipo, entidade.categoria,
            entidade.descricao, entidade.valor, entidade.dataHora, entidade.recorrente, entidade.quantidadeMeses, entidade.idMovimentacaoEstoque]);
        return this.obter(resultado.insertId, consultar);
    }

    async criar(entidade) {
        return this.banco.ExecutaTransacao(consultar => this.inserir(entidade, consultar));
    }

    async atualizar(id, preparar) {
        return this.banco.ExecutaTransacao(async consultar => {
            let entidade = preparar(await this.obter(id, consultar, true));
            let resultado = await consultar(`update movimentacao_financeira set tipo = ?, categoria = ?, descricao = ?,
                valor = ?, data_hora = ?, recorrente = ?, quantidade_meses = ?
                where id_movimentacao_financeira = ? and id_movimentacao_estoque is null and id_pedido is null`,
                [entidade.tipo, entidade.categoria, entidade.descricao, entidade.valor, entidade.dataHora, entidade.recorrente, entidade.quantidadeMeses, id]);
            return resultado.affectedRows === 1 ? this.obter(id, consultar) : null;
        });
    }

    async excluir(id, validar) {
        return this.banco.ExecutaTransacao(async consultar => {
            validar(await this.obter(id, consultar, true));
            let resultado = await consultar(`delete from movimentacao_financeira where id_movimentacao_financeira = ?
                and id_movimentacao_estoque is null and id_pedido is null`, [id]);
            return resultado.affectedRows === 1;
        });
    }
}
