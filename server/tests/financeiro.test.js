import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'segredo-exclusivo-dos-testes-financeiros';
const { default: Database } = await import('../db/database.js');
const { default: financeiroRouter } = await import('../routes/financeiroRoute.js');
const { default: estoqueRouter } = await import('../routes/estoqueRoute.js');
const { default: caixaRouter } = await import('../routes/caixaRoute.js');
const pool = new Database().conexao, queryOriginal = pool.query, conexaoOriginal = pool.getConnection;
let estado, consultas, commits, rollbacks, transacoes, falharEm;

function executar(sql, valores = [], banco, tx) {
    let q = sql.replace(/\s+/g, ' ').trim().toLowerCase();
    consultas.push({ q, valores, tx });
    if (falharEm && q.startsWith(falharEm)) throw new Error('Falha simulada na transação');
    if (q.startsWith('select * from usuario')) return banco.usuarios.filter(u => u.id_usuario === valores[0]);
    if (q.startsWith('select * from movimentacao_financeira')) return banco.financeiro.filter(m => m.id_movimentacao_financeira === valores[0]);
    if (q.startsWith('select f.*, u.nome')) {
        assert.equal((q.match(/union all/g) ?? []).length, 2);
        assert.equal((q.match(/pg.status = 'pago' and p.status <> 'cancelado'/g) ?? []).length, 2);
        assert.match(q, /from movimentacao_financeira m where m.id_pedido is null/);
        assert.match(q, /pg.data_quitacao is not null and pg.id_caixa_quitacao is not null/);
        assert.match(q, /where c.status = 'fechado' and c.data_fechamento is not null/);
        assert.match(q, /group by c.id_caixa/);
        assert.match(q, /having sum\(r.valor\) > 0/);
        assert.doesNotMatch(q, /valor_recebido|valor_abertura|valor_fechamento|item_pedido|curdate|now\(/);
        let rows = banco.financeiro.filter(m => m.id_pedido === null).map(m => ({ ...m, id_caixa: null }));
        let recebimentos = [];
        for (let pg of banco.pagamentos) {
            let p = banco.pedidos.find(p => p.id_pedido === pg.id_pedido);
            if (!p || p.status === 'CANCELADO' || pg.status !== 'PAGO') continue;
            let fiado = pg.forma_pagamento === 'FIADO';
            if (!['DINHEIRO', 'PIX', 'DEBITO', 'CREDITO'].includes(fiado ? pg.forma_quitacao : pg.forma_pagamento)) continue;
            if (fiado && (pg.data_quitacao === null || pg.id_caixa_quitacao === null || pg.id_usuario_quitacao === null)) continue;
            recebimentos.push({ id_caixa: fiado ? pg.id_caixa_quitacao : p.id_caixa, valor: Number(pg.valor) });
        }
        for (let caixa of banco.caixas.filter(c => c.status === 'FECHADO' && c.data_fechamento !== null)) {
            let total = recebimentos.filter(r => r.id_caixa === caixa.id_caixa).reduce((soma, r) => soma + Math.round(r.valor * 100), 0);
            if (!total) continue;
            rows.push({ id_movimentacao_financeira: null, id_usuario: caixa.id_usuario_fechamento ?? caixa.id_usuario_abertura,
                id_pedido: null, id_movimentacao_estoque: null, tipo: 'ENTRADA', categoria: 'Fechamento de caixa',
                descricao: `Recebimentos do caixa #${caixa.id_caixa}`, valor: (total / 100).toFixed(2),
                data_hora: caixa.data_fechamento, recorrente: 0, quantidade_meses: null, id_caixa: caixa.id_caixa });
        }
        rows = rows.filter(m => banco.usuarios.some(u => u.id_usuario === m.id_usuario))
            .map(m => ({ ...m, nome_usuario: banco.usuarios.find(u => u.id_usuario === m.id_usuario).nome }));
        let indice = 0;
        if (q.includes('and f.data_hora >= ?')) { let data = valores[indice++]; rows = rows.filter(m => m.data_hora >= `${data} 00:00:00`); }
        if (q.includes('and f.data_hora < date_add')) { let data = valores[indice++]; rows = rows.filter(m => m.data_hora.slice(0, 10) <= data); }
        if (q.includes('and f.tipo = ?')) { let tipo = valores[indice++]; rows = rows.filter(m => m.tipo === tipo); }
        if (q.includes('and f.categoria = ?')) { let categoria = valores[indice++]; rows = rows.filter(m => m.categoria === categoria); }
        return rows.sort((a, b) => b.data_hora.localeCompare(a.data_hora) || b.id_caixa - a.id_caixa || b.id_movimentacao_financeira - a.id_movimentacao_financeira);
    }
    if (q.startsWith('select m.*, u.nome')) return banco.financeiro.filter(m => m.id_movimentacao_financeira === valores[0])
        .map(m => ({ ...m, nome_usuario: banco.usuarios.find(u => u.id_usuario === m.id_usuario)?.nome }));
    if (q.includes('from caixa c')) {
        if (falharEm === 'resposta-fechamento' && tx !== null) throw new Error('Falha simulada após fechar');
        let rows = banco.caixas.map(c => ({ ...c, nome_usuario_abertura: banco.usuarios.find(u => u.id_usuario === c.id_usuario_abertura)?.nome,
            nome_usuario_fechamento: banco.usuarios.find(u => u.id_usuario === c.id_usuario_fechamento)?.nome ?? null }));
        return q.includes('where c.id_caixa = ?') ? rows.filter(c => c.id_caixa === valores[0]) : rows.filter(c => c.status === 'ABERTO').slice(0, 1);
    }
    if (q.startsWith('update caixa')) {
        let [idUsuario, valor, id] = valores, caixa = banco.caixas.find(c => c.id_caixa === id && c.status === 'ABERTO');
        if (!caixa) return { affectedRows: 0 };
        Object.assign(caixa, { status: 'FECHADO', data_fechamento: banco.agora, id_usuario_fechamento: idUsuario, valor_fechamento: valor.toFixed(2) });
        return { affectedRows: 1 };
    }
    if (q === "select id_pedido, status from pedido where id_caixa = ? and status in ('recebido', 'em_preparo') order by id_pedido") {
        return banco.pedidos.filter(p => p.id_caixa === valores[0] && ['RECEBIDO', 'EM_PREPARO'].includes(p.status))
            .sort((a, b) => a.id_pedido - b.id_pedido).map(({ id_pedido, status }) => ({ id_pedido, status }));
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
        insumos: [{ id_insumo: 1, nome: 'Arroz', ativo: 1, estoque_minimo: '2.000' }], estoque: [], movimentacoes: [], pagamentos: [], pedidos: [], caixas: [], agora: '2026-11-02 18:00:00' };
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
function registrarCaixa({ id = 1, status = 'FECHADO', dataFechamento = '2026-11-02 18:00:00', valorFechamento = 190, idUsuarioFechamento = 2 } = {}) {
    let caixa = { id_caixa: id, id_usuario_abertura: 1, data_abertura: '2026-11-01 08:00:00', valor_abertura: '150.00', status,
        data_fechamento: status === 'ABERTO' ? null : dataFechamento, id_usuario_fechamento: status === 'ABERTO' ? null : idUsuarioFechamento,
        valor_fechamento: status === 'ABERTO' ? null : valorFechamento.toFixed(2) };
    estado.caixas.push(caixa); return caixa;
}
function fecharCaixa(idCaixa = 1, valorFechamento = 190) { return chamar({ router: caixaRouter, caminho: '/fechar', body: { idCaixa, valorFechamento } }); }
function registrarVenda({ id = 1, forma = 'DINHEIRO', valor = 40, dataHora = '2026-11-02 12:00:00', idCaixa = 1,
    status = 'PAGO', statusPedido = 'RECEBIDO', valorRecebido = null, ...quitacao } = {}) {
    estado.pedidos.push({ id_pedido: id, id_usuario: 1, id_caixa: idCaixa, status: statusPedido });
    let pagamento = { id_pagamento: id, id_pedido: id, forma_pagamento: forma, valor: valor.toFixed(2), data_hora: dataHora,
        status, valor_recebido: valorRecebido, id_usuario_quitacao: null, data_quitacao: null, forma_quitacao: null, id_caixa_quitacao: null, ...quitacao };
    estado.pagamentos.push(pagamento);
    return pagamento;
}

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
    ['pagamento forjado', b => { b.idPagamento = 3; }], ['pagamento SQL forjado', b => { b.id_pagamento = 3; }],
    ['caixa forjado', b => { b.idCaixa = 1; }], ['caixa SQL forjado', b => { b.id_caixa = 1; }],
]) test(`Validação ${nome}: 400 sem gravação`, async () => {
    let b = corpo(); alterar(b); assert.equal((await chamar({ body: b })).status, 400); assert.equal(estado.financeiro.length, 0);
});

test('Recorrência gera só um lançamento; aceita valor mínimo e ano bissexto', async () => {
    let r = await chamar({ body: { ...corpo(), recorrente: true, quantidadeMeses: 12, valor: 0.01, dataHora: '2024-02-29T10:00:00' } });
    assert.equal(r.status, 201); assert.equal(r.body.recorrente, true); assert.equal(r.body.quantidadeMeses, 12); assert.equal(estado.financeiro.length, 1);
    r = await chamar({ caminho: '/:id', metodo: 'put', body: { recorrente: false, quantidadeMeses: null } });
    assert.equal(r.status, 200); assert.equal(r.body.quantidadeMeses, null);
});

test('Período inclusivo, tipo e categoria combinados; ignora cópias legadas de vendas', async () => {
    for (let [tipo, categoria, valor, dataHora] of [
        ['ENTRADA', 'Avulsa', 0.1, '2026-11-01T00:00:00'], ['ENTRADA', 'Avulsa', 0.2, '2026-11-02T23:59:59'],
        ['SAIDA', 'Aluguel', 0.15, '2026-11-02T12:00:00'], ['ENTRADA', 'Avulsa', 20, '2026-11-03T00:00:00'],
    ]) await chamar({ body: { ...corpo(), tipo, categoria, valor, dataHora } });
    estado.financeiro.push({ ...estado.financeiro[0], id_movimentacao_financeira: 99, id_pedido: 99, valor: '1000.00' });
    let r = await chamar({ metodo: 'get', query: { dataInicio: '2026-11-01', dataFim: '2026-11-02' } });
    assert.equal(r.status, 200); assert.equal(r.body.movimentacoes.length, 3);
    assert.deepEqual(r.body.totais, { entradas: 0.3, saidas: 0.15, saldo: 0.15, recebimentosCaixas: 0, entradasAvulsas: 0.3 });
    r = await chamar({ metodo: 'get', query: { dataInicio: '2026-11-01', dataFim: '2026-11-02', tipo: 'ENTRADA', categoria: 'Avulsa' } });
    assert.deepEqual(r.body.totais, { entradas: 0.3, saidas: 0, saldo: 0.3, recebimentosCaixas: 0, entradasAvulsas: 0.3 });
    assert.deepEqual(consultas.at(-1).valores, ['2026-11-01', '2026-11-02', 'ENTRADA', 'Avulsa']);
    assert.doesNotMatch(consultas.at(-1).q, /date\(f.data_hora\)/);
});
for (let query of [{ dataInicio: '2026-02-30' }, { dataInicio: '2026-11-03', dataFim: '2026-11-02' }, { tipo: 'VENDA' }, { categoria: '' }, { categoria: ['a', 'b'] }]) test(`Filtro inválido ${JSON.stringify(query)}: 400`, async () => {
    assert.equal((await chamar({ metodo: 'get', query })).status, 400);
});
for (let perfil of [1, 2, 3, null]) test(`Permissões financeiras perfil ${perfil}`, async () => {
    registrarCaixa();
    registrarVenda();
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

test('Fechar caixa gera uma única entrada consolidada de R$ 300, sem copiar pagamentos', async () => {
    registrarCaixa({ status: 'ABERTO' });
    for (let [indice, forma] of ['DINHEIRO', 'PIX', 'DEBITO', 'CREDITO'].entries()) {
        registrarVenda({ id: indice + 1, forma, valor: [40, 80, 70, 110][indice], statusPedido: 'PRONTO', valorRecebido: forma === 'DINHEIRO' ? '50.00' : null });
    }
    await chamar({ body: { ...corpo(), tipo: 'ENTRADA', categoria: 'Avulsa', valor: 10 } });
    await chamar({ body: { ...corpo(), valor: 30 } });
    let r = await chamar({ metodo: 'get' });
    assert.equal(r.body.movimentacoes.length, 2); assert.equal(r.body.totais.recebimentosCaixas, 0);
    assert.equal((await fecharCaixa()).status, 200);
    let antes = structuredClone(estado);
    r = await chamar({ metodo: 'get' });
    assert.equal(r.status, 200); assert.equal(r.body.movimentacoes.length, 3);
    assert.deepEqual(r.body.totais, { entradas: 310, saidas: 30, saldo: 280, recebimentosCaixas: 300, entradasAvulsas: 10 });
    let consolidado = r.body.movimentacoes.find(m => m.origem === 'CAIXA');
    assert.equal(consolidado.valor, 300); assert.equal(consolidado.id, null); assert.equal(consolidado.idCaixa, 1);
    assert.equal(consolidado.idPedido, null); assert.equal(consolidado.nomeUsuario, 'Pessoa 1');
    assert.equal(consolidado.dataHora, estado.agora); assert.equal(consolidado.categoria, 'Fechamento de caixa');
    assert.equal(consolidado.descricao, 'Recebimentos do caixa #1');
    assert.equal('idPagamento' in consolidado, false); assert.equal('formaPagamento' in consolidado, false);
    assert.equal(r.body.movimentacoes.find(m => m.id === 1).origem, 'MANUAL');
    assert.deepEqual(estado, antes); assert.equal(estado.financeiro.length, 2);
    assert.deepEqual((await chamar({ metodo: 'get' })).body, r.body);
    assert.equal((await fecharCaixa()).status, 409);
    assert.deepEqual((await chamar({ metodo: 'get' })).body, r.body);
});

test('Caixa aberto não aparece no financeiro, mesmo com vendas pagas e atualizações repetidas', async () => {
    registrarCaixa({ status: 'ABERTO' }); registrarVenda();
    for (let tentativa = 0; tentativa < 3; tentativa++) {
        let r = await chamar({ metodo: 'get' });
        assert.equal(r.status, 200); assert.equal(r.body.movimentacoes.length, 0); assert.equal(r.body.totais.entradas, 0);
    }
    assert.equal(estado.financeiro.length, 0); assert.equal(transacoes, 0);
});

test('Dinheiro sem valor recebido e precisão de centavos: não soma troco, abertura ou valor contado', async () => {
    registrarCaixa({ valorFechamento: 999 });
    registrarVenda({ id: 1, valor: 0.1 }); registrarVenda({ id: 2, valor: 0.2, valorRecebido: '1.00' });
    registrarVenda({ id: 3, valor: 0.3, forma: 'PIX' });
    let r = await chamar({ metodo: 'get' });
    assert.equal(r.status, 200); assert.equal(r.body.totais.entradas, 0.6); assert.equal(r.body.totais.saldo, 0.6);
    assert.equal(r.body.movimentacoes.length, 1); assert.equal(r.body.movimentacoes[0].valor, 0.6);
    assert.equal(estado.financeiro.length, 0);
});

test('Fiado só entra no fechamento do caixa que recebeu, mesmo quitado em outro dia e caixa', async () => {
    registrarCaixa({ dataFechamento: '2026-10-31 18:00:00' });
    registrarCaixa({ id: 2, status: 'ABERTO' });
    let pg = registrarVenda({ forma: 'FIADO', valor: 35.5, status: 'PENDENTE', dataHora: '2026-10-31 12:00:00' });
    assert.equal((await chamar({ metodo: 'get' })).body.totais.entradas, 0);
    Object.assign(pg, { status: 'PAGO', data_quitacao: '2026-11-01 10:15:00', id_caixa_quitacao: 2, id_usuario_quitacao: 2, forma_quitacao: 'PIX' });
    assert.equal((await chamar({ metodo: 'get' })).body.totais.entradas, 0);
    assert.equal((await fecharCaixa(2)).status, 200);
    for (let dia of ['2026-10-31', '2026-11-01']) {
        let r = await chamar({ metodo: 'get', query: { dataInicio: dia, dataFim: dia } });
        assert.equal(r.body.movimentacoes.length, 0); assert.equal(r.body.totais.entradas, 0);
    }
    let r = await chamar({ metodo: 'get', query: { dataInicio: '2026-11-02', dataFim: '2026-11-02', categoria: 'Fechamento de caixa' } });
    assert.equal(r.status, 200); assert.equal(r.body.movimentacoes.length, 1);
    assert.deepEqual(r.body.totais, { entradas: 35.5, saidas: 0, saldo: 35.5, recebimentosCaixas: 35.5, entradasAvulsas: 0 });
    assert.equal(r.body.movimentacoes[0].idCaixa, 2); assert.equal(r.body.movimentacoes[0].dataHora, estado.agora);
    assert.equal(estado.financeiro.length, 0);
});

test('Fiados quitados nas quatro formas são somados uma vez no mesmo caixa fechado', async () => {
    registrarCaixa(); registrarCaixa({ id: 2 });
    for (let [indice, forma] of ['DINHEIRO', 'PIX', 'DEBITO', 'CREDITO'].entries()) {
        registrarVenda({ id: indice + 1, forma: 'FIADO', valor: 10.15, id_usuario_quitacao: 1,
            forma_quitacao: forma, data_quitacao: '2026-11-02 12:00:00', id_caixa_quitacao: 2, valorRecebido: forma === 'DINHEIRO' ? '50.00' : null });
    }
    let r = await chamar({ metodo: 'get' });
    assert.equal(r.body.movimentacoes.length, 1); assert.equal(r.body.movimentacoes[0].idCaixa, 2);
    assert.equal(r.body.totais.recebimentosCaixas, 40.6); assert.equal(r.body.totais.entradas, 40.6);
});

test('Exclui pendentes, pagamentos cancelados e pedidos cancelados, inclusive fiado quitado', async () => {
    registrarCaixa(); registrarCaixa({ id: 2 });
    registrarVenda({ id: 1 });
    registrarVenda({ id: 2, status: 'PENDENTE', forma: 'PIX' });
    registrarVenda({ id: 3, status: 'CANCELADO' });
    registrarVenda({ id: 4, statusPedido: 'CANCELADO' });
    registrarVenda({ id: 5, forma: 'FIADO', statusPedido: 'CANCELADO', data_quitacao: '2026-11-02 12:00:00',
        forma_quitacao: 'DINHEIRO', id_caixa_quitacao: 2, id_usuario_quitacao: 1 });
    let r = await chamar({ metodo: 'get' });
    assert.equal(r.body.movimentacoes.length, 1); assert.equal(r.body.movimentacoes[0].idCaixa, 1);
    assert.equal(r.body.totais.entradas, 40);
});

test('Fiado PAGO legado sem dados completos de quitação não vira recebimento presumido', async () => {
    registrarCaixa(); registrarCaixa({ id: 2 });
    registrarVenda({ id: 1, forma: 'FIADO' });
    registrarVenda({ id: 2, forma: 'FIADO', data_quitacao: '2026-11-02 12:00:00', forma_quitacao: 'PIX', id_usuario_quitacao: 1 });
    registrarVenda({ id: 3, forma: 'FIADO', data_quitacao: '2026-11-02 12:00:00', forma_quitacao: 'PIX', id_caixa_quitacao: 2 });
    let r = await chamar({ metodo: 'get' });
    assert.equal(r.body.movimentacoes.length, 0); assert.equal(r.body.totais.entradas, 0);
});

test('Caixa que atravessa dias gera uma entrada na data de fechamento; dois caixas no dia ficam separados', async () => {
    registrarCaixa({ dataFechamento: '2026-11-03 00:00:00' });
    registrarCaixa({ id: 2, dataFechamento: '2026-11-03 23:59:59' });
    registrarCaixa({ id: 3, dataFechamento: '2026-11-04 00:00:00' });
    registrarVenda({ id: 1, dataHora: '2026-11-01 23:59:59' });
    registrarVenda({ id: 2, dataHora: '2026-11-02 00:00:00' });
    registrarVenda({ id: 3, idCaixa: 2, valor: 10, dataHora: '2026-11-03 12:00:00' });
    registrarVenda({ id: 4, idCaixa: 3, valor: 20, dataHora: '2026-11-03 15:00:00' });
    let r = await chamar({ metodo: 'get', query: { dataInicio: '2026-11-01', dataFim: '2026-11-02' } });
    assert.equal(r.body.movimentacoes.length, 0);
    r = await chamar({ metodo: 'get', query: { dataInicio: '2026-11-03', dataFim: '2026-11-03' } });
    assert.equal(r.body.movimentacoes.length, 2); assert.equal(r.body.totais.entradas, 90);
    assert.deepEqual(r.body.movimentacoes.map(m => [m.idCaixa, m.valor]), [[2, 10], [1, 80]]);
    assert.equal(estado.financeiro.length, 0);
});

test('Filtros de período, tipo e categoria se aplicam aos fechamentos e lançamentos manuais', async () => {
    registrarCaixa(); registrarVenda();
    registrarCaixa({ id: 2, dataFechamento: '2026-11-03 00:00:00' }); registrarVenda({ id: 2, idCaixa: 2, valor: 10 });
    await chamar({ body: { ...corpo(), valor: 5 } });
    let query = { dataInicio: '2026-11-02', dataFim: '2026-11-02', tipo: 'ENTRADA', categoria: 'Fechamento de caixa' };
    let r = await chamar({ metodo: 'get', query });
    assert.equal(r.body.movimentacoes.length, 1); assert.equal(r.body.totais.recebimentosCaixas, 40);
    query.tipo = 'SAIDA';
    r = await chamar({ metodo: 'get', query }); assert.equal(r.body.movimentacoes.length, 0);
    delete query.categoria;
    r = await chamar({ metodo: 'get', query }); assert.equal(r.body.totais.saidas, 5); assert.equal(r.body.totais.entradas, 0);
});

test('Caixa sem recebimentos ou sem data de fechamento não gera entrada zero nem receita de abertura', async () => {
    registrarCaixa(); registrarCaixa({ id: 2, dataFechamento: null });
    registrarVenda({ id: 1, idCaixa: 2 });
    let r = await chamar({ metodo: 'get' });
    assert.equal(r.body.movimentacoes.length, 0); assert.equal(r.body.totais.recebimentosCaixas, 0);
});

test('Consolidado pode superar o limite de um lançamento individual e mantém a soma monetária', async () => {
    registrarCaixa();
    registrarVenda({ id: 1, forma: 'PIX', valor: 60000000 }); registrarVenda({ id: 2, forma: 'CREDITO', valor: 60000000 });
    let r = await chamar({ metodo: 'get' });
    assert.equal(r.status, 200); assert.equal(r.body.movimentacoes.length, 1);
    assert.equal(r.body.movimentacoes[0].valor, 120000000); assert.equal(r.body.totais.recebimentosCaixas, 120000000);
});

test('Falha após atualizar o caixa reverte o fechamento e não disponibiliza entrada financeira', async () => {
    registrarCaixa({ status: 'ABERTO' }); registrarVenda({ statusPedido: 'PRONTO' });
    let antes = structuredClone(estado); falharEm = 'resposta-fechamento';
    let original = console.error; console.error = () => {};
    try { assert.equal((await fecharCaixa()).status, 500); } finally { console.error = original; falharEm = null; }
    assert.deepEqual(estado, antes); assert.equal(rollbacks, 1); assert.equal(commits, 0);
    assert.equal((await chamar({ metodo: 'get' })).body.totais.recebimentosCaixas, 0);
    assert.equal((await fecharCaixa()).status, 200);
    assert.equal((await chamar({ metodo: 'get' })).body.totais.recebimentosCaixas, 40);
    assert.equal(estado.financeiro.length, 0);
});

test('Entradas manuais com o mesmo nome de categoria não são classificadas como caixa', async () => {
    registrarCaixa(); registrarVenda();
    await chamar({ body: { ...corpo(), tipo: 'ENTRADA', categoria: 'Fechamento de caixa', valor: 5 } });
    let r = await chamar({ metodo: 'get' });
    assert.equal(r.body.totais.entradas, 45); assert.equal(r.body.totais.recebimentosCaixas, 40); assert.equal(r.body.totais.entradasAvulsas, 5);
});
