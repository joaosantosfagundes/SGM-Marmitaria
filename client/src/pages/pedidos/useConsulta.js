import { useCallback, useEffect, useState } from 'react';
import ApiClient from '../../services/apiClient.js';
import { tratarErro } from './pedidoUtils.js';

export default function useConsulta(endpoint) {
    const [dados, setDados] = useState(null);
    const [carregando, setCarregando] = useState(Boolean(endpoint));
    const [erro, setErro] = useState('');
    const [tentativa, setTentativa] = useState(0);
    const recarregar = useCallback(() => setTentativa(atual => atual + 1), []);

    useEffect(() => {
        let atual = true;
        setDados(null);
        setErro('');
        setCarregando(Boolean(endpoint));
        if (endpoint) {
            ApiClient.get(endpoint).then(resposta => {
                if (atual) setDados(resposta);
            }).catch(error => {
                if (atual) setErro(tratarErro(error));
            }).finally(() => {
                if (atual) setCarregando(false);
            });
        }
        return () => { atual = false; };
    }, [endpoint, tentativa]);

    return { dados, carregando, erro, recarregar };
}
