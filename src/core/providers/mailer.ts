export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(msg: MailMessage): Promise<void>;
}

/** Development mailer: logs instead of sending. */
export class ConsoleMailer implements Mailer {
  readonly sent: MailMessage[] = [];
  async send(msg: MailMessage) {
    this.sent.push(msg);
    console.info(`[mail] to=${msg.to} subject="${msg.subject}"\n${msg.text}`);
  }
}

/** Minimal SMTP mailer via nodemailer (optional dependency, worker only). */
export class SmtpMailer implements Mailer {
  constructor(
    private readonly url: string,
    private readonly from: string,
  ) {}
  async send(msg: MailMessage) {
    const nodemailer = (await import("nodemailer")) as unknown as {
      createTransport(url: string): { sendMail(m: object): Promise<unknown> };
    };
    await nodemailer.createTransport(this.url).sendMail({ from: this.from, ...msg });
  }
}

export function createMailer(env: NodeJS.ProcessEnv = process.env): Mailer {
  if (env.MAILER === "smtp") {
    if (!env.SMTP_URL) throw new Error("SMTP_URL is required for MAILER=smtp");
    return new SmtpMailer(env.SMTP_URL, env.MAIL_FROM ?? "JobMatch <no-reply@jobmatch.example>");
  }
  return new ConsoleMailer();
}
