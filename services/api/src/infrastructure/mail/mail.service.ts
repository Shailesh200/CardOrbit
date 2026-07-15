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

  private getTransporter(): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'localhost',
        port: Number(process.env.SMTP_PORT || 1025),
        secure: false,
        auth:
          process.env.SMTP_USER && process.env.SMTP_PASS
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
      });
    }
    return this.transporter;
  }

  async send(to: string, subject: string, text: string, html?: string): Promise<void> {
    const from = process.env.EMAIL_FROM || 'noreply@cardwise.local';
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
      'Verify your CardWise email',
      `Welcome to CardWise.\n\nVerify your email:\n${link}\n\nIf you did not sign up, ignore this message.`,
    );
  }

  async sendPasswordResetEmail(to: string, rawToken: string): Promise<void> {
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const link = `${appUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
    await this.send(
      to,
      'Reset your CardWise password',
      `Reset your password:\n${link}\n\nIf you did not request this, ignore this message.`,
    );
  }

  async sendWelcomeEmail(to: string, input: WelcomeEmailInput): Promise<void> {
    await this.send(
      to,
      'Welcome to CardWise',
      renderWelcomeEmailText(input),
      renderWelcomeEmailHtml(input),
    );
  }
}
