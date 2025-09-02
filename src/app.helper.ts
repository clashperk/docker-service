import { createCipheriv, createDecipheriv } from 'node:crypto';

export const encrypt = async (input: { payload: string; key: string; iv: string }) => {
  const key = Buffer.from(input.key, 'hex');
  const iv = Buffer.from(input.iv, 'hex');
  const cipher = createCipheriv('aes256', key, iv);
  return Buffer.concat([cipher.update(input.payload), cipher.final()]).toString('hex');
};

export const decrypt = async (input: { payload: string; key: string; iv: string }) => {
  const key = Buffer.from(input.key, 'hex');
  const iv = Buffer.from(input.iv, 'hex');
  const decipher = createDecipheriv('aes256', key, iv);
  return Buffer.concat([
    decipher.update(Buffer.from(input.payload, 'hex')),
    decipher.final(),
  ]).toString();
};
