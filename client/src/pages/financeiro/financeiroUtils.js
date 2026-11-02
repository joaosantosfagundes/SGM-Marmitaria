import { dataLocal } from '../../lib/dataLocal.js';
export { converterValor, formatarValor, formatarDataHora } from '../caixa/caixaUtils.js';

export const CATEGORIAS = ['Aluguel', 'Salário', 'Gás', 'Compra de insumo', 'Energia', 'Água', 'Internet', 'Manutenção', 'Embalagens', 'Entrada avulsa'];

export function dataHoraLocal() {
    let agora = new Date();
    return `${dataLocal(agora)}T${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
}

export function novoForm() {
    return { tipo: 'SAIDA', categoria: '', categoriaOutra: '', descricao: '', valor: '', dataHora: dataHoraLocal(), recorrente: false, quantidadeMeses: '' };
}
