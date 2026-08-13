import { createHash } from 'node:crypto';
import { environment } from '../config/environment.js';
import { PushSubscriptionModel } from '../models/push-subscription.model.js';

interface PushPayload {
  readonly title: string;
  readonly body: string;
  readonly url: string;
  readonly tag: string;
}

function configured(): boolean {
  return Boolean(
    environment.PUSH_DELIVERY_API_URL &&
    environment.PUSH_DELIVERY_API_TOKEN &&
    environment.PUSH_VAPID_PUBLIC_KEY,
  );
}

export class PushDeliveryService {
  isConfigured(): boolean {
    return configured();
  }

  publicKey(): string | undefined {
    return configured() ? environment.PUSH_VAPID_PUBLIC_KEY : undefined;
  }

  async isSubscribed(universityId: string, userId: string): Promise<boolean> {
    return Boolean(
      await PushSubscriptionModel.exists({
        universityId,
        userId,
        revokedAt: { $exists: false },
      }),
    );
  }

  async subscribe(
    universityId: string,
    userId: string,
    input: {
      readonly endpoint: string;
      readonly expirationTime?: number | null;
      readonly keys: { readonly p256dh: string; readonly auth: string };
    },
  ): Promise<void> {
    if (!configured())
      throw Object.assign(new Error('Push delivery is not configured.'), { statusCode: 409 });
    const endpointHash = createHash('sha256').update(input.endpoint).digest('hex');
    await PushSubscriptionModel.findOneAndUpdate(
      { universityId, userId, endpointHash },
      {
        $set: {
          endpoint: input.endpoint,
          expirationTime: input.expirationTime ?? undefined,
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
          revokedAt: undefined,
          updatedBy: userId,
        },
        $setOnInsert: { universityId, userId, endpointHash, createdBy: userId },
      },
      { upsert: true, runValidators: true },
    ).exec();
  }

  async revoke(universityId: string, userId: string, endpoint: string): Promise<void> {
    const endpointHash = createHash('sha256').update(endpoint).digest('hex');
    await PushSubscriptionModel.updateOne(
      { universityId, userId, endpointHash },
      { $set: { revokedAt: new Date(), updatedBy: userId } },
    ).exec();
  }

  async send(universityId: string, userId: string, payload: PushPayload): Promise<void> {
    if (!configured())
      throw Object.assign(new Error('Push delivery is unavailable.'), {
        code: 'channel_unavailable',
      });
    const subscriptions = await PushSubscriptionModel.find({
      universityId,
      userId,
      revokedAt: { $exists: false },
    })
      .select('+endpoint +p256dh +auth expirationTime endpointHash')
      .limit(20)
      .exec();
    if (!subscriptions.length)
      throw Object.assign(new Error('No active push subscription exists.'), {
        code: 'subscription_missing',
      });
    const failures: unknown[] = [];
    let delivered = false;
    for (const subscription of subscriptions) {
      try {
        const response = await fetch(environment.PUSH_DELIVERY_API_URL!, {
          method: 'POST',
          headers: {
            accept: 'application/json',
            authorization: `Bearer ${environment.PUSH_DELIVERY_API_TOKEN!}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            subscription: {
              endpoint: subscription.endpoint,
              expirationTime: subscription.expirationTime,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            notification: payload,
          }),
          signal: AbortSignal.timeout(environment.PUSH_DELIVERY_TIMEOUT_MS),
        });
        if (!response.ok) {
          if (response.status === 404 || response.status === 410)
            await PushSubscriptionModel.updateOne(
              { _id: subscription._id },
              { $set: { revokedAt: new Date(), updatedBy: userId } },
            ).exec();
          throw new Error(`Push provider returned ${response.status}.`);
        }
        delivered = true;
        await PushSubscriptionModel.updateOne(
          { _id: subscription._id },
          { $set: { lastUsedAt: new Date(), updatedBy: userId } },
        ).exec();
      } catch (error) {
        failures.push(error);
      }
    }
    if (!delivered)
      throw Object.assign(new Error('Push delivery failed for every active subscription.'), {
        code: 'push_delivery_failed',
        failures,
      });
  }
}

export const pushDeliveryService = new PushDeliveryService();
