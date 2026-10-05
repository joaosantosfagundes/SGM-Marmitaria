import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import ApiClient from '../../services/apiClient.js';

function dataLocal(date = new Date()) {
    let ano = date.getFullYear();
    let mes = String(date.getMonth() + 1).padStart(2, '0');
    let dia = String(date.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

export default function CardapioPage() {
    const [data, setData] = useState(dataLocal);
    const [dataOrigem, setDataOrigem] = useState('');
    const [preparacoes, setPreparacoes] = useState([]);
    const [existe, setExiste] = useState(false);
    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [copiando, setCopiando] = useState(false);

    async function carregarMenu(dataMenu = data) {
        setCarregando(true);
        try {
            let menu = await ApiClient.get(`cardapio?data=${encodeURIComponent(dataMenu)}`);
            setPreparacoes(menu.preparacoes ?? []);
            setExiste(menu.existe);
        } catch {
            setPreparacoes([]);
            setExiste(false);
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => { carregarMenu(data); }, [data]);

    function editarPreparacao(indice, nome) {
        setPreparacoes(atual => atual.map((item, i) => i === indice ? nome : item));
    }

    function removerPreparacao(indice) {
        setPreparacoes(atual => atual.filter((_, i) => i !== indice));
    }

    async function salvar() {
        setSalvando(true);
        try {
            let menu = await ApiClient.put('cardapio', { data, preparacoes });
            setPreparacoes(menu.preparacoes ?? []);
            setExiste(menu.existe);
            toast.success('Cardápio salvo para essa data.');
        } catch {
        } finally {
            setSalvando(false);
        }
    }

    async function reutilizar() {
        if (!dataOrigem) {
            toast.error('Escolha a data do cardápio que quer reutilizar.');
            return;
        }
        if (existe && !window.confirm(`Já existe um cardápio em ${data}. Quer substituir as preparações dele pelas da data ${dataOrigem}?`)) return;

        setCopiando(true);
        try {
            let menu = await ApiClient.post('cardapio/copiar', { dataOrigem, dataDestino: data });
            setPreparacoes(menu.preparacoes ?? []);
            setExiste(menu.existe);
            toast.success('Preparações reutilizadas para a data escolhida.');
        } catch {
        } finally {
            setCopiando(false);
        }
    }

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <div>
                    <h1 className="fs-3 mb-1">Cardápio do Dia</h1>
                    <p className="text-secondary mb-0">Escreva o que será preparado. Você pode reutilizar outro dia como ponto de partida.</p>
                </div>
                <button className="btn btn-primary" onClick={salvar} disabled={salvando || carregando}>
                    <i className="ti ti-device-floppy me-1" />{salvando ? 'Salvando...' : 'Salvar cardápio'}
                </button>
            </div>

            <section className="page-card p-4 mb-4">
                <div className="row g-3 align-items-end">
                    <div className="col-md-4">
                        <label className="form-label small">Montar cardápio para</label>
                        <div className="input-group">
                            <input type="date" className="form-control" value={data} onChange={event => setData(event.target.value)} />
                            <button className="btn btn-light" type="button" onClick={() => setData(dataLocal())}>Hoje</button>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <label className="form-label small">Reutilizar preparações de</label>
                        <input type="date" className="form-control" value={dataOrigem} onChange={event => setDataOrigem(event.target.value)} />
                    </div>
                    <div className="col-md-auto">
                        <button className="btn btn-outline-primary" onClick={reutilizar} disabled={copiando || carregando}>
                            <i className="ti ti-copy me-1" />{copiando ? 'Aplicando...' : 'Reutilizar nesta data'}
                        </button>
                    </div>
                    <div className="col-md text-md-end small text-secondary">
                        {existe ? 'Cardápio salvo para esta data' : 'Ainda não há cardápio salvo para esta data'}
                    </div>
                </div>
            </section>

            <section className="page-card">
                <div className="d-flex justify-content-between align-items-center px-4 py-3 border-bottom">
                    <div>
                        <h2 className="h6 mb-1">Preparações</h2>
                        <p className="small text-secondary mb-0">Ex.: frango ao molho, arroz, feijão, bife</p>
                    </div>
                    <button className="btn btn-sm btn-light" disabled={carregando}
                        onClick={() => setPreparacoes(atual => [...atual, ''])}>
                        <i className="ti ti-plus me-1" />Adicionar preparação
                    </button>
                </div>

                {carregando ? (
                    <div className="text-center text-secondary py-5">Carregando cardápio...</div>
                ) : preparacoes.length === 0 ? (
                    <div className="text-center text-secondary py-5">Ainda não há preparações. Clique em “Adicionar preparação” para começar.</div>
                ) : (
                    <div className="p-4 d-flex flex-column gap-2">
                        {preparacoes.map((nome, indice) => (
                            <div key={indice} className="d-flex align-items-center gap-2">
                                <span className="text-secondary small" style={{ width: '1.5rem' }}>{indice + 1}.</span>
                                <input className="form-control" type="text" maxLength={150} value={nome}
                                    placeholder="Nome da preparação" onChange={event => editarPreparacao(indice, event.target.value)} />
                                <button className="btn btn-light text-danger" type="button" title="Remover preparação"
                                    onClick={() => removerPreparacao(indice)}>
                                    <i className="ti ti-trash" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="d-flex justify-content-end p-3 border-top">
                    <button className="btn btn-primary" onClick={salvar} disabled={salvando || carregando}>
                        {salvando ? 'Salvando...' : 'Salvar cardápio'}
                    </button>
                </div>
            </section>
        </div>
    );
}
