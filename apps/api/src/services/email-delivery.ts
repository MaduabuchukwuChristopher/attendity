export interface EmailMessage {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html: string;
}

export interface EmailDelivery {
  readonly provider: 'resend' | 'smtp';
  send(message: EmailMessage): Promise<void>;
}

interface SmtpMessage extends EmailMessage {
  readonly from: string;
  readonly disableFileAccess: true;
  readonly disableUrlAccess: true;
}

interface EmailDeliveryOptions {
  readonly resendApiKey?: string | undefined;
  readonly resendFrom?: string | undefined;
  readonly resendEndpoint?: string | undefined;
  readonly fetchImpl?: typeof fetch | undefined;
  readonly smtpFrom?: string | undefined;
  readonly smtpSend?: ((message: SmtpMessage) => Promise<unknown>) | undefined;
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export function createEmailDelivery(options: EmailDeliveryOptions): EmailDelivery | null {
  if (options.resendApiKey && options.resendFrom) {
    const fetchImpl = options.fetchImpl ?? fetch;
    return {
      provider: 'resend',
      send: async (message) => {
        let response: Response;
        try {
          response = await fetchImpl(options.resendEndpoint ?? RESEND_ENDPOINT, {
            method: 'POST',
            headers: {
              authorization: `Bearer ${options.resendApiKey}`,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              from: options.resendFrom,
              to: [message.to],
              subject: message.subject,
              text: message.text,
              html: message.html,
            }),
            signal: AbortSignal.timeout(10_000),
          });
        } catch {
          throw new Error('Email provider delivery request failed.');
        }
        if (!response.ok) throw new Error('Email provider rejected the delivery request.');
      },
    };
  }

  if (options.smtpFrom && options.smtpSend) {
    const smtpFrom = options.smtpFrom;
    const smtpSend = options.smtpSend;
    return {
      provider: 'smtp',
      send: async (message) => {
        await smtpSend({
          from: smtpFrom,
          ...message,
          disableFileAccess: true,
          disableUrlAccess: true,
        });
      },
    };
  }

  return null;
}
