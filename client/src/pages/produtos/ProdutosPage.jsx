import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import ApiClient from '../../services/apiClient.js';

const FORM_VAZIO = { nome: '', descricao: '', preco_padrao: '' };

function formatarPreco(valor) {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function ProdutosPage() {
    const [produtos, setProdutos] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [form, setForm] = useState(FORM_VAZIO);
    const [salvando, setSalvando] = useState(false);

    async function carregar() {
        setCarregando(true);
        try {
            let dados = await ApiClient.get('produto');
            setProdutos(dados);
        } catch {
            // erro já mostrado via toast pelo ApiClient
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

    function abrirEdicao(produto) {
        setEditandoId(produto.id);
        setForm({
            nome: produto.nome,
            descricao: produto.descricao ?? '',
            preco_padrao: produto.precoPadrao,
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
            descricao: form.descricao,
            preco_padrao: Number(form.preco_padrao),
        };

        try {
            if (editandoId) {
                await ApiClient.put(`produto/${editandoId}`, corpo);
                toast.success('Produto atualizado!');
            } else {
                await ApiClient.post('produto', corpo);
                toast.success('Produto cadastrado!');
            }
            fecharForm();
            carregar();
        } catch {
            // erro já mostrado via toast
        } finally {
            setSalvando(false);
        }
    }

    async function handleInativar(produto) {
        if (!confirm(`Inativar o produto "${produto.nome}"?`)) return;

        try {
            await ApiClient.delete(`produto/${produto.id}`);
            toast.success('Produto inativado.');
            carregar();
        } catch {
            // erro já mostrado via toast
        }
    }

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h1 className="fs-3 mb-1">Produtos</h1>
                    <p className="text-secondary mb-0">Itens vendáveis com preço fixo.</p>
                </div>
                {!mostrarForm && (
                    <button className="btn btn-primary" onClick={abrirNovo}>
                        <i className="ti ti-plus me-1" /> Novo Produto
                    </button>
                )}
            </div>

            {mostrarForm && (
                <section className="page-card p-4 mb-4">
                    <h2 className="h6 mb-3">{editandoId ? 'Editar produto' : 'Novo produto'}</h2>
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
                                <label className="form-label small">Preço (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="form-control"
                                    value={form.preco_padrao}
                                    onChange={(e) => setForm({ ...form, preco_padrao: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="col-12">
                                <label className="form-label small">Descrição</label>
                                <input
                                    className="form-control"
                                    value={form.descricao}
                                    onChange={(e) => setForm({ ...form, descricao: e.target.value })}
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
                                <th>Descrição</th>
                                <th>Preço</th>
                                <th>Status</th>
                                <th className="text-end pe-4">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {carregando && (
                                <tr><td colSpan={5} className="text-center text-secondary py-4">Carregando...</td></tr>
                            )}

                            {!carregando && produtos.length === 0 && (
                                <tr><td colSpan={5} className="text-center text-secondary py-4">Nenhum produto cadastrado.</td></tr>
                            )}

                            {produtos.map((produto) => (
                                <tr key={produto.id}>
                                    <td className="ps-4">{produto.nome}</td>
                                    <td className="text-secondary">{produto.descricao || '—'}</td>
                                    <td>{formatarPreco(produto.precoPadrao)}</td>
                                    <td>
                                        <span className={`badge ${produto.ativo ? 'text-bg-success' : 'text-bg-secondary'}`}>
                                            {produto.ativo ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="text-end pe-4">
                                        <button className="btn btn-sm btn-light me-2" onClick={() => abrirEdicao(produto)}>
                                            <i className="ti ti-edit" />
                                        </button>
                                        {produto.ativo && (
                                            <button className="btn btn-sm btn-light text-danger" onClick={() => handleInativar(produto)}>
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
