import CryptoJS from 'crypto-js';

const SECRET_KEY = 'nexus-app-secret-key-2024';

export const hashPassword = (password: string): string => {
  return CryptoJS.SHA256(password + SECRET_KEY).toString();
};

export const generateToken = (): string => {
  return CryptoJS.lib.WordArray.random(32).toString();
};

export const verifyPassword = (password: string, hashedPassword: string): boolean => {
  const hashed = hashPassword(password);
  return hashed === hashedPassword;
};