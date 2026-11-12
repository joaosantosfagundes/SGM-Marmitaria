export default class EmailService {

    async enviarRedefinicaoSenha(email, nome, link) {
        const chave = process.env.BREVO_API_KEY;
        if (!chave) {
            console.warn('⚠️  BREVO_API_KEY não configurada. Link de redefinição (só pra debug local):');
            console.warn(link);
            return { modoDebug: true };
        }

        const htmlContent = `
                <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                    <h2 style="color: #D85A30;">Redefinição de senha</h2>
                    <p>Olá, ${nome}.</p>
                    <p>Recebemos um pedido pra redefinir a senha da sua conta no SGM.</p>
                    <p>
                        <a href="${link}" style="background: #D85A30; color: #fff; padding: 10px 20px;
                           border-radius: 6px; text-decoration: none; display: inline-block;">
                            Redefinir senha
                        </a>
                    </p>
                    <p style="color: #666; font-size: 13px;">
                        Esse link expira em 1 hora. Se você não pediu essa redefinição, pode ignorar este e-mail —
                        sua senha continua a mesma.
                    </p>
                </div>
            `;

        const sinal = AbortSignal.timeout(10000);
        try {
            const resposta = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                redirect: 'manual',
                headers: {
                    'api-key': chave,
                    'content-type': 'application/json',
                    accept: 'application/json',
                },
                body: JSON.stringify({
                    sender: {
                        name: process.env.EMAIL_FROM_NAME || 'SGM',
                        email: process.env.EMAIL_FROM,
                    },
                    to: [{ email, name: nome }],
                    subject: 'Redefinição de senha — SGM',
                    htmlContent,
                }),
                signal: sinal,
            });

            const corpo = await resposta.text().catch(() => 'Corpo da resposta indisponível.');
            if (resposta.ok) return;

            console.error('Erro no envio de e-mail pelo Brevo', resposta.status, corpo.replaceAll(chave, '[oculta]'));
        } catch {
            console.error(sinal.aborted
                ? 'Tempo limite excedido no envio de e-mail pelo Brevo.'
                : 'Falha de comunicação com a API do Brevo.');
        }

        throw { status: 500, msg: 'Falha ao enviar e-mail de redefinição' };
    }
}
