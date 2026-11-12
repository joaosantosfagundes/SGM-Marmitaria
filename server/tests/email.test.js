import assert from 'node:assert/strict';
import { test } from 'node:test';
import EmailService from '../services/emailService.js';

const chave = 'chave-ficticia-do-brevo';
const remetente = 'sgm@example.com';
const destinatario = 'pessoa@example.com';
const link = 'https://sgm.example.com/redefinir-senha?token=teste';
const falha = { status: 500, msg: 'Falha ao enviar e-mail de redefinição' };

function configurarAmbiente(t, valores = {}) {
    const variaveis = {
        BREVO_API_KEY: chave,
        EMAIL_FROM: remetente,
        EMAIL_FROM_NAME: undefined,
        ...valores,
    };
    for (const [nome, valor] of Object.entries(variaveis)) {
        const anterior = process.env[nome];
        t.after(() => {
            if (anterior === undefined) delete process.env[nome];
            else process.env[nome] = anterior;
        });
        if (valor === undefined) delete process.env[nome];
        else process.env[nome] = valor;
    }
}

test('envia o e-mail pela API do Brevo com o remetente configurado', async t => {
    configurarAmbiente(t, { EMAIL_FROM_NAME: 'SGM Marmitaria' });
    const buscar = t.mock.method(globalThis, 'fetch', async () =>
        new Response('{"messageId":"mensagem-de-teste"}', { status: 201 }));

    await new EmailService().enviarRedefinicaoSenha(destinatario, 'Ana', link);

    assert.equal(buscar.mock.callCount(), 1);
    const [url, opcoes] = buscar.mock.calls[0].arguments;
    assert.equal(url, 'https://api.brevo.com/v3/smtp/email');
    assert.equal(opcoes.method, 'POST');
    assert.equal(opcoes.redirect, 'manual');
    assert.deepEqual(opcoes.headers, {
        'api-key': chave,
        'content-type': 'application/json',
        accept: 'application/json',
    });
    assert.ok(opcoes.signal instanceof AbortSignal);

    const { htmlContent, ...mensagem } = JSON.parse(opcoes.body);
    assert.deepEqual(mensagem, {
        sender: { name: 'SGM Marmitaria', email: remetente },
        to: [{ email: destinatario, name: 'Ana' }],
        subject: 'Redefinição de senha — SGM',
    });
    assert.ok(htmlContent.includes('<p>Olá, Ana.</p>'));
    assert.ok(htmlContent.includes(`href="${link}"`));
    assert.ok(htmlContent.includes('Esse link expira em 1 hora.'));
});

test('usa SGM como nome padrão do remetente', async t => {
    configurarAmbiente(t);
    const buscar = t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 204 }));

    await new EmailService().enviarRedefinicaoSenha(destinatario, 'Ana', link);

    const corpo = JSON.parse(buscar.mock.calls[0].arguments[1].body);
    assert.deepEqual(corpo.sender, { name: 'SGM', email: remetente });
});

for (const [status, corpo, corpoEsperado] of [
    [401, `Chave inválida: ${chave}`, 'Chave inválida: [oculta]'],
    [503, 'Serviço indisponível', 'Serviço indisponível'],
]) {
    test(`registra o erro HTTP ${status} do Brevo e devolve a falha de redefinição`, async t => {
        configurarAmbiente(t);
        t.mock.method(globalThis, 'fetch', async () => new Response(corpo, { status }));
        const registrar = t.mock.method(console, 'error', () => {});

        await assert.rejects(new EmailService().enviarRedefinicaoSenha(destinatario, 'Ana', link), falha);

        assert.equal(registrar.mock.callCount(), 1);
        assert.deepEqual(registrar.mock.calls[0].arguments.slice(1), [status, corpoEsperado]);
    });
}

test('aplica o timeout de 10 segundos e devolve a falha de redefinição', async t => {
    configurarAmbiente(t);
    const sinal = AbortSignal.abort(new DOMException('Tempo limite excedido', 'TimeoutError'));
    const timeout = t.mock.method(AbortSignal, 'timeout', () => sinal);
    const buscar = t.mock.method(globalThis, 'fetch', async (_url, opcoes) => {
        opcoes.signal.throwIfAborted();
    });
    const registrar = t.mock.method(console, 'error', () => {});

    await assert.rejects(new EmailService().enviarRedefinicaoSenha(destinatario, 'Ana', link), falha);

    assert.equal(timeout.mock.callCount(), 1);
    assert.deepEqual(timeout.mock.calls[0].arguments, [10000]);
    assert.equal(buscar.mock.calls[0].arguments[1].signal, sinal);
    assert.match(registrar.mock.calls[0].arguments[0], /Tempo limite/);
});

test('sem chave, registra o link no console e dispensa a chamada HTTP', async t => {
    configurarAmbiente(t, { BREVO_API_KEY: undefined });
    const buscar = t.mock.method(globalThis, 'fetch', async () => {});
    const avisar = t.mock.method(console, 'warn', () => {});

    const resultado = await new EmailService().enviarRedefinicaoSenha(destinatario, 'Ana', link);

    assert.deepEqual(resultado, { modoDebug: true });
    assert.equal(buscar.mock.callCount(), 0);
    assert.match(avisar.mock.calls[0].arguments[0], /BREVO_API_KEY/);
    assert.deepEqual(avisar.mock.calls[1].arguments, [link]);
});
