import { formatarValor } from './caixaUtils.js';
import ConferenciaCaixa from './ConferenciaCaixa.jsx';

const FORMAS = [
    ['Dinheiro', 'totalDinheiro', 'dinheiro'], ['Pix', 'totalPix', 'pix'],
    ['Débito', 'totalDebito', 'debito'], ['Crédito', 'totalCredito', 'credito'],
    ['Fiado pendente', 'totalFiado', 'fiado'],
];

export default function ResumoFinanceiro({ resumo }) {
    let quantidade = Object.values(resumo.quantidadePagamentos).reduce((total, valor) => total + valor, 0);
    return <div className="mt-3">
        <h3 className="h6">Resumo financeiro</h3>
        {quantidade === 0 && resumo.fiadoRecebido.total === 0 && <p className="text-secondary small">Nenhum pagamento contabilizável neste caixa.</p>}
        <div className="table-responsive border rounded mb-3">
            <table className="table align-middle mb-0">
                <caption className="visually-hidden">Vendas recebidas por forma e fiado pendente deste caixa.</caption>
                <thead><tr><th scope="col">Forma</th><th scope="col" className="text-end">Pagamentos</th><th scope="col" className="text-end">Total</th></tr></thead>
                <tbody>{FORMAS.map(([nome, campo, chave]) => <tr key={campo}>
                    <th scope="row" className="fw-normal">{nome}</th>
                    <td className="text-end">{resumo.quantidadePagamentos[chave]}</td>
                    <td className="text-end text-nowrap">{formatarValor(resumo[campo])}</td>
                </tr>)}</tbody>
            </table>
        </div>
        <h3 className="h6">Fiado recebido neste caixa</h3>
        <div className="table-responsive border rounded mb-3">
            <table className="table align-middle mb-0">
                <caption className="visually-hidden">Quitações por forma de recebimento, inclusive de vendas de caixas anteriores.</caption>
                <thead><tr><th scope="col">Forma de quitação</th><th scope="col" className="text-end">Pagamentos</th><th scope="col" className="text-end">Total</th></tr></thead>
                <tbody>{FORMAS.slice(0, 4).map(([nome, , chave]) => <tr key={chave}>
                    <th scope="row" className="fw-normal">{nome}</th>
                    <td className="text-end">{resumo.fiadoRecebido.quantidadePagamentos[chave]}</td>
                    <td className="text-end text-nowrap">{formatarValor(resumo.fiadoRecebido[chave])}</td>
                </tr>)}</tbody>
                <tfoot><tr><th scope="row" colSpan={2}>Total de fiado recebido</th><td className="text-end text-nowrap">{formatarValor(resumo.fiadoRecebido.total)}</td></tr></tfoot>
            </table>
        </div>
        <div className="row g-3 mb-3">
            {[
                ['Total recebido', resumo.totalRecebido, 'Vendas pagas + fiado recebido neste caixa.'],
                ['Total vendido', resumo.totalVendido, 'Vendas originadas neste caixa, incluindo fiado pendente ou quitado. A abertura e as quitações não são novas vendas.'],
                ['Total pendente', resumo.totalFiado, 'Fiado ainda não recebido.'],
            ].map(([rotulo, valor, ajuda]) => <div className="col-12 col-md-4" key={rotulo}>
                <div className="bg-light border rounded p-3 h-100">
                    <div className="small text-secondary">{rotulo}</div><strong className="fs-5">{formatarValor(valor)}</strong>
                    <p className="small text-secondary mb-0 mt-1">{ajuda}</p>
                </div>
            </div>)}
        </div>
        <div className="bg-primary-subtle border border-primary-subtle rounded p-3">
            <div className="fw-semibold">Saldo esperado em dinheiro na gaveta</div>
            <strong className="fs-3 text-primary">{formatarValor(resumo.saldoEsperadoDinheiro)}</strong>
            <p className="small mb-0">Dinheiro físico: abertura ({formatarValor(resumo.valorAbertura)}) + vendas e quitações recebidas em dinheiro. Pix, cartões e fiado pendente não entram na gaveta.</p>
        </div>
        <p className="small text-secondary mt-2 mb-0">Considera todo o período deste caixa, sem corte por dia. Não inclui sangrias, suprimentos, despesas, taxas ou estornos.</p>
        {resumo.status === 'FECHADO' && <div className="mt-3">
            <h3 className="h6">Conferência do fechamento</h3>
            {resumo.valorFechamento === null ? <p className="text-secondary">Valor contado não informado.</p>
                : <ConferenciaCaixa saldoEsperado={resumo.saldoEsperadoDinheiro} valorContado={resumo.valorFechamento} fechado />}
        </div>}
    </div>;
}
