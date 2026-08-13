import type { RequestActor } from '@qr/types';
import { z } from 'zod';
import { environment } from '../config/environment.js';
import { FaceProfileModel } from '../models/face-profile.model.js';
import { auditService } from './audit.service.js';

const enrolmentResponseSchema = z.object({
  reference: z.string().min(1).max(512),
  provider: z.string().min(1).max(80).default('configured-biometric-provider'),
});
const verificationResponseSchema = z.object({
  matched: z.boolean(),
  confidence: z.number().min(0).max(1),
  provider: z.string().min(1).max(80).default('configured-biometric-provider'),
});

class FaceVerificationService {
  isConfigured(): boolean {
    return Boolean(environment.FACE_VERIFICATION_API_URL && environment.FACE_VERIFICATION_API_KEY);
  }

  assertConfigured(): void {
    if (!this.isConfigured())
      throw Object.assign(new Error('Face verification is not configured for this deployment.'), {
        statusCode: 503,
      });
  }

  private async request(path: string, body: Record<string, unknown>): Promise<unknown> {
    this.assertConfigured();
    const response = await fetch(new URL(path, environment.FACE_VERIFICATION_API_URL), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${environment.FACE_VERIFICATION_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok)
      throw Object.assign(new Error('The biometric provider could not complete the request.'), {
        statusCode: response.status >= 500 ? 502 : 422,
      });
    return response.json();
  }

  async hasProfile(actor: RequestActor): Promise<boolean> {
    return Boolean(
      await FaceProfileModel.exists({
        universityId: actor.universityId,
        studentId: actor.id,
      }),
    );
  }

  async enrol(actor: RequestActor, imageCapture: string) {
    this.assertConfigured();
    const result = enrolmentResponseSchema.parse(
      await this.request('/enrolments', {
        subjectId: actor.id,
        universityId: actor.universityId,
        image: imageCapture,
      }),
    );
    const profile = await FaceProfileModel.findOneAndUpdate(
      { universityId: actor.universityId, studentId: actor.id },
      {
        $set: {
          provider: result.provider,
          providerReference: result.reference,
          enrolledAt: new Date(),
          updatedBy: actor.id,
        },
        $setOnInsert: { universityId: actor.universityId, createdBy: actor.id },
      },
      { new: true, upsert: true },
    ).exec();
    await auditService.record({
      action: 'face_profile.enrolled',
      resourceType: 'face_profile',
      resourceId: profile.id,
      actor,
      newValue: { provider: result.provider, enrolledAt: profile.enrolledAt },
    });
    return { enrolled: true, provider: result.provider, enrolledAt: profile.enrolledAt };
  }

  async verify(actor: RequestActor, imageCapture: string) {
    this.assertConfigured();
    const profile = await FaceProfileModel.findOne({
      universityId: actor.universityId,
      studentId: actor.id,
    })
      .select('+providerReference')
      .exec();
    if (!profile)
      throw Object.assign(new Error('Enrol your face profile before checking in.'), {
        statusCode: 422,
      });
    const result = verificationResponseSchema.parse(
      await this.request('/verifications', {
        reference: profile.providerReference,
        subjectId: actor.id,
        universityId: actor.universityId,
        image: imageCapture,
      }),
    );
    const verified = result.matched && result.confidence >= environment.FACE_VERIFICATION_THRESHOLD;
    if (!verified)
      throw Object.assign(new Error('Face verification did not meet the required confidence.'), {
        statusCode: 422,
      });
    profile.set({ lastVerifiedAt: new Date(), updatedBy: actor.id });
    await profile.save();
    return {
      confidence: result.confidence,
      verified: true as const,
      provider: result.provider,
      verifiedAt: profile.lastVerifiedAt,
    };
  }
}

export const faceVerificationService = new FaceVerificationService();
