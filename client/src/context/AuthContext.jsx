import { createContext, useContext, useEffect, useState } from 'react';
import ApiClient from '../services/apiClient.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = useState(null);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        ApiClient.get('login/usuario', { silent: true })
            .then(setUsuario)
            .catch(() => setUsuario(null))
            .finally(() => setCarregando(false));
    }, []);

    async function login(email, senha) {
        let resposta = await ApiClient.post('login', { email, senha });
        setUsuario(resposta.usuario);
        return resposta.usuario;
    }

    async function logout() {
        await ApiClient.post('login/logout', {});
        setUsuario(null);
    }

    return (
        <AuthContext.Provider value={{ usuario, carregando, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
