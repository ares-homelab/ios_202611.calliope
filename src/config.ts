import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';

export const DEFAULT_URL = 'http://ares:8087';
export const DEFAULT_ND = 'http://ares:4533';

export type Nd = { url: string; user: string; salt: string; token: string };
type Config = { url: string; token: string; nd: Nd };

const read = (key: string) => {
  try {
    return SecureStore.getItem(key) ?? '';
  } catch {
    return '';
  }
};

let config: Config = {
  url: read('api_url') || DEFAULT_URL,
  token: read('api_token'),
  nd: { url: read('nd_url') || DEFAULT_ND, user: read('nd_user') || 'mars', salt: read('nd_salt'), token: read('nd_token') },
};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

export const getConfig = () => config;

const clean = (u: string, fallback: string) => u.trim().replace(/\/+$/, '') || fallback;

export async function saveConfig(next: { url: string; token: string }) {
  const url = clean(next.url, DEFAULT_URL);
  const token = next.token.trim();
  await SecureStore.setItemAsync('api_url', url);
  await SecureStore.setItemAsync('api_token', token);
  config = { ...config, url, token };
  emit();
}

/** subsonic login: only the salted md5 token is kept, never the password */
export async function ndLogin(url: string, user: string, password: string): Promise<Nd> {
  const salt = Math.random().toString(36).slice(2, 12);
  const token = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.MD5, password + salt);
  return { url: clean(url, DEFAULT_ND), user: user.trim(), salt, token };
}

export async function saveNd(nd: Nd) {
  await SecureStore.setItemAsync('nd_url', nd.url);
  await SecureStore.setItemAsync('nd_user', nd.user);
  await SecureStore.setItemAsync('nd_salt', nd.salt);
  await SecureStore.setItemAsync('nd_token', nd.token);
  config = { ...config, nd };
  emit();
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const useConfig = () => useSyncExternalStore(subscribe, getConfig);
