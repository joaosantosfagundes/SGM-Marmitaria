import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
    const [dialogo, setDialogo] = useState(null);
    const resolverRef = useRef(null);
    const location = useLocation();

    const responder = useCallback(resultado => {
        let resolver = resolverRef.current;
        resolverRef.current = null;
        setDialogo(null);
        resolver?.(resultado);
    }, []);

    const confirmar = useCallback(({
        titulo = 'Confirmar ação', mensagem = '', textoConfirmar = 'Confirmar', tipo = 'padrao',
    } = {}) => new Promise(resolve => {
        // Evita abrir outra confirmação enquanto já existe uma aguardando resposta.
        if (resolverRef.current) {
            resolve(false);
            return;
        }
        resolverRef.current = resolve;
        setDialogo({ titulo, mensagem, textoConfirmar, tipo });
    }), []);

    // Uma ação da tela anterior não deve continuar depois de uma navegação.
    useEffect(() => { responder(false); }, [location.key, responder]);

    useEffect(() => () => {
        resolverRef.current?.(false);
        resolverRef.current = null;
    }, []);

    return (
        <ConfirmContext.Provider value={confirmar}>
            {children}
            {dialogo && <ConfirmDialog {...dialogo} onResponder={responder} />}
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const confirmar = useContext(ConfirmContext);
    if (!confirmar) throw new Error('useConfirm deve ser usado dentro de ConfirmProvider.');
    return confirmar;
}
