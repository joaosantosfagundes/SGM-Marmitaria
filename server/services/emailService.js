import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const EMAIL_FROM = process.env.EMAIL_FROM || 'SGM <onboarding@resend.dev>';

export default class EmailService {

    async enviarRedefinicaoSenha(email, nome, link) {
        // Sem RESEND_API_KEY configurada (ex: ambiente de dev sem conta ainda),
        // não quebra o fluxo — só mostra o link no console pra você conseguir testar.
        if (!resend) {
            console.warn('⚠️  RESEND_API_KEY não configurada. Link de redefinição (só pra debug local):');
            console.warn(link);
            return { modoDebug: true };
        }

        let resultado = await resend.emails.send({
            from: EMAIL_FROM,
            to: email,
            subject: 'Redefinição de senha — SGM',
            html: `
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
            `,
        });

        if (resultado.error) {
            throw { status: 500, msg: 'Falha ao enviar e-mail de redefinição' };
        }

        return resultado;
    }
}