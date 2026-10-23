import toast from 'react-hot-toast';
export { converterValor, formatarDataHora, formatarValor } from '../caixa/caixaUtils.js';

export const FORMAS_PAGAMENTO = { DINHEIRO: 'Dinheiro', PIX: 'Pix', DEBITO: 'Débito', CREDITO: 'Crédito', FIADO: 'Fiado' };
export const TIPOS_ATENDIMENTO = { BALCAO: 'Balcão', MESA: 'Mesa', DELIVERY: 'Delivery' };
export const MAX_CENTAVOS = 9999999999;

export function centavos(valor) {
    return Math.round(Number(valor) * 100);
}

export function quantidadeValida(valor) {
    let quantidade = Number(valor);
    return String(valor).trim() !== '' && Number.isInteger(quantidade) && quantidade >= 1 && quantidade <= 99;
}

export function subtotalItem(item) {
    return centavos(item.precoUnitario) * Number(item.quantidade)
        + item.adicionais.reduce((total, adicional) => total + centavos(adicional.precoUnitario) * Number(adicional.quantidade), 0);
}

export function totalPedido(itens) {
    return itens.reduce((total, item) => total + subtotalItem(item), 0);
}

export function tratarErro(error) {
    console.error(error);
    let mensagem = error?.msg || 'Não foi possível comunicar com o servidor. Tente novamente.';
    // O ApiClient já mostra o toast das respostas HTTP com erro.
    if (!error?.status) toast.error(mensagem);
    return mensagem;
}
