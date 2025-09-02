// Advanced caching utilities for better performance

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

class AdvancedCache<T> {
  private cache = new Map<string, CacheItem<T>>();
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize = 100, defaultTTL = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  set(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expiry = now + (ttl || this.defaultTTL);

    // Remove oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      expiry
    });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    this.cleanup();
    return this.cache.size;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton instances for different data types
export const menuCache = new AdvancedCache<any>(50, 10 * 60 * 1000); // 10 minutes for menu items
export const userCache = new AdvancedCache<any>(20, 5 * 60 * 1000);  // 5 minutes for user data
export const orderCache = new AdvancedCache<any>(100, 2 * 60 * 1000); // 2 minutes for orders

// IndexedDB wrapper for persistent offline storage
class IndexedDBCache {
  private dbName: string;
  private version: number;
  private db: IDBDatabase | null = null;

  constructor(dbName = 'BreakfastBuddyCache', version = 1) {
    this.dbName = dbName;
    this.version = version;
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' });
          store.createIndex('expiry', 'expiry', { unique: false });
        }
      };
    });
  }

  async set(key: string, data: any, ttl = 24 * 60 * 60 * 1000): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    
    const item = {
      key,
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    };

    return new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get(key: string): Promise<any | null> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['cache'], 'readonly');
    const store = transaction.objectStore('cache');

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const item = request.result;
        if (!item) {
          resolve(null);
          return;
        }

        if (Date.now() > item.expiry) {
          this.delete(key);
          resolve(null);
          return;
        }

        resolve(item.data);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async delete(key: string): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');

    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const persistentCache = new IndexedDBCache();

// Cache wrapper with fallback strategy
export const getCachedData = async <T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: {
    memoryTTL?: number;
    persistentTTL?: number;
    useMemoryCache?: boolean;
    usePersistentCache?: boolean;
  } = {}
): Promise<T> => {
  const {
    memoryTTL = 5 * 60 * 1000,
    persistentTTL = 24 * 60 * 60 * 1000,
    useMemoryCache = true,
    usePersistentCache = true
  } = options;

  // Try memory cache first
  if (useMemoryCache) {
    const memoryData = menuCache.get(key);
    if (memoryData) return memoryData;
  }

  // Try persistent cache
  if (usePersistentCache) {
    try {
      const persistentData = await persistentCache.get(key);
      if (persistentData) {
        // Update memory cache
        if (useMemoryCache) {
          menuCache.set(key, persistentData, memoryTTL);
        }
        return persistentData;
      }
    } catch (error) {
      console.warn('Persistent cache error:', error);
    }
  }

  // Fetch fresh data
  const freshData = await fetchFn();

  // Update caches
  if (useMemoryCache) {
    menuCache.set(key, freshData, memoryTTL);
  }
  
  if (usePersistentCache) {
    try {
      await persistentCache.set(key, freshData, persistentTTL);
    } catch (error) {
      console.warn('Failed to cache to IndexedDB:', error);
    }
  }

  return freshData;
};