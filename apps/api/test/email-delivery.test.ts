import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { describe, it } from 'node:test';
import { createEmailDelivery, type EmailMessage } from '../src/services/email-delivery.js';

const message: EmailMessage = {
  to: 'student@example.edu',
  subject: 'Verify your Attendity account',
  text: 'Plain text',
  html: '<p>HTML</p>',
};

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server address unavailable.');
  return `http://127.0.0.1:${address.port}/emails`;
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}

void describe('email delivery provider selection', () => {
  void it('prefers Resend HTTPS when both Resend values exist', async () => {
    let authorization = '';
    let requestBody = '';
    const server = createServer((request, response) => {
      authorization = request.headers.authorization ?? '';
      request.setEncoding('utf8');
      request.on('data', (chunk: string) => {
        requestBody += chunk;
      });
      request.on('end', () => {
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end('{"id":"email-id"}');
      });
    });
    const endpoint = await listen(server);
    let smtpCalled = false;

    try {
      const delivery = createEmailDelivery({
        resendApiKey: 're_test_secret_value',
        resendFrom: 'Attendity <onboarding@resend.dev>',
        resendEndpoint: endpoint,
        smtpFrom: 'smtp@example.edu',
        smtpSend: async () => {
          smtpCalled = true;
        },
      });

      assert.equal(delivery?.provider, 'resend');
      await delivery?.send(message);
      assert.equal(authorization, 'Bearer re_test_secret_value');
      assert.deepEqual(JSON.parse(requestBody), {
        from: 'Attendity <onboarding@resend.dev>',
        to: ['student@example.edu'],
        subject: 'Verify your Attendity account',
        text: 'Plain text',
        html: '<p>HTML</p>',
      });
      assert.equal(smtpCalled, false);
    } finally {
      await close(server);
    }
  });

  void it('uses SMTP when Resend is absent and SMTP is complete', async () => {
    let delivered: Record<string, unknown> | undefined;
    const delivery = createEmailDelivery({
      smtpFrom: 'Attendity <no-reply@example.edu>',
      smtpSend: async (input) => {
        delivered = input;
      },
    });

    assert.equal(delivery?.provider, 'smtp');
    await delivery?.send(message);
    assert.deepEqual(delivered, {
      from: 'Attendity <no-reply@example.edu>',
      ...message,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  });

  void it('returns null when neither provider is complete', () => {
    assert.equal(createEmailDelivery({ resendApiKey: 're_test_secret_value' }), null);
    assert.equal(createEmailDelivery({ smtpFrom: 'no-reply@example.edu' }), null);
  });

  void it('rejects a Resend failure without exposing its response body or API key', async () => {
    const apiKey = 're_private_test_secret';
    const server = createServer((_request, response) => {
      response.writeHead(422, { 'content-type': 'application/json' });
      response.end(`{"message":"provider detail containing ${apiKey}"}`);
    });
    const endpoint = await listen(server);

    try {
      const delivery = createEmailDelivery({
        resendApiKey: apiKey,
        resendFrom: 'Attendity <onboarding@resend.dev>',
        resendEndpoint: endpoint,
      });
      await assert.rejects(delivery?.send(message), (error: unknown) => {
        assert(error instanceof Error);
        assert.equal(error.message, 'Email provider rejected the delivery request.');
        assert.doesNotMatch(error.message, new RegExp(apiKey));
        assert.doesNotMatch(error.message, /provider detail/);
        return true;
      });
    } finally {
      await close(server);
    }
  });
});
