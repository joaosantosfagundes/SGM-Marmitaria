import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'segredo-dos-testes-de-quitacao';
const { default: Database } = await import('../db/database.js');
const { default: router } = await import('../routes/pagamentoRoute.js');
const { default: PagamentoService } = await import('../services/pagamentoService.js');
const { default: CaixaService } = await import('../services/caixaService.js');
const pool = new Database().conexao;
const queryOriginal = pool.query, conexaoOriginal = pool.getConnection;
let estado, consultas, travas, sequencia, commits, rollbacks, falharPagamento, conflito, interceptar, aoEsperar;

function sinal() {
    let resolver; return { promise: new Promise(resolve => { resolver = resolve; }), resolver: () => resolver() };
}

// Coordenação simulada dos bloqueios, sem substituir o isolamento do MySQL real.
async function bloquear(chave, tx, tipo) {
    assert.ok(tx);
    let trava = travas.get(chave);
    if (!trava) { trava = { donos: new Map(), fila: [] }; travas.set(chave, trava); }
    if (trava.donos.has(tx.id)) return;
    if (!trava.fila.length && (!trava.donos.size || (tipo === 'S' && [...trava.donos.values()].every(v => v === 'S')))) trava.donos.set(tx.id, tipo);
    else await new Promise(resolve => { trava.fila.push({ id: tx.id, tipo, resolve }); aoEsperar?.(chave, tipo); });
}

function liberar(tx) {
    for (let trava of travas.values()) {
        trava.donos.delete(tx.id);
        while (trava.fila.length) {
            let proximo = trava.fila[0];
            if (trava.donos.size && (proximo.tipo === 'X' || [...trava.donos.values()].includes('X'))) break;
            trava.fila.shift(); trava.donos.set(proximo.id, proximo.tipo); proximo.resolve();
            if (proximo.tipo === 'X') break;
        }
    }
}

function pagamentos(tx) { return estado.pagamentos.map(pg => ({ ...pg, ...tx?.pagamentos.get(pg.id_pagamento) })); }
function caixas(tx) { return estado.caixas.map(c => ({ ...c, ...tx?.caixas.get(c.id_caixa) })); }
function valorTotal(rows) { return (rows.reduce((soma, pg) => soma + Math.round(Number(pg.valor) * 100), 0) / 100).toFixed(2); }
function detalhar(pg) {
    let p = estado.pedidos.find(p => p.id_pedido === pg.id_pedido), c = estado.clientes.find(c => c.id_cliente === p.id_cliente);
    return { ...pg, id_cliente: p.id_cliente, id_caixa: p.id_caixa, status_pedido: p.status,
        nome_cliente: c?.nome ?? null, telefone_cliente: c?.telefone ?? null,
        nome_usuario_quitacao: estado.usuarios.find(u => u.id_usuario === pg.id_usuario_quitacao)?.nome ?? null };
}

function resumo(id, sql) {
    assert.match(sql, /left join pedido p on p.id_caixa = c.id_caixa and p.status <> 'cancelado'/);
    assert.match(sql, /group by pg.id_caixa_quitacao/);
    assert.match(sql, /coalesce\(max\(q.total_dinheiro\), 0\) as fiado_recebido_dinheiro/);
    assert.doesNotMatch(sql, /item_pedido|valor_recebido|curdate|date\(/);
    let caixa = estado.caixas.find(c => c.id_caixa === id);
    if (!caixa) return [];
    let validos = pagamentos().filter(pg => estado.pedidos.some(p => p.id_pedido === pg.id_pedido && p.status !== 'CANCELADO'));
    let vendas = validos.filter(pg => estado.pedidos.find(p => p.id_pedido === pg.id_pedido).id_caixa === id);
    let row = { ...caixa, total_fiado_quitado: valorTotal(vendas.filter(pg => pg.forma_pagamento === 'FIADO' && pg.status === 'PAGO')) };
    for (let forma of ['DINHEIRO', 'PIX', 'DEBITO', 'CREDITO', 'FIADO']) {
        let chave = forma.toLowerCase();
        let rows = vendas.filter(pg => pg.forma_pagamento === forma && pg.status === (forma === 'FIADO' ? 'PENDENTE' : 'PAGO'));
        row[`total_${chave}`] = valorTotal(rows); row[`quantidade_${chave}`] = rows.length;
        if (forma !== 'FIADO') {
            rows = validos.filter(pg => pg.forma_pagamento === 'FIADO' && pg.status === 'PAGO' && pg.id_caixa_quitacao === id && pg.forma_quitacao === forma);
            row[`fiado_recebido_${chave}`] = valorTotal(rows); row[`quantidade_fiado_recebido_${chave}`] = rows.length;
        }
    }
    return [row];
}

async function executar(sql, valores = [], tx) {
    let q = sql.replace(/\s+/g, ' ').trim().toLowerCase();
    consultas.push({ q, valores, tx: tx?.id ?? null });
    if (q.startsWith('select * from usuario')) return estado.usuarios.filter(u => u.id_usuario === valores[0]);
    if (q.includes('sum(case')) return resumo(valores[0], q);
    if (q.startsWith('select pg.id_pagamento, pg.id_pedido')) {
        return pagamentos(tx).filter(pg => q.includes('where pg.id_pagamento = ?') ? pg.id_pagamento === valores[0]
            : pg.forma_pagamento === 'FIADO' && pg.status === 'PENDENTE' && estado.pedidos.some(p => p.id_pedido === pg.id_pedido && p.id_cliente === valores[0] && p.status !== 'CANCELADO'));
    }
    if (q.startsWith('select * from pedido where')) {
        await bloquear(`pedido:${valores[0]}`, tx, 'X'); await interceptar?.(q, tx);
        return estado.pedidos.filter(p => p.id_pedido === valores[0]);
    }
    if (q.startsWith('select * from pagamento where id_pagamento')) {
        await bloquear(`pagamento:${valores[0]}`, tx, 'X'); await interceptar?.(q, tx);
        return pagamentos(tx).filter(pg => pg.id_pagamento === valores[0]);
    }
    if (q.includes('from caixa c')) {
        let rows = caixas(tx);
        if (q.includes("c.status = 'aberto'")) rows = rows.filter(c => c.status === 'ABERTO');
        if (q.includes('c.id_caixa = ?')) rows = rows.filter(c => c.id_caixa === valores[0]);
        if (q.endsWith('for share') && rows.length) {
            let id = rows[0].id_caixa;
            await bloquear(`caixa:${id}`, tx, 'S'); await interceptar?.(q, tx);
            rows = caixas(tx).filter(c => c.id_caixa === id && c.status === 'ABERTO');
        }
        return rows.map(c => ({ ...c, nome_usuario_abertura: 'Pessoa 1' }));
    }
    if (q.startsWith("update pagamento set status = 'pago'")) {
        let [usuario, forma, caixa, recebido, id] = valores;
        if (id === falharPagamento) throw new Error('Falha simulada na quitação');
        let pg = pagamentos(tx).find(pg => pg.id_pagamento === id && pg.forma_pagamento === 'FIADO' && pg.status === 'PENDENTE');
        if (!pg || conflito) return { affectedRows: 0 };
        tx.pagamentos.set(id, { status: 'PAGO', id_usuario_quitacao: usuario, forma_quitacao: forma, id_caixa_quitacao: caixa,
            data_quitacao: '2026-11-02 14:00:00', valor_recebido: recebido === null ? null : recebido.toFixed(2) });
        return { affectedRows: 1 };
    }
    if (q.startsWith('update caixa')) {
        let [usuario, valor, id] = valores;
        await bloquear(`caixa:${id}`, tx, 'X');
        let caixa = caixas(tx).find(c => c.id_caixa === id && c.status === 'ABERTO');
        if (!caixa) return { affectedRows: 0 };
        tx.caixas.set(id, { status: 'FECHADO', id_usuario_fechamento: usuario, valor_fechamento: valor.toFixed(2), data_fechamento: '2026-11-02 15:00:00' });
        await interceptar?.(q, tx); return { affectedRows: 1 };
    }
    if (q.startsWith('select pg.*')) {
        let rows = pagamentos(tx).map(detalhar);
        if (q.includes('where pg.id_pagamento = ?')) return rows.filter(pg => pg.id_pagamento === valores[0]);
        if (q.includes("where pg.forma_pagamento = 'fiado'")) return rows.filter(pg => pg.forma_pagamento === 'FIADO' && pg.status === 'PENDENTE' && pg.status_pedido !== 'CANCELADO').sort((a, b) => a.nome_cliente.localeCompare(b.nome_cliente));
        let indice = 0;
        if (q.includes('pg.data_quitacao >= ?')) {
            let data = valores[indice]; indice += 4;
            rows = rows.filter(pg => (pg.data_quitacao || pg.data_hora).slice(0, 10) === data);
        }
        if (q.includes('coalesce(pg.forma_quitacao, pg.forma_pagamento) = ?')) { let forma = valores[indice++]; rows = rows.filter(pg => (pg.forma_quitacao || pg.forma_pagamento) === forma); }
        if (q.includes('and pg.status = ?')) { let status = valores[indice++]; rows = rows.filter(pg => pg.status === status); }
        if (q.includes('coalesce(pg.id_caixa_quitacao, p.id_caixa) = ?')) { let id = valores[indice++]; rows = rows.filter(pg => (pg.id_caixa_quitacao || pg.id_caixa) === id); }
        return rows.sort((a, b) => (b.data_quitacao || b.data_hora).localeCompare(a.data_quitacao || a.data_hora) || b.id_pagamento - a.id_pagamento).slice(0, valores.at(-1));
    }
    throw new Error(`SQL não previsto no banco simulado: ${q}`);
}

pool.query = (sql, valores, callback) => { executar(sql, valores).then(rows => callback(null, rows), callback); };
pool.getConnection = callback => {
    let tx = { id: ++sequencia, pagamentos: new Map(), caixas: new Map() };
    callback(null, {
        beginTransaction: callback => callback(null),
        query: (sql, valores, callback) => { executar(sql, valores, tx).then(rows => callback(null, rows), callback); },
        commit: callback => {
            for (let [id, alteracoes] of tx.pagamentos) Object.assign(estado.pagamentos.find(pg => pg.id_pagamento === id), alteracoes);
            for (let [id, alteracoes] of tx.caixas) Object.assign(estado.caixas.find(c => c.id_caixa === id), alteracoes);
            commits++; liberar(tx); callback(null);
        },
        rollback: callback => { rollbacks++; liberar(tx); callback(null); }, release() {},
    });
};

beforeEach(() => {
    estado = {
        usuarios: [1, 2, 3].map((id, i) => ({ id_usuario: id, nome: `Pessoa ${id}`, perfil: ['ADMIN', 'ATENDENTE', 'COZINHA'][i], ativo: 1 })),
        clientes: [{ id_cliente: 7, nome: 'Ana', telefone: '18999990000' }, { id_cliente: 8, nome: 'Bruno', telefone: null }],
        caixas: [{ id_caixa: 1, status: 'FECHADO', valor_abertura: '100.00', valor_fechamento: '100.00' }, { id_caixa: 2, status: 'ABERTO', valor_abertura: '150.00', valor_fechamento: null }],
        pedidos: [1, 2, 3].map(id => ({ id_pedido: id, id_cliente: id === 3 ? 8 : 7, id_caixa: id === 3 ? 2 : 1, status: 'RECEBIDO' })),
        pagamentos: [1, 2, 3].map((id, i) => ({ id_pagamento: id, id_pedido: id, forma_pagamento: 'FIADO', status: 'PENDENTE', valor: ['20.10', '30.20', '9.70'][i], valor_recebido: null, data_hora: '2026-10-31 12:00:00', id_usuario_quitacao: null, data_quitacao: null, forma_quitacao: null, id_caixa_quitacao: null })),
    };
    consultas = []; travas = new Map(); sequencia = commits = rollbacks = 0;
    falharPagamento = interceptar = aoEsperar = null; conflito = false;
});
after(() => { pool.query = queryOriginal; pool.getConnection = conexaoOriginal; pool.end(); });

async function chamar(caminho = '/:id/quitar', { body = { forma: 'PIX' }, metodo = 'post', perfil = 1, id = '1', idCliente = '7', query = {} } = {}) {
    let camada = router.stack.find(layer => layer.route?.path === caminho && layer.route.methods[metodo]);
    let req = { body, query, params: { id, idCliente }, cookies: perfil ? { token: jwt.sign({ id: perfil }, process.env.JWT_SECRET) } : {} };
    return new Promise((resolve, reject) => {
        let res = { status(code) { this.code = code; return this; }, json(body) { resolve({ status: this.code, body: JSON.parse(JSON.stringify(body)) }); } }, indice = 0;
        function next(error) {
            if (error) return reject(error);
            try { Promise.resolve(camada.route.stack[indice++].handle(req, res, next)).catch(reject); } catch (error) { reject(error); }
        }
        next();
    });
}

test('Fiados agrupados por cliente, telefone, quantidade, total exato e pedidos', async () => {
    let r = await chamar('/fiado', { metodo: 'get' });
    assert.equal(r.status, 200); assert.equal(r.body.length, 2);
    assert.deepEqual([r.body[0].nome, r.body[0].telefone, r.body[0].quantidade, r.body[0].totalEmAberto], ['Ana', '18999990000', 2, 50.3]);
    assert.deepEqual(r.body[0].pedidos.map(pg => pg.idPedido), [1, 2]);
    estado.pedidos[0].status = 'CANCELADO'; estado.pagamentos[1].status = 'PAGO';
    assert.equal((await chamar('/fiado', { metodo: 'get' })).body.length, 1);
});

for (let forma of ['DINHEIRO', 'PIX', 'DEBITO', 'CREDITO']) test(`Quitar em ${forma}: mantém FIADO e registra o caixa aberto e usuário JWT`, async () => {
    let r = await chamar(undefined, { body: { forma, idUsuarioQuitacao: 999, idCaixaQuitacao: 999 }, perfil: 2 });
    assert.equal(r.status, 200); assert.equal(r.body.total, 20.1); assert.equal(r.body.quantidade, 1);
    let pg = r.body.pagamentos[0];
    assert.equal(pg.forma, 'FIADO'); assert.equal(pg.status, 'PAGO'); assert.equal(pg.formaQuitacao, forma);
    assert.equal(pg.idUsuarioQuitacao, 2); assert.equal(pg.nomeUsuarioQuitacao, 'Pessoa 2');
    assert.equal(pg.idCaixa, 1); assert.equal(pg.idCaixaQuitacao, 2); assert.equal(pg.dataQuitacao, '2026-11-02 14:00:00');
    assert.equal(pg.valorRecebido, null); assert.equal(pg.troco, null);
    assert.equal(commits, 1); assert.equal(rollbacks, 0);
    assert.ok(consultas.some(q => q.q.endsWith('for update') && q.q.includes('from pagamento')));
    assert.ok(consultas.some(q => q.q.endsWith('for share') && q.q.includes('from caixa')));
    assert.ok(consultas.filter(q => !q.q.startsWith('select * from usuario')).every(q => q.tx === 1));
});

test('Sem caixa aberto: 409, sem gravar quitação', async () => {
    estado.caixas[1].status = 'FECHADO'; let antes = structuredClone(estado);
    let r = await chamar(); assert.equal(r.status, 409); assert.equal(r.body.msg, 'Abra o caixa antes de quitar pagamentos de devedores.');
    assert.deepEqual(estado, antes); assert.equal(rollbacks, 1);
});

test('Quitar duas vezes: segunda tentativa é 409, preservando recibo original', async () => {
    await chamar(); let antes = structuredClone(estado);
    assert.equal((await chamar()).status, 409); assert.deepEqual(estado, antes);
});

for (let cenario of ['pedido cancelado', 'pagamento cancelado', 'pagamento não fiado']) test(`${cenario}: não permite quitação`, async () => {
    if (cenario === 'pedido cancelado') estado.pedidos[0].status = 'CANCELADO';
    if (cenario === 'pagamento cancelado') estado.pagamentos[0].status = 'CANCELADO';
    if (cenario === 'pagamento não fiado') estado.pagamentos[0].forma_pagamento = 'PIX';
    assert.equal((await chamar()).status, 409); assert.equal(estado.pagamentos[0].data_quitacao, null);
});

for (let forma of [undefined, null, '', 'FIADO', 'CHEQUE', ['PIX']]) test(`Forma inválida ${JSON.stringify(forma)}: 400`, async () => {
    assert.equal((await chamar(undefined, { body: { forma } })).status, 400); assert.equal(commits, 0);
});
for (let body of [{ forma: 'PIX', valorRecebido: 50 }, { forma: 'PIX', valorRecebido: null }, { forma: 'DINHEIRO', valorRecebido: '50' }, { forma: 'DINHEIRO', valorRecebido: -1 }, { forma: 'DINHEIRO', valorRecebido: 20.001 }, { forma: 'DINHEIRO', valorRecebido: 10 }, { forma: 'DINHEIRO', valorRecebido: 100000000 }]) test(`Valor recebido inválido ${JSON.stringify(body)}: 400`, async () => {
    assert.equal((await chamar(undefined, { body })).status, 400); assert.equal(estado.pagamentos[0].status, 'PENDENTE');
});
test('Dinheiro opcional/null e troco em centavos', async () => {
    let r = await chamar(undefined, { body: { forma: 'DINHEIRO', valorRecebido: 50 } });
    assert.equal(r.body.troco, 29.9); assert.equal(r.body.pagamentos[0].troco, 29.9);
    r = await chamar(undefined, { id: '2', body: { forma: 'DINHEIRO', valorRecebido: null } });
    assert.equal(r.status, 200); assert.equal(r.body.troco, null);
});

test('Quitação em lote, total do servidor e troco não repetido nos pagamentos', async () => {
    let r = await chamar('/cliente/:idCliente/quitar', { body: { forma: 'DINHEIRO', valorRecebido: 60, total: 0.01 } });
    assert.equal(r.status, 200); assert.equal(r.body.quantidade, 2); assert.equal(r.body.total, 50.3); assert.equal(r.body.troco, 9.7);
    assert.equal(r.body.pagamentos.reduce((soma, pg) => soma + Math.round(pg.valorRecebido * 100), 0), 6000);
    assert.equal(r.body.pagamentos.reduce((soma, pg) => soma + Math.round(pg.troco * 100), 0), 970);
    assert.equal(estado.pagamentos[2].status, 'PENDENTE'); assert.equal(commits, 1);
    assert.equal((await chamar('/cliente/:idCliente/quitar')).status, 409);
});

test('Lote não inclui pedidos cancelados, outros clientes nem pagamentos já quitados', async () => {
    estado.pedidos[0].status = 'CANCELADO';
    let r = await chamar('/cliente/:idCliente/quitar');
    assert.equal(r.status, 200); assert.deepEqual(r.body.pagamentos.map(pg => pg.id), [2]);
    assert.equal(estado.pagamentos[0].status, 'PENDENTE'); assert.equal(estado.pagamentos[2].status, 'PENDENTE');
});

test('Falha na segunda quitação faz rollback do lote inteiro', async () => {
    falharPagamento = 2; let antes = structuredClone(estado), original = console.error; console.error = () => {};
    try { assert.equal((await chamar('/cliente/:idCliente/quitar')).status, 500); } finally { console.error = original; }
    assert.deepEqual(estado, antes); assert.equal(commits, 0); assert.equal(rollbacks, 1);
});
test('Update com zero linhas: 409 e rollback', async () => {
    conflito = true; assert.equal((await chamar()).status, 409); assert.equal(rollbacks, 1); assert.equal(commits, 0);
});

test('Pagamento inexistente: 404; cliente sem pendências: 409; IDs inválidos: 400', async () => {
    assert.equal((await chamar(undefined, { id: '999' })).status, 404);
    assert.equal((await chamar('/cliente/:idCliente/quitar', { idCliente: '999' })).status, 409);
    assert.equal((await chamar(undefined, { id: 'abc' })).status, 400);
    assert.equal((await chamar('/cliente/:idCliente/quitar', { idCliente: '0' })).status, 400);
});

for (let perfil of [1, 2, 3, null]) test(`Permissões de pagamento: perfil ${perfil}`, async () => {
    let esperado = perfil === null ? 401 : perfil === 3 ? 403 : 200;
    assert.equal((await chamar('/', { metodo: 'get', perfil })).status, esperado);
    assert.equal((await chamar('/fiado', { metodo: 'get', perfil })).status, esperado);
    assert.equal((await chamar(undefined, { perfil })).status, esperado);
    assert.equal((await chamar('/cliente/:idCliente/quitar', { perfil })).status, esperado);
});

test('Consulta combina data, forma, status e caixa do recebimento sem apagar o lançamento', async () => {
    await chamar(); let antes = structuredClone(estado);
    let r = await chamar('/', { metodo: 'get', query: { data: '2026-11-02', forma: 'PIX', status: 'PAGO', idCaixa: '2' } });
    assert.equal(r.status, 200); assert.deepEqual(r.body.map(pg => pg.id), [1]);
    assert.equal(r.body[0].dataHora, '2026-10-31 12:00:00'); assert.equal(r.body[0].dataQuitacao, '2026-11-02 14:00:00');
    r = await chamar('/', { metodo: 'get', query: { data: '2026-10-31', forma: 'FIADO', status: 'PENDENTE', idCaixa: '1' } });
    assert.deepEqual(r.body.map(pg => pg.id), [2]); assert.deepEqual(estado, antes);
    let sql = consultas.find(q => q.q.includes('pg.data_quitacao >= ?')).q;
    assert.match(sql, /pg.data_quitacao >= \? and pg.data_quitacao < date_add/); assert.doesNotMatch(sql, /date\(pg\./);
});
for (let query of [{ data: '2026-02-30' }, { forma: 'CHEQUE' }, { status: 'INVALIDO' }, { idCaixa: '0' }, { limite: '201' }]) test(`Filtro inválido ${JSON.stringify(query)}: 400`, async () => {
    assert.equal((await chamar('/', { metodo: 'get', query })).status, 400);
});

test('Quitação em outro caixa recebe uma vez e mantém a venda no caixa original', async () => {
    let caixa = new CaixaService();
    assert.equal((await caixa.obterResumo('1')).totalVendido, 50.3);
    await chamar(undefined, { body: { forma: 'DINHEIRO', valorRecebido: 50 } });
    let origem = await caixa.obterResumo('1'), destino = await caixa.obterResumo('2');
    assert.equal(origem.totalVendido, 50.3); assert.equal(origem.totalFiado, 30.2); assert.equal(origem.totalFiadoQuitado, 20.1);
    assert.equal(origem.totalRecebido, 0); assert.equal(origem.saldoEsperadoDinheiro, 100); assert.equal(origem.diferenca, 0);
    assert.equal(destino.fiadoRecebido.dinheiro, 20.1); assert.equal(destino.fiadoRecebido.total, 20.1);
    assert.equal(destino.fiadoRecebido.quantidadePagamentos.dinheiro, 1);
    assert.equal(destino.totalRecebido, 20.1); assert.equal(destino.saldoEsperadoDinheiro, 170.1); assert.equal(destino.totalVendido, 9.7);
});

test('Fiado quitado no mesmo caixa não duplica receita e separa Pix, débito e crédito', async () => {
    estado.pedidos.forEach(p => { p.id_caixa = 2; });
    for (let [i, forma] of ['PIX', 'DEBITO', 'CREDITO'].entries()) await chamar(undefined, { id: String(i + 1), body: { forma } });
    let resumo = await new CaixaService().obterResumo('2');
    assert.equal(resumo.totalVendido, 60); assert.equal(resumo.totalRecebido, 60); assert.equal(resumo.totalFiado, 0);
    assert.equal(resumo.saldoEsperadoDinheiro, 150);
    assert.deepEqual([resumo.fiadoRecebido.pix, resumo.fiadoRecebido.debito, resumo.fiadoRecebido.credito], [20.1, 30.2, 9.7]);
});

test('Resumo exclui quitações canceladas, sem forma ou de pedido cancelado', async () => {
    await chamar(); estado.pagamentos[0].status = 'CANCELADO';
    assert.equal((await new CaixaService().obterResumo('2')).fiadoRecebido.total, 0);
    estado.pagamentos[0].status = 'PAGO'; estado.pedidos[0].status = 'CANCELADO';
    assert.equal((await new CaixaService().obterResumo('2')).fiadoRecebido.total, 0);
});

test('Duas quitações simultâneas: só uma grava', { timeout: 2000 }, async () => {
    let entrou = sinal(), seguir = sinal(), esperou = sinal(), primeiro = true;
    interceptar = async q => { if (q.startsWith('select * from pedido') && primeiro) { primeiro = false; entrou.resolver(); await seguir.promise; } };
    aoEsperar = () => esperou.resolver();
    let service = new PagamentoService(), primeira = service.quitar('1', { forma: 'PIX' }, 1);
    await entrou.promise;
    let segunda = assert.rejects(service.quitar('1', { forma: 'PIX' }, 2), error => error.status === 409);
    await esperou.promise; seguir.resolver(); await Promise.all([primeira, segunda]);
    assert.equal(consultas.filter(q => q.q.startsWith('update pagamento')).length, 1);
});

test('Individual concorrente com lote: conflito reverte o lote inteiro', { timeout: 2000 }, async () => {
    let entrou = sinal(), seguir = sinal(), esperou = sinal(), primeiro = true;
    interceptar = async (q, tx) => { if (q.startsWith('select * from pedido') && tx.id === 1 && primeiro) { primeiro = false; entrou.resolver(); await seguir.promise; } };
    aoEsperar = chave => { if (chave === 'pedido:2') esperou.resolver(); };
    let service = new PagamentoService(), individual = service.quitar('2', { forma: 'PIX' }, 1);
    await entrou.promise;
    let lote = assert.rejects(service.quitarCliente('7', { forma: 'DINHEIRO' }, 2), error => error.status === 409);
    await esperou.promise; seguir.resolver(); await Promise.all([individual, lote]);
    assert.equal(estado.pagamentos[0].status, 'PENDENTE'); assert.equal(estado.pagamentos[1].status, 'PAGO');
    assert.equal(estado.pagamentos[1].forma_quitacao, 'PIX'); assert.equal(commits, 1); assert.equal(rollbacks, 1);
});

test('Quitação obtém S antes: fechamento aguarda e inclui o dinheiro', { timeout: 2000 }, async () => {
    let entrou = sinal(), seguir = sinal(), esperou = sinal();
    interceptar = async q => { if (q.includes('from caixa c') && q.endsWith('for share')) { entrou.resolver(); await seguir.promise; } };
    aoEsperar = (chave, tipo) => { if (tipo === 'X' && chave === 'caixa:2') esperou.resolver(); };
    let quitacao = new PagamentoService().quitar('1', { forma: 'DINHEIRO' }, 1);
    await entrou.promise;
    let fechamento = new CaixaService().fechar({ idCaixa: 2, valorFechamento: 170.1 }, 2);
    await esperou.promise; seguir.resolver(); await Promise.all([quitacao, fechamento]);
    let resumo = await new CaixaService().obterResumo('2'); assert.equal(resumo.diferenca, 0);
});

test('Fechamento obtém X antes: quitação aguarda e não entra em caixa fechado', { timeout: 2000 }, async () => {
    let entrou = sinal(), seguir = sinal(), esperou = sinal();
    interceptar = async q => { if (q.startsWith('update caixa')) { entrou.resolver(); await seguir.promise; } };
    aoEsperar = (chave, tipo) => { if (tipo === 'S' && chave === 'caixa:2') esperou.resolver(); };
    let fechamento = new CaixaService().fechar({ idCaixa: 2, valorFechamento: 150 }, 2);
    await entrou.promise;
    let quitacao = assert.rejects(new PagamentoService().quitar('1', { forma: 'DINHEIRO' }, 1), error => error.status === 409);
    await esperou.promise; seguir.resolver(); await Promise.all([fechamento, quitacao]);
    assert.equal(estado.pagamentos[0].status, 'PENDENTE');
});

test('Cancelamento concorrente vence o bloqueio: quitação não grava em pedido cancelado', { timeout: 2000 }, async () => {
    let entrou = sinal(), seguir = sinal(), esperou = sinal(), primeiro = true;
    interceptar = async q => {
        if (q.startsWith('select * from pedido') && primeiro) { primeiro = false; entrou.resolver(); await seguir.promise; }
    };
    aoEsperar = () => esperou.resolver();
    let bloqueio = new Database().ExecutaTransacao(async consultar => {
        await consultar('select * from pedido where id_pedido = ? for update', [1]);
        estado.pedidos[0].status = 'CANCELADO';
    });
    await entrou.promise;
    let quitacao = assert.rejects(new PagamentoService().quitar('1', { forma: 'PIX' }, 1), error => error.status === 409);
    await esperou.promise; seguir.resolver(); await Promise.all([bloqueio, quitacao]);
    assert.equal(estado.pagamentos[0].status, 'PENDENTE');
});
