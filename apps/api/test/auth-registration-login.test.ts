import './setup.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { registerSchema, loginSchema } from '../src/validators/auth.validator.js';
import { UserModel } from '../src/models/user.model.js';
import { passwordRequirements } from '../../web/src/features/auth/auth-utils.js';
import { serializeAuthenticatedUser } from '../src/services/auth.service.js';
import { signAccessToken } from '../src/utils/tokens.js';
import jsonwebtoken from 'jsonwebtoken';

void describe('account registration and login contracts', () => {
  const validRegistration = {
    universityId: 'lagos-metropolitan-university',
    firstName: '  Ada  ',
    lastName: '  Okafor  ',
    email: 'ada.okafor@student.lmu.edu.ng',
    password: 'SecurePassphrase2026!',
  };

  void it('validates registration input schema with university slug and trimmed fields', () => {
    const result = registerSchema.safeParse({ body: validRegistration });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.body.firstName, 'Ada');
      assert.equal(result.data.body.lastName, 'Okafor');
      assert.equal(result.data.body.universityId, 'lagos-metropolitan-university');
    }
  });

  void it('rejects registration attempt with self-assigned role or invalid password', () => {
    assert.equal(
      registerSchema.safeParse({ body: { ...validRegistration, role: 'super_admin' } }).success,
      false,
    );
    assert.equal(
      registerSchema.safeParse({ body: { ...validRegistration, password: 'weak' } }).success,
      false,
    );
  });

  void it('validates login schema inputs and defaults rememberMe flag', () => {
    const result = loginSchema.safeParse({
      body: {
        universityId: '  lagos-metropolitan-university  ',
        email: 'ada.okafor@student.lmu.edu.ng',
        password: 'SecurePassphrase2026!',
      },
    });

    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.body.universityId, 'lagos-metropolitan-university');
      assert.equal(result.data.body.rememberMe, false);
    }
  });

  void it('matches frontend and backend password security requirements', () => {
    const strongPassword = 'SecurePassphrase2026!';
    for (const requirement of passwordRequirements) {
      assert.equal(requirement.test(strongPassword), true);
    }

    const weakPassword = 'weakpassword';
    assert.equal(
      passwordRequirements.every((item) => item.test(weakPassword)),
      false,
    );
  });

  void it('enforces unique compound index for university email tenant boundary', () => {
    const compoundIndex = UserModel.schema
      .indexes()
      .find(([fields]) => fields.universityId === 1 && fields.email === 1);

    assert.ok(compoundIndex);
    assert.equal(compoundIndex[1].unique, true);
    assert.deepEqual(compoundIndex[1].partialFilterExpression, { deletedAt: null });
  });

  void it('returns a profile photograph as presentation data without adding it to access claims', () => {
    const photoUrl = 'https://res.cloudinary.com/demo/image/upload/profile-photo.jpg';
    const user = serializeAuthenticatedUser({
      _id: '507f1f77bcf86cd799439011',
      universityId: '507f191e810c19729de860ea',
      email: 'ada@example.edu',
      firstName: 'Ada',
      lastName: 'Okafor',
      role: 'student',
      photoUrl,
    });

    assert.equal(user.photoUrl, photoUrl);
    const claims = jsonwebtoken.decode(
      signAccessToken({ sub: user.id, universityId: user.universityId, role: user.role }),
    ) as Record<string, unknown>;
    assert.equal(claims.photoUrl, undefined);
  });
});
