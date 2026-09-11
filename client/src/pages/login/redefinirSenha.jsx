import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import ApiClient from '../../services/apiClient.js';

export default function RedefinirSenha() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [novaSenha, setNovaSenha] = useState('');
    const [confirmacao, setConfirmacao] = useState('');
    const [salvando, setSalvando] = useState(false);
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();

        if (novaSenha !== confirmacao) {
            toast.error('As senhas não conferem');
            return;
        }

        setSalvando(true);
        try {
            await ApiClient.post('senha/redefinir-senha', { token, novaSenha });
            toast.success('Senha redefinida! Faça login com a nova senha.');
            navigate('/login');
        } catch {
            // erro já mostrado via toast (ex: link expirado)
        } finally {
            setSalvando(false);
        }
    }

    // Sem token na URL — alguém abriu essa página direto, sem vir do e-mail
    if (!token) {
        return (
            <div className="login-container">
                <div className="login-form page-card p-4 text-center">
                    <i className="ti ti-alert-triangle fs-1 text-warning" />
                    <h2 className="h5 mt-3 mb-2">Link inválido</h2>
                    <p className="text-secondary small">
                        Esse link tá incompleto. Solicite a redefinição de novo.
                    </p>
                    <Link to="/esqueci-senha" className="btn btn-primary w-100 mt-2">
                        Solicitar novo link
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="login-container">
            <div className="login-form page-card p-4">
                <div className="text-center mb-4">
                    <span className="icon-shape bg-primary text-white rounded-2 mx-auto mb-2" style={{ width: 48, height: 48 }}>
                        <i className="ti ti-lock fs-4" />
                    </span>
                    <h1 className="fs-4 mb-0">Nova senha</h1>
                    <p className="text-secondary small mb-0">Escolha uma senha nova pra sua conta.</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label small">Nova senha</label>
                        <input
                            type="password"
                            className="form-control"
                            value={novaSenha}
                            onChange={(e) => setNovaSenha(e.target.value)}
                            minLength={6}
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="form-label small">Confirmar nova senha</label>
                        <input
                            type="password"
                            className="form-control"
                            value={confirmacao}
                            onChange={(e) => setConfirmacao(e.target.value)}
                            minLength={6}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary w-100" disabled={salvando}>
                        {salvando ? 'Salvando...' : 'Redefinir senha'}
                    </button>
                </form>
            </div>
        </div>
    );
}