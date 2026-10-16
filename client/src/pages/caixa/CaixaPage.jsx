import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import ApiClient from '../../services/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { converterValor, formatarDataHora, formatarValor } from './caixaUtils.js';

function tratarErro(error) {
    console.error(error);
    if (!error?.status) toast.error('Não foi possível comunicar com o servidor. Tente novamente.');
}

export default function CaixaPage() {
    const confirmar = useConfirm();
    const { usuario } = useAuth();
    const podeAcessar = ['ADMIN', 'ATENDENTE'].includes(usuario?.perfil);
    const [caixaAtual, setCaixaAtual] = useState(null);
    const [caixas, setCaixas] = useState([]);
    const [valorAbertura, setValorAbertura] = useState('');
    const [valorFechamento, setValorFechamento] = useState('');
    const [carregando, setCarregando] = useState(true);
    const [erroCarga, setErroCarga] = useState(false);
    const [salvando, setSalvando] = useState(false);

    async function carregar() {
        setCarregando(true);
        setErroCarga(false);
        try {
            let [atual, ultimos] = await Promise.all([ApiClient.get('caixa/atual'), ApiClient.get('caixa')]);
            setCaixaAtual(atual);
            setCaixas(ultimos);
        } catch (error) {
            setErroCarga(true);
            tratarErro(error);
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        if (podeAcessar) carregar();
        else setCarregando(false);
    }, [podeAcessar]);

    async function abrirCaixa(event) {
        event.preventDefault();
        if (carregando || salvando || erroCarga || caixaAtual || !podeAcessar) return;
        let valor = converterValor(valorAbertura);
        if (valor === null) {
            toast.error('Informe um valor entre R$ 0,00 e R$ 99.999.999,99, com até duas casas decimais.');
            return;
        }

        setSalvando(true);
        try {
            let caixa = await ApiClient.post('caixa/abrir', { valorAbertura: valor });
            setCaixaAtual(caixa);
            setValorAbertura('');
            setValorFechamento('');
            toast.success('Caixa aberto com sucesso!');
            await carregar();
        } catch (error) {
            tratarErro(error);
            if (error?.status === 409) await carregar();
        } finally {
            setSalvando(false);
        }
    }

    async function fecharCaixa(event) {
        event.preventDefault();
        if (carregando || salvando || erroCarga || !caixaAtual || !podeAcessar) return;
        let valor = converterValor(valorFechamento);
        if (valor === null) {
            toast.error('Informe um valor entre R$ 0,00 e R$ 99.999.999,99, com até duas casas decimais.');
            return;
        }
        if (!(await confirmar({
            titulo: 'Fechar caixa',
            mensagem: `Confirma o fechamento do caixa com ${formatarValor(valor)} contados na gaveta? O fechamento deste caixa não pode ser desfeito.`,
            textoConfirmar: 'Fechar caixa', tipo: 'perigo',
        }))) return;

        setSalvando(true);
        try {
            await ApiClient.post('caixa/fechar', { valorFechamento: valor });
            setCaixaAtual(null);
            setValorAbertura('');
            setValorFechamento('');
            toast.success('Caixa fechado com sucesso!');
            await carregar();
        } catch (error) {
            tratarErro(error);
            if (error?.status === 409) await carregar();
        } finally {
            setSalvando(false);
        }
    }

    if (!podeAcessar) return <div className="alert alert-warning">O caixa está disponível para administradores e atendentes.</div>;

    return (
        <div>
            <div className="page-header d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <div>
                    <h1 className="fs-3 mb-1">Caixa</h1>
                    <p className="text-secondary mb-0">Abertura, fechamento e histórico do caixa.</p>
                </div>
                <button className="btn btn-outline-primary" disabled={carregando || salvando} onClick={carregar}>
                    <i className="ti ti-refresh me-1" />Atualizar
                </button>
            </div>

            {erroCarga && <div className="alert alert-danger">Não foi possível carregar os caixas. Clique em Atualizar para tentar novamente.</div>}
            {carregando ? <section className="page-card p-4 mb-4 text-secondary">Carregando caixa...</section> : !erroCarga && (
                caixaAtual ? <section className="page-card p-4 mb-4">
                    <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                        <h2 className="h5 mb-0">Caixa aberto</h2>
                        <span className="badge text-bg-success">Aberto</span>
                    </div>
                    <dl className="row mb-0">
                        <div className="col-md-4 mb-2"><dt className="small text-secondary">Aberto por</dt><dd className="mb-0">{caixaAtual.nomeUsuarioAbertura}</dd></div>
                        <div className="col-md-4 mb-2"><dt className="small text-secondary">Data e hora de abertura</dt><dd className="mb-0">{formatarDataHora(caixaAtual.dataAbertura)}</dd></div>
                        <div className="col-md-4 mb-2"><dt className="small text-secondary">Valor de abertura</dt><dd className="mb-0">{formatarValor(caixaAtual.valorAbertura)}</dd></div>
                    </dl>
                    <form onSubmit={fecharCaixa} className="mt-4 pt-4 border-top" noValidate>
                        <div className="row g-3 align-items-end">
                            <div className="col-md-5">
                                <label htmlFor="valor-fechamento" className="form-label small">Valor contado na gaveta (R$)</label>
                                <input id="valor-fechamento" type="text" inputMode="decimal" min="0" className="form-control"
                                    required disabled={salvando} value={valorFechamento} placeholder="0,00" aria-describedby="ajuda-valor-fechamento"
                                    onChange={event => setValorFechamento(event.target.value)} />
                                <div id="ajuda-valor-fechamento" className="form-text">Zero é permitido. Use vírgula ou ponto e até duas casas decimais.</div>
                            </div>
                            <div className="col-md-auto">
                                <button type="submit" className="btn btn-primary" disabled={salvando}>
                                    <i className="ti ti-lock me-1" />{salvando ? 'Fechando...' : 'Fechar caixa'}
                                </button>
                            </div>
                        </div>
                    </form>
                </section> : <section className="page-card p-4 mb-4">
                    <h2 className="h6 mb-3">Nenhum caixa aberto</h2>
                    <form onSubmit={abrirCaixa} noValidate>
                        <div className="row g-3 align-items-end">
                            <div className="col-md-5">
                                <label htmlFor="valor-abertura" className="form-label small">Valor de abertura (R$)</label>
                                <input id="valor-abertura" type="text" inputMode="decimal" min="0" className="form-control"
                                    required disabled={salvando} value={valorAbertura} placeholder="0,00" aria-describedby="ajuda-valor-abertura"
                                    onChange={event => setValorAbertura(event.target.value)} />
                                <div id="ajuda-valor-abertura" className="form-text">Zero é permitido. Use vírgula ou ponto e até duas casas decimais.</div>
                            </div>
                            <div className="col-md-auto">
                                <button type="submit" className="btn btn-primary" disabled={salvando}>
                                    <i className="ti ti-lock-open me-1" />{salvando ? 'Abrindo...' : 'Abrir caixa'}
                                </button>
                            </div>
                        </div>
                    </form>
                </section>
            )}

            <section className="page-card">
                <h2 className="h6 px-4 py-3 mb-0 border-bottom">Últimos caixas</h2>
                <div className="table-responsive">
                    <table className="table table-hover mb-0 align-middle">
                        <thead><tr><th className="ps-4">Abertura</th><th>Aberto por</th><th>Valor de abertura</th><th>Fechamento</th><th>Fechado por</th><th>Valor de fechamento</th><th className="pe-4">Status</th></tr></thead>
                        <tbody>
                            {carregando && <tr><td colSpan={7} className="text-center text-secondary py-4">Carregando...</td></tr>}
                            {!carregando && erroCarga && <tr><td colSpan={7} className="text-center text-secondary py-4">Consulta indisponível.</td></tr>}
                            {!carregando && !erroCarga && caixas.length === 0 && <tr><td colSpan={7} className="text-center text-secondary py-4">Nenhum caixa registrado.</td></tr>}
                            {!carregando && !erroCarga && caixas.map(caixa => <tr key={caixa.id}>
                                <td className="ps-4 text-nowrap">{formatarDataHora(caixa.dataAbertura)}</td>
                                <td>{caixa.nomeUsuarioAbertura}</td>
                                <td>{formatarValor(caixa.valorAbertura)}</td>
                                <td className="text-nowrap">{formatarDataHora(caixa.dataFechamento)}</td>
                                <td>{caixa.nomeUsuarioFechamento ?? '—'}</td>
                                <td>{caixa.valorFechamento == null ? '—' : formatarValor(caixa.valorFechamento)}</td>
                                <td className="pe-4"><span className={`badge ${caixa.status === 'ABERTO' ? 'text-bg-success' : 'text-bg-secondary'}`}>{caixa.status === 'ABERTO' ? 'Aberto' : 'Fechado'}</span></td>
                            </tr>)}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
