import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import Database from '../db/database.js';
import BackupService from '../services/backupService.js';

process.env.JWT_SECRET = 'segredo-exclusivo-do-teste-de-backup';
const { default: backupRouter } = await import('../routes/backupRoute.js');

test('Backup lê um snapshot, exporta em lotes e preserva os valores sem inserir colunas geradas', async t => {
    const pool = new Database().conexao;
    const texto = `ação ' " \\ \n\r\0 🥘`;
    const colunas = ['id', 'texto', 'data_hora', 'valor', 'ativo', 'bytes', 'gerada'];
    const etapas = [];
    const conexao = {
        async query(sql) {
            etapas.push(sql);
            if (sql.startsWith('select database()')) return [[{ banco: 'banco_teste', fuso: '-03:00', modo: 'STRICT_TRANS_TABLES' }]];
            if (sql.startsWith('show full tables')) return [[{ Tables_in_banco_teste: 'teste', Table_type: 'BASE TABLE' }]];
            if (sql.startsWith('show create table')) return [[{ 'Create Table': 'CREATE TABLE `teste` (gerada INT)' }]];
        },
        async execute(consulta, parametros) {
            if (typeof consulta === 'string' && consulta.includes('key_column_usage')) return [[{ nome: 'id' }]];
            if (typeof consulta === 'string' && consulta.includes('information_schema.columns')) {
                return [colunas.map(nome => ({ nome, extra: nome === 'gerada' ? 'STORED GENERATED' : nome === 'data_hora' ? 'DEFAULT_GENERATED' : '' }))];
            }
            etapas.push(parametros);
            assert.doesNotMatch(consulta.sql, /gerada/i);
            const registro = { texto, data_hora: '2026-11-16 10:15:30', valor: '1234567890.990', ativo: true, bytes: Buffer.from([0, 255]) };
            if (parametros.length === 1) {
                assert.deepEqual(parametros, [500]);
                return [Array.from({ length: 500 }, (_, indice) => ({ ...registro, id: indice + 1 }))];
            }
            assert.match(consulta.sql, /where \(`id` > \?\)/);
            assert.deepEqual(parametros, [500, 500]);
            return [[{ ...registro, id: 501, texto: null, ativo: false }]];
        },
        async rollback() { etapas.push('rollback'); },
        release() { etapas.push('release'); }
    };
    t.mock.method(pool, 'promise', () => ({ getConnection: async () => conexao }));
    const blocos = [];
    for await (const bloco of new BackupService().gerar()) blocos.push(bloco);

    assert.deepEqual(etapas.slice(0, 2), ['set transaction isolation level repeatable read', 'start transaction with consistent snapshot, read only']);
    assert.deepEqual(etapas.slice(-2), ['rollback', 'release']);
    const inserts = blocos.filter(bloco => bloco.startsWith('INSERT INTO'));
    assert.equal(inserts.length, 2);
    assert.equal(inserts[0].split('\n').length, 502);
    const comoTexto = valor => `CONVERT(X'${Buffer.from(valor).toString('hex')}' USING utf8mb4)`;
    for (const valor of [texto, '2026-11-16 10:15:30', '1234567890.990']) assert.ok(inserts[0].includes(comoTexto(valor)));
    assert.ok(inserts[0].includes(", 1, X'00ff')"));
    assert.ok(inserts[1].includes("(501, NULL, "));
    assert.ok(inserts[1].includes(", 0, X'00ff')"));
    assert.match(blocos[0], /SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;/);
    assert.match(blocos.at(-1), /SET FOREIGN_KEY_CHECKS=1;[\s\S]*-- teste: 501/);
});

test('Backup libera a conexão quando o consumidor encerra a leitura', async t => {
    const pool = new Database().conexao;
    let liberou = false;
    const conexao = {
        async query(sql) {
            if (sql.startsWith('select database()')) return [[{ banco: 'teste', fuso: '-03:00', modo: '' }]];
            if (sql.startsWith('show full tables')) return [[]];
        },
        async rollback() {},
        release() { liberou = true; }
    };
    t.mock.method(pool, 'promise', () => ({ getConnection: async () => conexao }));
    const dump = new BackupService().gerar();
    await dump.next();
    await dump.return();
    assert.equal(liberou, true);
});

test('Somente ADMIN baixa o SQL com os cabeçalhos de download', async t => {
    t.mock.method(Database.prototype, 'ExecutaComando', async (_sql, [id]) => [
        { id_usuario: id, nome: 'Pessoa', perfil: ['ADMIN', 'ATENDENTE', 'COZINHA'][id - 1], ativo: 1 }
    ]);
    const gerar = t.mock.method(BackupService.prototype, 'gerar', async function* () {
        yield '-- SQL de teste\n';
        yield 'SET FOREIGN_KEY_CHECKS=1;\n';
    });
    t.mock.method(console, 'info', () => {});
    const app = express();
    app.use(cookieParser());
    app.use('/backup', backupRouter);
    const servidor = await new Promise((resolve, reject) => {
        const http = app.listen(0, '127.0.0.1', () => resolve(http));
        http.once('error', reject);
    });
    t.after(() => new Promise(resolve => servidor.close(resolve)));

    const url = `http://127.0.0.1:${servidor.address().port}/backup`;
    const consultar = id => fetch(url, id ? { headers: { cookie: 'token=' + jwt.sign({ id }, process.env.JWT_SECRET) } } : {});
    for (const [id, status] of [[null, 401], [2, 403], [3, 403]]) {
        const resposta = await consultar(id);
        assert.equal(resposta.status, status);
        await resposta.text();
    }
    assert.equal(gerar.mock.callCount(), 0);

    let resposta = await consultar(1);
    assert.equal(resposta.status, 200);
    assert.match(resposta.headers.get('content-disposition'), /^attachment; filename="backup-sgm-\d{4}-\d{2}-\d{2}-\d{4}\.sql"$/);
    assert.equal(resposta.headers.get('cache-control'), 'no-store');
    assert.equal(resposta.headers.get('access-control-expose-headers'), 'Content-Disposition');
    assert.equal(await resposta.text(), '-- SQL de teste\nSET FOREIGN_KEY_CHECKS=1;\n');

    t.mock.method(console, 'error', () => {});
    gerar.mock.mockImplementationOnce(async function* () { throw new Error('Banco indisponível'); });
    resposta = await consultar(1);
    assert.equal(resposta.status, 500);
    assert.equal(resposta.headers.get('content-disposition'), null);
    assert.deepEqual(await resposta.json(), { msg: 'Não foi possível gerar o backup.' });
});
