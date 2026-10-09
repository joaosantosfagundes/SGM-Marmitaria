import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import ApiClient from '../../services/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';

function dataLocal(date = new Date()) {
    let ano = date.getFullYear();
    let mes = String(date.getMonth() + 1).padStart(2, '0');
    let dia = String(date.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function formatarPreco(valor) {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function tratarErro(error) {
    console.error(error);
    if (!error?.status) toast.error('Não foi possível comunicar com o servidor. Tente novamente.');
}

export default function CardapioPage() {
    const { usuario } = useAuth();
    const podeEditar = ['ADMIN', 'ATENDENTE'].includes(usuario?.perfil);
    const [data, setData] = useState(dataLocal);
    const [dataOrigem, setDataOrigem] = useState('');
    const [preparacoes, setPreparacoes] = useState([]);
    const [adicionais, setAdicionais] = useState([]);
    const [selecionados, setSelecionados] = useState([]);
    const [existe, setExiste] = useState(false);
    const [dataCarregada, setDataCarregada] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [erroCarga, setErroCarga] = useState(false);
    const [tentativa, setTentativa] = useState(0);
    const [salvando, setSalvando] = useState(false);
    const [copiando, setCopiando] = useState(false);

    function aplicarMenu(menu) {
        setPreparacoes(menu.preparacoes);
        setSelecionados(menu.adicionais);
        setExiste(menu.existe);
        setDataCarregada(menu.data);
    }

    useEffect(() => {
        let atual = true;
        setCarregando(true);
        setErroCarga(false);
        setDataCarregada(null);
        async function carregar() {
            try {
                let [menu, catalogo] = await Promise.all([
                    ApiClient.get(`cardapio?data=${encodeURIComponent(data)}`),
                    ApiClient.get('adicional'),
                ]);
                if (atual) {
                    aplicarMenu(menu);
                    setAdicionais(catalogo);
                }
            } catch (error) {
                if (atual) {
                    setErroCarga(true);
                    tratarErro(error);
                }
            } finally {
                if (atual) setCarregando(false);
            }
        }
        if (podeEditar) carregar();
        else setCarregando(false);
        return () => { atual = false; };
    }, [data, tentativa, podeEditar]);

    let ocupado = carregando || salvando || copiando;
    let bloqueado = ocupado || erroCarga || dataCarregada !== data || !podeEditar;
    let ativos = adicionais.filter(item => item.ativo);
    let indisponiveis = selecionados.filter(item => !ativos.some(ativo => ativo.id === item.id));

    function editarPreparacao(indice, nome) {
        setPreparacoes(atual => atual.map((item, i) => i === indice ? { ...item, nome } : item));
    }

    function removerPreparacao(indice) {
        setPreparacoes(atual => atual.filter((_, i) => i !== indice));
    }

    function moverPreparacao(indice, destino) {
        setPreparacoes(atual => {
            let nova = [...atual];
            [nova[indice], nova[destino]] = [nova[destino], nova[indice]];
            return nova;
        });
    }

    function selecionarAdicional(item, marcado) {
        setSelecionados(atual => marcado ? [...atual, { id: item.id, nome: item.nome, preco: item.preco }] : atual.filter(adicional => adicional.id !== item.id));
    }

    async function salvar() {
        if (bloqueado) return;
        if (preparacoes.some(item => !item.nome.trim())) {
            toast.error('Preencha o nome de todas as preparações ou remova as linhas vazias.');
            return;
        }
        setSalvando(true);
        try {
            let menu = await ApiClient.put('cardapio', { data, preparacoes, adicionais: selecionados.map(item => item.id) });
            aplicarMenu(menu);
            toast.success('Cardápio salvo para essa data.');
        } catch (error) {
            tratarErro(error);
        } finally {
            setSalvando(false);
        }
    }

    async function reutilizar() {
        if (bloqueado) return;
        if (!dataOrigem) {
            toast.error('Escolha a data do cardápio que quer reutilizar.');
            return;
        }
        if (dataOrigem === data) {
            toast.error('Escolha uma data de origem diferente da data de destino.');
            return;
        }
        if ((existe || preparacoes.length || selecionados.length) && !window.confirm(`Substituir o cardápio de ${data} pelo da data ${dataOrigem}? As alterações ainda não salvas também serão substituídas.`)) return;
        setCopiando(true);
        try {
            let menu = await ApiClient.post('cardapio/copiar', { dataOrigem, dataDestino: data });
            aplicarMenu(menu);
            toast.success('Cardápio reutilizado para a data escolhida.');
        } catch (error) {
            tratarErro(error);
        } finally {
            setCopiando(false);
        }
    }

    function renderizarPreparacoes(grupo, titulo, exemplo) {
        let itens = preparacoes.map((item, indice) => ({ ...item, indice })).filter(item => item.grupo === grupo);
        return (
            <section className="page-card mb-4">
                <div className="d-flex justify-content-between align-items-center px-4 py-3 border-bottom flex-wrap gap-2">
                    <div>
                        <h2 className="h6 mb-1">{titulo}</h2>
                        <p className="small text-secondary mb-0">{exemplo}</p>
                    </div>
                    <button className="btn btn-sm btn-outline-primary" disabled={bloqueado} onClick={() => setPreparacoes(atual => [...atual, { nome: '', grupo }])}>
                        <i className="ti ti-plus me-1" />{grupo ? 'Adicionar opção' : 'Adicionar item fixo'}
                    </button>
                </div>
                {itens.length === 0 ? <div className="text-secondary p-4">{grupo ? 'Ainda não há opções de mistura.' : 'Ainda não há itens fixos.'}</div> : (
                    <div className="p-4 d-flex flex-column gap-3">
                        {itens.map((item, posicao) => (
                            <div key={item.indice}>
                                <label htmlFor={`preparacao-${item.indice}`} className="form-label small text-secondary">{grupo ? `${posicao + 1}ª opção` : `${posicao + 1}. Item fixo`}</label>
                                <div className="d-flex gap-2 flex-wrap">
                                    <input id={`preparacao-${item.indice}`} className="form-control flex-grow-1 w-auto" maxLength={150} value={item.nome} disabled={bloqueado} placeholder="Nome da preparação" onChange={event => editarPreparacao(item.indice, event.target.value)} />
                                    <div className="d-flex gap-1">
                                        <button className="btn btn-light" disabled={bloqueado || posicao === 0} title="Mover para cima" aria-label={`Mover ${item.nome || 'preparação'} para cima`} onClick={() => moverPreparacao(item.indice, itens[posicao - 1].indice)}><i className="ti ti-arrow-up" /></button>
                                        <button className="btn btn-light" disabled={bloqueado || posicao === itens.length - 1} title="Mover para baixo" aria-label={`Mover ${item.nome || 'preparação'} para baixo`} onClick={() => moverPreparacao(item.indice, itens[posicao + 1].indice)}><i className="ti ti-arrow-down" /></button>
                                        <button className="btn btn-light text-danger" disabled={bloqueado} title="Remover preparação" aria-label={`Remover ${item.nome || 'preparação'}`} onClick={() => removerPreparacao(item.indice)}><i className="ti ti-trash" /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        );
    }

    if (!podeEditar) return <div className="alert alert-warning">O cardápio do dia está disponível para administradores e atendentes.</div>;

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <div>
                    <h1 className="fs-3 mb-1">Cardápio do Dia</h1>
                    <p className="text-secondary mb-0">Monte os itens fixos, as opções de mistura e os adicionais para a data escolhida.</p>
                </div>
                <button className="btn btn-primary" onClick={salvar} disabled={bloqueado}><i className="ti ti-device-floppy me-1" />{salvando ? 'Salvando...' : 'Salvar cardápio'}</button>
            </div>
            <section className="page-card p-4 mb-4">
                <div className="row g-3 align-items-end">
                    <div className="col-md-4">
                        <label htmlFor="data-cardapio" className="form-label small">Montar cardápio para</label>
                        <div className="input-group">
                            <input id="data-cardapio" type="date" className="form-control" value={data} disabled={salvando || copiando} onChange={event => setData(event.target.value)} />
                            <button className="btn btn-light" onClick={() => setData(dataLocal())} disabled={salvando || copiando}>Hoje</button>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <label htmlFor="origem-cardapio" className="form-label small">Reutilizar cardápio de</label>
                        <input id="origem-cardapio" type="date" className="form-control" value={dataOrigem} disabled={ocupado} onChange={event => setDataOrigem(event.target.value)} />
                    </div>
                    <div className="col-md-auto">
                        <button className="btn btn-outline-primary" onClick={reutilizar} disabled={bloqueado}><i className="ti ti-copy me-1" />{copiando ? 'Aplicando...' : 'Reutilizar nesta data'}</button>
                    </div>
                    <div className="col-12 small text-secondary">{carregando ? 'Carregando cardápio...' : erroCarga ? 'Não foi possível carregar esta data.' : existe ? 'Cardápio salvo para esta data' : 'Ainda não há cardápio salvo para esta data'}</div>
                </div>
            </section>
            {erroCarga && <div className="alert alert-danger">Não foi possível carregar o cardápio e os adicionais. <button className="btn btn-sm btn-outline-danger" disabled={ocupado} onClick={() => setTentativa(atual => atual + 1)}>Tentar novamente</button></div>}
            {!carregando && !erroCarga && dataCarregada === data && <>
                {renderizarPreparacoes(null, 'Itens fixos do dia', 'Ex.: arroz, feijão e salada.')}
                {renderizarPreparacoes('Mistura', 'Mistura (opções)', 'Cadastre as alternativas na ordem desejada. Ex.: carne, frango e ovo.')}
                <section className="page-card p-4 mb-4">
                    <h2 className="h6 mb-1">Adicionais do dia</h2>
                    <p className="small text-secondary mb-3">Selecione os adicionais disponíveis nesta data. Os preços vêm do cadastro de adicionais.</p>
                    {ativos.length === 0 && <p className="text-secondary mb-0">Nenhum adicional ativo cadastrado.</p>}
                    <div className="row g-3">
                        {ativos.map(item => <div className="col-md-6 col-lg-4" key={item.id}>
                            <div className="form-check">
                                <input id={`adicional-${item.id}`} type="checkbox" className="form-check-input" disabled={bloqueado} checked={selecionados.some(selecionado => selecionado.id === item.id)} onChange={event => selecionarAdicional(item, event.target.checked)} />
                                <label className="form-check-label" htmlFor={`adicional-${item.id}`}>{item.nome} <span className="text-secondary">— {formatarPreco(item.preco)}</span></label>
                            </div>
                        </div>)}
                    </div>
                    {indisponiveis.length > 0 && <div className="alert alert-warning mt-3 mb-0">
                        <p>Há adicionais deste cardápio que estão inativos ou indisponíveis. Remova-os da seleção ou reative seus cadastros antes de salvar.</p>
                        {indisponiveis.map(item => <div key={item.id} className="d-flex gap-3 align-items-center mt-2">
                            <span>{item.nome} — {formatarPreco(item.preco)}</span>
                            <button className="btn btn-sm btn-outline-danger" disabled={bloqueado} onClick={() => selecionarAdicional(item, false)}>Remover da seleção</button>
                        </div>)}
                    </div>}
                </section>
                <div className="d-flex justify-content-end"><button className="btn btn-primary" onClick={salvar} disabled={bloqueado}>{salvando ? 'Salvando...' : 'Salvar cardápio'}</button></div>
            </>}
        </div>
    );
}
