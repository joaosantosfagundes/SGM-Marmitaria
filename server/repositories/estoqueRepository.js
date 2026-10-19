import EstoqueEntity from "../entities/estoqueEntity.js";
import MovimentacaoEstoqueEntity from "../entities/movimentacaoEstoqueEntity.js";
import Repository from "./repository.js";

const CONSULTA_MOVIMENTACOES = `select m.*, i.nome as nome_insumo, u.sigla as sigla_unidade,
    usuario.nome as nome_usuario from movimentacao_estoque m
    inner join insumo i on i.id_insumo = m.id_insumo
    inner join unidade u on u.id_unidade = i.id_unidade
    inner join usuario on usuario.id_usuario = m.id_usuario`;

export default class EstoqueRepository extends Repository {
    async listar() {
        let rows = await this.banco.ExecutaComando(
            `select i.id_insumo, i.nome, c.nome as nome_categoria, u.sigla as sigla_unidade,
             coalesce(e.quantidade, 0) as quantidade, i.estoque_minimo, i.ativo from insumo i
             inner join categoria c on c.id_categoria = i.id_categoria
             inner join unidade u on u.id_unidade = i.id_unidade
             left join estoque e on e.id_insumo = i.id_insumo order by i.nome, i.id_insumo`
        );
        return rows.map(row => EstoqueEntity.toMap(row));
    }

    async listarMovimentacoes(idInsumo, limite) {
        let sql = CONSULTA_MOVIMENTACOES;
        let valores = [];
        if (idInsumo !== undefined) {
            sql += " where m.id_insumo = ?";
            valores.push(idInsumo);
        }
        sql += " order by m.data_hora desc, m.id_movimentacao desc limit ?";
        valores.push(limite);
        let rows = await this.banco.ExecutaComando(sql, valores);
        return rows.map(row => MovimentacaoEstoqueEntity.toMap(row));
    }

    async registrar(entidade, calcularNovoSaldo) {
        return this.banco.ExecutaTransacao(async consultar => {
            // O bloqueio do insumo também serializa a criação de um estoque ausente.
            let insumos = await consultar("select * from insumo where id_insumo = ? for update", [entidade.idInsumo]);
            let estoque = null;
            if (insumos.length) {
                await consultar(
                    `insert into estoque (id_insumo, quantidade) values (?, 0)
                     on duplicate key update id_insumo = ?`, [entidade.idInsumo, entidade.idInsumo]
                );
                let saldos = await consultar("select * from estoque where id_insumo = ? for update", [entidade.idInsumo]);
                estoque = EstoqueEntity.toMap({ ...insumos[0], quantidade: saldos[0].quantidade });
            }

            // O Service aplica as regras enquanto os registros continuam bloqueados.
            let novoSaldo = calcularNovoSaldo(estoque);
            await consultar("update estoque set quantidade = ? where id_insumo = ?", [novoSaldo, entidade.idInsumo]);
            let resultado = await consultar(
                "insert into movimentacao_estoque (id_insumo, id_usuario, tipo, quantidade, motivo) values (?, ?, ?, ?, ?)",
                [entidade.idInsumo, entidade.idUsuario, entidade.tipo, entidade.quantidade, entidade.motivo]
            );
            let rows = await consultar(`${CONSULTA_MOVIMENTACOES} where m.id_movimentacao = ?`, [resultado.insertId]);
            return { movimentacao: MovimentacaoEstoqueEntity.toMap(rows[0]), novoSaldo };
        });
    }
}
