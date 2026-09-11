import { Routes, Route } from 'react-router-dom';

import Login from './pages/login/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';

import AppShell from './components/AppShell.jsx';
import Dashboard from './components/Dashboard.jsx';
import PlaceholderPage from './components/PlaceholderPage.jsx';
import ProdutosPage from './pages/produtos/ProdutosPage.jsx';
import InsumosPage from './pages/insumos/InsumosPage.jsx';
import EsqueciSenha from './pages/login/esqueciSenha.jsx';
import RedefinirSenha from './pages/login/redefinirSenha.jsx';

import { pages } from './lib/menu.js';

// Telas já implementadas de verdade (substituem o PlaceholderPage nessas rotas).
// Conforme cada RF for ficando pronto, só adiciona uma entrada aqui.
const TELAS_PRONTAS = {
    '/produtos': ProdutosPage,
    '/insumos': InsumosPage,
};

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />

            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <AppShell>
                            <Dashboard />
                        </AppShell>
                    </ProtectedRoute>
                }
            />

            {Object.entries(pages).map(([path, { title, description }]) => {
                const TelaPronta = TELAS_PRONTAS[path];

                return (
                    <Route
                        key={path}
                        path={path}
                        element={
                            <ProtectedRoute>
                                <AppShell>
                                    {TelaPronta
                                        ? <TelaPronta />
                                        : <PlaceholderPage title={title} description={description} />}
                                </AppShell>
                            </ProtectedRoute>
                        }
                    />
                );
            })}

            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />

            <Route path="*" element={<NotFound />} />
        </Routes>
        
    );
}