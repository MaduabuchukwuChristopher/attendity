import mongoose from 'mongoose';
import { environment } from '../config/environment.js';

export async function connectDatabase(): Promise<void> {
  await mongoose.connect(environment.MONGODB_URI, {
    maxPoolSize: 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5_000,
  });
}
export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
