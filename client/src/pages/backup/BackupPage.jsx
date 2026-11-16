import { useState } from 'react';
import toast from 'react-hot-toast';
import ApiClient from '../../services/apiClient.js';

export default function BackupPage() {
    const [gerando, setGerando] = useState(false);

    async function baixar() {
        if (gerando) return;
        setGerando(true);
        try {
            const resposta = await ApiClient.baixar('backup');
            const disposicao = resposta.headers.get('content-disposition') ?? '';
            const nome = disposicao.match(/filename="(backup-sgm-\d{4}-\d{2}-\d{2}-\d{4}\.sql)"/)?.[1];
            if (!nome) throw new Error('Resposta de backup inválida.');
            const arquivo = await resposta.blob();
            if (!arquivo.size) throw new Error('O arquivo de backup veio vazio.');

            const url = URL.createObjectURL(arquivo);
            const link = document.createElement('a');
            link.href = url;
            link.download = nome;
            document.body.append(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (erro) {
            if (!erro?.status) toast.error('Não foi possível baixar o backup. Tente novamente.');
        } finally {
            setGerando(false);
        }
    }

    return <div>
        <header className="page-header mb-4">
            <h1 className="fs-3 mb-1">Backup</h1>
            <p className="text-secondary mb-0">Baixe uma cópia do banco de dados do SGM.</p>
        </header>
        <section className="page-card p-3 p-sm-4">
            <p data-tour="backup-frequencia">Faça pelo menos uma vez por semana e antes de mudanças grandes. Guarde em outro lugar, como Drive ou pendrive.</p>
            <p className="alert alert-warning" data-tour="backup-privacidade">
                O arquivo contém dados do sistema, hashes de senha e tokens. Guarde em local privado.
            </p>
            <button type="button" className="btn btn-primary" data-tour="backup-baixar" disabled={gerando}
                aria-busy={gerando} onClick={baixar}>
                <i className="ti ti-database-export me-1" aria-hidden="true" />
                {gerando ? 'Gerando...' : 'Baixar backup agora'}
            </button>
        </section>
    </div>;
}
