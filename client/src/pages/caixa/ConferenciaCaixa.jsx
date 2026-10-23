import { calcularDiferenca, formatarValor, situacaoConferencia } from './caixaUtils.js';

export default function ConferenciaCaixa({ saldoEsperado, valorContado, fechado = false }) {
    if (valorContado === null) return <p className="form-text mb-0">Informe um valor válido para conferir o dinheiro da gaveta.</p>;
    let diferenca = calcularDiferenca(valorContado, saldoEsperado);
    let situacao = situacaoConferencia(diferenca);
    return <div className={`alert alert-${situacao.classe} mt-3 mb-0`} aria-live="polite">
        <dl className="row g-2 mb-2">
            <div className="col-12 col-md-4"><dt className="small">Saldo esperado</dt><dd className="mb-0">{formatarValor(saldoEsperado)}</dd></div>
            <div className="col-12 col-md-4"><dt className="small">Valor contado</dt><dd className="mb-0">{formatarValor(valorContado)}</dd></div>
            <div className="col-12 col-md-4"><dt className="small">Diferença</dt><dd className="mb-0 fw-semibold">{formatarValor(diferenca)}</dd></div>
        </dl>
        <strong>{situacao.texto}</strong>
        {diferenca !== 0 && <p className="small mb-0 mt-1">{fechado ? 'Este caixa já foi fechado. A diferença é exibida apenas para consulta.' : 'Há diferença na conferência. Você pode confirmar o fechamento mesmo assim.'}</p>}
    </div>;
}
