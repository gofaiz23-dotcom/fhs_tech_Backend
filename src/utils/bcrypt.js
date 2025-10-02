import bcrypt from 'bcrypt';

const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;

// Hash password
export const hashPassword = async (password) => {
  try {
    return await bcrypt.hash(password, saltRounds);
  } catch (error) {
    throw new Error('Password hashing failed');
  }
};

// Compare password with hash
export const comparePassword = async (password, hash) => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};
