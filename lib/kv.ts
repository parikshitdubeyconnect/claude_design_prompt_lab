// Tiny KV abstraction. Uses Upstash Redis when REST credentials are present
// (production on Vercel), otherwise falls back to an in-process store so the
// app runs locally / in ephemeral environments with zero setup.
//
// Only the handful of operations the session layer needs are implemented.

import { Redis } from "@upstash/redis";

export interface KV {
  getJSON<T>(key: string): Promise<T | null>;
  setJSON(key: string, val: unknown, ttlSec?: number): Promise<void>;
  del(key: string): Promise<void>;
  hset(key: string, field: string, val: string | number): Promise<void>;
  hincrby(key: string, field: string, by: number): Promise<number>;
  hgetall(key: string): Promise<Record<string, string> | null>;
  hdel(key: string, field: string): Promise<void>;
  expire(key: string, ttlSec: number): Promise<void>;
}

const DEFAULT_TTL = 60 * 60 * 8; // 8h — a session self-expires well after any workshop

// ── Upstash-backed implementation ──
class UpstashKV implements KV {
  constructor(private redis: Redis) {}

  async getJSON<T>(key: string): Promise<T | null> {
    return (await this.redis.get<T>(key)) ?? null;
  }
  async setJSON(key: string, val: unknown, ttlSec = DEFAULT_TTL): Promise<void> {
    await this.redis.set(key, val, { ex: ttlSec });
  }
  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }
  async hset(key: string, field: string, val: string | number): Promise<void> {
    await this.redis.hset(key, { [field]: val });
    await this.redis.expire(key, DEFAULT_TTL);
  }
  async hincrby(key: string, field: string, by: number): Promise<number> {
    const n = await this.redis.hincrby(key, field, by);
    await this.redis.expire(key, DEFAULT_TTL);
    return n;
  }
  async hgetall(key: string): Promise<Record<string, string> | null> {
    const res = await this.redis.hgetall<Record<string, string>>(key);
    return res ?? null;
  }
  async hdel(key: string, field: string): Promise<void> {
    await this.redis.hdel(key, field);
  }
  async expire(key: string, ttlSec: number): Promise<void> {
    await this.redis.expire(key, ttlSec);
  }
}

// ── In-memory fallback (single process; fine for local dev & demos) ──
type Entry = { val: unknown; hash?: Map<string, string> };

// Survive module reloads in Next dev by hanging the store off globalThis.
const g = globalThis as unknown as { __plMemStore?: Map<string, Entry> };
const store: Map<string, Entry> = g.__plMemStore ?? (g.__plMemStore = new Map());

class MemoryKV implements KV {
  async getJSON<T>(key: string): Promise<T | null> {
    const e = store.get(key);
    return e ? (e.val as T) : null;
  }
  async setJSON(key: string, val: unknown): Promise<void> {
    store.set(key, { val });
  }
  async del(key: string): Promise<void> {
    store.delete(key);
  }
  private hash(key: string): Map<string, string> {
    let e = store.get(key);
    if (!e || !e.hash) {
      e = { val: null, hash: new Map<string, string>() };
      store.set(key, e);
    }
    return e.hash as Map<string, string>;
  }
  async hset(key: string, field: string, val: string | number): Promise<void> {
    this.hash(key).set(field, String(val));
  }
  async hincrby(key: string, field: string, by: number): Promise<number> {
    const h = this.hash(key);
    const n = (parseInt(h.get(field) ?? "0", 10) || 0) + by;
    h.set(field, String(n));
    return n;
  }
  async hgetall(key: string): Promise<Record<string, string> | null> {
    const e = store.get(key);
    if (!e || !e.hash || e.hash.size === 0) return null;
    return Object.fromEntries(e.hash);
  }
  async hdel(key: string, field: string): Promise<void> {
    store.get(key)?.hash?.delete(field);
  }
  async expire(): Promise<void> {
    /* no-op in memory; process is ephemeral */
  }
}

let kvSingleton: KV | null = null;

export function getKV(): KV {
  if (kvSingleton) return kvSingleton;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (url && token) {
    kvSingleton = new UpstashKV(new Redis({ url, token }));
  } else {
    kvSingleton = new MemoryKV();
  }
  return kvSingleton;
}

export function kvBackend(): "upstash" | "memory" {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? "upstash" : "memory";
}
