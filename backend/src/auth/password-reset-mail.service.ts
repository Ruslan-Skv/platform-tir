import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class PasswordResetMailService {
  constructor(
    private config: ConfigService,
    private mailer: MailerService,
  ) {}

  async sendPasswordResetEmail(email: string, resetUrl: string): Promise<boolean> {
    const from = this.config.get<string>('MAIL_FROM') || 'noreply@example.com';
    try {
      await this.mailer.sendMail({
        from: `"Восстановление пароля" <${from}>`,
        to: email,
        subject: 'Восстановление пароля — личный кабинет',
        html: this.buildResetEmailHtml(resetUrl),
        text: this.buildResetEmailText(resetUrl),
      });
      return true;
    } catch (err) {
      console.error('PasswordResetMailService.sendPasswordResetEmail error:', err);
      return false;
    }
  }

  private buildResetEmailHtml(resetUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Восстановление пароля</title></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1>Восстановление пароля</h1>
  <p>Здравствуйте!</p>
  <p>Вы запросили восстановление пароля к личному кабинету. Нажмите кнопку ниже, чтобы задать новый пароль:</p>
  <p><a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Задать новый пароль</a></p>
  <p>Ссылка действительна 1 час. Если вы не запрашивали восстановление пароля, проигнорируйте это письмо.</p>
  <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
  <p style="color: #6b7280; font-size: 12px;">Если кнопка не работает, скопируйте ссылку в браузер: ${resetUrl}</p>
</body>
</html>`;
  }

  private buildResetEmailText(resetUrl: string): string {
    return `Восстановление пароля\n\nВы запросили восстановление пароля к личному кабинету. Перейдите по ссылке, чтобы задать новый пароль:\n\n${resetUrl}\n\nСсылка действительна 1 час. Если вы не запрашивали восстановление пароля, проигнорируйте это письмо.`;
  }
}
