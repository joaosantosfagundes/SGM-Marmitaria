import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import ApiClient from '../../services/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';

const FORM_VAZIO = { nome: '', preco: '' };

function formatarPreco(valor) {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function tratarErro(error) {
    console.error(error);
    if (!error?.status) toast.error('Não foi possível comunicar com o servidor. Tente novamente.');
}

export default function AdicionaisPage() {
    const confirmar = useConfirm();
    const { usuario } = useAuth();
    const podeEditar = usuario?.perfil === 'ADMIN';
    const [adicionais, setAdicionais] = useState([]);
    const [busca, setBusca] = useState('');
    const [carregando, setCarregando] = useState(true);
    const [erroCarga, setErroCarga] = useState(false);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [form, setForm] = useState(FORM_VAZIO);
    const [salvando, setSalvando] = useState(false);
    const [alterando, setAlterando] = useState(false);

    async function carregar() {
        setCarregando(true);
        setErroCarga(false);
        try {
            let dados = await ApiClient.get('adicional');
            setAdicionais(dados);
        } catch (error) {
            setErroCarga(true);
            tratarErro(error);
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => { carregar(); }, []);

    function abrirNovo() {
        setEditandoId(null);
        setForm(FORM_VAZIO);
        setMostrarForm(true);
    }

    function abrirEdicao(adicional) {
        setEditandoId(adicional.id);
        setForm({ nome: adicional.nome, preco: adicional.preco });
        setMostrarForm(true);
    }

    function fecharForm() {
        setMostrarForm(false);
        setEditandoId(null);
        setForm(FORM_VAZIO);
    }

    async function handleSubmit(event) {
        event.preventDefault();
        let preco = Number(form.preco);
        if (String(form.preco).trim() === '' || !Number.isFinite(preco) || preco < 0.01) {
            toast.error('O preço do adicional deve ser maior que zero (mínimo R$ 0,01).');
            return;
        }
        setSalvando(true);
        let corpo = { nome: form.nome, preco };
        try {
            if (editandoId) {
                await ApiClient.put(`adicional/${editandoId}`, corpo);
                toast.success('Adicional atualizado!');
            } else {
                await ApiClient.post('adicional', corpo);
                toast.success('Adicional cadastrado!');
            }
            fecharForm();
            await carregar();
        } catch (error) {
            tratarErro(error);
        } finally {
            setSalvando(false);
        }
    }

    async function alterarStatus(adicional) {
        if (adicional.ativo && !(await confirmar({
            titulo: 'Desativar adicional', mensagem: `Desativar o adicional "${adicional.nome}"?`,
            textoConfirmar: 'Desativar', tipo: 'padrao',
        }))) return;
        setAlterando(true);
        try {
            if (adicional.ativo) await ApiClient.delete(`adicional/${adicional.id}`);
            else await ApiClient.put(`adicional/${adicional.id}`, { ativo: true });
            toast.success(adicional.ativo ? 'Adicional desativado.' : 'Adicional reativado.');
            await carregar();
        } catch (error) {
            tratarErro(error);
        } finally {
            setAlterando(false);
        }
    }

    async function excluir(adicional) {
        if (!(await confirmar({
            titulo: 'Excluir adicional definitivamente',
            mensagem: `Excluir "${adicional.nome}" definitivamente? Essa ação não pode ser desfeita.`,
            textoConfirmar: 'Excluir definitivamente', tipo: 'perigo',
        }))) return;
        setAlterando(true);
        try {
            await ApiClient.delete(`adicional/${adicional.id}/excluir`);
            if (editandoId === adicional.id) fecharForm();
            toast.success('Adicional excluído.');
            await carregar();
        } catch (error) {
            tratarErro(error);
        } finally {
            setAlterando(false);
        }
    }

    let filtrados = adicionais.filter(item => item.nome.toLocaleLowerCase('pt-BR').includes(busca.trim().toLocaleLowerCase('pt-BR')));
    let ocupado = carregando || salvando || alterando;

    return (
        <div>
            <div className="page-header d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <div>
                    <h1 className="fs-3 mb-1">Adicionais</h1>
                    <p className="text-secondary mb-0">Cadastre os adicionais e seus preços para usar no cardápio do dia.</p>
                </div>
                {podeEditar && !mostrarForm && <button data-tour="adicionais-novo" className="btn btn-primary" disabled={ocupado} onClick={abrirNovo}>
                    <i className="ti ti-plus me-1" />Novo adicional
                </button>}
            </div>
            {podeEditar && mostrarForm && <section className="page-card p-4 mb-4">
                <h2 className="h6 mb-3" id="titulo-adicional">{editandoId ? 'Editar adicional' : 'Novo adicional'}</h2>
                <form onSubmit={handleSubmit}>
                    <fieldset disabled={salvando}>
                        <div className="row g-3">
                            <div className="col-md-8">
                                <label htmlFor="nome-adicional" className="form-label small">Nome</label>
                                <input id="nome-adicional" className="form-control" maxLength={100} required value={form.nome} onChange={event => setForm({ ...form, nome: event.target.value })} />
                            </div>
                            <div className="col-md-4">
                                <label htmlFor="preco-adicional" className="form-label small">Preço (R$)</label>
                                <input id="preco-adicional" type="number" min="0.01" max="99999999.99" step="0.01" className="form-control" required value={form.preco} onChange={event => setForm({ ...form, preco: event.target.value })}
                                    onInvalid={event => {
                                        if (event.target.validity.valueMissing || event.target.validity.rangeUnderflow) {
                                            toast.error('O preço do adicional deve ser maior que zero (mínimo R$ 0,01).');
                                        }
                                    }} />
                            </div>
                        </div>
                    </fieldset>
                    <div className="d-flex flex-wrap justify-content-end gap-2 mt-3">
                        <button type="button" className="btn btn-danger" disabled={salvando} onClick={fecharForm}>Cancelar</button>
                        <button type="submit" className="btn btn-success" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
                    </div>
                </form>
            </section>}
            <section className="page-card">
                <div className="p-4 border-bottom">
                    <label htmlFor="busca-adicional" className="form-label small">Buscar por nome</label>
                    <input id="busca-adicional" className="form-control" value={busca} onChange={event => setBusca(event.target.value)} placeholder="Ex.: ovo extra" />
                </div>
                {erroCarga && <div className="alert alert-danger m-3">Não foi possível carregar os adicionais. <button className="btn btn-sm btn-outline-danger" onClick={carregar}>Tentar novamente</button></div>}
                <div data-tour="adicionais-lista" className="table-responsive">
                    <table className="table table-hover mb-0 align-middle">
                        <thead><tr><th className="ps-4">Nome</th><th>Preço</th><th>Status</th>{podeEditar && <th className="text-end pe-4">Ações</th>}</tr></thead>
                        <tbody>
                            {carregando && <tr><td colSpan={podeEditar ? 4 : 3} className="text-center text-secondary py-4">Carregando...</td></tr>}
                            {!carregando && !erroCarga && filtrados.length === 0 && <tr><td colSpan={podeEditar ? 4 : 3} className="text-center text-secondary py-4">Nenhum adicional encontrado.</td></tr>}
                            {!carregando && filtrados.map(item => <tr key={item.id}>
                                <td className="ps-4">{item.nome}</td><td>{formatarPreco(item.preco)}</td>
                                <td><span className={`badge ${item.ativo ? 'text-bg-success' : 'text-bg-secondary'}`}>{item.ativo ? 'Ativo' : 'Inativo'}</span></td>
                                {podeEditar && <td data-tour="adicionais-acoes" className="text-end pe-4 text-nowrap">
                                    <button className="btn btn-sm btn-light me-2" disabled={ocupado} title="Editar" aria-label={`Editar ${item.nome}`} onClick={() => abrirEdicao(item)}><i className="ti ti-edit" /></button>
                                    <button className={`btn btn-sm btn-light me-2 ${item.ativo ? 'text-warning' : 'text-success'}`} disabled={ocupado} title={item.ativo ? 'Desativar' : 'Reativar'} aria-label={`${item.ativo ? 'Desativar' : 'Reativar'} ${item.nome}`} onClick={() => alterarStatus(item)}><i className={`ti ${item.ativo ? 'ti-ban' : 'ti-rotate-clockwise'}`} /></button>
                                    <button className="btn btn-sm btn-light text-danger" disabled={ocupado} title="Excluir definitivamente" aria-label={`Excluir definitivamente ${item.nome}`} onClick={() => excluir(item)}><i className="ti ti-trash" /></button>
                                </td>}
                            </tr>)}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
