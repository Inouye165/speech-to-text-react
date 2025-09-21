import fs from 'fs-extra';
import path from 'path';

// Storage abstraction - can be easily replaced with a real database
export interface GroceryListStorage {
  getList(): Promise<string[]>;
  saveList(items: string[]): Promise<void>;
  clearList(): Promise<void>;
}

// File-based storage implementation (acts as database placeholder)
class FileStorage implements GroceryListStorage {
  private readonly dataDir = path.join(process.cwd(), 'data');
  private readonly dataFile = path.join(this.dataDir, 'grocery-list.json');

  constructor() {
    this.ensureDataDirectory();
  }

  private async ensureDataDirectory(): Promise<void> {
    try {
      await fs.ensureDir(this.dataDir);
    } catch (error) {
      console.error('Failed to create data directory:', error);
    }
  }

  async getList(): Promise<string[]> {
    try {
      if (await fs.pathExists(this.dataFile)) {
        const data = await fs.readJson(this.dataFile);
        return Array.isArray(data.items) ? data.items : [];
      }
      return [];
    } catch (error) {
      console.error('Failed to read grocery list:', error);
      return [];
    }
  }

  async saveList(items: string[]): Promise<void> {
    try {
      await fs.ensureDir(this.dataDir);
      const data = {
        items,
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      };
      await fs.writeJson(this.dataFile, data, { spaces: 2 });
      console.log(`Successfully saved ${items.length} items to ${this.dataFile}`);
    } catch (error) {
      console.error('Failed to save grocery list:', error);
      throw new Error('Failed to save grocery list');
    }
  }

  async clearList(): Promise<void> {
    try {
      await fs.writeJson(this.dataFile, {
        items: [],
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      }, { spaces: 2 });
    } catch (error) {
      console.error('Failed to clear grocery list:', error);
      throw new Error('Failed to clear grocery list');
    }
  }
}

// Database storage implementation (for future use)
// This is a placeholder that shows how to implement with a real database
class DatabaseStorage implements GroceryListStorage {
  constructor(private dbConnection: any) {
    // In a real implementation, you'd connect to your database here
  }

  async getList(): Promise<string[]> {
    // Example: SELECT * FROM grocery_items ORDER BY created_at
    // const result = await this.dbConnection.query('SELECT item FROM grocery_items');
    // return result.rows.map(row => row.item);
    throw new Error('Database storage not implemented yet');
  }

  async saveList(items: string[]): Promise<void> {
    // Example: 
    // await this.dbConnection.query('DELETE FROM grocery_items');
    // await this.dbConnection.query(
    //   'INSERT INTO grocery_items (item, created_at) VALUES ($1, $2)',
    //   items.map(item => [item, new Date()])
    // );
    throw new Error('Database storage not implemented yet');
  }

  async clearList(): Promise<void> {
    // Example: DELETE FROM grocery_items
    // await this.dbConnection.query('DELETE FROM grocery_items');
    throw new Error('Database storage not implemented yet');
  }
}

// Factory function to create storage instance
export function createStorage(): GroceryListStorage {
  // For now, use file storage
  // Later, you can easily switch to database storage by changing this line:
  // return new DatabaseStorage(dbConnection);
  return new FileStorage();
}

// Storage singleton - ensures we have one instance throughout the app
let storageInstance: GroceryListStorage | null = null;

export function getStorage(): GroceryListStorage {
  if (!storageInstance) {
    storageInstance = createStorage();
  }
  return storageInstance;
}
