import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { MailerService } from '@nestjs-modules/mailer';

const logger = new Logger('SigningEmails');

/** Письмо «Документы на ознакомление и подписание»: ссылка + одноразовый код. */
export async function sendSigningOtpEmail(
  mailer: MailerService,
  config: ConfigService,
  input: {
    to: string;
    customerName: string | null;
    signUrl: string;
    otpCode: string;
    expiresAt: Date;
    documentLabels: string[];
  },
): Promise<boolean> {
  const from = config.get<string>('MAIL_FROM') || 'noreply@example.com';
  const name = input.customerName?.trim() || 'Здравствуйте';
  const docs = input.documentLabels.map((l) => `• ${l}`).join('\n');
  const exp = input.expiresAt.toLocaleString('ru-RU');
  try {
    await mailer.sendMail({
      from: `"Договоры" <${from}>`,
      to: input.to,
      subject: 'Документы на ознакомление и подписание',
      text: `${name}!\n\nВам направлены документы для ознакомления и подписания:\n${docs}\n\nСсылка: ${input.signUrl}\nКод подтверждения: ${input.otpCode}\nСрок действия: до ${exp}\n\nОткройте ссылку, просмотрите документы и введите код для подписания.`,
      html: `<p>${name}!</p><p>Вам направлены документы для ознакомления и подписания:</p><ul>${input.documentLabels.map((l) => `<li>${l}</li>`).join('')}</ul><p><a href="${input.signUrl}">Открыть документы</a></p><p>Код подтверждения: <strong>${input.otpCode}</strong></p><p>Срок действия: до ${exp}</p>`,
    });
    return true;
  } catch (err) {
    logger.error(
      `Не удалось отправить письмо со ссылкой на подписание (${input.to}): ${(err as Error).message}`,
    );
    return false;
  }
}
