import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';

import {
  renderWelcomeEmailHtml,
  renderWelcomeEmailText,
  type WelcomeEmailInput,
} from './welcome-email';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  private getSmtpPassword(): string | undefined {
    const pass = process.env.SMTP_PASS?.trim() || process.env.RESEND_API_KEY?.trim();
    return pass && pass.length > 0 ? pass : undefined;
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      const pass = this.getSmtpPassword();
      const user = process.env.SMTP_USER?.trim() || (pass ? 'resend' : undefined);
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'localhost',
        port: Number(process.env.SMTP_PORT || 1025),
        secure: false,
        auth: user && pass ? { user, pass } : undefined,
      });
    }
    return this.transporter;
  }

  async send(to: string, subject: string, text: string, html?: string): Promise<void> {
    const from = process.env.EMAIL_FROM || 'CardOrbit <noreply@cardorbit.in>';
    if (!this.getSmtpPassword() && (process.env.SMTP_HOST || '').includes('resend.com')) {
      throw new Error('SMTP is not configured — set SMTP_PASS or RESEND_API_KEY');
    }
    try {
      await this.getTransporter().sendMail({ from, to, subject, text, html });
    } catch (error) {
      this.logger.error(`Failed to send mail to ${to}: ${String(error)}`);
      throw error;
    }
  }

  async sendVerificationEmail(to: string, rawToken: string): Promise<void> {
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const link = `${appUrl}/verify-email?token=${encodeURIComponent(rawToken)}`;
    await this.send(
      to,
      'Verify your CardOrbit email',
      `Welcome to CardOrbit.\n\nVerify your email:\n${link}\n\nIf you did not sign up, ignore this message.`,
    );
  }

  async sendPasswordResetEmail(to: string, rawToken: string): Promise<void> {
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const link = `${appUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
    await this.send(
      to,
      'Reset your CardOrbit password',
      `Reset your password:\n${link}\n\nIf you did not request this, ignore this message.`,
    );
  }

  async sendWelcomeEmail(to: string, input: WelcomeEmailInput): Promise<void> {
    await this.send(
      to,
      'Welcome to CardOrbit',
      renderWelcomeEmailText(input),
      renderWelcomeEmailHtml(input),
    );
  }
}
