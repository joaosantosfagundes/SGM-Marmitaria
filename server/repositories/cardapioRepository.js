import CardapioEntity from "../entities/cardapioEntity.js";
import Repository from "./repository.js";

export default class CardapioRepository extends Repository {
    async obterPorData(data) {
        return this.banco.ExecutaTransacao(async consultar => {
            let cardapios = await consultar(
                "select id_cardapio, data_cardapio from cardapio where data_cardapio = ? for share", [data]
            );
            if (!cardapios.length) return CardapioEntity.toMap({ data_cardapio: data });
            let id = cardapios[0].id_cardapio;
            let preparacoes = await consultar(
                "select nome, grupo from cardapio_preparacao where id_cardapio = ? order by ordem, id_cardapio_preparacao", [id]
            );
            let adicionais = await consultar(
                `select a.id_adicional, a.nome, a.preco from cardapio_adicional ca
                 inner join adicional a on a.id_adicional = ca.id_adicional
                 where ca.id_cardapio = ? order by ca.id_cardapio_adicional`, [id]
            );
            return CardapioEntity.toMap(cardapios[0], preparacoes.map(item => ({ nome: item.nome, grupo: item.grupo })),
                adicionais.map(item => ({ id: item.id_adicional, nome: item.nome, preco: Number(item.preco) })));
        });
    }

    async salvar(data, preparacoes, adicionais) {
        return this.banco.ExecutaTransacao(async consultar => {
            let insert = await consultar(
                `insert into cardapio (data_cardapio) values (?)
                 on duplicate key update id_cardapio = last_insert_id(id_cardapio)`, [data]
            );
            let idCardapio = insert.insertId;
            await consultar("delete from cardapio_preparacao where id_cardapio = ?", [idCardapio]);
            await consultar("delete from cardapio_adicional where id_cardapio = ?", [idCardapio]);
            if (preparacoes.length) {
                let valores = preparacoes.map((item, ordem) => [idCardapio, item.nome, item.grupo, ordem]);
                await consultar("insert into cardapio_preparacao (id_cardapio, nome, grupo, ordem) values ?", [valores]);
            }
            if (adicionais.length) {
                let valores = adicionais.map(id => [idCardapio, id]);
                await consultar("insert into cardapio_adicional (id_cardapio, id_adicional) values ?", [valores]);
            }
            return true;
        });
    }
}
