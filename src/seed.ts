/**
 * Seed script: creates a default admin user if not already present.
 * Run with: npx ts-node -r tsconfig-paths/register src/seed.ts
 */
import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lorawan';

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'operator', 'viewer'], default: 'viewer' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    lastLogin: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const UserModel = mongoose.model('User', UserSchema);

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB:', MONGODB_URI);

  const email = 'admin@lorawan.io';
  const existing = await UserModel.findOne({ email });

  if (existing) {
    console.log('Admin user already exists, skipping.');
  } else {
    const passwordHash = await bcrypt.hash('password', 10);
    await UserModel.create({
      name: 'Admin',
      email,
      passwordHash,
      role: 'admin',
      status: 'active',
    });
    console.log('Admin user created: admin@lorawan.io / password');
  }

  await mongoose.disconnect();
  console.log('Done.');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
