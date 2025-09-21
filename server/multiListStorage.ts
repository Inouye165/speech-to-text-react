import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getBackupManager } from './backup';
import { 
  List, 
  ListItem, 
  ListMetadata, 
  ListSettings, 
  ListType,
  CreateListRequest,
  UpdateListRequest 
} from './types';

export interface MultiListStorage {
  getAllLists(): Promise<List[]>;
  getList(listId: string): Promise<List | null>;
  createList(request: CreateListRequest): Promise<List>;
  updateList(listId: string, request: UpdateListRequest): Promise<List | null>;
  deleteList(listId: string): Promise<boolean>;
  updateListItems(listId: string, items: ListItem[]): Promise<List | null>;
  addListItem(listId: string, item: Omit<ListItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ListItem | null>;
  updateListItem(listId: string, itemId: string, updates: Partial<ListItem>): Promise<ListItem | null>;
  deleteListItem(listId: string, itemId: string): Promise<boolean>;
}

class FileMultiListStorage implements MultiListStorage {
  private readonly dataDir = path.join(process.cwd(), 'data');
  private readonly listsFile = path.join(this.dataDir, 'lists.json');
  private readonly backupManager = getBackupManager();

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

  async getAllLists(): Promise<List[]> {
    try {
      if (await fs.pathExists(this.listsFile)) {
        const data = await fs.readJson(this.listsFile);
        return Array.isArray(data.lists) ? data.lists : [];
      }
      return [];
    } catch (error) {
      console.error('Failed to read lists:', error);
      return [];
    }
  }

  async getList(listId: string): Promise<List | null> {
    try {
      const lists = await this.getAllLists();
      return lists.find(list => list.id === listId) || null;
    } catch (error) {
      console.error('Failed to get list:', error);
      return null;
    }
  }

  async createList(request: CreateListRequest): Promise<List> {
    try {
      const lists = await this.getAllLists();
      
      // Check if list with same name already exists
      const existingList = lists.find(list => 
        list.metadata.name.toLowerCase() === request.name.toLowerCase()
      );
      
      if (existingList) {
        throw new Error(`List with name "${request.name}" already exists`);
      }

      const now = new Date().toISOString();
      const newList: List = {
        id: uuidv4(),
        type: request.type,
        metadata: {
          name: request.name,
          description: request.description || '',
          icon: request.icon || '📝',
          color: request.color || '#607D8B',
          createdAt: now,
          updatedAt: now
        },
        items: [],
        settings: {
          allowDuplicates: false,
          sortOrder: 'manual',
          autoComplete: false,
          ...request.settings
        }
      };

      lists.push(newList);
      await this.saveAllLists(lists);
      
      console.log(`Created new list: ${newList.metadata.name} (${newList.id})`);
      return newList;
    } catch (error) {
      console.error('Failed to create list:', error);
      throw error;
    }
  }

  async updateList(listId: string, request: UpdateListRequest): Promise<List | null> {
    try {
      const lists = await this.getAllLists();
      const listIndex = lists.findIndex(list => list.id === listId);
      
      if (listIndex === -1) {
        return null;
      }

      const list = lists[listIndex];
      
      // Check for name conflicts (if name is being changed)
      if (request.name && request.name !== list.metadata.name) {
        const existingList = lists.find(l => 
          l.id !== listId && l.metadata.name.toLowerCase() === request.name.toLowerCase()
        );
        
        if (existingList) {
          throw new Error(`List with name "${request.name}" already exists`);
        }
      }

      // Update list metadata
      if (request.name) list.metadata.name = request.name;
      if (request.description !== undefined) list.metadata.description = request.description;
      if (request.icon) list.metadata.icon = request.icon;
      if (request.color) list.metadata.color = request.color;
      
      // Update settings
      if (request.settings) {
        list.settings = { ...list.settings, ...request.settings };
      }
      
      list.metadata.updatedAt = new Date().toISOString();
      
      lists[listIndex] = list;
      await this.saveAllLists(lists);
      
      console.log(`Updated list: ${list.metadata.name} (${list.id})`);
      return list;
    } catch (error) {
      console.error('Failed to update list:', error);
      throw error;
    }
  }

  async deleteList(listId: string): Promise<boolean> {
    try {
      const lists = await this.getAllLists();
      const initialLength = lists.length;
      
      const filteredLists = lists.filter(list => list.id !== listId);
      
      if (filteredLists.length === initialLength) {
        return false; // List not found
      }
      
      await this.saveAllLists(filteredLists);
      console.log(`Deleted list: ${listId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete list:', error);
      return false;
    }
  }

  async updateListItems(listId: string, items: ListItem[]): Promise<List | null> {
    try {
      const lists = await this.getAllLists();
      const listIndex = lists.findIndex(list => list.id === listId);
      
      if (listIndex === -1) {
        return null;
      }

      const list = lists[listIndex];
      list.items = items;
      list.metadata.updatedAt = new Date().toISOString();
      
      lists[listIndex] = list;
      await this.saveAllLists(lists);
      
      console.log(`Updated ${items.length} items for list: ${list.metadata.name} (${list.id})`);
      return list;
    } catch (error) {
      console.error('Failed to update list items:', error);
      throw error;
    }
  }

  async addListItem(listId: string, item: Omit<ListItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ListItem | null> {
    try {
      const lists = await this.getAllLists();
      const listIndex = lists.findIndex(list => list.id === listId);
      
      if (listIndex === -1) {
        return null;
      }

      const list = lists[listIndex];
      
      // Check for duplicates if not allowed
      if (!list.settings.allowDuplicates) {
        const existingItem = list.items.find(existing => 
          existing.text.toLowerCase() === item.text.toLowerCase()
        );
        
        if (existingItem) {
          throw new Error(`Item "${item.text}" already exists in the list`);
        }
      }

      const now = new Date().toISOString();
      const newItem: ListItem = {
        ...item,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now
      };

      list.items.push(newItem);
      list.metadata.updatedAt = now;
      
      lists[listIndex] = list;
      await this.saveAllLists(lists);
      
      console.log(`Added item to list ${list.metadata.name}: ${newItem.text}`);
      return newItem;
    } catch (error) {
      console.error('Failed to add list item:', error);
      throw error;
    }
  }

  async updateListItem(listId: string, itemId: string, updates: Partial<ListItem>): Promise<ListItem | null> {
    try {
      const lists = await this.getAllLists();
      const listIndex = lists.findIndex(list => list.id === listId);
      
      if (listIndex === -1) {
        return null;
      }

      const list = lists[listIndex];
      const itemIndex = list.items.findIndex(item => item.id === itemId);
      
      if (itemIndex === -1) {
        return null;
      }

      const item = list.items[itemIndex];
      const updatedItem = {
        ...item,
        ...updates,
        id: item.id, // Preserve ID
        createdAt: item.createdAt, // Preserve creation time
        updatedAt: new Date().toISOString()
      };

      list.items[itemIndex] = updatedItem;
      list.metadata.updatedAt = new Date().toISOString();
      
      lists[listIndex] = list;
      await this.saveAllLists(lists);
      
      console.log(`Updated item in list ${list.metadata.name}: ${updatedItem.text}`);
      return updatedItem;
    } catch (error) {
      console.error('Failed to update list item:', error);
      throw error;
    }
  }

  async deleteListItem(listId: string, itemId: string): Promise<boolean> {
    try {
      const lists = await this.getAllLists();
      const listIndex = lists.findIndex(list => list.id === listId);
      
      if (listIndex === -1) {
        return false;
      }

      const list = lists[listIndex];
      const initialLength = list.items.length;
      
      list.items = list.items.filter(item => item.id !== itemId);
      
      if (list.items.length === initialLength) {
        return false; // Item not found
      }

      list.metadata.updatedAt = new Date().toISOString();
      lists[listIndex] = list;
      await this.saveAllLists(lists);
      
      console.log(`Deleted item from list ${list.metadata.name}: ${itemId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete list item:', error);
      return false;
    }
  }

  private async saveAllLists(lists: List[]): Promise<void> {
    try {
      await this.ensureDataDirectory();
      
      // Create backup before saving if file exists and has content
      if (await fs.pathExists(this.listsFile)) {
        const existingData = await fs.readJson(this.listsFile);
        if (existingData.lists && existingData.lists.length > 0) {
          await this.backupManager.createBackup(this.listsFile);
        }
      }
      
      const data = {
        lists,
        lastUpdated: new Date().toISOString(),
        version: '2.0'
      };
      
      await fs.writeJson(this.listsFile, data, { spaces: 2 });
      console.log(`Saved ${lists.length} lists to ${this.listsFile}`);
    } catch (error) {
      console.error('Failed to save lists:', error);
      throw new Error('Failed to save lists');
    }
  }
}

// Factory function to create storage instance
export function createMultiListStorage(): MultiListStorage {
  return new FileMultiListStorage();
}

// Storage singleton - ensures we have one instance throughout the app
let multiListStorageInstance: MultiListStorage | null = null;

export function getMultiListStorage(): MultiListStorage {
  if (!multiListStorageInstance) {
    multiListStorageInstance = createMultiListStorage();
  }
  return multiListStorageInstance;
}
