import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import ApiClient from '../../services/apiClient.js';

const FORM_VAZIO = {
    nome: '',
    id_categoria: '',
    id_unidade: '',
    classificacao: 'INSUMO',
    preco_custo: '',
    preco_venda: '0',
    estoque_minimo: '0',
};

function formatarPreco(valor) {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function InsumosPage() {
    const [insumos, setInsumos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [unidades, setUnidades] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [form, setForm] = useState(FORM_VAZIO);
    const [salvando, setSalvando] = useState(false);

    async function carregar() {
        setCarregando(true);
        try {
            let [listaInsumos, listaCategorias, listaUnidades] = await Promise.all([
                ApiClient.get('insumo'),
                ApiClient.get('categoria'),
                ApiClient.get('unidade'),
            ]);
            setInsumos(listaInsumos);
            setCategorias(listaCategorias);
            setUnidades(listaUnidades);
        } catch {
            // erro já mostrado via toast
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

    function abrirEdicao(insumo) {
        setEditandoId(insumo.id);
        setForm({
            nome: insumo.nome,
            id_categoria: insumo.idCategoria,
            id_unidade: insumo.idUnidade,
            classificacao: insumo.classificacao,
            preco_custo: insumo.precoCusto,
            preco_venda: insumo.precoVenda,
            estoque_minimo: insumo.estoqueMinimo,
        });
        setMostrarForm(true);
    }

    function fecharForm() {
        setMostrarForm(false);
        setEditandoId(null);
        setForm(FORM_VAZIO);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSalvando(true);

        let corpo = {
            nome: form.nome,
            id_categoria: Number(form.id_categoria),
            id_unidade: Number(form.id_unidade),
            classificacao: form.classificacao,
            preco_custo: Number(form.preco_custo),
            preco_venda: Number(form.preco_venda),
            estoque_minimo: Number(form.estoque_minimo),
        };

        try {
            if (editandoId) {
                await ApiClient.put(`insumo/${editandoId}`, corpo);
                toast.success('Insumo atualizado!');
            } else {
                await ApiClient.post('insumo', corpo);
                toast.success('Insumo cadastrado!');
            }
            fecharForm();
            carregar();
        } catch {
            // erro já mostrado via toast
        } finally {
            setSalvando(false);
        }
    }

    async function handleInativar(insumo) {
        if (!confirm(`Inativar o insumo "${insumo.nome}"?`)) return;

        try {
            await ApiClient.delete(`insumo/${insumo.id}`);
            toast.success('Insumo inativado.');
            carregar();
        } catch {
            // erro já mostrado via toast
        }
    }

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h1 className="fs-3 mb-1">Insumos</h1>
                    <p className="text-secondary mb-0">Matérias-primas usadas na produção.</p>
                </div>
                {!mostrarForm && (
                    <button className="btn btn-primary" onClick={abrirNovo}>
                        <i className="ti ti-plus me-1" /> Novo Insumo
                    </button>
                )}
            </div>

            {mostrarForm && (
                <section className="page-card p-4 mb-4">
                    <h2 className="h6 mb-3">{editandoId ? 'Editar insumo' : 'Novo insumo'}</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <label className="form-label small">Nome</label>
                                <input
                                    className="form-control"
                                    value={form.nome}
                                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="col-md-3">
                                <label className="form-label small">Categoria</label>
                                <select
                                    className="form-select"
                                    value={form.id_categoria}
                                    onChange={(e) => setForm({ ...form, id_categoria: e.target.value })}
                                    required
                                >
                                    <option value="" disabled>Selecione...</option>
                                    {categorias.map((c) => (
                                        <option key={c.id} value={c.id}>{c.nome}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-md-3">
                                <label className="form-label small">Unidade</label>
                                <select
                                    className="form-select"
                                    value={form.id_unidade}
                                    onChange={(e) => setForm({ ...form, id_unidade: e.target.value })}
                                    required
                                >
                                    <option value="" disabled>Selecione...</option>
                                    {unidades.map((u) => (
                                        <option key={u.id} value={u.id}>{u.nome} ({u.sigla})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-md-3">
                                <label className="form-label small">Classificação</label>
                                <select
                                    className="form-select"
                                    value={form.classificacao}
                                    onChange={(e) => setForm({ ...form, classificacao: e.target.value })}
                                >
                                    <option value="INSUMO">Insumo (matéria-prima)</option>
                                    <option value="VENDA_DIRETA">Venda direta</option>
                                </select>
                            </div>

                            <div className="col-md-3">
                                <label className="form-label small">Preço de custo (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="form-control"
                                    value={form.preco_custo}
                                    onChange={(e) => setForm({ ...form, preco_custo: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="col-md-3">
                                <label className="form-label small">Preço de venda (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="form-control"
                                    value={form.preco_venda}
                                    onChange={(e) => setForm({ ...form, preco_venda: e.target.value })}
                                />
                                <div className="form-text">Só se aplica pra "Venda direta" (ex: refrigerante).</div>
                            </div>

                            <div className="col-md-3">
                                <label className="form-label small">Estoque mínimo</label>
                                <input
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    className="form-control"
                                    value={form.estoque_minimo}
                                    onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="d-flex gap-2 mt-3">
                            <button type="submit" className="btn btn-primary" disabled={salvando}>
                                {salvando ? 'Salvando...' : 'Salvar'}
                            </button>
                            <button type="button" className="btn btn-light" onClick={fecharForm}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </section>
            )}

            <section className="page-card">
                <div className="table-responsive">
                    <table className="table table-hover mb-0 align-middle">
                        <thead>
                            <tr>
                                <th className="ps-4">Nome</th>
                                <th>Categoria</th>
                                <th>Unidade</th>
                                <th>Classificação</th>
                                <th>Custo</th>
                                <th>Status</th>
                                <th className="text-end pe-4">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {carregando && (
                                <tr><td colSpan={7} className="text-center text-secondary py-4">Carregando...</td></tr>
                            )}

                            {!carregando && insumos.length === 0 && (
                                <tr><td colSpan={7} className="text-center text-secondary py-4">Nenhum insumo cadastrado.</td></tr>
                            )}

                            {insumos.map((insumo) => (
                                <tr key={insumo.id}>
                                    <td className="ps-4">{insumo.nome}</td>
                                    <td className="text-secondary">{insumo.nomeCategoria}</td>
                                    <td className="text-secondary">{insumo.siglaUnidade}</td>
                                    <td>
                                        <span className="badge text-bg-light border">
                                            {insumo.classificacao === 'INSUMO' ? 'Matéria-prima' : 'Venda direta'}
                                        </span>
                                    </td>
                                    <td>{formatarPreco(insumo.precoCusto)}</td>
                                    <td>
                                        <span className={`badge ${insumo.ativo ? 'text-bg-success' : 'text-bg-secondary'}`}>
                                            {insumo.ativo ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="text-end pe-4">
                                        <button className="btn btn-sm btn-light me-2" onClick={() => abrirEdicao(insumo)}>
                                            <i className="ti ti-edit" />
                                        </button>
                                        {insumo.ativo && (
                                            <button className="btn btn-sm btn-light text-danger" onClick={() => handleInativar(insumo)}>
                                                <i className="ti ti-trash" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
