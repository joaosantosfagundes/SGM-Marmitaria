import { useState } from 'react';
import { Link } from 'react-router-dom';
import ApiClient from '../../services/apiClient.js';

export default function EsqueciSenha() {
    const [email, setEmail] = useState('');
    const [enviado, setEnviado] = useState(false);
    const [enviando, setEnviando] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setEnviando(true);
        try {
            await ApiClient.post('senha/esqueci-senha', { email });
            // Sempre mostra sucesso, mesmo se o e-mail não existir (mesma lógica do backend:
            // não dá pra usar essa tela pra descobrir quais e-mails estão cadastrados).
            setEnviado(true);
        } catch {
            // erro já mostrado via toast
        } finally {
            setEnviando(false);
        }
    }

    return (
        <div className="login-container">
            <div className="login-form page-card p-4">
                {!enviado ? (
                    <>
                        <div className="text-center mb-4">
                            <span className="icon-shape bg-primary text-white rounded-2 mx-auto mb-2" style={{ width: 48, height: 48 }}>
                                <i className="ti ti-lock-question fs-4" />
                            </span>
                            <h1 className="fs-4 mb-0">Esqueci minha senha</h1>
                            <p className="text-secondary small mb-0">
                                Informe seu e-mail e enviaremos um link de redefinição.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label className="form-label small">E-mail</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <button type="submit" className="btn btn-primary w-100" disabled={enviando}>
                                {enviando ? 'Enviando...' : 'Enviar link de redefinição'}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="text-center">
                        <i className="ti ti-mail-check fs-1 text-success" />
                        <h2 className="h5 mt-3 mb-2">Verifique seu e-mail</h2>
                        <p className="text-secondary small">
                            Se <strong>{email}</strong> estiver cadastrado, você vai receber um link
                            pra redefinir sua senha. Ele expira em 1 hora.
                        </p>
                    </div>
                )}

                <div className="text-center mt-3">
                    <Link to="/login" className="small text-secondary">
                        <i className="ti ti-arrow-left me-1" /> Voltar pro login
                    </Link>
                </div>
            </div>
        </div>
    );
}