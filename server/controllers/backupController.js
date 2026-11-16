import { pipeline } from 'node:stream/promises';
import BackupService from '../services/backupService.js';

function nomeArquivo() {
    const agora = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    return `backup-sgm-${agora.slice(0, 10)}-${agora.slice(11, 16).replace(':', '')}.sql`;
}

export default class BackupController {
    #service = new BackupService();

    async baixar(req, res) {
        const cancelamento = new AbortController();
        const cancelar = () => {
            if (!res.writableFinished) cancelamento.abort();
        };
        res.once('close', cancelar);
        res.set('Cache-Control', 'no-store');
        const dump = this.#service.gerar({ sinal: cancelamento.signal });

        try {
            // A primeira leitura pode falhar antes de enviar os cabeçalhos do arquivo.
            const primeiro = await dump.next();
            cancelamento.signal.throwIfAborted();
            res.set('Content-Type', 'application/sql; charset=utf-8');
            res.set('Content-Disposition', `attachment; filename="${nomeArquivo()}"`);
            res.set('Access-Control-Expose-Headers', 'Content-Disposition');
            async function* arquivo() {
                yield primeiro.value;
                yield* dump;
            }
            await pipeline(arquivo(), res, { signal: cancelamento.signal });
            console.info(`Backup SGM gerado por usuário ${req.usuarioLogado.id} em ${new Date().toISOString()}`);
        } catch (erro) {
            if (erro?.name !== 'AbortError') this.#tratarErro(res, erro);
        } finally {
            res.off('close', cancelar);
            await dump.return();
        }
    }

    #tratarErro(res, erro) {
        if (res.headersSent || res.destroyed) {
            if (!res.destroyed) res.destroy();
            console.error('O stream do backup foi interrompido.');
            return;
        }
        res.removeHeader('Content-Disposition');
        res.removeHeader('Content-Type');
        if (erro?.status) return res.status(erro.status).json({ msg: erro.msg });
        console.error('Falha ao gerar o backup do banco.');
        return res.status(500).json({ msg: 'Não foi possível gerar o backup.' });
    }
}
