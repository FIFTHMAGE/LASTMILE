/**
 * Bcrypt utility functions for password hashing
 */
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    throw new Error('Failed to hash password');
  }
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    throw new Error('Failed to compare password');
  }
}

export function generateSalt(rounds: number = SALT_ROUNDS): Promise<string> {
  return bcrypt.genSalt(rounds);
}