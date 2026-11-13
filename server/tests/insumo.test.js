import { test } from 'node:test';
import assert from 'node:assert/strict';
import InsumoEntity from '../entities/insumoEntity.js';
import InsumoRepository from '../repositories/insumoRepository.js';
import InsumoService from '../services/insumoService.js';

const legado = { classificacao: 'IGNORAR', preco_custo: -1, preco_venda: -1 };

test('Cadastra insumo sem exigir os campos antigos e ignora esses campos no corpo', async t => {
    t.mock.method(InsumoRepository.prototype, 'obterPorNome', async () => null);
    t.mock.method(InsumoRepository.prototype, 'categoriaExiste', async () => true);
    t.mock.method(InsumoRepository.prototype, 'unidadeExiste', async () => true);
    const gravar = t.mock.method(InsumoRepository.prototype, 'gravar', async entidade => { entidade.id = 1; });
    const service = new InsumoService();

    const insumo = await service.gravar({ nome: 'Arroz', id_categoria: 2, id_unidade: 1 });
    assert.equal(insumo.estoqueMinimo, 0);
    const comLegado = await service.gravar({ nome: 'Arroz', id_categoria: 2, id_unidade: 1, ...legado });
    assert.deepEqual(comLegado.toJSON(), insumo.toJSON());
    assert.equal(gravar.mock.callCount(), 2);
});

test('Edita o estoque mínimo e ignora os campos antigos sem alterar a situação', async t => {
    const linha = { id_insumo: 1, nome: 'Arroz', id_categoria: 2, id_unidade: 1, estoque_minimo: '1.250', ativo: 0, ...legado };
    const atual = InsumoEntity.toMap(linha);
    assert.equal(atual.estoqueMinimo, 1.25);
    assert.deepEqual(Object.keys(JSON.parse(JSON.stringify(atual))).sort(),
        ['ativo', 'estoqueMinimo', 'id', 'idCategoria', 'idUnidade', 'nome']);
    t.mock.method(InsumoRepository.prototype, 'obter', async () => atual);
    const atualizar = t.mock.method(InsumoRepository.prototype, 'atualizar', async () => true);
    const service = new InsumoService();

    const resultado = await service.atualizar(1, { estoque_minimo: 2.125, ...legado });
    assert.equal(resultado.estoqueMinimo, 2.125);
    assert.equal(resultado.ativo, 0);
    await assert.rejects(service.atualizar(1, { estoque_minimo: -1 }), { status: 400 });
    assert.equal(atualizar.mock.callCount(), 1);
});
