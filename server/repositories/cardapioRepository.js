import CardapioEntity from "../entities/cardapioEntity.js";
import Repository from "./repository.js";

export default class CardapioRepository extends Repository {
    async obterPorData(data) {
        let cardapios = await this.banco.ExecutaComando(
            "select id_cardapio, data_cardapio from cardapio where data_cardapio = ?", [data]
        );
        if (!cardapios.length) return CardapioEntity.toMap({ data_cardapio: data }, []);

        let preparacoes = await this.banco.ExecutaComando(
            `select nome from cardapio_preparacao where id_cardapio = ? order by ordem, id_cardapio_preparacao`,
            [cardapios[0].id_cardapio]
        );
        return CardapioEntity.toMap(cardapios[0], preparacoes.map(item => item.nome));
    }

    async salvar(data, preparacoes) {
        return this.banco.ExecutaTransacao(async consultar => {
            let insert = await consultar(
                `insert into cardapio (data_cardapio) values (?)
                 on duplicate key update id_cardapio = last_insert_id(id_cardapio)`,
                [data]
            );
            let idCardapio = insert.insertId;
            await consultar("delete from cardapio_preparacao where id_cardapio = ?", [idCardapio]);
            if (preparacoes.length) {
                let valores = preparacoes.map((nome, ordem) => [idCardapio, nome, ordem]);
                await consultar(
                    "insert into cardapio_preparacao (id_cardapio, nome, ordem) values ?", [valores]
                );
            }
            return true;
        });
    }

    async copiar(dataOrigem, dataDestino) {
        return this.banco.ExecutaTransacao(async consultar => {
            let origem = await consultar("select id_cardapio from cardapio where data_cardapio = ?", [dataOrigem]);
            if (!origem.length) return false;
            let preparacoesOrigem = await consultar(
                "select nome, ordem from cardapio_preparacao where id_cardapio = ? order by ordem",
                [origem[0].id_cardapio]
            );

            let insert = await consultar(
                `insert into cardapio (data_cardapio) values (?)
                 on duplicate key update id_cardapio = last_insert_id(id_cardapio)`,
                [dataDestino]
            );
            let idDestino = insert.insertId;
            await consultar("delete from cardapio_preparacao where id_cardapio = ?", [idDestino]);
            if (preparacoesOrigem.length) {
                let valores = preparacoesOrigem.map(item => [idDestino, item.nome, item.ordem]);
                await consultar(
                    "insert into cardapio_preparacao (id_cardapio, nome, ordem) values ?", [valores]
                );
            }
            return true;
        });
    }
}
