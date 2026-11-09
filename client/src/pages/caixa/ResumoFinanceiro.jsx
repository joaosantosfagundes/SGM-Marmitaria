import { formatarValor } from './caixaUtils.js';
import { centavos } from '../pedidos/pedidoUtils.js';
import ConferenciaCaixa from './ConferenciaCaixa.jsx';

const FORMAS = [
    ['Dinheiro', 'totalDinheiro', 'dinheiro'], ['Pix', 'totalPix', 'pix'],
    ['Débito', 'totalDebito', 'debito'], ['Crédito', 'totalCredito', 'credito'],
];

export default function ResumoFinanceiro({ resumo }) {
    let { fiadoRecebido, quantidadePagamentos } = resumo;
    let quantidadeFiadoRecebido = Object.values(fiadoRecebido.quantidadePagamentos).reduce((total, valor) => total + valor, 0);
    let quantidadeFiadoPendente = quantidadePagamentos.fiado;

    return <div className="mt-3">
        <h3 className="h6">Recebido neste caixa</h3>
        <div className="table-responsive border rounded">
            <table className="table align-middle mb-0">
                <caption className="visually-hidden">Recebimentos por forma de pagamento</caption>
                <thead><tr><th scope="col">Forma</th><th scope="col" className="text-end">Nº de pagamentos</th><th scope="col" className="text-end">Total</th></tr></thead>
                <tbody>{FORMAS.map(([nome, campo, chave]) => {
                    let quantidade = quantidadePagamentos[chave] + fiadoRecebido.quantidadePagamentos[chave];
                    let totalCentavos = centavos(resumo[campo]) + centavos(fiadoRecebido[chave]);
                    return <tr key={campo}>
                        <th scope="row" className="fw-normal">{nome}</th>
                        <td className="text-end">{quantidade}</td>
                        <td className="text-end text-nowrap">{formatarValor(totalCentavos / 100)}</td>
                    </tr>;
                })}</tbody>
                <tfoot><tr><th scope="row" colSpan={2}>Total recebido</th>
                    <td className="text-end text-nowrap fw-semibold">{formatarValor(resumo.totalRecebido)}</td></tr></tfoot>
            </table>
        </div>
        {fiadoRecebido.total > 0 && <p className="small text-secondary mt-2 mb-0">
            Fiado recebido: {quantidadeFiadoRecebido} {quantidadeFiadoRecebido === 1 ? 'pagamento' : 'pagamentos'} — {formatarValor(fiadoRecebido.total)} (já incluído nas formas acima)
        </p>}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 my-3">
            <div>
                <h3 className="h6 mb-1">Fiado a receber (pendente)</h3>
                <div className="small text-secondary">Não recebido · {quantidadeFiadoPendente} {quantidadeFiadoPendente === 1 ? 'pagamento' : 'pagamentos'}</div>
            </div>
            <strong className="text-nowrap">{formatarValor(resumo.totalFiado)}</strong>
        </div>
        <div className="bg-primary-subtle border border-primary-subtle rounded p-3">
            <div className="fw-semibold">Saldo esperado em dinheiro na gaveta</div>
            <strong className="fs-3 text-primary">{formatarValor(resumo.saldoEsperadoDinheiro)}</strong>
            <p className="small mb-0">Abertura + dinheiro recebido (vendas e fiado).</p>
        </div>
        <p className="small text-secondary mt-2 mb-0">Não inclui sangrias, despesas, taxas ou estornos.</p>
        {resumo.status === 'FECHADO' && <div className="mt-3">
            <h3 className="h6">Conferência do fechamento</h3>
            {resumo.valorFechamento === null ? <p className="text-secondary">Valor contado não informado.</p>
                : <ConferenciaCaixa saldoEsperado={resumo.saldoEsperadoDinheiro} valorContado={resumo.valorFechamento} fechado />}
        </div>}
    </div>;
}
