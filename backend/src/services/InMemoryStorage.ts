/**
 * In-memory storage for testing when MongoDB is not available
 */

export class InMemoryStorage {
  private static instance: InMemoryStorage;
  private storage: Map<string, any> = new Map();

  static getInstance(): InMemoryStorage {
    if (!InMemoryStorage.instance) {
      InMemoryStorage.instance = new InMemoryStorage();
    }
    return InMemoryStorage.instance;
  }

  save(key: string, data: any): void {
    this.storage.set(key, data);
  }

  findById(key: string): any | null {
    return this.storage.get(key) || null;
  }

  find(query: any): any[] {
    const results: any[] = [];
    for (const [key, value] of this.storage.entries()) {
      if (this.matchesQuery(value, query)) {
        results.push(value);
      }
    }
    return results;
  }

  update(key: string, data: any): void {
    if (this.storage.has(key)) {
      this.storage.set(key, { ...this.storage.get(key), ...data });
    }
  }

  delete(key: string): boolean {
    return this.storage.delete(key);
  }

  private matchesQuery(item: any, query: any): boolean {
    for (const [key, value] of Object.entries(query)) {
      if (item[key] !== value) {
        return false;
      }
    }
    return true;
  }
}
