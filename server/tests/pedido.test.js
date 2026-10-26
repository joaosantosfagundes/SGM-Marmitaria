import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'segredo-exclusivo-dos-testes-de-pedido';
const { default: Database } = await import('../db/database.js');
const { default: router } = await import('../routes/pedidoRoute.js');
const { default: ProdutoService } = await import('../services/produtoService.js');
const { default: ProdutoEntity } = await import('../entities/produtoEntity.js');
const pool = new Database().conexao;
const consultaOriginal = pool.query;
const conexaoOriginal = pool.getConnection;
let estado, consultas, transacoes, commits, rollbacks, liberacoes, falharEm, simularConflito;

function inicial() {
    return {
        usuarios: [1, 2, 3].map((id, i) => ({ id_usuario: id, nome: `Pessoa ${id}`, email: `pessoa${id}@exemplo.com`, perfil: ['ADMIN', 'ATENDENTE', 'COZINHA'][i], ativo: 1 })),
        caixas: [{ id_caixa: 4, status: 'ABERTO', id_usuario_abertura: 2, valor_abertura: '100.00' }],
        produtos: [
            { id_produto: 1, nome: 'Marmita', preco_padrao: '20.10', ativo: 1, usa_cardapio: 1 },
            { id_produto: 2, nome: 'Refrigerante', preco_padrao: '5.00', ativo: 1, usa_cardapio: 0 },
        ],
        adicionais: [3, 4, 5].map(id => ({ id_adicional: id, nome: `Adicional ${id}`, preco: '2.50', ativo: id === 5 ? 0 : 1 })),
        clientes: [{ id_cliente: 7, nome: 'Cliente', ativo: 1 }],
        cardapios: [{ id_cardapio: 1, data_cardapio: '2026-10-22' }],
        preparacoes: [{ nome: 'Frango ao molho', grupo: 'Mistura' }, { nome: 'Bife', grupo: 'Mistura' }],
        vinculos: [3, 5], pedidos: [], itens: [], extras: [], pagamentos: [],
    };
}

function executar(sql, valores = [], banco, transacao) {
    let q = sql.replace(/\s+/g, ' ').trim().toLowerCase();
    consultas.push({ sql: q, valores, transacao });
    if (falharEm && q.startsWith(falharEm)) throw new Error('Falha simulada durante gravação');
    if (q.startsWith('select * from usuario')) return banco.usuarios.filter(row => row.id_usuario === valores[0]);
    if (q.startsWith('select * from pedido where')) return banco.pedidos.filter(row => row.id_pedido === valores[0]);
    if (q.startsWith('select status from caixa')) return banco.caixas.filter(row => row.id_caixa === valores[0]);
    if (q.includes('from caixa c')) return banco.caixas.filter(row => row.status === 'ABERTO').map(row => ({ ...row, nome_usuario_abertura: 'Pessoa 2' }));
    if (q.startsWith('select * from produto where id_produto')) return banco.produtos.filter(row => row.id_produto === valores[0]);
    if (q.startsWith('select * from produto where nome')) return banco.produtos.filter(row => row.nome === valores[0]);
    if (q.startsWith('select * from cliente')) return banco.clientes.filter(row => row.id_cliente === valores[0]);
    if (q.startsWith('select * from adicional')) return banco.adicionais.filter(row => row.id_adicional === valores[0]);
    if (q.startsWith('select id_cardapio,')) return banco.cardapios.filter(row => row.data_cardapio === valores[0]);
    if (q.includes('from cardapio_preparacao')) return banco.preparacoes;
    if (q.includes('from cardapio_adicional')) return banco.adicionais.filter(row => banco.vinculos.includes(row.id_adicional)).map(row => ({ id_adicional: row.id_adicional, nome: row.nome, preco: row.preco }));
    if (q.startsWith('insert into pedido ')) {
        let id = banco.pedidos.length + 1;
        let [id_caixa, id_usuario, id_cliente, tipo_atendimento, endereco_entrega, observacao, total] = valores;
        banco.pedidos.push({ id_pedido: id, id_caixa, id_usuario, id_cliente, tipo_atendimento, endereco_entrega, observacao, valor_total: total.toFixed(2), status: 'RECEBIDO', data_hora: `2026-10-22 12:00:0${id}`, hora_pronto: null, hora_saiu_entrega: null, motivo_cancelamento: null, hora_cancelamento: null, id_usuario_cancelamento: null });
        return { insertId: id };
    }
    if (q.startsWith('insert into item_pedido ')) {
        let id = banco.itens.length + 1;
        let [id_pedido, id_produto, quantidade, preco, subtotal, opcao_mistura, observacao] = valores;
        banco.itens.push({ id_item_pedido: id, id_pedido, id_produto, quantidade, preco_unitario: preco.toFixed(2), subtotal: subtotal.toFixed(2), opcao_mistura, observacao });
        return { insertId: id };
    }
    if (q.startsWith('insert into item_pedido_adicional ')) {
        let id = banco.extras.length + 1;
        let [id_item_pedido, id_adicional, quantidade, preco, subtotal] = valores;
        banco.extras.push({ id_item_pedido_adicional: id, id_item_pedido, id_adicional, quantidade, preco_unitario: preco.toFixed(2), subtotal: subtotal.toFixed(2) });
        return { insertId: id };
    }
    if (q.startsWith('insert into pagamento ')) {
        let [id_pedido, forma_pagamento, valor, status, valor_recebido] = valores;
        banco.pagamentos.push({ id_pagamento: banco.pagamentos.length + 1, id_pedido, forma_pagamento, valor: valor.toFixed(2), status, valor_recebido: valor_recebido === null ? null : valor_recebido.toFixed(2), data_hora: '2026-10-22 12:00:00' });
        return { insertId: banco.pagamentos.length };
    }
    if (q.includes('from pedido p')) {
        let rows = banco.pedidos.map(row => ({ ...row, nome_usuario: banco.usuarios.find(u => u.id_usuario === row.id_usuario)?.nome, nome_cliente: banco.clientes.find(c => c.id_cliente === row.id_cliente)?.nome ?? null, nome_usuario_cancelamento: banco.usuarios.find(u => u.id_usuario === row.id_usuario_cancelamento)?.nome ?? null }));
        if (q.includes('pg.forma_pagamento')) {
            let indice = 0;
            if (q.includes('and p.status = ?')) { let status = valores[indice++]; rows = rows.filter(row => row.status === status); }
            if (q.includes('and p.id_caixa = ?')) { let id = valores[indice++]; rows = rows.filter(row => row.id_caixa === id); }
            if (q.includes('and p.data_hora >= ?')) {
                let inicio = `${valores[indice++]} 00:00:00`;
                let fim = new Date(`${valores[indice++]}T00:00:00Z`);
                fim.setUTCDate(fim.getUTCDate() + 1);
                let limite = `${fim.toISOString().slice(0, 10)} 00:00:00`;
                rows = rows.filter(row => row.data_hora >= inicio && row.data_hora < limite);
            }
            return rows.sort((a, b) => b.data_hora.localeCompare(a.data_hora) || b.id_pedido - a.id_pedido).slice(0, valores.at(-1)).map(row => ({ ...row, forma_pagamento: banco.pagamentos.find(p => p.id_pedido === row.id_pedido)?.forma_pagamento, status_pagamento: banco.pagamentos.find(p => p.id_pedido === row.id_pedido)?.status }));
        }
        return rows.filter(row => row.id_pedido === valores[0]);
    }
    if (q.includes('from item_pedido ip')) return banco.itens.filter(row => row.id_pedido === valores[0]).map(row => ({ ...row, nome_produto: banco.produtos.find(p => p.id_produto === row.id_produto).nome }));
    if (q.includes('from item_pedido_adicional ipa')) return banco.extras.filter(row => banco.itens.some(item => item.id_item_pedido === row.id_item_pedido && item.id_pedido === valores[0])).map(row => ({ ...row, nome_adicional: banco.adicionais.find(a => a.id_adicional === row.id_adicional).nome }));
    if (q.startsWith('select * from pagamento')) return banco.pagamentos.filter(row => row.id_pedido === valores[0]);
    if (q.startsWith('update pedido')) {
        let cancelando = q.includes('motivo_cancelamento');
        let id = cancelando ? valores[2] : valores[1];
        let pedido = banco.pedidos.find(row => row.id_pedido === id && row.status === valores.at(-1));
        if (!pedido || simularConflito) return { affectedRows: 0 };
        if (cancelando) Object.assign(pedido, { status: 'CANCELADO', motivo_cancelamento: valores[0], id_usuario_cancelamento: valores[1], hora_cancelamento: '2026-10-22 13:30:00' });
        else {
            pedido.status = valores[0];
            if (q.includes('hora_pronto = now()')) pedido.hora_pronto = '2026-10-22 13:00:00';
            if (q.includes('hora_saiu_entrega = now()')) pedido.hora_saiu_entrega = '2026-10-22 13:10:00';
        }
        return { affectedRows: 1 };
    }
    if (q.startsWith('update pagamento')) {
        let rows = banco.pagamentos.filter(row => row.id_pedido === valores[0]);
        rows.forEach(row => { row.status = 'CANCELADO'; });
        return { affectedRows: rows.length };
    }
    if (q.startsWith('insert into produto')) {
        let [nome, descricao, preco_padrao, ativo, usa_cardapio] = valores;
        banco.produtos.push({ id_produto: 3, nome, descricao, preco_padrao, ativo, usa_cardapio });
        return { insertId: 3 };
    }
    if (q.startsWith('update produto')) {
        let [nome, descricao, preco_padrao, ativo, usa_cardapio, id] = valores;
        Object.assign(banco.produtos.find(p => p.id_produto === id), { nome, descricao, preco_padrao, ativo, usa_cardapio });
        return { affectedRows: 1 };
    }
    throw new Error(`SQL não previsto no banco simulado: ${q}`);
}

pool.query = (sql, valores, callback) => {
    try { callback(null, executar(sql, valores, estado, null)); } catch (error) { callback(error); }
};
pool.getConnection = callback => {
    let banco;
    let transacao = ++transacoes;
    callback(null, {
        beginTransaction: callback => { banco = structuredClone(estado); callback(null); },
        query: (sql, valores, callback) => {
            try { callback(null, executar(sql, valores, banco, transacao)); } catch (error) { callback(error); }
        },
        commit: callback => { estado = banco; commits++; callback(null); },
        rollback: callback => { rollbacks++; callback(null); },
        release: () => { liberacoes++; },
    });
};

beforeEach(() => {
    estado = inicial(); consultas = []; transacoes = commits = rollbacks = liberacoes = 0; falharEm = null; simularConflito = false;
});
after(() => { pool.query = consultaOriginal; pool.getConnection = conexaoOriginal; pool.end(); });

function corpo() {
    return { data: '2026-10-22', tipoAtendimento: 'BALCAO', itens: [{ idProduto: 1, quantidade: 2, opcaoMistura: ' FRANGO ao MOLHO ', adicionais: [{ idAdicional: 3, quantidade: 1 }] }], pagamento: { forma: 'DINHEIRO', valorRecebido: 50 } };
}

async function chamar(body, { metodo = 'post', caminho = '/', perfil = 1, query = {}, params = {} } = {}) {
    const camada = router.stack.find(layer => layer.route?.path === caminho && layer.route.methods[metodo]);
    const req = { body, query, params, cookies: { token: jwt.sign({ id: perfil }, process.env.JWT_SECRET) } };
    return new Promise((resolve, reject) => {
        const res = { status(code) { this.code = code; return this; }, json(value) { resolve({ status: this.code, body: JSON.parse(JSON.stringify(value)) }); } };
        let indice = 0;
        function next(error) {
            if (error) return reject(error);
            try { Promise.resolve(camada.route.stack[indice++].handle(req, res, next)).catch(reject); } catch (error) { reject(error); }
        }
        next();
    });
}

test('Sem caixa: 409 e nenhuma gravação', async () => {
    estado.caixas = [];
    let r = await chamar(corpo());
    assert.equal(r.status, 409); assert.equal(r.body.msg, 'Abra o caixa antes de lançar pedidos.'); assert.equal(estado.pedidos.length, 0); assert.equal(rollbacks, 1);
});
test('Criação completa: preços do banco, mistura canônica, adicionais totais e troco', async () => {
    let dados = corpo(); dados.id_usuario = 999; dados.idCaixa = 999; dados.valorTotal = 0;
    Object.assign(dados.itens[0], { precoUnitario: 0.01, subtotal: 0.02 }); dados.itens[0].adicionais[0].preco = 0;
    let r = await chamar(dados);
    assert.equal(r.status, 201); assert.equal(r.body.idCaixa, 4); assert.equal(r.body.idUsuario, 1);
    assert.equal(r.body.status, 'RECEBIDO'); assert.equal(r.body.valorTotal, 42.7); assert.equal(r.body.itens[0].subtotal, 40.2);
    assert.equal(r.body.itens[0].opcaoMistura, 'Frango ao molho'); assert.equal(r.body.itens[0].adicionais[0].subtotal, 2.5);
    assert.equal(r.body.pagamento.valor, 42.7); assert.equal(r.body.pagamento.troco, 7.3); assert.equal(r.body.nomeUsuario, 'Pessoa 1');
    assert.equal(transacoes, 1); assert.equal(commits, 1); assert.equal(liberacoes, 1);
    assert.ok(consultas.find(q => q.sql.includes("c.status = 'aberto'") && q.sql.endsWith('for share')));
    assert.ok(consultas.filter(q => !q.sql.startsWith('select * from usuario')).every(q => q.transacao === 1));
    assert.ok(!Object.hasOwn(estado.pagamentos[0], 'troco'));
});

for (const [nome, alterar] of [
    ['Mistura ausente', b => { delete b.itens[0].opcaoMistura; }],
    ['Mistura inexistente', b => { b.itens[0].opcaoMistura = 'Peixe'; }],
    ['Adicional fora do cardápio', b => { b.itens[0].adicionais[0].idAdicional = 4; }],
    ['Adicional inativo', b => { b.itens[0].adicionais[0].idAdicional = 5; }],
    ['Adicional inexistente', b => { b.itens[0].adicionais[0].idAdicional = 99; }],
    ['Refrigerante com adicional', b => { b.itens[0].idProduto = 2; b.itens[0].opcaoMistura = null; }],
    ['Refrigerante com mistura', b => { b.itens[0].idProduto = 2; b.itens[0].adicionais = []; }],
    ['Delivery sem endereço', b => { b.tipoAtendimento = 'DELIVERY'; }],
    ['Balcão com endereço', b => { b.enderecoEntrega = 'Rua A, 123'; }],
    ['Mesa com endereço', b => { b.tipoAtendimento = 'MESA'; b.enderecoEntrega = 'Rua A, 123'; }],
    ['Fiado sem cliente', b => { b.pagamento = { forma: 'FIADO' }; }],
    ['Dinheiro insuficiente', b => { b.pagamento.valorRecebido = 40; }],
    ['Dinheiro recebido como string', b => { b.pagamento.valorRecebido = '50'; }],
    ['Dinheiro com três casas', b => { b.pagamento.valorRecebido = 50.001; }],
    ['Valor recebido em PIX', b => { b.pagamento.forma = 'PIX'; }],
    ['Valor recebido null em PIX', b => { b.pagamento = { forma: 'PIX', valorRecebido: null }; }],
    ['Cliente inexistente', b => { b.idCliente = 99; }],
    ['Data inválida', b => { b.data = '2026-02-30'; }],
    ['Itens vazios', b => { b.itens = []; }],
    ['Quantidade zero', b => { b.itens[0].quantidade = 0; }],
    ['Quantidade acima de 99', b => { b.itens[0].quantidade = 100; }],
    ['Quantidade fracionária', b => { b.itens[0].quantidade = 1.5; }],
    ['Adicional acima de 99', b => { b.itens[0].adicionais[0].quantidade = 100; }],
    ['Adicional com quantidade zero', b => { b.itens[0].adicionais[0].quantidade = 0; }],
    ['Adicional com quantidade negativa', b => { b.itens[0].adicionais[0].quantidade = -1; }],
    ['Adicional com quantidade fracionária', b => { b.itens[0].adicionais[0].quantidade = 1.5; }],
    ['Observação longa', b => { b.observacao = 'a'.repeat(256); }],
    ['Produto inexistente', b => { b.itens[0].idProduto = 999; }],
]) test(`${nome}: 400 sem registros parciais`, async () => {
    let b = corpo(); alterar(b); let r = await chamar(b);
    assert.equal(r.status, 400); assert.equal(estado.pedidos.length + estado.itens.length + estado.extras.length + estado.pagamentos.length, 0);
});

for (const [nome, alterar] of [
    ['Dinheiro sem recebido', b => { delete b.pagamento.valorRecebido; }],
    ['Dinheiro com recebido null', b => { b.pagamento.valorRecebido = null; }],
]) test(`${nome}: cria pedido sem troco`, async () => {
    let b = corpo(); alterar(b); let r = await chamar(b);
    assert.equal(r.status, 201); assert.equal(r.body.pagamento.status, 'PAGO');
    assert.equal(r.body.pagamento.valorRecebido, null); assert.equal(r.body.pagamento.troco, null);
    assert.equal(estado.pagamentos[0].valor_recebido, null);
    let consulta = await chamar(null, { metodo: 'get', caminho: '/:id', params: { id: String(r.body.id) } });
    assert.equal(consulta.status, 200); assert.equal(consulta.body.pagamento.valorRecebido, null); assert.equal(consulta.body.pagamento.troco, null);
});
test('Adicional com quantidade 99: aceita o limite e calcula o total da linha', async () => {
    let b = corpo(); b.itens[0].adicionais[0].quantidade = 99; b.pagamento.valorRecebido = 300;
    let r = await chamar(b);
    assert.equal(r.status, 201); assert.equal(r.body.itens[0].adicionais[0].quantidade, 99);
    assert.equal(r.body.itens[0].adicionais[0].subtotal, 247.5); assert.equal(r.body.valorTotal, 287.7);
});

for (const forma of ['PIX', 'DEBITO', 'CREDITO', 'FIADO']) test(`Pagamento ${forma}`, async () => {
    let b = corpo(); b.pagamento = { forma }; if (forma === 'FIADO') b.idCliente = 7;
    let r = await chamar(b); assert.equal(r.status, 201); assert.equal(r.body.pagamento.status, forma === 'FIADO' ? 'PENDENTE' : 'PAGO');
    assert.equal(r.body.pagamento.valorRecebido, null); assert.equal(r.body.pagamento.troco, null);
});
test('Delivery válido e endereço preservado', async () => {
    let b = corpo(); b.tipoAtendimento = 'DELIVERY'; b.enderecoEntrega = 'Rua A, 123';
    let r = await chamar(b); assert.equal(r.status, 201); assert.equal(r.body.enderecoEntrega, b.enderecoEntrega);
});
test('Cliente inativo e produto inativo são recusados', async () => {
    estado.clientes[0].ativo = 0; let b = corpo(); b.idCliente = 7; assert.equal((await chamar(b)).status, 400);
    estado.produtos[0].ativo = 0; assert.equal((await chamar(corpo())).status, 400);
});
test('Cardápio só com preparação fixa: exige mistura null e mantém a regra de adicionais', async () => {
    estado.preparacoes = [{ nome: 'Arroz', grupo: null }]; assert.equal((await chamar(corpo())).status, 400);
    let b = corpo(); b.itens[0].opcaoMistura = null; assert.equal((await chamar(b)).status, 201);
    estado.vinculos = []; assert.equal((await chamar(b)).status, 400);
});
for (let cenario of ['ausente', 'sem preparações']) test(`Produto usa cardápio ${cenario}: 409 sem gravação parcial`, async () => {
    if (cenario === 'ausente') estado.cardapios = [];
    else estado.preparacoes = [];
    let b = corpo(); b.itens[0].opcaoMistura = null; b.itens[0].adicionais = [];
    let r = await chamar(b);
    assert.equal(r.status, 409); assert.equal(r.body.msg, 'Monte o cardápio do dia antes de lançar este produto.');
    assert.equal(estado.pedidos.length + estado.itens.length + estado.extras.length + estado.pagamentos.length, 0);
    assert.equal(rollbacks, 1); assert.equal(commits, 0);
});
test('Produto sem usaCardapio continua livre sem cardápio ou preparações', async () => {
    estado.cardapios = []; estado.preparacoes = [];
    let b = corpo(); b.itens = [{ idProduto: 2, quantidade: 1 }];
    let r = await chamar(b); assert.equal(r.status, 201); assert.equal(r.body.valorTotal, 5);
    assert.equal(r.body.itens[0].opcaoMistura, null); assert.deepEqual(r.body.itens[0].adicionais, []);
    assert.ok(!consultas.some(consulta => consulta.sql.includes('from cardapio')));
});
test('Pedido misto também exige cardápio para o item que o utiliza', async () => {
    estado.cardapios = [];
    let b = corpo(); b.itens.unshift({ idProduto: 2, quantidade: 1 });
    assert.equal((await chamar(b)).status, 409);
    assert.equal(estado.pedidos.length + estado.itens.length + estado.extras.length + estado.pagamentos.length, 0);
});
for (const ponto of ['insert into item_pedido ', 'insert into item_pedido_adicional ', 'insert into pagamento ']) test(`Rollback após falha em ${ponto.trim()}`, async () => {
    falharEm = ponto; const original = console.error; console.error = () => {};
    try { assert.equal((await chamar(corpo())).status, 500); } finally { console.error = original; }
    assert.equal(estado.pedidos.length + estado.itens.length + estado.extras.length + estado.pagamentos.length, 0);
    assert.equal(rollbacks, 1); assert.equal(commits, 0); assert.equal(liberacoes, 1);
});
test('Limites monetários e centavos exatos', async () => {
    estado.produtos[0].preco_padrao = '99999999.99'; assert.equal((await chamar(corpo())).status, 400);
    estado.produtos[0].preco_padrao = '0.10'; estado.adicionais[0].preco = '0.10';
    let r = await chamar(corpo()); assert.equal(r.status, 201); assert.equal(r.body.valorTotal, 0.3); assert.equal(r.body.pagamento.troco, 49.7);
});
test('Preços históricos e leitura completa são preservados após reajuste', async () => {
    await chamar(corpo()); estado.produtos[0].preco_padrao = '99.00'; estado.adicionais[0].preco = '9.00';
    let r = await chamar(null, { metodo: 'get', caminho: '/:id', params: { id: '1' } });
    assert.equal(r.status, 200); assert.equal(r.body.valorTotal, 42.7); assert.equal(r.body.itens[0].precoUnitario, 20.1); assert.equal(r.body.itens[0].adicionais[0].precoUnitario, 2.5);
});
test('Consultas: ordem, filtros, limite, ID inválido e 404', async () => {
    await chamar(corpo()); await chamar(corpo());
    let r = await chamar(null, { metodo: 'get', query: { limite: '1', idCaixa: '4', status: 'RECEBIDO' } });
    assert.equal(r.status, 200); assert.equal(r.body.length, 1); assert.equal(r.body[0].id, 2); assert.equal(r.body[0].formaPagamento, 'DINHEIRO');
    assert.equal((await chamar(null, { metodo: 'get', query: { limite: '201' } })).status, 400);
    assert.equal((await chamar(null, { metodo: 'get', query: { status: 'INVALIDO' } })).status, 400);
    assert.equal((await chamar(null, { metodo: 'get', query: { idCaixa: 'abc' } })).status, 400);
    assert.equal((await chamar(null, { metodo: 'get', caminho: '/:id', params: { id: '999' } })).status, 404);
    assert.equal((await chamar(null, { metodo: 'get', caminho: '/:id', params: { id: '0' } })).status, 400);
});
test('Data consulta intervalo fechado no início e aberto no fim, junto com status e caixa', async () => {
    await chamar(corpo()); let modelo = estado.pedidos[0];
    estado.pedidos = [
        { ...modelo, id_pedido: 1, data_hora: '2026-10-21 23:59:59' },
        { ...modelo, id_pedido: 2, data_hora: '2026-10-22 00:00:00' },
        { ...modelo, id_pedido: 3, data_hora: '2026-10-22 23:59:59' },
        { ...modelo, id_pedido: 4, data_hora: '2026-10-23 00:00:00' },
        { ...modelo, id_pedido: 5, id_caixa: 7, data_hora: '2026-10-22 12:00:00' },
        { ...modelo, id_pedido: 6, status: 'PRONTO', data_hora: '2026-10-22 14:00:00' },
    ];
    let antes = structuredClone(estado.pedidos);
    let r = await chamar(null, { metodo: 'get', query: { data: '2026-10-22' } });
    assert.equal(r.status, 200); assert.deepEqual(r.body.map(pedido => pedido.id), [3, 6, 5, 2]);
    r = await chamar(null, { metodo: 'get', query: { data: '2026-10-22', status: 'RECEBIDO', idCaixa: '4', limite: '1' } });
    assert.equal(r.status, 200); assert.deepEqual(r.body.map(pedido => pedido.id), [3]);
    let consulta = consultas.findLast(consulta => consulta.sql.includes('pg.forma_pagamento'));
    assert.match(consulta.sql, /p.data_hora >= \? and p.data_hora < date_add\(\?, interval 1 day\)/);
    assert.doesNotMatch(consulta.sql, /date\(p.data_hora\)|convert_tz|curdate/);
    assert.deepEqual(consulta.valores, ['RECEBIDO', 4, '2026-10-22', '2026-10-22', 1]);
    assert.deepEqual(estado.pedidos, antes);
});
test('Com data o limite padrão é 200; sem data continua 50; limite explícito é respeitado', async () => {
    await chamar(corpo()); let modelo = estado.pedidos[0];
    estado.pedidos = Array.from({ length: 205 }, (_, indice) => ({ ...modelo, id_pedido: indice + 1 }));
    let geral = await chamar(null, { metodo: 'get' }); assert.equal(geral.body.length, 50);
    assert.equal(consultas.at(-1).valores.at(-1), 50);
    assert.ok(!consultas.at(-1).sql.includes('p.data_hora >= ?'));
    let dia = await chamar(null, { metodo: 'get', query: { data: '2026-10-22' } }); assert.equal(dia.body.length, 200);
    assert.equal(consultas.at(-1).valores.at(-1), 200);
    let menor = await chamar(null, { metodo: 'get', query: { data: '2026-10-22', limite: '2' } });
    assert.deepEqual(menor.body.map(pedido => pedido.id), [205, 204]);
    assert.equal((await chamar(null, { metodo: 'get', query: { data: '2026-10-22', limite: '201' } })).status, 400);
});
for (let data of ['', '2026-02-30', '2026-02-29', '2026-13-01', '2026-10-00', '22/10/2026', ['2026-10-22', '2026-10-23']]) test(`Filtro com data inválida ${JSON.stringify(data)}: 400`, async () => {
    let r = await chamar(null, { metodo: 'get', query: { data } });
    assert.equal(r.status, 400); assert.equal(r.body.msg, 'Informe uma data válida para consultar os pedidos (AAAA-MM-DD).');
});
test('Filtro aceita data real em ano bissexto e pode retornar vazio', async () => {
    let r = await chamar(null, { metodo: 'get', query: { data: '2024-02-29' } });
    assert.equal(r.status, 200); assert.deepEqual(r.body, []);
});
test('Pool inicializa cada nova conexão com -03:00 e mantém dateStrings', () => {
    let comandos = [];
    for (let indice = 0; indice < 2; indice++) {
        pool.emit('connection', { query(sql, callback) { comandos.push(sql); callback(null); } });
    }
    assert.deepEqual(comandos, ["set time_zone = '-03:00'", "set time_zone = '-03:00'"]);
    assert.equal(pool.config.connectionConfig.dateStrings, true);
});
test('Conexão inicializada com fuso é usada por ExecutaTransacao', async () => {
    let obterConexao = pool.getConnection, comandos = [];
    pool.getConnection = callback => obterConexao((error, connection) => {
        let query = connection.query;
        connection.query = (sql, valores, callback) => {
            comandos.push(sql);
            if (typeof valores === 'function') return valores(null);
            return query(sql, valores, callback);
        };
        pool.emit('connection', connection);
        callback(error, connection);
    });
    try {
        let usuarios = await new Database().ExecutaTransacao(consultar => consultar('select * from usuario where id_usuario = ?', [1]));
        assert.equal(usuarios[0].id_usuario, 1);
        assert.deepEqual(comandos, ["set time_zone = '-03:00'", 'select * from usuario where id_usuario = ?']);
    } finally { pool.getConnection = obterConexao; }
});
test('Falha ao definir fuso é registrada e descarta a conexão', () => {
    let descartada = false, erros = [], original = console.error;
    console.error = (...args) => erros.push(args);
    try {
        pool.emit('connection', { query(sql, callback) { callback(new Error('Falha simulada no fuso')); }, destroy() { descartada = true; } });
    } finally { console.error = original; }
    assert.equal(descartada, true); assert.equal(erros.length, 1);
    assert.match(erros[0][0], /Erro ao definir o fuso horário/);
});
for (const perfil of [1, 2, 3]) test(`Permissões do perfil ${['', 'ADMIN', 'ATENDENTE', 'COZINHA'][perfil]}`, async () => {
    assert.equal((await chamar(corpo(), { perfil })).status, perfil === 3 ? 403 : 201);
    assert.equal((await chamar(null, { metodo: 'get', perfil })).status, 200);
    if (perfil === 3) await chamar(corpo());
    assert.equal((await chamar(null, { metodo: 'get', caminho: '/:id', params: { id: '1' }, perfil })).status, 200);
});
test('Produto: booleano, padrão true, atualização parcial e DECIMAL numérico', async () => {
    const service = new ProdutoService();
    await assert.rejects(() => service.gravar({ nome: 'Teste', preco_padrao: 10, usaCardapio: 'true' }), error => error.status === 400);
    let novo = await service.gravar({ nome: 'Teste', preco_padrao: 10 }); assert.equal(novo.usaCardapio, true);
    let editado = await service.atualizar(2, { nome: 'Refri' }); assert.equal(editado.usaCardapio, false);
    editado = await service.atualizar(2, { usaCardapio: true }); assert.equal(editado.usaCardapio, true);
    await assert.rejects(() => service.atualizar(2, { usaCardapio: null }), error => error.status === 400);
    assert.equal(typeof ProdutoEntity.toMap(estado.produtos[0]).precoPadrao, 'number');
});

function mudarStatus(status, perfil = 1, id = '1') {
    return chamar({ status }, { metodo: 'put', caminho: '/:id/status', params: { id }, perfil });
}

function cancelar(motivo = 'Cliente desistiu do pedido', perfil = 1, id = '1', extras = {}) {
    return chamar({ motivo, ...extras }, { caminho: '/:id/cancelar', params: { id }, perfil });
}

for (let tipo of ['BALCAO', 'MESA', 'DELIVERY']) test(`Fluxo completo ${tipo}, horários e resposta completa`, async () => {
    let b = corpo(); b.tipoAtendimento = tipo;
    if (tipo === 'DELIVERY') b.enderecoEntrega = 'Rua A, 123';
    await chamar(b);
    let r = await mudarStatus('EM_PREPARO', 3);
    assert.equal(r.status, 200); assert.equal(r.body.status, 'EM_PREPARO');
    assert.equal(r.body.horaPronto, null); assert.equal(r.body.horaSaiuEntrega, null);
    r = await mudarStatus('PRONTO', 3);
    assert.equal(r.status, 200); assert.equal(r.body.horaPronto, '2026-10-22 13:00:00');
    assert.equal(r.body.itens[0].opcaoMistura, 'Frango ao molho'); assert.equal(r.body.pagamento.status, 'PAGO');
    r = await mudarStatus('SAIU_ENTREGA', 2);
    assert.equal(r.status, tipo === 'DELIVERY' ? 200 : 409);
    assert.equal(estado.pedidos[0].status, tipo === 'DELIVERY' ? 'SAIU_ENTREGA' : 'PRONTO');
    if (tipo === 'DELIVERY') {
        assert.equal(r.body.horaSaiuEntrega, '2026-10-22 13:10:00');
        assert.equal(r.body.horaPronto, '2026-10-22 13:00:00');
    }
    let escritas = consultas.filter(q => q.sql.startsWith('update pedido'));
    assert.ok(escritas.every(q => /where id_pedido = \? and status = \?$/.test(q.sql)));
    for (let escrita of escritas) assert.ok(consultas.some(q => q.transacao === escrita.transacao && q.sql.endsWith('for update')));
});

for (let [atual, proximo] of [
    ['RECEBIDO', 'PRONTO'], ['RECEBIDO', 'SAIU_ENTREGA'], ['EM_PREPARO', 'SAIU_ENTREGA'],
    ['EM_PREPARO', 'EM_PREPARO'], ['PRONTO', 'EM_PREPARO'], ['PRONTO', 'PRONTO'],
    ['SAIU_ENTREGA', 'PRONTO'], ['SAIU_ENTREGA', 'EM_PREPARO'], ['CANCELADO', 'EM_PREPARO'],
]) test(`Transição ${atual} para ${proximo}: 409 sem alteração`, async () => {
    await chamar(corpo()); estado.pedidos[0].status = atual;
    let antes = structuredClone(estado);
    assert.equal((await mudarStatus(proximo)).status, 409);
    assert.deepEqual(estado, antes); assert.equal(rollbacks, 1);
});

for (let status of [undefined, null, 'RECEBIDO', 'CANCELADO', 'inexistente', ['PRONTO']]) test(`Status de destino inválido ${JSON.stringify(status)}: 400`, async () => {
    await chamar(corpo()); assert.equal((await mudarStatus(status)).status, 400);
    assert.equal(estado.pedidos[0].status, 'RECEBIDO');
});

test('COZINHA não sai para entrega nem cancela, mesmo enviando perfil no corpo', async () => {
    let b = corpo(); b.tipoAtendimento = 'DELIVERY'; b.enderecoEntrega = 'Rua A, 123'; await chamar(b);
    estado.pedidos[0].status = 'PRONTO';
    let r = await mudarStatus('SAIU_ENTREGA', 3);
    assert.equal(r.status, 403); assert.equal(r.body.msg, 'Sem permissão para esta ação');
    assert.equal((await cancelar('Motivo válido', 3, '1', { perfil: 'ADMIN' })).status, 403);
    assert.equal(estado.pedidos[0].status, 'PRONTO'); assert.equal(estado.pagamentos[0].status, 'PAGO');
});

for (let status of ['RECEBIDO', 'EM_PREPARO', 'PRONTO', 'SAIU_ENTREGA']) test(`Cancelar em ${status}: motivo, usuário JWT e TODOS os pagamentos`, async () => {
    await chamar(corpo()); estado.pedidos[0].status = status;
    estado.pagamentos.push({ ...estado.pagamentos[0], id_pagamento: 2, status: 'PENDENTE', forma_pagamento: 'FIADO' });
    let r = await cancelar('  Cliente desistiu  ', 2, '1', { idUsuarioCancelamento: 999, id_usuario_cancelamento: 999 });
    assert.equal(r.status, 200); assert.equal(r.body.status, 'CANCELADO');
    assert.equal(r.body.motivoCancelamento, 'Cliente desistiu'); assert.equal(r.body.idUsuarioCancelamento, 2);
    assert.equal(r.body.nomeUsuarioCancelamento, 'Pessoa 2'); assert.equal(r.body.horaCancelamento, '2026-10-22 13:30:00');
    assert.ok(estado.pagamentos.every(row => row.status === 'CANCELADO'));
    assert.equal(r.body.pagamento.status, 'CANCELADO'); assert.equal(r.body.itens.length, 1);
    let escritas = consultas.filter(q => q.sql.startsWith('update '));
    assert.equal(new Set(escritas.map(q => q.transacao)).size, 1);
    assert.ok(consultas.some(q => q.sql === 'select status from caixa where id_caixa = ? for share' && q.valores[0] === 4 && q.transacao === escritas[0].transacao));
    let lista = await chamar(null, { metodo: 'get', query: { status: 'CANCELADO' } });
    assert.equal(lista.body[0].motivoCancelamento, 'Cliente desistiu');
    assert.equal(lista.body[0].nomeUsuarioCancelamento, 'Pessoa 2');
    assert.equal((await cancelar()).status, 409);
});

for (let motivo of [undefined, null, '', 'ab', '   ', ' a ', 123, 'a'.repeat(256)]) test(`Motivo inválido ${JSON.stringify(motivo)}: 400`, async () => {
    await chamar(corpo()); assert.equal((await cancelar(motivo === undefined ? null : motivo)).status, 400);
    assert.equal(estado.pedidos[0].status, 'RECEBIDO');
    assert.equal(estado.pagamentos[0].status, 'PAGO');
});

test('Motivo aceita os limites de 3 e 255 caracteres', async () => {
    await chamar(corpo()); assert.equal((await cancelar('abc')).status, 200);
    await chamar(corpo()); assert.equal((await cancelar('a'.repeat(255), 1, '2')).status, 200);
});

test('Caixa do pedido fechado bloqueia cancelamento mesmo com outro caixa aberto', async () => {
    await chamar(corpo()); estado.caixas[0].status = 'FECHADO';
    estado.caixas.push({ id_caixa: 8, status: 'ABERTO' });
    let r = await cancelar();
    assert.equal(r.status, 409); assert.equal(r.body.msg, 'Não é possível cancelar: o caixa deste pedido já foi fechado.');
    assert.equal(estado.pedidos[0].status, 'RECEBIDO'); assert.equal(estado.pagamentos[0].status, 'PAGO');
});

test('Caixa fechado não impede avançar preparo de pedido já lançado', async () => {
    await chamar(corpo()); estado.caixas[0].status = 'FECHADO';
    assert.equal((await mudarStatus('EM_PREPARO', 3)).status, 200);
});

test('Mutações retornam 404 para pedido inexistente e 400 para ID inválido', async () => {
    assert.equal((await mudarStatus('EM_PREPARO')).status, 404);
    assert.equal((await cancelar()).status, 404);
    assert.equal((await mudarStatus('EM_PREPARO', 1, 'abc')).status, 400);
    assert.equal((await cancelar('Motivo válido', 1, '0')).status, 400);
});

for (let acao of ['status', 'cancelar']) test(`Update concorrente em ${acao}: 409, nenhum pagamento alterado`, async () => {
    await chamar(corpo()); let antes = structuredClone(estado); simularConflito = true;
    let r = await (acao === 'status' ? mudarStatus('EM_PREPARO') : cancelar());
    assert.equal(r.status, 409); assert.equal(r.body.msg, 'O pedido foi alterado por outra pessoa. Atualize a lista.');
    assert.deepEqual(estado, antes);
    assert.ok(!consultas.some(q => q.sql.startsWith('update pagamento')));
});

test('Duas tentativas da mesma transição/cancelamento não gravam duas vezes', async () => {
    await chamar(corpo()); assert.equal((await mudarStatus('EM_PREPARO')).status, 200);
    assert.equal((await mudarStatus('EM_PREPARO')).status, 409);
    assert.equal((await cancelar()).status, 200); assert.equal((await cancelar()).status, 409);
    assert.equal(consultas.filter(q => q.sql.startsWith('update pagamento')).length, 1);
});

test('Falha ao cancelar pagamento desfaz também o cancelamento do pedido', async () => {
    await chamar(corpo()); let antes = structuredClone(estado); falharEm = 'update pagamento';
    let original = console.error; console.error = () => {};
    try { assert.equal((await cancelar()).status, 500); } finally { console.error = original; }
    assert.deepEqual(estado, antes); assert.equal(rollbacks, 1);
});

test('Motivo ausente no corpo é recusado antes de abrir transação', async () => {
    await chamar(corpo()); let antes = transacoes;
    let r = await chamar({}, { caminho: '/:id/cancelar', params: { id: '1' } });
    assert.equal(r.status, 400); assert.equal(transacoes, antes);
});

for (let acao of ['status', 'cancelar']) test(`Falha ao carregar resposta de ${acao} desfaz a mutação`, async () => {
    await chamar(corpo()); let antes = structuredClone(estado); falharEm = 'select p.*';
    let original = console.error; console.error = () => {};
    try { assert.equal((await (acao === 'status' ? mudarStatus('EM_PREPARO') : cancelar())).status, 500); }
    finally { console.error = original; }
    assert.deepEqual(estado, antes); assert.equal(rollbacks, 1);
});
