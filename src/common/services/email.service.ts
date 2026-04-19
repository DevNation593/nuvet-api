import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
}

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private readonly fromAddress: string;
    private readonly appUrl: string;

    constructor(private readonly config: ConfigService) {
        this.fromAddress = this.config.get<string>('MAIL_FROM', 'noreply@nuvet.app');
        this.appUrl = this.config.get<string>('APP_URL', 'http://localhost:4200');
    }

    async send(options: SendEmailOptions): Promise<void> {
        // TODO: Replace with real email transport (nodemailer, SES, Resend, etc.)
        this.logger.log(
            `[EMAIL] To: ${options.to} | Subject: ${options.subject}`,
        );
        this.logger.debug(`[EMAIL] Body:\n${options.html}`);
    }

    async sendPasswordReset(email: string, token: string): Promise<void> {
        const resetUrl = `${this.appUrl}/auth/reset-password?token=${token}`;
        await this.send({
            to: email,
            subject: 'NuVet Tech - Restablecer contraseña',
            html: `
                <h2>Restablecer contraseña</h2>
                <p>Recibimos una solicitud para restablecer tu contraseña.</p>
                <p><a href="${resetUrl}" style="padding:10px 20px;background:#059669;color:white;border-radius:8px;text-decoration:none;display:inline-block;">Restablecer contraseña</a></p>
                <p>Si no solicitaste esto, ignora este correo. El enlace expira en 1 hora.</p>
                <p style="color:#999;font-size:12px;">URL directa: ${resetUrl}</p>
            `.trim(),
        });
    }

    async sendEmailVerification(email: string, token: string): Promise<void> {
        const verifyUrl = `${this.appUrl}/auth/verify-email?token=${token}`;
        await this.send({
            to: email,
            subject: 'NuVet Tech - Verifica tu correo electrónico',
            html: `
                <h2>Verificar correo electrónico</h2>
                <p>Gracias por registrarte en NuVet Tech. Verifica tu correo para activar tu cuenta.</p>
                <p><a href="${verifyUrl}" style="padding:10px 20px;background:#059669;color:white;border-radius:8px;text-decoration:none;display:inline-block;">Verificar correo</a></p>
                <p>Si no creaste una cuenta, ignora este correo. El enlace expira en 24 horas.</p>
                <p style="color:#999;font-size:12px;">URL directa: ${verifyUrl}</p>
            `.trim(),
        });
    }
}
