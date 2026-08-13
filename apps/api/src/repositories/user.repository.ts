import type { HydratedDocument } from 'mongoose';
import { UserModel, type User } from '../models/user.model.js';

export class UserRepository {
  findByEmail(universityId: string, email: string): Promise<HydratedDocument<User> | null> {
    return UserModel.findOne({ universityId, email })
      .select('+passwordHash +failedLoginAttempts +lockedUntil')
      .exec();
  }
  findById(id: string): Promise<HydratedDocument<User> | null> {
    return UserModel.findById(id).exec();
  }
  findByIdWithPassword(id: string): Promise<HydratedDocument<User> | null> {
    return UserModel.findById(id).select('+passwordHash').exec();
  }
  create(
    values: Pick<User, 'email' | 'firstName' | 'lastName' | 'passwordHash' | 'role'> & {
      universityId: string;
    },
  ): Promise<HydratedDocument<User>> {
    return UserModel.create(values);
  }
}
