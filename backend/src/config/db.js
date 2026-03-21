import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectMongo() {
  await mongoose.connect(env.mongoUri, {
    autoIndex: true
  });
  console.log('✅ MongoDB connected');
}
