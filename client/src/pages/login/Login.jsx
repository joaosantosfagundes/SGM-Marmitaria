import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

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
        <div className="login-container">
            <form onSubmit={handleSubmit} className="login-form page-card p-4">
                <div className="text-center mb-4">
                    <span className="icon-shape bg-primary text-white rounded-2 mx-auto mb-2" style={{ width: 48, height: 48 }}>
                        <i className="ti ti-tools-kitchen-2 fs-4" />
                    </span>
                    <h1 className="fs-4 mb-0">SGM</h1>
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

                <div className="mb-4">
                    <label className="form-label small">Senha</label>
                    <input
                        type="password"
                        className="form-control"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        required
                    />
                </div>

                <button type="submit" className="btn btn-primary w-100">Entrar</button>

                <div className="text-center mt-3">
                    <Link to="/esqueci-senha" className="small text-secondary">
                        Esqueci minha senha
                    </Link>
                </div>
            </form>
        </div>
    );
}