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
let estado, consultas, transacoes, commits, rollbacks, liberacoes, falharEm;

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
        banco.pedidos.push({ id_pedido: id, id_caixa, id_usuario, id_cliente, tipo_atendimento, endereco_entrega, observacao, valor_total: total.toFixed(2), status: 'RECEBIDO', data_hora: `2026-10-22 12:00:0${id}` });
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
        let rows = banco.pedidos.map(row => ({ ...row, nome_usuario: banco.usuarios.find(u => u.id_usuario === row.id_usuario)?.nome, nome_cliente: banco.clientes.find(c => c.id_cliente === row.id_cliente)?.nome ?? null }));
        if (q.includes('pg.forma_pagamento')) {
            let indice = 0;
            if (q.includes('and p.status = ?')) { let status = valores[indice++]; rows = rows.filter(row => row.status === status); }
            if (q.includes('and p.id_caixa = ?')) { let id = valores[indice++]; rows = rows.filter(row => row.id_caixa === id); }
            return rows.reverse().slice(0, valores.at(-1)).map(row => ({ ...row, forma_pagamento: banco.pagamentos.find(p => p.id_pedido === row.id_pedido)?.forma_pagamento, status_pagamento: banco.pagamentos.find(p => p.id_pedido === row.id_pedido)?.status }));
        }
        return rows.filter(row => row.id_pedido === valores[0]);
    }
    if (q.includes('from item_pedido ip')) return banco.itens.filter(row => row.id_pedido === valores[0]).map(row => ({ ...row, nome_produto: banco.produtos.find(p => p.id_produto === row.id_produto).nome }));
    if (q.includes('from item_pedido_adicional ipa')) return banco.extras.filter(row => banco.itens.some(item => item.id_item_pedido === row.id_item_pedido && item.id_pedido === valores[0])).map(row => ({ ...row, nome_adicional: banco.adicionais.find(a => a.id_adicional === row.id_adicional).nome }));
    if (q.startsWith('select * from pagamento')) return banco.pagamentos.filter(row => row.id_pedido === valores[0]);
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
    estado = inicial(); consultas = []; transacoes = commits = rollbacks = liberacoes = 0; falharEm = null;
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
    ['Dinheiro sem recebido', b => { delete b.pagamento.valorRecebido; }],
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
    ['Adicional acima de INT', b => { b.itens[0].adicionais[0].quantidade = 2147483648; }],
    ['Observação longa', b => { b.observacao = 'a'.repeat(256); }],
    ['Produto inexistente', b => { b.itens[0].idProduto = 999; }],
]) test(`${nome}: 400 sem registros parciais`, async () => {
    let b = corpo(); alterar(b); let r = await chamar(b);
    assert.equal(r.status, 400); assert.equal(estado.pedidos.length + estado.itens.length + estado.extras.length + estado.pagamentos.length, 0);
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
test('Sem opções ou sem cardápio: exige mistura null e recusa adicionais indisponíveis', async () => {
    estado.preparacoes = []; assert.equal((await chamar(corpo())).status, 400);
    let b = corpo(); b.itens[0].opcaoMistura = null; assert.equal((await chamar(b)).status, 201);
    estado.cardapios = []; assert.equal((await chamar(b)).status, 400);
    b.itens[0].adicionais = []; assert.equal((await chamar(b)).status, 201);
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
