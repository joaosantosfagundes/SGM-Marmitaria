import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import ApiClient from '../../services/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';

const FORM_VAZIO = { idInsumo: '', tipo: 'ENTRADA_COMPRA', quantidade: '', motivo: '' };
const TIPOS = {
    ENTRADA_COMPRA: 'Entrada de compra', PERDA: 'Perda',
    AJUSTE_ENTRADA: 'Ajuste de entrada', AJUSTE_SAIDA: 'Ajuste de saída',
};

function formatarQuantidade(valor) {
    return Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
}

function formatarDataHora(valor) {
    // Preserva o DATETIME registrado pelo banco, sem converter o fuso horário.
    let partes = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2}:\d{2})$/.exec(valor ?? '');
    return partes ? `${partes[3]}/${partes[2]}/${partes[1]} ${partes[4]}` : '—';
}

function converterQuantidade(texto) {
    let valor = texto.trim();
    if (!/^\d+(?:[.,]\d{1,3})?$/.test(valor)) return null;
    let numero = Number(valor.replace(',', '.'));
    return Number.isFinite(numero) && numero > 0 && numero <= 9999999.999 ? numero : null;
}

function tratarErro(error) {
    console.error(error);
    if (!error?.status) toast.error('Não foi possível comunicar com o servidor. Tente novamente.');
}

export default function EstoquePage() {
    const { usuario } = useAuth();
    const confirmar = useConfirm();
    const podeConsultar = ['ADMIN', 'ATENDENTE', 'COZINHA'].includes(usuario?.perfil);
    const podeRegistrar = ['ADMIN', 'COZINHA'].includes(usuario?.perfil);
    const [saldos, setSaldos] = useState([]);
    const [movimentacoes, setMovimentacoes] = useState([]);
    const [busca, setBusca] = useState('');
    const [filtroInsumo, setFiltroInsumo] = useState('');
    const [mostrarForm, setMostrarForm] = useState(false);
    const [form, setForm] = useState(FORM_VAZIO);
    const [carregando, setCarregando] = useState(true);
    const [carregandoHistorico, setCarregandoHistorico] = useState(true);
    const [erroSaldos, setErroSaldos] = useState(false);
    const [erroHistorico, setErroHistorico] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [tentativa, setTentativa] = useState(0);

    useEffect(() => {
        if (!podeConsultar) return;
        let atual = true;
        setCarregando(true);
        setErroSaldos(false);
        async function carregar() {
            try {
                let dados = await ApiClient.get('estoque');
                if (atual) setSaldos(dados);
            } catch (error) {
                if (atual) {
                    setErroSaldos(true);
                    tratarErro(error);
                }
            } finally {
                if (atual) setCarregando(false);
            }
        }
        carregar();
        return () => { atual = false; };
    }, [podeConsultar, tentativa]);

    useEffect(() => {
        if (!podeConsultar) return;
        let atual = true;
        setCarregandoHistorico(true);
        setErroHistorico(false);
        async function carregarHistorico() {
            let parametros = new URLSearchParams({ limite: '50' });
            if (filtroInsumo) parametros.set('idInsumo', filtroInsumo);
            try {
                let dados = await ApiClient.get(`estoque/movimentacoes?${parametros}`);
                if (atual) setMovimentacoes(dados);
            } catch (error) {
                if (atual) {
                    setErroHistorico(true);
                    tratarErro(error);
                }
            } finally {
                if (atual) setCarregandoHistorico(false);
            }
        }
        carregarHistorico();
        return () => { atual = false; };
    }, [podeConsultar, filtroInsumo, tentativa]);

    function atualizar() {
        setTentativa(atual => atual + 1);
    }

    function abrirNovo(insumo = null) {
        setForm({ ...FORM_VAZIO, idInsumo: insumo ? String(insumo.id) : '' });
        setMostrarForm(true);
    }

    function fecharForm() {
        setMostrarForm(false);
        setForm(FORM_VAZIO);
    }

    let ativos = saldos.filter(item => item.ativo);
    let selecionado = ativos.find(item => item.id === Number(form.idInsumo));
    let exigeMotivo = form.tipo !== 'ENTRADA_COMPRA';
    let filtrados = saldos.filter(item => item.nome.toLocaleLowerCase('pt-BR').includes(busca.trim().toLocaleLowerCase('pt-BR')));
    let ocupado = carregando || salvando;

    async function handleSubmit(event) {
        event.preventDefault();
        if (!podeRegistrar || ocupado || erroSaldos) return;
        if (!selecionado) {
            toast.error('Selecione um insumo ativo.');
            return;
        }
        if (!Object.hasOwn(TIPOS, form.tipo)) {
            toast.error('Selecione um tipo de movimentação válido.');
            return;
        }
        let quantidade = converterQuantidade(form.quantidade);
        if (quantidade === null) {
            toast.error('A quantidade deve ser maior que zero, com até três casas decimais e no máximo 9.999.999,999.');
            return;
        }
        let motivo = form.motivo.trim();
        if (exigeMotivo && motivo.length < 3) {
            toast.error('Informe um motivo com pelo menos 3 caracteres para perdas e ajustes.');
            return;
        }
        if (form.motivo.length > 255) {
            toast.error('O motivo deve ter até 255 caracteres.');
            return;
        }
        let saida = form.tipo === 'PERDA' || form.tipo === 'AJUSTE_SAIDA';
        if (saida && !(await confirmar({
            titulo: 'Registrar saída de estoque',
            mensagem: `Registrar ${TIPOS[form.tipo].toLocaleLowerCase('pt-BR')} de ${formatarQuantidade(quantidade)} ${selecionado.siglaUnidade} de "${selecionado.nome}"? O saldo será reduzido e a movimentação ficará no histórico.`,
            textoConfirmar: 'Registrar saída', tipo: 'perigo',
        }))) return;

        setSalvando(true);
        try {
            await ApiClient.post('estoque/movimentacoes', {
                idInsumo: selecionado.id, tipo: form.tipo, quantidade, motivo: motivo || null,
            });
            fecharForm();
            toast.success('Movimentação registrada!');
            atualizar();
        } catch (error) {
            tratarErro(error);
            if ([400, 404, 409].includes(error?.status)) atualizar();
        } finally {
            setSalvando(false);
        }
    }

    if (!podeConsultar) return <div className="alert alert-warning">A consulta de estoque está disponível para administradores, atendentes e cozinha.</div>;

    return (
        <div>
            <div className="page-header d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <div>
                    <h1 className="fs-3 mb-1">Estoque</h1>
                    <p className="text-secondary mb-0">Consulte os saldos e registre entradas, perdas e ajustes manuais.</p>
                </div>
                <div className="d-flex flex-wrap gap-2">
                    <button className="btn btn-outline-primary" disabled={ocupado || carregandoHistorico} onClick={atualizar}><i className="ti ti-refresh me-1" />Atualizar</button>
                    {podeRegistrar && !mostrarForm && <button className="btn btn-primary" disabled={ocupado || erroSaldos || !ativos.length} onClick={() => abrirNovo()}><i className="ti ti-plus me-1" />Registrar movimentação</button>}
                </div>
            </div>

            {podeRegistrar && mostrarForm && <section className="page-card p-4 mb-4">
                <h2 className="h6 mb-3">Registrar movimentação</h2>
                <form onSubmit={handleSubmit} noValidate>
                    <fieldset disabled={ocupado || erroSaldos}>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <label htmlFor="insumo-movimentacao" className="form-label small">Insumo</label>
                                <select id="insumo-movimentacao" className="form-select" required value={form.idInsumo} onChange={event => setForm({ ...form, idInsumo: event.target.value })}>
                                    <option value="">Selecione...</option>
                                    {ativos.map(item => <option key={item.id} value={item.id}>{item.nome} ({item.siglaUnidade})</option>)}
                                </select>
                            </div>
                            <div className="col-md-6">
                                <label htmlFor="tipo-movimentacao" className="form-label small">Tipo</label>
                                <select id="tipo-movimentacao" className="form-select" value={form.tipo} onChange={event => setForm({ ...form, tipo: event.target.value })}>
                                    {Object.entries(TIPOS).map(([tipo, nome]) => <option key={tipo} value={tipo}>{nome}</option>)}
                                </select>
                            </div>
                            <div className="col-md-4">
                                <label htmlFor="quantidade-movimentacao" className="form-label small">Quantidade</label>
                                <div className="input-group">
                                    <input id="quantidade-movimentacao" type="text" inputMode="decimal" className="form-control" required placeholder="0,000" value={form.quantidade} aria-describedby="unidade-movimentacao ajuda-quantidade" onChange={event => setForm({ ...form, quantidade: event.target.value })} />
                                    <span id="unidade-movimentacao" className="input-group-text">{selecionado?.siglaUnidade ?? '—'}</span>
                                </div>
                                <div id="ajuda-quantidade" className="form-text">Informe uma quantidade positiva, com até três casas decimais.</div>
                                {selecionado && <div className="form-text">Saldo atual: {formatarQuantidade(selecionado.quantidade)} {selecionado.siglaUnidade}</div>}
                            </div>
                            <div className="col-md-8">
                                <label htmlFor="motivo-movimentacao" className="form-label small">Motivo {exigeMotivo ? '(obrigatório)' : '(opcional)'}</label>
                                <textarea id="motivo-movimentacao" className="form-control" rows={2} maxLength={255} minLength={exigeMotivo ? 3 : undefined} required={exigeMotivo} value={form.motivo} onChange={event => setForm({ ...form, motivo: event.target.value })} />
                                <div className="form-text">Obrigatório para perdas e ajustes: de 3 a 255 caracteres.</div>
                            </div>
                        </div>
                    </fieldset>
                    <div className="d-flex flex-wrap gap-2 mt-3">
                        <button type="submit" className="btn btn-primary" disabled={ocupado || erroSaldos}>{salvando ? 'Salvando...' : 'Salvar'}</button>
                        <button type="button" className="btn btn-light" disabled={salvando} onClick={fecharForm}>Cancelar</button>
                    </div>
                </form>
            </section>}

            <section className="page-card mb-4">
                <div className="p-4 border-bottom">
                    <h2 className="h6 mb-3">Saldos dos insumos</h2>
                    <label htmlFor="busca-estoque" className="form-label small">Buscar por nome</label>
                    <input id="busca-estoque" className="form-control" value={busca} placeholder="Nome do insumo" onChange={event => setBusca(event.target.value)} />
                </div>
                {erroSaldos && <div className="alert alert-danger m-3">Não foi possível carregar os saldos. <button className="btn btn-sm btn-outline-danger" disabled={ocupado} onClick={atualizar}>Tentar novamente</button></div>}
                <div className="table-responsive">
                    <table className="table table-hover mb-0 align-middle">
                        <thead><tr><th className="ps-4">Insumo</th><th>Categoria</th><th>Unidade</th><th>Saldo</th><th>Mínimo</th><th>Situação</th>{podeRegistrar && <th className="text-end pe-4">Ações</th>}</tr></thead>
                        <tbody>
                            {carregando && <tr><td colSpan={podeRegistrar ? 7 : 6} className="text-center text-secondary py-4">Carregando...</td></tr>}
                            {!carregando && !erroSaldos && !filtrados.length && <tr><td colSpan={podeRegistrar ? 7 : 6} className="text-center text-secondary py-4">Nenhum insumo encontrado.</td></tr>}
                            {!carregando && !erroSaldos && filtrados.map(item => <tr key={item.id}>
                                <td className="ps-4">{item.nome}</td><td>{item.categoria}</td><td>{item.siglaUnidade}</td>
                                <td>{formatarQuantidade(item.quantidade)}</td><td>{formatarQuantidade(item.estoqueMinimo)}</td>
                                <td><div className="d-flex flex-wrap gap-1"><span className={`badge ${item.abaixoDoMinimo ? 'text-bg-warning' : 'text-bg-success'}`}>{item.abaixoDoMinimo ? 'Abaixo do mínimo' : 'Regular'}</span>{!item.ativo && <span className="badge text-bg-secondary">Inativo</span>}</div></td>
                                {podeRegistrar && <td className="text-end pe-4">{item.ativo && <button className="btn btn-sm btn-outline-primary" disabled={ocupado || erroSaldos} onClick={() => abrirNovo(item)}>Registrar movimentação</button>}</td>}
                            </tr>)}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="page-card">
                <div className="p-4 border-bottom">
                    <h2 className="h6 mb-1">Histórico de movimentações</h2>
                    <p className="small text-secondary mb-3">Últimas 50 movimentações, das mais recentes para as mais antigas.</p>
                    <label htmlFor="filtro-historico-estoque" className="form-label small">Filtrar por insumo</label>
                    <select id="filtro-historico-estoque" className="form-select" value={filtroInsumo} disabled={salvando} onChange={event => setFiltroInsumo(event.target.value)}>
                        <option value="">Todos os insumos</option>
                        {saldos.map(item => <option key={item.id} value={item.id}>{item.nome}{!item.ativo ? ' (inativo)' : ''}</option>)}
                    </select>
                </div>
                {erroHistorico && <div className="alert alert-danger m-3">Não foi possível carregar o histórico. <button className="btn btn-sm btn-outline-danger" disabled={salvando || carregandoHistorico} onClick={atualizar}>Tentar novamente</button></div>}
                <div className="table-responsive">
                    <table className="table table-hover mb-0 align-middle">
                        <thead><tr><th className="ps-4">Data e hora</th><th>Insumo</th><th>Unidade</th><th>Tipo</th><th>Quantidade</th><th>Motivo</th><th className="pe-4">Registrado por</th></tr></thead>
                        <tbody>
                            {carregandoHistorico && <tr><td colSpan={7} className="text-center text-secondary py-4">Carregando...</td></tr>}
                            {!carregandoHistorico && !erroHistorico && !movimentacoes.length && <tr><td colSpan={7} className="text-center text-secondary py-4">Nenhuma movimentação encontrada.</td></tr>}
                            {!carregandoHistorico && !erroHistorico && movimentacoes.map(item => <tr key={item.id}>
                                <td className="ps-4 text-nowrap">{formatarDataHora(item.dataHora)}</td><td>{item.nomeInsumo}</td><td>{item.siglaUnidade}</td>
                                <td><span className={`badge ${['ENTRADA_COMPRA', 'AJUSTE_ENTRADA'].includes(item.tipo) ? 'text-bg-success' : item.tipo === 'PERDA' ? 'text-bg-danger' : 'text-bg-warning'}`}>{TIPOS[item.tipo]}</span></td>
                                <td>{formatarQuantidade(item.quantidade)}</td><td>{item.motivo ?? '—'}</td><td className="pe-4">{item.nomeUsuario}</td>
                            </tr>)}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
