import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { calcularDiferenca, converterValor, situacaoConferencia } from '../../client/src/pages/caixa/caixaUtils.js';

process.env.JWT_SECRET = 'segredo-exclusivo-dos-testes-de-caixa';
const { default: Database } = await import('../db/database.js');
const { default: CaixaService } = await import('../services/caixaService.js');
const { default: PedidoService } = await import('../services/pedidoService.js');
const { default: router } = await import('../routes/caixaRoute.js');
const pool = new Database().conexao;
const queryOriginal = pool.query, conexaoOriginal = pool.getConnection;
let estado, consultas, travas, proximaTransacao, proximoPedido, proximoCaixa, interceptar, aoEsperar, falharLeitura, commits, rollbacks;

function sinal() {
    let resolver;
    return { promise: new Promise(resolve => { resolver = resolve; }), resolver: (...args) => resolver(...args) };
}

// Simula somente a coordenação de bloqueios S/X usada pelo código; não substitui testes no MySQL.
async function bloquear(id, transacao, tipo) {
    assert.ok(transacao, 'Bloqueios precisam da conexão dedicada da transação.');
    let trava = travas.get(id);
    if (!trava) { trava = { titulares: new Map(), fila: [] }; travas.set(id, trava); }
    if (trava.titulares.has(transacao.id)) return;
    if (!trava.fila.length && (!trava.titulares.size || (tipo === 'S' && [...trava.titulares.values()].every(valor => valor === 'S')))) {
        trava.titulares.set(transacao.id, tipo);
        return;
    }
    await new Promise(resolve => { trava.fila.push({ transacao, tipo, resolve }); aoEsperar?.(tipo); });
}

function liberar(transacao) {
    for (let trava of travas.values()) {
        trava.titulares.delete(transacao.id);
        while (trava.fila.length) {
            let proximo = trava.fila[0];
            if (trava.titulares.size && (proximo.tipo === 'X' || [...trava.titulares.values()].includes('X'))) break;
            trava.fila.shift(); trava.titulares.set(proximo.transacao.id, proximo.tipo); proximo.resolve();
            if (proximo.tipo === 'X') break;
        }
    }
}

function centavosExatos(valor) {
    let [inteiro, decimal = ''] = String(valor).split('.');
    return BigInt(inteiro) * 100n + BigInt(decimal.padEnd(2, '0'));
}

function decimalExato(valor) {
    return `${valor / 100n}.${String(valor % 100n).padStart(2, '0')}`;
}

function caixasVisiveis(transacao) {
    return estado.caixas.map(caixa => ({ ...caixa, ...transacao?.caixas.get(caixa.id_caixa) }));
}

function pedidosVisiveis(transacao) {
    return [...estado.pedidos, ...(transacao?.pedidos ?? [])].map(pedido => ({ ...pedido, ...transacao?.pedidoAlteracoes.get(pedido.id_pedido) }));
}

function pagamentosVisiveis(transacao) {
    return [...estado.pagamentos, ...(transacao?.pagamentos ?? [])].map(pg => ({ ...pg, ...transacao?.pagamentoAlteracoes.get(pg.id_pagamento) }));
}

function resumir(id, q) {
    assert.match(q, /left join pedido p on p.id_caixa = c.id_caixa and p.status <> 'cancelado'/);
    assert.match(q, /left join pagamento pg on pg.id_pedido = p.id_pedido/);
    assert.match(q, /where c.id_caixa = \?/);
    assert.doesNotMatch(q, /item_pedido|valor_recebido|curdate|current_date|date\(|data_hora/);
    let caixa = estado.caixas.find(caixa => caixa.id_caixa === id);
    if (!caixa) return [];
    let row = { ...caixa };
    for (let forma of ['DINHEIRO', 'PIX', 'DEBITO', 'CREDITO', 'FIADO']) {
        let status = forma === 'FIADO' ? 'PENDENTE' : 'PAGO';
        assert.ok(q.includes(`pg.status = '${status.toLowerCase()}' and pg.forma_pagamento = '${forma.toLowerCase()}'`));
        let pagamentos = estado.pagamentos.filter(pg => pg.forma_pagamento === forma && pg.status === status && estado.pedidos.some(pedido => pedido.id_pedido === pg.id_pedido && pedido.id_caixa === id && pedido.status !== 'CANCELADO'));
        row[`total_${forma.toLowerCase()}`] = decimalExato(pagamentos.reduce((total, pg) => total + centavosExatos(pg.valor), 0n));
        row[`quantidade_${forma.toLowerCase()}`] = pagamentos.length;
    }
    return [row];
}

async function executar(sql, valores = [], transacao) {
    let q = sql.replace(/\s+/g, ' ').trim().toLowerCase();
    consultas.push({ q, valores, transacao: transacao?.id ?? null });
    if (q.startsWith('select * from usuario')) return estado.usuarios.filter(usuario => usuario.id_usuario === valores[0]);
    if (q.includes('sum(case')) return resumir(valores[0], q);
    if (q.startsWith('select * from pedido where')) {
        await bloquear(`pedido:${valores[0]}`, transacao, 'X');
        await interceptar?.(q, transacao);
        return pedidosVisiveis(transacao).filter(p => p.id_pedido === valores[0]);
    }
    if (q.startsWith('select status from caixa')) {
        await bloquear(valores[0], transacao, 'S');
        await interceptar?.(q, transacao);
        return caixasVisiveis(transacao).filter(c => c.id_caixa === valores[0]);
    }
    if (q.startsWith('update pedido')) {
        let cancelando = q.includes('motivo_cancelamento');
        let id = valores[cancelando ? 2 : 1];
        let pedido = pedidosVisiveis(transacao).find(p => p.id_pedido === id && p.status === valores.at(-1));
        if (!pedido) return { affectedRows: 0 };
        transacao.pedidoAlteracoes.set(id, cancelando
            ? { status: 'CANCELADO', motivo_cancelamento: valores[0], id_usuario_cancelamento: valores[1], hora_cancelamento: '2026-10-25 13:00:00' }
            : { status: valores[0] });
        return { affectedRows: 1 };
    }
    if (q.startsWith('update pagamento')) {
        let pagamentos = pagamentosVisiveis(transacao).filter(pg => pg.id_pedido === valores[0]);
        for (let pg of pagamentos) transacao.pagamentoAlteracoes.set(pg.id_pagamento, { status: 'CANCELADO' });
        return { affectedRows: pagamentos.length };
    }
    if (q.includes('from caixa c')) {
        let caixas = caixasVisiveis(transacao);
        if (q.includes("where c.status = 'aberto'")) caixas = caixas.filter(caixa => caixa.status === 'ABERTO');
        if (q.includes('where c.id_caixa = ?')) caixas = caixas.filter(caixa => caixa.id_caixa === valores[0]);
        if (q.endsWith('for share') && caixas.length) {
            let id = caixas[0].id_caixa;
            await bloquear(id, transacao, 'S');
            await interceptar?.(q, transacao);
            caixas = caixasVisiveis(transacao).filter(caixa => caixa.id_caixa === id && caixa.status === 'ABERTO');
        }
        if (falharLeitura && transacao?.caixas.size && q.includes('where c.id_caixa')) throw new Error('Falha simulada na leitura após fechar');
        return caixas.slice(0, 10).map(caixa => ({ ...caixa, nome_usuario_abertura: 'Pessoa 1', nome_usuario_fechamento: caixa.id_usuario_fechamento ? `Pessoa ${caixa.id_usuario_fechamento}` : null }));
    }
    if (q.startsWith('update caixa')) {
        assert.match(q, /where id_caixa = \? and status = 'aberto'/);
        await bloquear(valores[2], transacao, 'X');
        let caixa = caixasVisiveis(transacao).find(caixa => caixa.id_caixa === valores[2]);
        if (!caixa || caixa.status !== 'ABERTO') return { affectedRows: 0 };
        transacao.caixas.set(caixa.id_caixa, { status: 'FECHADO', id_usuario_fechamento: valores[0], valor_fechamento: valores[1].toFixed(2), data_fechamento: '2026-10-23 15:00:00' });
        await interceptar?.(q, transacao);
        return { affectedRows: 1 };
    }
    if (q.startsWith('insert into caixa')) {
        if (estado.caixas.some(caixa => caixa.status === 'ABERTO')) throw { code: 'ER_DUP_ENTRY', sqlMessage: 'uq_caixa_um_aberto' };
        let id = proximoCaixa++;
        estado.caixas.push({ id_caixa: id, status: 'ABERTO', id_usuario_abertura: valores[0], valor_abertura: valores[1].toFixed(2), valor_fechamento: null });
        return { insertId: id };
    }
    if (q.startsWith('select * from produto')) return [{ id_produto: 1, nome: 'PF', ativo: 1, usa_cardapio: 0, preco_padrao: '40.00' }];
    if (q.startsWith('insert into pedido ')) {
        let [id_caixa, id_usuario, id_cliente, tipo_atendimento, endereco_entrega, observacao, valor_total] = valores;
        let id = proximoPedido++;
        transacao.pedidos.push({ id_pedido: id, id_caixa, id_usuario, id_cliente, tipo_atendimento, endereco_entrega, observacao, valor_total: valor_total.toFixed(2), status: 'RECEBIDO' });
        return { insertId: id };
    }
    if (q.startsWith('insert into item_pedido ')) return { insertId: 1 };
    if (q.startsWith('insert into pagamento ')) {
        let [id_pedido, forma_pagamento, valor, status, valor_recebido] = valores;
        transacao.pagamentos.push({ id_pagamento: id_pedido, id_pedido, forma_pagamento, valor: valor.toFixed(2), status, valor_recebido });
        return { insertId: id_pedido };
    }
    if (q.includes('from pedido p')) return pedidosVisiveis(transacao).filter(pedido => pedido.id_pedido === valores[0]).map(pedido => ({ ...pedido, nome_usuario: 'Pessoa 1', nome_cliente: null, nome_usuario_cancelamento: pedido.id_usuario_cancelamento ? `Pessoa ${pedido.id_usuario_cancelamento}` : null }));
    if (q.includes('from item_pedido_adicional')) return [];
    if (q.includes('from item_pedido ip')) return [{ id_item_pedido: 1, id_produto: 1, nome_produto: 'PF', quantidade: 1, preco_unitario: '40.00', subtotal: '40.00', opcao_mistura: null, observacao: null }];
    if (q.startsWith('select * from pagamento')) return pagamentosVisiveis(transacao).filter(pg => pg.id_pedido === valores[0]);
    throw new Error(`SQL não previsto no banco simulado: ${q}`);
}

pool.query = (sql, valores, callback) => { executar(sql, valores).then(rows => callback(null, rows), callback); };
pool.getConnection = callback => {
    let transacao = { id: ++proximaTransacao, caixas: new Map(), pedidos: [], pagamentos: [], pedidoAlteracoes: new Map(), pagamentoAlteracoes: new Map() };
    callback(null, {
        beginTransaction: callback => callback(null),
        query: (sql, valores, callback) => { executar(sql, valores, transacao).then(rows => callback(null, rows), callback); },
        commit: callback => {
            for (let [id, alteracoes] of transacao.caixas) Object.assign(estado.caixas.find(caixa => caixa.id_caixa === id), alteracoes);
            estado.pedidos.push(...transacao.pedidos); estado.pagamentos.push(...transacao.pagamentos);
            for (let [id, alteracoes] of transacao.pedidoAlteracoes) Object.assign(estado.pedidos.find(p => p.id_pedido === id), alteracoes);
            for (let [id, alteracoes] of transacao.pagamentoAlteracoes) Object.assign(estado.pagamentos.find(pg => pg.id_pagamento === id), alteracoes);
            commits++; liberar(transacao); callback(null);
        },
        rollback: callback => { rollbacks++; liberar(transacao); callback(null); },
        release: () => {},
    });
};

beforeEach(() => {
    estado = {
        usuarios: [1, 2, 3].map((id, indice) => ({ id_usuario: id, nome: `Pessoa ${id}`, perfil: ['ADMIN', 'ATENDENTE', 'COZINHA'][indice], ativo: 1 })),
        caixas: [{ id_caixa: 1, status: 'ABERTO', valor_abertura: '150.00', valor_fechamento: null, id_usuario_abertura: 1, data_abertura: '2026-10-22 08:00:00' },
            { id_caixa: 2, status: 'FECHADO', valor_abertura: '20.00', valor_fechamento: '20.00', id_usuario_abertura: 1 }],
        pedidos: [], pagamentos: [],
    };
    consultas = []; travas = new Map(); proximaTransacao = 0; proximoPedido = 1; proximoCaixa = 3;
    interceptar = aoEsperar = null; falharLeitura = false; commits = rollbacks = 0;
});
after(() => { pool.query = queryOriginal; pool.getConnection = conexaoOriginal; pool.end(); });

function venda({ forma = 'DINHEIRO', valor = '40.00', recebido = '50.00', status = 'PAGO', statusPedido = 'RECEBIDO', idCaixa = 1, data = '2026-10-23 12:00:00' } = {}) {
    let id = proximoPedido++;
    estado.pedidos.push({ id_pedido: id, id_caixa: idCaixa, id_usuario: 1, id_cliente: null, tipo_atendimento: 'BALCAO', valor_total: valor, status: statusPedido, data_hora: data });
    estado.pagamentos.push({ id_pagamento: id, id_pedido: id, forma_pagamento: forma, valor, valor_recebido: recebido, status, data_hora: data });
}

async function chamar(caminho, { metodo = 'get', body, perfil = 1, id = '1' } = {}) {
    let camada = router.stack.find(layer => layer.route?.path === caminho && layer.route.methods[metodo]);
    let req = { body, params: { id }, cookies: perfil ? { token: jwt.sign({ id: perfil }, process.env.JWT_SECRET) } : {} };
    return new Promise((resolve, reject) => {
        let res = { status(code) { this.code = code; return this; }, json(body) { resolve({ status: this.code, body: JSON.parse(JSON.stringify(body)) }); } };
        let indice = 0;
        function next(error) {
            if (error) return reject(error);
            try { Promise.resolve(camada.route.stack[indice++].handle(req, res, next)).catch(reject); } catch (error) { reject(error); }
        }
        next();
    });
}

test('Abertura não é venda: sem pagamentos, saldo esperado é 150', async () => {
    let r = await chamar('/:id/resumo');
    assert.equal(r.status, 200); assert.equal(r.body.valorAbertura, 150);
    assert.equal(r.body.totalVendido, 0); assert.equal(r.body.totalRecebido, 0); assert.equal(r.body.saldoEsperadoDinheiro, 150);
    assert.equal(r.body.diferenca, null); assert.equal(r.body.valorFechamento, null);
    assert.deepEqual(r.body.quantidadePagamentos, { dinheiro: 0, pix: 0, debito: 0, credito: 0, fiado: 0 });
});
for (let recebido of ['50.00', null]) test(`Dinheiro de 40 com recebido ${recebido}: saldo 190, sem somar o recebido`, async () => {
    venda({ recebido }); let resumo = await new CaixaService().obterResumo('1');
    assert.equal(resumo.totalDinheiro, 40); assert.equal(resumo.totalRecebido, 40); assert.equal(resumo.saldoEsperadoDinheiro, 190);
    assert.equal(resumo.quantidadePagamentos.dinheiro, 1);
});
test('Pix, débito, crédito e fiado separados: exemplo completo de 270 vendidos', async () => {
    venda(); venda({ forma: 'PIX', valor: '80.00' }); venda({ forma: 'DEBITO', valor: '70.00' }); venda({ forma: 'CREDITO', valor: '50.00' }); venda({ forma: 'FIADO', status: 'PENDENTE', valor: '30.00' });
    let r = await chamar('/:id/resumo');
    assert.equal(r.body.totalDinheiro, 40); assert.equal(r.body.totalPix, 80); assert.equal(r.body.totalDebito, 70); assert.equal(r.body.totalCredito, 50);
    assert.equal(r.body.totalFiado, 30); assert.equal(r.body.totalRecebido, 240); assert.equal(r.body.totalVendido, 270); assert.equal(r.body.saldoEsperadoDinheiro, 190);
    assert.deepEqual(r.body.quantidadePagamentos, { dinheiro: 1, pix: 1, debito: 1, credito: 1, fiado: 1 });
});
test('Somente PAGO recebe; somente FIADO PENDENTE entra como fiado', async () => {
    for (let forma of ['DINHEIRO', 'PIX', 'DEBITO', 'CREDITO']) { venda({ forma, status: 'PENDENTE' }); venda({ forma, status: 'CANCELADO' }); }
    venda({ forma: 'FIADO', status: 'CANCELADO' }); venda({ forma: 'FIADO', status: 'PAGO' });
    let resumo = await new CaixaService().obterResumo('1');
    assert.equal(resumo.totalRecebido, 0); assert.equal(resumo.totalFiado, 0); assert.equal(resumo.totalVendido, 0);
});
test('Pedidos cancelados não contam como recebido nem fiado', async () => {
    venda({ statusPedido: 'CANCELADO' }); venda({ forma: 'FIADO', status: 'PENDENTE', statusPedido: 'CANCELADO' });
    let resumo = await new CaixaService().obterResumo('1'); assert.equal(resumo.totalVendido, 0);
});
test('Pagamentos de mesmo valor não são eliminados nem duplicados por itens', async () => {
    venda(); venda(); let resumo = await new CaixaService().obterResumo('1');
    assert.equal(resumo.totalDinheiro, 80); assert.equal(resumo.quantidadePagamentos.dinheiro, 2);
    assert.doesNotMatch(consultas.at(-1).q, /join item_pedido|sum\(distinct/);
});
test('Período operacional atravessa datas e não mistura outros caixas', async () => {
    venda({ valor: '10.00', data: '2026-10-22 23:59:59' }); venda({ valor: '20.00', data: '2026-10-23 00:00:01' }); venda({ valor: '999.00', idCaixa: 2 });
    let resumo = await new CaixaService().obterResumo('1'); assert.equal(resumo.totalDinheiro, 30); assert.equal(resumo.saldoEsperadoDinheiro, 180);
    assert.equal((await new CaixaService().obterResumo('2')).totalDinheiro, 999);
});
test('Centavos exatos nos totais e na diferença', async () => {
    venda({ valor: '0.10' }); venda({ valor: '0.20' }); venda({ forma: 'PIX', valor: '0.30' });
    estado.caixas[0].status = 'FECHADO'; estado.caixas[0].valor_fechamento = '150.25';
    let resumo = await new CaixaService().obterResumo('1');
    assert.equal(resumo.totalDinheiro, 0.3); assert.equal(resumo.totalRecebido, 0.6); assert.equal(resumo.saldoEsperadoDinheiro, 150.3); assert.equal(resumo.diferenca, -0.05);
});
for (let [valor, diferenca] of [[190, 0], [185, -5], [195, 5], [0, -190]]) test(`Fecha com contado ${valor}, diferença ${diferenca}, e consulta o histórico`, async () => {
    venda();
    let r = await chamar('/fechar', { metodo: 'post', body: { valorFechamento: valor, idCaixa: 1, id_usuario: 3 }, perfil: 2 });
    assert.equal(r.status, 200); assert.equal(r.body.status, 'FECHADO'); assert.equal(r.body.valorFechamento, valor); assert.equal(r.body.idUsuarioFechamento, 2);
    assert.equal(r.body.nomeUsuarioFechamento, 'Pessoa 2'); assert.ok(r.body.dataFechamento);
    let resumo = await chamar('/:id/resumo'); assert.equal(resumo.status, 200); assert.equal(resumo.body.diferenca, diferenca); assert.equal(resumo.body.valorFechamento, valor);
    assert.ok(consultas.filter(consulta => consulta.q.startsWith('update caixa')).every(consulta => consulta.transacao !== null));
});
test('Contrato antigo de fechamento funciona; depois é possível abrir outro caixa', async () => {
    let r = await chamar('/fechar', { metodo: 'post', body: { valorFechamento: 150 } }); assert.equal(r.status, 200);
    let novo = await chamar('/abrir', { metodo: 'post', body: { valorAbertura: 20 } }); assert.equal(novo.status, 201);
    assert.equal(novo.body.id, 3); assert.equal((await chamar('/:id/resumo', { id: '3' })).body.saldoEsperadoDinheiro, 20);
    assert.equal((await chamar('/:id/resumo')).body.status, 'FECHADO');
});
for (let id of ['0', '-1', 'abc', '1.5', '']) test(`ID inválido ${JSON.stringify(id)}: 400`, async () => {
    assert.equal((await chamar('/:id/resumo', { id })).status, 400);
});
test('Caixa inexistente: 404', async () => {
    let r = await chamar('/:id/resumo', { id: '999' }); assert.equal(r.status, 404); assert.equal(r.body.msg, 'Caixa não encontrado.');
});
for (let perfil of [1, 2, 3, null]) test(`Permissão financeira do perfil ${perfil ?? 'sem login'}`, async () => {
    assert.equal((await chamar('/:id/resumo', { perfil })).status, perfil === null ? 401 : perfil === 3 ? 403 : 200);
    if (perfil === 3) assert.equal((await chamar('/fechar', { metodo: 'post', perfil, body: { valorFechamento: 150 } })).status, 403);
});
test('GET caixa e caixa/atual mantêm seus contratos e null quando fechado', async () => {
    assert.equal((await chamar('/atual')).body.id, 1); assert.equal((await chamar('/')).body.length, 2);
    assert.ok(!Object.hasOwn((await chamar('/atual')).body, 'totalDinheiro'));
    await new CaixaService().fechar({ valorFechamento: 150 }, 1);
    assert.equal((await chamar('/atual')).body, null);
});
for (let valor of [undefined, null, '', '150', -1, 1.001, 100000000]) test(`Fechamento inválido ${JSON.stringify(valor)}: 400 sem alterar caixa`, async () => {
    let r = await chamar('/fechar', { metodo: 'post', body: { valorFechamento: valor } });
    assert.equal(r.status, 400); assert.equal(estado.caixas[0].status, 'ABERTO');
});
for (let idCaixa of [null, '1', 0]) test(`ID opcional inválido ${JSON.stringify(idCaixa)}: 400`, async () => {
    assert.equal((await chamar('/fechar', { metodo: 'post', body: { valorFechamento: 150, idCaixa } })).status, 400);
});
test('ID conferido protege o novo caixa aberto depois do antigo ser fechado', async () => {
    estado.caixas[0].status = 'FECHADO'; estado.caixas[1].status = 'ABERTO';
    assert.equal((await chamar('/fechar', { metodo: 'post', body: { valorFechamento: 150, idCaixa: 1 } })).status, 409);
    assert.equal(estado.caixas[1].status, 'ABERTO');
});
test('Duas tentativas de fechamento gravam uma única vez', { timeout: 2000 }, async () => {
    let resultados = await Promise.allSettled([new CaixaService().fechar({ valorFechamento: 150, idCaixa: 1 }, 1), new CaixaService().fechar({ valorFechamento: 145, idCaixa: 1 }, 2)]);
    assert.equal(resultados.filter(resultado => resultado.status === 'fulfilled').length, 1);
    assert.equal(resultados.find(resultado => resultado.status === 'rejected').reason.status, 409);
});
test('Erro após update faz rollback do fechamento', async () => {
    falharLeitura = true; let original = console.error; console.error = () => {};
    try { assert.equal((await chamar('/fechar', { metodo: 'post', body: { valorFechamento: 150 } })).status, 500); } finally { console.error = original; }
    assert.equal(estado.caixas[0].status, 'ABERTO'); assert.equal(rollbacks, 1); assert.equal(commits, 0);
});

function pedido() {
    return { data: '2026-10-23', tipoAtendimento: 'BALCAO', itens: [{ idProduto: 1, quantidade: 1 }], pagamento: { forma: 'DINHEIRO', valorRecebido: 50 } };
}

test('Pedido obtém S antes: fechamento espera o commit e inclui a venda', { timeout: 2000 }, async () => {
    let entrou = sinal(), continuar = sinal(), esperando = sinal();
    interceptar = async q => { if (q.endsWith('for share') && q.includes('from caixa c')) { entrou.resolver(); await continuar.promise; } };
    aoEsperar = tipo => { if (tipo === 'X') esperando.resolver(); };
    let criacao = new PedidoService().criar(pedido(), 1);
    await entrou.promise;
    let fechamento = new CaixaService().fechar({ valorFechamento: 190, idCaixa: 1 }, 2);
    await esperando.promise; assert.equal(estado.caixas[0].status, 'ABERTO');
    continuar.resolver(); let [criado, fechado] = await Promise.all([criacao, fechamento]);
    assert.equal(criado.idCaixa, 1); assert.equal(fechado.status, 'FECHADO');
    let resumo = await new CaixaService().obterResumo('1'); assert.equal(resumo.totalDinheiro, 40); assert.equal(resumo.diferenca, 0);
});
test('Fechamento obtém X antes: novo pedido espera e é recusado após fechar', { timeout: 2000 }, async () => {
    let entrou = sinal(), continuar = sinal(), esperando = sinal();
    interceptar = async q => { if (q.startsWith('update caixa')) { entrou.resolver(); await continuar.promise; } };
    aoEsperar = tipo => { if (tipo === 'S') esperando.resolver(); };
    let fechamento = new CaixaService().fechar({ valorFechamento: 150, idCaixa: 1 }, 2);
    await entrou.promise;
    let criacao = new PedidoService().criar(pedido(), 1);
    let recusado = assert.rejects(criacao, error => error.status === 409 && error.msg === 'Abra o caixa antes de lançar pedidos.');
    await esperando.promise; continuar.resolver(); await Promise.all([fechamento, recusado]);
    assert.equal(estado.pedidos.length, 0); assert.equal(estado.pagamentos.length, 0);
});
test('Prévia da tela: vírgula/ponto e situações Conferido, Falta e Sobra', () => {
    assert.equal(converterValor('185,25'), 185.25); assert.equal(converterValor('185.25'), 185.25);
    assert.equal(converterValor('0'), 0); assert.equal(converterValor('1,001'), null);
    for (let [valor, diferenca, texto] of [[190, 0, 'Conferido'], [185, -5, 'Falta de dinheiro'], [195, 5, 'Sobra de dinheiro']]) {
        assert.equal(calcularDiferenca(valor, 190), diferenca); assert.equal(situacaoConferencia(diferenca).texto, texto);
    }
    assert.equal(calcularDiferenca(150.25, 150.3), -0.05);
});

test('Cancelamento real do Service retira dinheiro e fiado do resumo sem apagar histórico', async () => {
    venda(); venda({ forma: 'FIADO', status: 'PENDENTE', valor: '30.00' });
    let caixa = new CaixaService(), pedidoService = new PedidoService();
    assert.equal((await caixa.obterResumo('1')).totalVendido, 70);
    await pedidoService.cancelar('1', 'Cliente desistiu', 2);
    let resumo = await caixa.obterResumo('1');
    assert.equal(resumo.totalDinheiro, 0); assert.equal(resumo.totalFiado, 30); assert.equal(resumo.totalVendido, 30);
    assert.equal(resumo.saldoEsperadoDinheiro, 150);
    await pedidoService.cancelar('2', 'Lançamento incorreto', 2);
    assert.equal((await caixa.obterResumo('1')).totalVendido, 0);
    assert.equal(estado.pedidos.length, 2); assert.equal(estado.pagamentos.length, 2);
    assert.ok(estado.pagamentos.every(pg => pg.status === 'CANCELADO'));
});

test('Cancelamento obtém S antes: fechamento espera e o resumo exclui a venda', { timeout: 2000 }, async () => {
    venda(); let entrou = sinal(), continuar = sinal(), esperando = sinal();
    interceptar = async q => { if (q.startsWith('select status from caixa')) { entrou.resolver(); await continuar.promise; } };
    aoEsperar = tipo => { if (tipo === 'X') esperando.resolver(); };
    let cancelamento = new PedidoService().cancelar('1', 'Cliente desistiu', 2);
    await entrou.promise;
    let fechamento = new CaixaService().fechar({ valorFechamento: 150, idCaixa: 1 }, 1);
    await esperando.promise; continuar.resolver(); await Promise.all([cancelamento, fechamento]);
    assert.equal(estado.caixas[0].status, 'FECHADO'); assert.equal(estado.pedidos[0].status, 'CANCELADO');
    assert.equal((await new CaixaService().obterResumo('1')).diferenca, 0);
});

test('Fechamento obtém X antes: cancelamento aguarda e é recusado com caixa fechado', { timeout: 2000 }, async () => {
    venda(); let entrou = sinal(), continuar = sinal(), esperando = sinal();
    interceptar = async q => { if (q.startsWith('update caixa')) { entrou.resolver(); await continuar.promise; } };
    aoEsperar = tipo => { if (tipo === 'S') esperando.resolver(); };
    let fechamento = new CaixaService().fechar({ valorFechamento: 190, idCaixa: 1 }, 1);
    await entrou.promise;
    let recusado = assert.rejects(new PedidoService().cancelar('1', 'Cliente desistiu', 2), error => error.status === 409 && /já foi fechado/.test(error.msg));
    await esperando.promise; continuar.resolver(); await Promise.all([fechamento, recusado]);
    assert.equal(estado.pedidos[0].status, 'RECEBIDO'); assert.equal(estado.pagamentos[0].status, 'PAGO');
    assert.equal((await new CaixaService().obterResumo('1')).totalDinheiro, 40);
});

for (let acao of ['status', 'cancelamento']) test(`Duas requisições simultâneas de ${acao} serializam no pedido`, { timeout: 2000 }, async () => {
    venda(); let entrou = sinal(), continuar = sinal(), esperando = sinal(), primeiro = true;
    interceptar = async q => {
        if (q.startsWith('select * from pedido where') && primeiro) { primeiro = false; entrou.resolver(); await continuar.promise; }
    };
    aoEsperar = tipo => { if (tipo === 'X') esperando.resolver(); };
    let service = new PedidoService();
    let executarAcao = () => acao === 'status' ? service.alterarStatus('1', 'EM_PREPARO', 'ATENDENTE') : service.cancelar('1', 'Cliente desistiu', 2);
    let primeira = executarAcao(); await entrou.promise;
    let segunda = assert.rejects(executarAcao(), error => error.status === 409);
    await esperando.promise; continuar.resolver(); await Promise.all([primeira, segunda]);
    assert.equal(estado.pedidos[0].status, acao === 'status' ? 'EM_PREPARO' : 'CANCELADO');
    assert.equal(consultas.filter(q => q.q.startsWith('update pedido')).length, 1);
});
