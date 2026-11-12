import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import AuthLayout from './AuthLayout.jsx';

export default function Login() {
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            await login(email, senha);
            navigate('/');
        } catch {
            // erro já mostrado via toast no ApiClient
        }
    }

    return (
        <AuthLayout>
            <form onSubmit={handleSubmit}>
                <div className="auth-form-heading">
                    <h1>Entrar no SGM</h1>
                    <p className="text-secondary small mb-0">Sistema de Gestão para Marmitaria</p>
                </div>

                <div className="mb-3">
                    <label className="form-label small">E-mail</label>
                    <input
                        type="email"
                        className="form-control"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className="mb-3">
                    <label className="form-label small">Senha</label>
                    <input
                        type="password"
                        className="form-control"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        required
                    />
                </div>

                <div className="text-end mb-3">
                    <Link to="/esqueci-senha" className="small">
                        Esqueci minha senha
                    </Link>
                </div>
                <button type="submit" className="btn btn-primary w-100">Entrar</button>
            </form>
        </AuthLayout>
    );
}
