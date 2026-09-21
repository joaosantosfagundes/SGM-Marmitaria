import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import ApiClient from '../../services/apiClient.js';

const FORM_VAZIO = { nome: '', telefone: '' };

export default function ClientesPage() {
    const [clientes, setClientes] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [form, setForm] = useState(FORM_VAZIO);
    const [salvando, setSalvando] = useState(false);

    async function carregar() {
        setCarregando(true);
        try {
            let dados = await ApiClient.get('cliente');
            setClientes(dados);
        } catch {
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

    function abrirEdicao(cliente) {
        setEditandoId(cliente.id);
        setForm({ nome: cliente.nome, telefone: cliente.telefone ?? '' });
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

        let corpo = { nome: form.nome, telefone: form.telefone || null };

        try {
            if (editandoId) {
                await ApiClient.put(`cliente/${editandoId}`, corpo);
                toast.success('Cliente atualizado!');
            } else {
                await ApiClient.post('cliente', corpo);
                toast.success('Cliente cadastrado!');
            }
            fecharForm();
            carregar();
        } catch {
        } finally {
            setSalvando(false);
        }
    }

    async function handleInativar(cliente) {
        if (!confirm(`Inativar o cliente "${cliente.nome}"?`)) return;

        try {
            await ApiClient.delete(`cliente/${cliente.id}`);
            toast.success('Cliente inativado.');
            carregar();
        } catch {
        }
    }

    async function handleExcluir(cliente) {
        if (!confirm(`Excluir "${cliente.nome}" de vez? Essa ação NÃO pode ser desfeita.`)) return;

        try {
            await ApiClient.delete(`cliente/${cliente.id}/excluir`);
            toast.success('Cliente excluído.');
            carregar();
        } catch {
        }
    }

    async function handleReativar(cliente) {
        try {
            await ApiClient.put(`cliente/${cliente.id}`, { ativo: true });
            toast.success('Cliente reativado.');
            carregar();
        } catch {
        }
    }

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h1 className="fs-3 mb-1">Clientes</h1>
                    <p className="text-secondary mb-0">Cadastro de clientes (usado no fiado).</p>
                </div>
                {!mostrarForm && (
                    <button className="btn btn-primary" onClick={abrirNovo}>
                        <i className="ti ti-plus me-1" /> Novo Cliente
                    </button>
                )}
            </div>

            {mostrarForm && (
                <section className="page-card p-4 mb-4">
                    <h2 className="h6 mb-3">{editandoId ? 'Editar cliente' : 'Novo cliente'}</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="row g-3">
                            <div className="col-md-7">
                                <label className="form-label small">Nome</label>
                                <input
                                    className="form-control"
                                    value={form.nome}
                                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="col-md-5">
                                <label className="form-label small">Telefone</label>
                                <input
                                    className="form-control"
                                    placeholder="(opcional)"
                                    value={form.telefone}
                                    onChange={(e) => setForm({ ...form, telefone: e.target.value })}
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

            {carregando && <p className="text-secondary text-center py-4">Carregando...</p>}

            {!carregando && clientes.length === 0 && (
                <p className="text-secondary text-center py-4">Nenhum cliente cadastrado.</p>
            )}

            <div className="row g-3">
                {clientes.map((cliente) => (
                    <div key={cliente.id} className="col-md-6 col-lg-4">
                        <div className="page-card p-3 h-100 d-flex flex-column">
                            <div className="d-flex align-items-start gap-3">
                                <span className="icon-shape bg-primary text-white rounded-circle fw-bold flex-shrink-0">
                                    {cliente.nome.charAt(0).toUpperCase()}
                                </span>
                                <div className="flex-grow-1 overflow-hidden">
                                    <div className="fw-semibold text-truncate">{cliente.nome}</div>
                                    <div className="small text-secondary">
                                        <i className="ti ti-phone me-1" />
                                        {cliente.telefone || 'Sem telefone'}
                                    </div>
                                </div>
                                <span className={`badge ${cliente.ativo ? 'text-bg-success' : 'text-bg-secondary'}`}>
                                    {cliente.ativo ? 'Ativo' : 'Inativo'}
                                </span>
                            </div>

                            <div className="d-flex gap-2 mt-3 pt-3 border-top">
                                <button className="btn btn-sm btn-light flex-grow-1" onClick={() => abrirEdicao(cliente)}>
                                    <i className="ti ti-edit me-1" /> Editar
                                </button>
                               {cliente.ativo ? (
                                <button className="btn btn-sm btn-light text-warning" title="Desativar" onClick={() => handleInativar(cliente)}>
                                    <i className="ti ti-ban" />
                                </button>
                                ) : (
                                <button className="btn btn-sm btn-light text-success" title="Reativar" onClick={() => handleReativar(cliente)}>
                                    <i className="ti ti-rotate-clockwise" />
                                </button>
                                )}
                                <button className="btn btn-sm btn-light text-danger" title="Excluir definitivamente" onClick={() => handleExcluir(cliente)}>
                                    <i className="ti ti-trash" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}