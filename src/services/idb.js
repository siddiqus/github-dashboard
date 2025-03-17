import { openDB } from "idb";

const DEFAULT_TTL = 30 * 86400000; // 30 days

class IndexedDBService {
  constructor(dbName, storeName) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.dbPromise = this.initDB();
  }

  async initDB() {
    return openDB(this.dbName, 1, {
      upgrade: (db) => {
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      },
    });
  }

  async getData(key) {
    const db = await this.dbPromise;
    const item = await db
      .transaction(this.storeName)
      .objectStore(this.storeName)
      .get(key);
    if (!item) return null;

    const { value, timestamp, ttl } = item;
    const now = Date.now();

    if (now - timestamp > ttl) {
      await this.unsetData(key);
      return null;
    }

    return value;
  }

  async setData(key, json, ttl = DEFAULT_TTL) {
    // Default TTL is 24 hours
    const db = await this.dbPromise;
    const tx = db.transaction(this.storeName, "readwrite");
    const data = {
      value: json,
      timestamp: Date.now(),
      ttl: ttl,
    };
    tx.objectStore(this.storeName).put(data, key);
    return tx.done;
  }

  async unsetData(key) {
    const db = await this.dbPromise;
    const tx = db.transaction(this.storeName, "readwrite");
    tx.objectStore(this.storeName).delete(key);
    return tx.done;
  }
}

export const dbStore = new IndexedDBService("gh-stats-react-app", "gh-stats-user-data");

export default dbStore;
