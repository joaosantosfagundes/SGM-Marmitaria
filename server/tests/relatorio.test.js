import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'segredo-exclusivo-dos-testes-de-relatorios';
const { default: Database } = await import('../db/database.js');
const { default: rotas } = await import('../routes/index.js');
const pool = new Database().conexao;
const queryOriginal = pool.query;
const fixtures = readFileSync(new URL('./fixtures/relatorio.sql', import.meta.url), 'utf8');
const periodo = 'dataInicio=2026-11-05&dataFim=2026-11-06';
const relatorios = ['vendas', 'estoque', 'produtos-mais-vendidos'];
const consultas = [];
let servidor, executar, encerrarBanco;

before(async () => {
    const portaMySQL = process.env.SGM_RELATORIO_MYSQL_TEST_PORT;

    if (portaMySQL) {
        const { default: mysql } = await import('mysql2/promise');
        const conexao = await mysql.createConnection({
            host: '127.0.0.1', port: Number(portaMySQL), user: 'root', dateStrings: true, multipleStatements: true
        });
        const nomeBanco = `sgm_teste_relatorio_${randomUUID().replaceAll('-', '')}`;
        let criado = false;
        encerrarBanco = async () => {
            try {
                if (criado) await conexao.query(`drop database ${nomeBanco}`);
            } finally {
                await conexao.end();
            }
        };
        await conexao.query(`create database ${nomeBanco} character set utf8mb4`);
        criado = true;
        await conexao.query(`use ${nomeBanco}`);
        await conexao.query("set time_zone = '-03:00'");
        await conexao.query(fixtures);
        executar = async (sql, valores) => (await conexao.query(sql, valores))[0];
    } else {
        const { DatabaseSync } = await import('node:sqlite');
        const banco = new DatabaseSync(':memory:');
        encerrarBanco = () => banco.close();
        banco.exec(fixtures);
        executar = async (sql, valores) => banco.prepare(sql).all(...valores);
    }

    pool.query = (sql, valores, callback) => {
        consultas.push(sql);
        assert.match(sql, /^\s*(select|with)\b/i);
        executar(sql, valores ?? []).then(rows => callback(null, rows), callback);
    };

    const app = express();
    app.use(cookieParser());
    app.use('/api', rotas);
    servidor = await new Promise((resolve, reject) => {
        const http = app.listen(0, '127.0.0.1', () => resolve(http));
        http.once('error', reject);
    });
});

beforeEach(() => { consultas.length = 0; });

after(async () => {
    pool.query = queryOriginal;
    if (servidor) await new Promise(resolve => servidor.close(resolve));
    try {
        await encerrarBanco?.();
    } finally {
        pool.end();
    }
});

async function consultar(relatorio, filtro = periodo, perfil = 1) {
    const headers = {};
    if (perfil !== null) headers.cookie = `token=${jwt.sign({ id: perfil }, process.env.JWT_SECRET)}`;
    const resposta = await fetch(`http://127.0.0.1:${servidor.address().port}/api/relatorio/${relatorio}?${filtro}`, { headers });
    return { status: resposta.status, dados: await resposta.json() };
}

test('Vendas usam a data do pedido e separam cancelados nos quatro agrupamentos', async () => {
    const { status, dados } = await consultar('vendas');
    assert.equal(status, 200);
    assert.deepEqual(dados.resumo, {
        quantidadePedidos: 5, quantidadeVendidos: 4, quantidadeCancelados: 1,
        totalVendido: 132, totalCancelado: 100, fiadoPendente: 32.5, ticketMedio: 33
    });
    assert.deepEqual(dados.porDia.map(dia => [dia.chave, dia.quantidadeVendidos, dia.totalVendido, dia.ticketMedio]), [
        ['2026-11-05', 2, 96.75, 48.38], ['2026-11-06', 2, 35.25, 17.63]
    ]);
    assert.equal(dados.porStatus.find(linha => linha.chave === 'CANCELADO').totalVendido, 0);
    assert.equal(dados.porTipoAtendimento.find(linha => linha.chave === 'DELIVERY').totalVendido, 32.5);
    assert.equal(dados.porTipoAtendimento.find(linha => linha.chave === 'DELIVERY').totalCancelado, 100);

    for (const grupo of ['porDia', 'porFormaPagamento', 'porTipoAtendimento', 'porStatus']) {
        assert.equal(dados[grupo].reduce((soma, linha) => soma + linha.quantidadeVendidos, 0), 4);
        assert.equal(dados[grupo].reduce((soma, linha) => soma + linha.totalVendido, 0), 132);
        assert.equal(dados[grupo].reduce((soma, linha) => soma + linha.totalCancelado, 0), 100);
    }
});

test('Fiado quitado mantém a forma original e só o pendente entra em a receber', async () => {
    const { dados } = await consultar('vendas');
    const formas = Object.fromEntries(dados.porFormaPagamento.map(linha => [linha.chave, linha]));
    assert.equal(formas.FIADO.quantidadeVendidos, 2);
    assert.equal(formas.FIADO.totalVendido, 53.75);
    assert.equal(formas.FIADO.fiadoPendente, 32.5);
    assert.equal(formas.PIX.totalVendido, 64.25);
    assert.equal(formas.SEM_PAGAMENTO.totalVendido, 14);
    assert.equal(formas.DINHEIRO, undefined);
    assert.equal(formas.CREDITO, undefined);
});

test('Ranking soma quantidades e subtotais de produtos e adicionais separadamente', async () => {
    const { status, dados } = await consultar('produtos-mais-vendidos');
    assert.equal(status, 200);
    assert.deepEqual(dados.produtos, [
        { id: 2, nome: 'Suco', quantidade: 8, totalVendido: 40 },
        { id: 1, nome: 'Marmita', quantidade: 3, totalVendido: 60 },
        { id: 3, nome: 'Salada', quantidade: 1, totalVendido: 14 }
    ]);
    assert.deepEqual(dados.adicionais, [
        { id: 2, nome: 'Ovo', quantidade: 4, totalVendido: 14.25 },
        { id: 1, nome: 'Farofa', quantidade: 2, totalVendido: 3.75 }
    ]);
    const vendas = await consultar('vendas');
    assert.equal([...dados.produtos, ...dados.adicionais].reduce((soma, item) => soma + item.totalVendido, 0),
        vendas.dados.resumo.totalVendido);
});

test('Estoque mostra saldo atual e agrega apenas movimentos dentro do período inclusivo', async () => {
    const { status, dados } = await consultar('estoque');
    assert.equal(status, 200);
    const insumos = Object.fromEntries(dados.insumos.map(linha => [linha.insumo.nome, linha]));
    assert.deepEqual(insumos.Arroz, {
        insumo: { id: 1, nome: 'Arroz', categoria: 'Mercearia', siglaUnidade: 'kg', quantidade: 3.25,
            estoqueMinimo: 5, abaixoDoMinimo: true, ativo: true },
        entradas: 10.125, perdas: 1.25, ajustesEntrada: 2.5, ajustesSaida: 0.125
    });
    assert.equal(insumos['Óleo'].insumo.abaixoDoMinimo, false);
    assert.equal(insumos['Óleo'].insumo.quantidade, 2);
    assert.equal(insumos['Óleo'].entradas, 3.75);
    assert.equal(insumos.Sal.insumo.quantidade, 0);
    assert.equal(insumos.Sal.insumo.abaixoDoMinimo, true);
    assert.equal(insumos.Sal.entradas, 0);
});

test('Hoje vira à meia-noite da operação em UTC−3 para os três relatórios', async t => {
    const agora = t.mock.method(Date, 'now', () => Date.parse('2026-11-06T02:59:59Z'));
    for (const relatorio of relatorios) {
        const { status, dados } = await consultar(relatorio, '');
        assert.equal(status, 200);
        assert.deepEqual(dados.periodo, { dataInicio: '2026-11-05', dataFim: '2026-11-05' });
    }
    agora.mock.mockImplementation(() => Date.parse('2026-11-06T03:00:00Z'));
    for (const relatorio of relatorios) {
        const { dados } = await consultar(relatorio, '');
        assert.deepEqual(dados.periodo, { dataInicio: '2026-11-06', dataFim: '2026-11-06' });
    }
});

test('Data única consulta o dia indicado e período inválido retorna 400', async () => {
    const { dados } = await consultar('vendas', 'dataFim=2026-11-05');
    assert.deepEqual(dados.periodo, { dataInicio: '2026-11-05', dataFim: '2026-11-05' });
    assert.equal(dados.resumo.totalVendido, 96.75);

    for (const relatorio of relatorios) {
        for (const filtro of ['dataInicio=2026-02-30', 'dataInicio=2026-11-06&dataFim=2026-11-05',
            'dataInicio=2026-11-05&dataInicio=2026-11-06', 'dataFim=0999-12-31']) {
            const resposta = await consultar(relatorio, filtro);
            assert.equal(resposta.status, 400);
            assert.match(resposta.dados.msg, /data/i);
        }
    }
});

test('Períodos vazios e só com cancelados têm ticket médio zero', async () => {
    const vazio = await consultar('vendas', 'dataInicio=2026-11-12');
    assert.equal(vazio.dados.resumo.quantidadePedidos, 0);
    assert.equal(vazio.dados.resumo.ticketMedio, 0);
    assert.deepEqual(vazio.dados.porDia, []);

    const cancelado = await consultar('vendas', 'dataInicio=2026-11-09');
    assert.equal(cancelado.dados.resumo.quantidadeCancelados, 1);
    assert.equal(cancelado.dados.resumo.totalCancelado, 20);
    assert.equal(cancelado.dados.resumo.totalVendido, 0);
    assert.equal(cancelado.dados.resumo.ticketMedio, 0);

    const ranking = await consultar('produtos-mais-vendidos', 'dataInicio=2026-11-12');
    assert.deepEqual(ranking.dados.produtos, []);
    assert.deepEqual(ranking.dados.adicionais, []);
});

test('Apenas ADMIN e ATENDENTE consultam os três relatórios', async () => {
    for (const relatorio of relatorios) {
        assert.equal((await consultar(relatorio, periodo, 1)).status, 200);
        assert.equal((await consultar(relatorio, periodo, 2)).status, 200);
        const quantidade = consultas.length;
        assert.equal((await consultar(relatorio, periodo, 3)).status, 403);
        assert.equal((await consultar(relatorio, periodo, null)).status, 401);
        assert.equal(consultas.length, quantidade + 1);
        assert.match(consultas.at(-1), /^select \* from usuario/i);
    }
});
