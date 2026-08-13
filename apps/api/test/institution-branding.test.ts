import './setup.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MediaAssetModel } from '../src/models/media-asset.model.js';
import { UniversityModel } from '../src/models/university.model.js';
import { updateInstitutionBrandingSchema } from '../src/validators/settings.validator.js';

const assetId = '507f1f77bcf86cd799439011';
const logoUrl = 'https://res.cloudinary.com/attendity/image/upload/logo.png';

void describe('managed institution branding contracts', () => {
  void it('accepts a paired managed logo and explicit removal', () => {
    assert.equal(
      updateInstitutionBrandingSchema.safeParse({ body: { logoAssetId: assetId, logoUrl } })
        .success,
      true,
    );
    assert.equal(
      updateInstitutionBrandingSchema.safeParse({ body: { logoAssetId: null } }).success,
      true,
    );
    assert.equal(
      updateInstitutionBrandingSchema.safeParse({ body: { logoAssetId: assetId } }).success,
      false,
    );
  });

  void it('supports tenant-owned institution logo assets and references', () => {
    const asset = new MediaAssetModel({
      universityId: assetId,
      context: 'institution_logo',
      provider: 'cloudinary',
      providerAssetId: 'institution/logo',
      name: 'logo.png',
      url: logoUrl,
      mimeType: 'image/png',
      sizeBytes: 100,
      checksum: 'a'.repeat(64),
      uploadedBy: assetId,
      createdBy: assetId,
      updatedBy: assetId,
    });
    const university = new UniversityModel({
      name: 'Attendity University',
      slug: 'attendity-university',
      email: 'admin@example.edu',
      logoAssetId: asset._id,
      logoUrl,
    });

    assert.equal(asset.validateSync(), undefined);
    assert.equal(university.validateSync(), undefined);
    assert.equal(String(university.logoAssetId), String(asset._id));
  });
});
