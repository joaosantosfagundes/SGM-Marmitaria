import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'segredo-exclusivo-dos-testes-financeiros';
const { default: Database } = await import('../db/database.js');
const { default: financeiroRouter } = await import('../routes/financeiroRoute.js');
const { default: estoqueRouter } = await import('../routes/estoqueRoute.js');
const pool = new Database().conexao, queryOriginal = pool.query, conexaoOriginal = pool.getConnection;
let estado, consultas, commits, rollbacks, transacoes, falharEm;

function executar(sql, valores = [], banco, tx) {
    let q = sql.replace(/\s+/g, ' ').trim().toLowerCase();
    consultas.push({ q, valores, tx });
    if (falharEm && q.startsWith(falharEm)) throw new Error('Falha simulada na transação');
    if (q.startsWith('select * from usuario')) return banco.usuarios.filter(u => u.id_usuario === valores[0]);
    if (q.startsWith('select * from movimentacao_financeira')) return banco.financeiro.filter(m => m.id_movimentacao_financeira === valores[0]);
    if (q.startsWith('select m.*, u.nome')) {
        let rows = banco.financeiro.map(m => ({ ...m, nome_usuario: banco.usuarios.find(u => u.id_usuario === m.id_usuario)?.nome }));
        if (q.includes('where m.id_movimentacao_financeira = ?')) return rows.filter(m => m.id_movimentacao_financeira === valores[0]);
        rows = rows.filter(m => m.id_pedido === null);
        let indice = 0;
        if (q.includes('and m.data_hora >= ?')) { let data = valores[indice++]; rows = rows.filter(m => m.data_hora >= `${data} 00:00:00`); }
        if (q.includes('and m.data_hora < date_add')) { let data = valores[indice++]; rows = rows.filter(m => m.data_hora.slice(0, 10) <= data); }
        if (q.includes('and m.tipo = ?')) { let tipo = valores[indice++]; rows = rows.filter(m => m.tipo === tipo); }
        if (q.includes('and m.categoria = ?')) { let categoria = valores[indice++]; rows = rows.filter(m => m.categoria === categoria); }
        return rows.sort((a, b) => b.data_hora.localeCompare(a.data_hora) || b.id_movimentacao_financeira - a.id_movimentacao_financeira);
    }
    if (q.startsWith('insert into movimentacao_financeira')) {
        let id = Math.max(0, ...banco.financeiro.map(m => m.id_movimentacao_financeira)) + 1;
        let [id_usuario, tipo, categoria, descricao, valor, data_hora, recorrente, quantidade_meses, id_movimentacao_estoque] = valores;
        banco.financeiro.push({ id_movimentacao_financeira: id, id_usuario, id_pedido: null, tipo, categoria, descricao, valor: valor.toFixed(2), data_hora, recorrente: Number(recorrente), quantidade_meses, id_movimentacao_estoque });
        return { insertId: id };
    }
    if (q.startsWith('update movimentacao_financeira')) {
        let [tipo, categoria, descricao, valor, data_hora, recorrente, quantidade_meses, id] = valores;
        let row = banco.financeiro.find(m => m.id_movimentacao_financeira === id && m.id_pedido === null && m.id_movimentacao_estoque === null);
        if (!row) return { affectedRows: 0 };
        Object.assign(row, { tipo, categoria, descricao, valor: valor.toFixed(2), data_hora, recorrente: Number(recorrente), quantidade_meses });
        return { affectedRows: 1 };
    }
    if (q.startsWith('delete from movimentacao_financeira')) {
        let indice = banco.financeiro.findIndex(m => m.id_movimentacao_financeira === valores[0] && m.id_pedido === null && m.id_movimentacao_estoque === null);
        if (indice < 0) return { affectedRows: 0 };
        banco.financeiro.splice(indice, 1); return { affectedRows: 1 };
    }
    if (q.startsWith('select * from insumo')) return banco.insumos.filter(i => i.id_insumo === valores[0]);
    if (q.startsWith('insert into estoque')) {
        if (!banco.estoque.some(e => e.id_insumo === valores[0])) banco.estoque.push({ id_insumo: valores[0], quantidade: '0.000' });
        return { affectedRows: 1 };
    }
    if (q.startsWith('select * from estoque')) return banco.estoque.filter(e => e.id_insumo === valores[0]);
    if (q.startsWith('update estoque')) { banco.estoque.find(e => e.id_insumo === valores[1]).quantidade = valores[0].toFixed(3); return { affectedRows: 1 }; }
    if (q.startsWith('insert into movimentacao_estoque')) {
        let id = banco.movimentacoes.length + 1;
        let [id_insumo, id_usuario, tipo, quantidade, motivo] = valores;
        banco.movimentacoes.push({ id_movimentacao: id, id_insumo, id_usuario, tipo, quantidade: quantidade.toFixed(3), motivo, data_hora: '2026-11-02 12:00:00' });
        return { insertId: id };
    }
    if (q.includes('from movimentacao_estoque m')) return banco.movimentacoes.filter(m => m.id_movimentacao === valores[0]).map(m => ({ ...m, nome_insumo: 'Arroz', sigla_unidade: 'kg', nome_usuario: 'Pessoa 1' }));
    throw new Error(`SQL não previsto no banco simulado: ${q}`);
}
pool.query = (sql, valores, callback) => { try { callback(null, executar(sql, valores, estado, null)); } catch (error) { callback(error); } };
pool.getConnection = callback => {
    let banco, tx = ++transacoes;
    callback(null, {
        beginTransaction: cb => { banco = structuredClone(estado); cb(null); },
        query: (sql, valores, cb) => { try { cb(null, executar(sql, valores, banco, tx)); } catch (error) { cb(error); } },
        commit: cb => { estado = banco; commits++; cb(null); },
        rollback: cb => { rollbacks++; cb(null); }, release() {},
    });
};
beforeEach(() => {
    estado = { usuarios: [1, 2, 3].map((id, i) => ({ id_usuario: id, nome: `Pessoa ${id}`, perfil: ['ADMIN', 'ATENDENTE', 'COZINHA'][i], ativo: 1 })), financeiro: [],
        insumos: [{ id_insumo: 1, nome: 'Arroz', ativo: 1, estoque_minimo: '2.000' }], estoque: [], movimentacoes: [] };
    consultas = []; commits = rollbacks = transacoes = 0; falharEm = null;
});
after(() => { pool.query = queryOriginal; pool.getConnection = conexaoOriginal; pool.end(); });

function corpo() { return { tipo: 'SAIDA', categoria: 'Aluguel', descricao: 'Pagamento do mês', valor: 150.25, dataHora: '2026-11-02T15:30', recorrente: false, quantidadeMeses: null }; }
function compra(valorPago) { return { idInsumo: 1, tipo: 'ENTRADA_COMPRA', quantidade: 10, ...(valorPago === undefined ? {} : { valorPago }) }; }
async function chamar({ router = financeiroRouter, caminho = '/', metodo = 'post', body = corpo(), perfil = 1, id = '1', query = {} } = {}) {
    let camada = router.stack.find(layer => layer.route?.path === caminho && layer.route.methods[metodo]);
    let req = { body, query, params: { id }, cookies: perfil ? { token: jwt.sign({ id: perfil }, process.env.JWT_SECRET) } : {} };
    return new Promise((resolve, reject) => {
        let res = { status(code) { this.code = code; return this; }, json(body) { resolve({ status: this.code, body: JSON.parse(JSON.stringify(body)) }); } }, indice = 0;
        function next(error) {
            if (error) return reject(error);
            try { Promise.resolve(camada.route.stack[indice++].handle(req, res, next)).catch(reject); } catch (error) { reject(error); }
        }
        next();
    });
}
function registrarCompra(body, perfil = 1) { return chamar({ router: estoqueRouter, caminho: '/movimentacoes', body, perfil }); }

test('CRUD manual, valor DECIMAL numérico, data editável sem UTC e usuário do JWT', async () => {
    let r = await chamar({ body: { ...corpo(), idUsuario: 999 } });
    assert.equal(r.status, 201); assert.equal(r.body.valor, 150.25); assert.equal(r.body.idUsuario, 1); assert.equal(r.body.nomeUsuario, 'Pessoa 1');
    assert.equal(r.body.dataHora, '2026-11-02 15:30:00'); assert.equal(r.body.idMovimentacaoEstoque, null);
    r = await chamar({ caminho: '/:id', metodo: 'put', body: { valor: 200, dataHora: '2026-11-01 23:59:59', idUsuario: 2 } });
    assert.equal(r.status, 200); assert.equal(r.body.dataHora, '2026-11-01 23:59:59'); assert.equal(r.body.idUsuario, 1);
    assert.equal((await chamar({ caminho: '/:id', metodo: 'delete' })).status, 200); assert.equal(estado.financeiro.length, 0);
    assert.equal(commits, 3); assert.ok(consultas.some(q => q.q.endsWith('for update')));
});

for (let [nome, alterar] of [
    ['valor ausente', b => { delete b.valor; }], ['zero', b => { b.valor = 0; }], ['negativo', b => { b.valor = -1; }],
    ['valor texto', b => { b.valor = '10'; }], ['três casas', b => { b.valor = 1.001; }], ['valor acima do máximo', b => { b.valor = 100000000; }],
    ['tipo inválido', b => { b.tipo = 'VENDA'; }], ['categoria vazia', b => { b.categoria = '  '; }], ['categoria longa', b => { b.categoria = 'a'.repeat(101); }],
    ['descrição longa', b => { b.descricao = 'a'.repeat(256); }], ['descrição numérica', b => { b.descricao = 3; }],
    ['data ausente', b => { delete b.dataHora; }], ['data inexistente', b => { b.dataHora = '2026-02-30T10:00'; }], ['hora inválida', b => { b.dataHora = '2026-11-02T24:00'; }],
    ['data UTC', b => { b.dataHora = '2026-11-02T10:00:00Z'; }], ['booleano texto', b => { b.recorrente = 'true'; }],
    ['meses sem recorrência', b => { b.quantidadeMeses = 2; }], ['recorrência sem meses', b => { b.recorrente = true; }],
    ['recorrência de um mês', b => { b.recorrente = true; b.quantidadeMeses = 1; }], ['meses fracionados', b => { b.recorrente = true; b.quantidadeMeses = 2.5; }],
    ['meses acima de INT', b => { b.recorrente = true; b.quantidadeMeses = 2147483648; }], ['meses texto', b => { b.recorrente = true; b.quantidadeMeses = '2'; }],
    ['vínculo de estoque forjado', b => { b.idMovimentacaoEstoque = 5; }], ['pedido forjado', b => { b.idPedido = 3; }],
]) test(`Validação ${nome}: 400 sem gravação`, async () => {
    let b = corpo(); alterar(b); assert.equal((await chamar({ body: b })).status, 400); assert.equal(estado.financeiro.length, 0);
});

test('Recorrência gera só um lançamento; aceita valor mínimo e ano bissexto', async () => {
    let r = await chamar({ body: { ...corpo(), recorrente: true, quantidadeMeses: 12, valor: 0.01, dataHora: '2024-02-29T10:00:00' } });
    assert.equal(r.status, 201); assert.equal(r.body.recorrente, true); assert.equal(r.body.quantidadeMeses, 12); assert.equal(estado.financeiro.length, 1);
    r = await chamar({ caminho: '/:id', metodo: 'put', body: { recorrente: false, quantidadeMeses: null } });
    assert.equal(r.status, 200); assert.equal(r.body.quantidadeMeses, null);
});

test('Período inclusivo, tipo e categoria combinados; totais em centavos sem vendas', async () => {
    for (let [tipo, categoria, valor, dataHora] of [
        ['ENTRADA', 'Avulsa', 0.1, '2026-11-01T00:00:00'], ['ENTRADA', 'Avulsa', 0.2, '2026-11-02T23:59:59'],
        ['SAIDA', 'Aluguel', 0.15, '2026-11-02T12:00:00'], ['ENTRADA', 'Avulsa', 20, '2026-11-03T00:00:00'],
    ]) await chamar({ body: { ...corpo(), tipo, categoria, valor, dataHora } });
    estado.financeiro.push({ ...estado.financeiro[0], id_movimentacao_financeira: 99, id_pedido: 99, valor: '1000.00' });
    let r = await chamar({ metodo: 'get', query: { dataInicio: '2026-11-01', dataFim: '2026-11-02' } });
    assert.equal(r.status, 200); assert.equal(r.body.movimentacoes.length, 3); assert.deepEqual(r.body.totais, { entradas: 0.3, saidas: 0.15, saldo: 0.15 });
    r = await chamar({ metodo: 'get', query: { dataInicio: '2026-11-01', dataFim: '2026-11-02', tipo: 'ENTRADA', categoria: 'Avulsa' } });
    assert.deepEqual(r.body.totais, { entradas: 0.3, saidas: 0, saldo: 0.3 });
    assert.deepEqual(consultas.at(-1).valores, ['2026-11-01', '2026-11-02', 'ENTRADA', 'Avulsa']);
    assert.doesNotMatch(consultas.at(-1).q, /date\(m.data_hora\)|from pagamento|join pagamento/);
});
for (let query of [{ dataInicio: '2026-02-30' }, { dataInicio: '2026-11-03', dataFim: '2026-11-02' }, { tipo: 'VENDA' }, { categoria: '' }, { categoria: ['a', 'b'] }]) test(`Filtro inválido ${JSON.stringify(query)}: 400`, async () => {
    assert.equal((await chamar({ metodo: 'get', query })).status, 400);
});
for (let perfil of [1, 2, 3, null]) test(`Permissões financeiras perfil ${perfil}`, async () => {
    let consulta = perfil === null ? 401 : perfil === 3 ? 403 : 200;
    let escrita = perfil === null ? 401 : perfil === 1 ? undefined : 403;
    assert.equal((await chamar({ metodo: 'get', perfil })).status, consulta);
    let r = await chamar({ perfil }); assert.equal(r.status, escrita ?? 201);
    assert.equal((await chamar({ caminho: '/:id', metodo: 'put', perfil })).status, escrita ?? 200);
    assert.equal((await chamar({ caminho: '/:id', metodo: 'delete', perfil })).status, escrita ?? 200);
});
test('IDs inválidos e registro inexistente', async () => {
    assert.equal((await chamar({ caminho: '/:id', metodo: 'put', id: '0' })).status, 400);
    assert.equal((await chamar({ caminho: '/:id', metodo: 'delete', id: 'abc' })).status, 400);
    assert.equal((await chamar({ caminho: '/:id', metodo: 'put', id: '99' })).status, 404);
    assert.equal((await chamar({ caminho: '/:id', metodo: 'delete', id: '99' })).status, 404);
});

test('Compra com valor pago: saldo, movimentação e despesa na mesma transação', async () => {
    let r = await registrarCompra({ ...compra(70.3), idUsuario: 999 });
    assert.equal(r.status, 201); assert.equal(r.body.novoSaldo, 10); assert.equal(r.body.financeiro.tipo, 'SAIDA');
    assert.equal(r.body.financeiro.valor, 70.3); assert.equal(r.body.financeiro.idMovimentacaoEstoque, r.body.movimentacao.id);
    assert.equal(r.body.financeiro.dataHora, r.body.movimentacao.dataHora); assert.equal(r.body.financeiro.idUsuario, 1);
    assert.equal(r.body.financeiro.categoria, 'Compra de insumo'); assert.equal(commits, 1); assert.equal(transacoes, 1);
    assert.ok(consultas.filter(q => !q.q.startsWith('select * from usuario')).every(q => q.tx === 1));
    assert.ok(consultas.some(q => q.q === 'select * from estoque where id_insumo = ? for update'));
    let consulta = await chamar({ metodo: 'get' }); assert.equal(consulta.body.totais.saidas, 70.3);
});
test('Compra sem valor ou null não cria despesa; COZINHA mantém o registro sem valor', async () => {
    for (let body of [compra(), compra(null)]) assert.equal((await registrarCompra(body, 3)).status, 201);
    assert.equal(estado.financeiro.length, 0); assert.equal(estado.movimentacoes.length, 2);
});
test('COZINHA não registra valor pago; ATENDENTE não registra estoque', async () => {
    assert.equal((await registrarCompra(compra(10), 3)).status, 403);
    assert.equal((await registrarCompra(compra(), 2)).status, 403);
    assert.equal(estado.movimentacoes.length, 0);
});
for (let valor of [0, -1, 1.001, '10', 100000000]) test(`Valor pago inválido ${JSON.stringify(valor)}: 400`, async () => {
    assert.equal((await registrarCompra(compra(valor))).status, 400); assert.equal(estado.financeiro.length, 0); assert.equal(estado.movimentacoes.length, 0);
});
test('Valor pago proibido nos demais tipos; saída sem saldo continua recusada', async () => {
    assert.equal((await registrarCompra({ ...compra(10), tipo: 'AJUSTE_ENTRADA', motivo: 'Ajuste' })).status, 400);
    assert.equal((await registrarCompra({ ...compra(), tipo: 'PERDA', motivo: 'Perda' })).status, 409);
});
test('Insumo inativo ou inexistente não cria financeiro', async () => {
    estado.insumos[0].ativo = 0; assert.equal((await registrarCompra(compra(10))).status, 400);
    assert.equal((await registrarCompra({ ...compra(10), idInsumo: 99 })).status, 404);
    assert.equal(estado.financeiro.length, 0);
});
test('Lançamentos vinculados e legados de pedido não podem ser alterados/excluídos', async () => {
    await registrarCompra(compra(10));
    assert.equal((await chamar({ caminho: '/:id', metodo: 'put' })).status, 409);
    assert.equal((await chamar({ caminho: '/:id', metodo: 'delete' })).status, 409);
    estado.financeiro[0].id_movimentacao_estoque = null; estado.financeiro[0].id_pedido = 9;
    assert.equal((await chamar({ caminho: '/:id', metodo: 'delete' })).status, 409);
    assert.equal((await chamar({ caminho: '/:id', metodo: 'put' })).status, 409);
    assert.equal(estado.financeiro.length, 1);
});
for (let ponto of ['update estoque', 'insert into movimentacao_estoque', 'insert into movimentacao_financeira', 'select m.*, u.nome']) test(`Rollback da compra após falha em ${ponto}`, async () => {
    let antes = structuredClone(estado); falharEm = ponto; let original = console.error; console.error = () => {};
    try { assert.equal((await registrarCompra(compra(10))).status, 500); } finally { console.error = original; }
    assert.deepEqual(estado, antes); assert.equal(commits, 0); assert.equal(rollbacks, 1);
});
test('Edição inválida reverte e não altera lançamento existente', async () => {
    await chamar(); let antes = structuredClone(estado);
    assert.equal((await chamar({ caminho: '/:id', metodo: 'put', body: { valor: 0 } })).status, 400);
    assert.deepEqual(estado, antes);
});
