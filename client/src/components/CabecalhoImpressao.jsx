import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { NOME_ESTABELECIMENTO, SUBTITULO } from '../lib/estabelecimento.js';
import '../styles/impressao.scss';

export default function CabecalhoImpressao({ titulo, periodo, nomeArquivo }) {
    const { usuario } = useAuth();
    const [emitidoEm, setEmitidoEm] = useState(null);

    useEffect(() => {
        let tituloAnterior;
        function antesDeImprimir() {
            if (tituloAnterior === undefined) tituloAnterior = document.title;
            document.title = nomeArquivo;
            // O navegador monta a impressão assim que o evento termina.
            flushSync(() => setEmitidoEm(new Date()));
        }
        function depoisDeImprimir() {
            if (tituloAnterior !== undefined) document.title = tituloAnterior;
            tituloAnterior = undefined;
            setEmitidoEm(null);
        }
        window.addEventListener('beforeprint', antesDeImprimir);
        window.addEventListener('afterprint', depoisDeImprimir);
        return () => {
            window.removeEventListener('beforeprint', antesDeImprimir);
            window.removeEventListener('afterprint', depoisDeImprimir);
            if (tituloAnterior !== undefined) document.title = tituloAnterior;
        };
    }, [nomeArquivo]);

    const nomeRodape = JSON.stringify(NOME_ESTABELECIMENTO.replace(/[\r\n\f]/g, ' '));
    return <>
        <style media="print">{`@page relatorio {
            @bottom-left { content: ${nomeRodape}; font: 8pt Arial, sans-serif; color: #333; }
        }`}</style>
        <header className="cabecalho-impressao">
            <div className="cabecalho-impressao-identidade">
                <strong>{NOME_ESTABELECIMENTO}</strong>
                <p>{SUBTITULO}</p>
            </div>
            <div className="cabecalho-impressao-documento">
                <h1>{titulo}</h1>
                {periodo && <p>{periodo}</p>}
                {emitidoEm && <p>
                    Emitido em {emitidoEm.toLocaleDateString('pt-BR')} às{' '}
                    {emitidoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}{' '}
                    por {usuario?.nome || 'Usuário'} ({usuario?.perfil || '—'})
                </p>}
            </div>
        </header>
    </>;
}
