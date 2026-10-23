import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import ApiClient from '../../services/apiClient.js';
import { formatarDataHora } from './caixaUtils.js';
import ResumoFinanceiro from './ResumoFinanceiro.jsx';

export default function ResumoCaixaHistorico({ caixa, onFechar }) {
    const tituloRef = useRef(null);
    const [resumo, setResumo] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState('');
    const [tentativa, setTentativa] = useState(0);

    useEffect(() => {
        tituloRef.current?.focus({ preventScroll: true });
        tituloRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, [caixa.id]);

    useEffect(() => {
        let atual = true;
        setCarregando(true); setErro(''); setResumo(null);
        ApiClient.get(`caixa/${caixa.id}/resumo`).then(dados => {
            if (atual) setResumo(dados);
        }).catch(error => {
            console.error(error);
            if (atual) {
                let mensagem = error?.msg || 'Não foi possível consultar o resumo do caixa. Tente novamente.';
                setErro(mensagem);
                if (!error?.status) toast.error(mensagem);
            }
        }).finally(() => { if (atual) setCarregando(false); });
        return () => { atual = false; };
    }, [caixa.id, tentativa]);

    return <section className="page-card p-3 p-sm-4 mb-4" aria-labelledby="resumo-caixa-historico">
        <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
            <h2 className="h5 mb-0" id="resumo-caixa-historico" ref={tituloRef} tabIndex={-1} style={{ scrollMarginTop: '84px' }}>Resumo do caixa #{caixa.id}</h2>
            <div className="d-flex flex-wrap gap-2">
                <button type="button" className="btn btn-outline-primary" disabled={carregando} onClick={() => setTentativa(atual => atual + 1)}>Atualizar resumo</button>
                <button type="button" className="btn btn-light" onClick={onFechar}>Ocultar resumo</button>
            </div>
        </div>
        <p className="small text-secondary">Aberto por {caixa.nomeUsuarioAbertura} em {formatarDataHora(caixa.dataAbertura)}.
            {caixa.dataFechamento && <> Fechado por {caixa.nomeUsuarioFechamento} em {formatarDataHora(caixa.dataFechamento)}.</>}
        </p>
        {carregando && <p className="text-secondary" role="status">Carregando resumo financeiro...</p>}
        {erro && <div className="alert alert-danger" role="alert"><p>{erro}</p><button type="button" className="btn btn-outline-danger" onClick={() => setTentativa(atual => atual + 1)}>Tentar novamente</button></div>}
        {resumo && <><span className={`badge ${resumo.status === 'ABERTO' ? 'text-bg-success' : 'text-bg-secondary'}`}>{resumo.status === 'ABERTO' ? 'Aberto' : 'Fechado'}</span><ResumoFinanceiro resumo={resumo} /></>}
    </section>;
}
