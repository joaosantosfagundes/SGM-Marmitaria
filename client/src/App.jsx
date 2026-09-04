import { Routes, Route } from 'react-router-dom';

import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';

import AppShell from './components/AppShell.jsx';
import Dashboard from './components/Dashboard.jsx';
import PlaceholderPage from './components/PlaceholderPage.jsx';
import { pages } from './lib/menu.js';

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

            {/* Gera uma rota pra cada função listada em lib/menu.js.
                Conforme cada RF for implementado (RF_B2, RF_F1, etc), troca o
                <PlaceholderPage> pela tela de verdade — não precisa mexer aqui. */}
            {Object.entries(pages).map(([path, { title, description }]) => (
                <Route
                    key={path}
                    path={path}
                    element={
                        <ProtectedRoute>
                            <AppShell>
                                <PlaceholderPage title={title} description={description} />
                            </AppShell>
                        </ProtectedRoute>
                    }
                />
            ))}

            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}
