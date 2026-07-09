import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  constructor(private config: ConfigService) {}

  private async sendEmail(email: string, subject: string, textMsg: string, htmlMsg: string): Promise<boolean> {
    const mailUser = this.config.get<string>('EMAIL_USER_NOREPLY');
    const mailPwd = this.config.get<string>('EMAIL_PASS_NOREPLY');

    const transporter = nodemailer.createTransport({
      host: this.config.get<string>('EMAIL_SERVER_DOMAIN'),
      port: Number(this.config.get<string>('EMAIL_SERVER_PORT')),
      secure: true,
      auth: { user: mailUser, pass: mailPwd },
    });

    const mailOptions = {
      from: `TeleNavix <${mailUser}>`,
      to: email,
      subject,
      text: textMsg,
      html: htmlMsg,
    };

    try {
      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  async sendConfirmationEmail(email: string, name: string, link: string): Promise<boolean> {
    const subject = 'Confirm your account';
    const text = `Hi ${name}, confirm your account within 48 hours: ${link}`;
    const html = `<p>Hi ${name},</p><p>Confirm your account (valid for 48 hours):</p><p><a href="${link}">${link}</a></p>`;
    return this.sendEmail(email, subject, text, html);
  }

  async sendPasswordResetEmail(email: string, name: string, link: string): Promise<boolean> {
    const subject = 'Reset your password';
    const text = `Hi ${name}, reset your password within 1 hour: ${link}`;
    const html = `<p>Hi ${name},</p><p>Reset your password (valid for 1 hour):</p><p><a href="${link}">${link}</a></p>`;
    return this.sendEmail(email, subject, text, html);
  }
}
