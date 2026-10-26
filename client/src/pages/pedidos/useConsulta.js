import { useCallback, useEffect, useRef, useState } from 'react';
import ApiClient from '../../services/apiClient.js';
import { tratarErro } from './pedidoUtils.js';
import { dataLocal } from '../../lib/dataLocal.js';

export default function useConsulta(endpoint, { atualizarAutomaticamente = false, pausada = false, dataAtualizacao = null } = {}) {
    const [dados, setDados] = useState(null);
    const [carregando, setCarregando] = useState(Boolean(endpoint));
    const [erro, setErro] = useState('');
    const [tentativa, setTentativa] = useState(0);
    const [atualizadoEm, setAtualizadoEm] = useState(null);
    const requisicaoRef = useRef(Promise.resolve());
    const ocupadaRef = useRef(false);
    const recarregar = useCallback(() => setTentativa(atual => atual + 1), []);

    useEffect(() => {
        let atual = true;
        setDados(null);
        setErro('');
        setCarregando(Boolean(endpoint));
        setAtualizadoEm(null);
        // Aguarda a chamada anterior, inclusive ao trocar filtros ou atualizar manualmente.
        let anterior = requisicaoRef.current;
        requisicaoRef.current = (async () => {
            await anterior;
            if (!atual || !endpoint) return;
            ocupadaRef.current = true;
            try {
                let resposta = await ApiClient.get(endpoint);
                if (atual) { setDados(resposta); setAtualizadoEm(new Date()); }
            } catch (error) {
                let mensagem = tratarErro(error);
                if (atual) setErro(mensagem);
            } finally {
                ocupadaRef.current = false;
                if (atual) setCarregando(false);
            }
        })();
        return () => { atual = false; };
    }, [endpoint, tentativa]);

    useEffect(() => {
        if (!atualizarAutomaticamente || pausada || !endpoint) return;
        let intervalo = window.setInterval(() => {
            if (dataAtualizacao && dataAtualizacao !== dataLocal()) return;
            if (!document.hidden && !document.querySelector('[role="dialog"]') && !ocupadaRef.current) recarregar();
        }, 30000);
        return () => window.clearInterval(intervalo);
    }, [endpoint, atualizarAutomaticamente, pausada, dataAtualizacao, recarregar]);

    return { dados, carregando, erro, recarregar, atualizadoEm };
}
