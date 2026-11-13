import { test } from 'node:test';
import assert from 'node:assert/strict';
import AdicionalEntity from '../entities/adicionalEntity.js';
import AdicionalRepository from '../repositories/adicionalRepository.js';
import AdicionalService from '../services/adicionalService.js';

const legado = { id_insumo: -1, quantidade_consumida: -1 };
const serializar = entidade => JSON.parse(JSON.stringify(entidade));

test('Cadastra adicional com nome e preço e ignora os campos antigos', async t => {
    t.mock.method(AdicionalRepository.prototype, 'obterAtivoPorNome', async () => null);
    const gravar = t.mock.method(AdicionalRepository.prototype, 'gravar', async entidade => { entidade.id = 1; });
    const service = new AdicionalService();

    const esperado = { id: 1, nome: 'Ovo extra', preco: 3, ativo: true };
    assert.deepEqual(serializar(await service.gravar({ nome: 'Ovo extra', preco: 3 })), esperado);
    assert.deepEqual(serializar(await service.gravar({ nome: 'Ovo extra', preco: 3, ...legado })), esperado);
    await assert.rejects(service.gravar({ nome: 'Ovo extra', preco: 0 }), { status: 400 });
    assert.equal(gravar.mock.callCount(), 2);
});

test('Atualiza adicional sem consultar insumos e mantém a validação de preço', async t => {
    const atual = AdicionalEntity.toMap({ id_adicional: 1, nome: 'Ovo extra', preco: '3.00', ativo: 1, ...legado });
    assert.deepEqual(serializar(atual), { id: 1, nome: 'Ovo extra', preco: 3, ativo: true });
    t.mock.method(AdicionalRepository.prototype, 'obter', async () => atual);
    t.mock.method(AdicionalRepository.prototype, 'obterAtivoPorNome', async () => null);
    const atualizar = t.mock.method(AdicionalRepository.prototype, 'atualizar', async () => true);
    const service = new AdicionalService();

    const resultado = await service.atualizar(1, { preco: 4.5, ...legado });
    assert.deepEqual(serializar(resultado), { id: 1, nome: 'Ovo extra', preco: 4.5, ativo: true });
    await assert.rejects(service.atualizar(1, { preco: 0 }), { status: 400 });
    assert.equal(atualizar.mock.callCount(), 1);
});
