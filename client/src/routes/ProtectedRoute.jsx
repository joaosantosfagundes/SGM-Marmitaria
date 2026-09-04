import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Uso: <ProtectedRoute perfis={['ADMIN']}><Pagina /></ProtectedRoute>
// Sem a prop "perfis", só exige estar logado (qualquer perfil).
export default function ProtectedRoute({ children, perfis }) {
    const { usuario, carregando } = useAuth();

    if (carregando) return <p>Carregando...</p>;
    if (!usuario) return <Navigate to="/login" replace />;
    if (perfis && !perfis.includes(usuario.perfil)) return <Navigate to="/" replace />;

    return children;
}
