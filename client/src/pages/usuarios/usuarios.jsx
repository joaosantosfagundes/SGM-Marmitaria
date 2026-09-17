import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import ApiClient from '../../services/apiClient.js';

const PERFIS = ['ADMIN', 'ATENDENTE', 'COZINHA'];
const FORM_VAZIO = { nome: '', email: '', senha: '', perfil: 'ATENDENTE' };

export default function UsuariosPage() {
    const [usuarios, setUsuarios] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [form, setForm] = useState(FORM_VAZIO);
    const [salvando, setSalvando] = useState(false);

    async function carregar() {
        setCarregando(true);
        try {
            let dados = await ApiClient.get('usuario');
            setUsuarios(dados);
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

    function abrirEdicao(usuario) {
        setEditandoId(usuario.id);
        setForm({ nome: usuario.nome, email: usuario.email, senha: '', perfil: usuario.perfil });
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

        try {
            if (editandoId) {
                await ApiClient.put(`usuario/${editandoId}`, {
                    nome: form.nome,
                    email: form.email,
                    perfil: form.perfil,
                });
                toast.success('Usuário atualizado!');
            } else {
                await ApiClient.post('usuario', form);
                toast.success('Usuário cadastrado!');
            }
            fecharForm();
            carregar();
        } catch {
            // erro já mostrado via toast
        } finally {
            setSalvando(false);
        }
    }

    async function handleInativar(usuario) {
        if (!confirm(`Inativar o usuário "${usuario.nome}"?`)) return;

        try {
            await ApiClient.delete(`usuario/${usuario.id}`);
            toast.success('Usuário inativado.');
            carregar();
        } catch {
            // erro já mostrado via toast
        }
    }

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h1 className="fs-3 mb-1">Usuários</h1>
                    <p className="text-secondary mb-0">Contas de acesso ao sistema (ADMIN, ATENDENTE, COZINHA).</p>
                </div>
                {!mostrarForm && (
                    <button className="btn btn-primary" onClick={abrirNovo}>
                        <i className="ti ti-plus me-1" /> Novo Usuário
                    </button>
                )}
            </div>

            {mostrarForm && (
                <section className="page-card p-4 mb-4">
                    <h2 className="h6 mb-3">{editandoId ? 'Editar usuário' : 'Novo usuário'}</h2>
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
                            <div className="col-md-6">
                                <label className="form-label small">E-mail</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    required
                                />
                            </div>

                            {!editandoId && (
                                <div className="col-md-6">
                                    <label className="form-label small">Senha</label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        value={form.senha}
                                        onChange={(e) => setForm({ ...form, senha: e.target.value })}
                                        minLength={6}
                                        required
                                    />
                                </div>
                            )}

                            <div className="col-md-6">
                                <label className="form-label small">Perfil</label>
                                <select
                                    className="form-select"
                                    value={form.perfil}
                                    onChange={(e) => setForm({ ...form, perfil: e.target.value })}
                                >
                                    {PERFIS.map((p) => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                        </div>

                        {editandoId && (
                            <p className="text-secondary small mt-2 mb-0">
                                Pra trocar a senha, use "Esqueci minha senha" na tela de login.
                            </p>
                        )}

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

            {!carregando && usuarios.length === 0 && (
                <p className="text-secondary text-center py-4">Nenhum usuário cadastrado.</p>
            )}

            <div className="row g-3">
                {usuarios.map((usuario) => {
                    const corPerfil = usuario.perfil === 'ADMIN' ? 'bg-primary'
                        : usuario.perfil === 'ATENDENTE' ? 'bg-info' : 'bg-warning';

                    return (
                        <div key={usuario.id} className="col-md-6 col-lg-4">
                            <div className="page-card p-3 h-100 d-flex flex-column">
                                <div className="d-flex align-items-start gap-3">
                                    <span className={`icon-shape ${corPerfil} text-white rounded-circle fw-bold flex-shrink-0`}>
                                        {usuario.nome.charAt(0).toUpperCase()}
                                    </span>
                                    <div className="flex-grow-1 overflow-hidden">
                                        <div className="fw-semibold text-truncate">{usuario.nome}</div>
                                        <div className="small text-secondary text-truncate">{usuario.email}</div>
                                    </div>
                                </div>

                                <div className="d-flex gap-2 mt-3">
                                    <span className="badge text-bg-light border">{usuario.perfil}</span>
                                    <span className={`badge ${usuario.ativo ? 'text-bg-success' : 'text-bg-secondary'}`}>
                                        {usuario.ativo ? 'Ativo' : 'Inativo'}
                                    </span>
                                </div>

                                <div className="d-flex gap-2 mt-3 pt-3 border-top">
                                    <button className="btn btn-sm btn-light flex-grow-1" onClick={() => abrirEdicao(usuario)}>
                                        <i className="ti ti-edit me-1" /> Editar
                                    </button>
                                    {usuario.ativo && (
                                        <button className="btn btn-sm btn-light text-danger" onClick={() => handleInativar(usuario)}>
                                            <i className="ti ti-trash" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}