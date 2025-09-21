import fs from 'fs-extra';
import path from 'path';

export interface BackupOptions {
  maxBackups?: number;
  backupDir?: string;
}

export class GroceryListBackup {
  private readonly dataDir = path.join(process.cwd(), 'data');
  private readonly backupDir: string;
  private readonly maxBackups: number;

  constructor(options: BackupOptions = {}) {
    this.backupDir = options.backupDir || path.join(this.dataDir, 'backups');
    this.maxBackups = options.maxBackups || 10;
    this.ensureBackupDirectory();
  }

  private async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.ensureDir(this.backupDir);
    } catch (error) {
      console.error('Failed to create backup directory:', error);
    }
  }

  async createBackup(sourceFile: string): Promise<string | null> {
    try {
      await this.ensureBackupDirectory();
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `grocery-list-backup-${timestamp}.json`;
      const backupPath = path.join(this.backupDir, backupFileName);
      
      await fs.copy(sourceFile, backupPath);
      console.log(`Backup created: ${backupPath}`);
      
      // Clean up old backups
      await this.cleanupOldBackups();
      
      return backupPath;
    } catch (error) {
      console.error('Failed to create backup:', error);
      return null;
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files
        .filter(file => file.startsWith('grocery-list-backup-') && file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          stats: fs.stat(path.join(this.backupDir, file))
        }));

      const resolvedFiles = await Promise.all(
        backupFiles.map(async (file) => ({
          ...file,
          stats: await file.stats
        }))
      );

      // Sort by modification time (newest first)
      resolvedFiles.sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

      // Remove excess backups
      if (resolvedFiles.length > this.maxBackups) {
        const filesToDelete = resolvedFiles.slice(this.maxBackups);
        for (const file of filesToDelete) {
          await fs.remove(file.path);
          console.log(`Removed old backup: ${file.name}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }

  async listBackups(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.backupDir);
      return files
        .filter(file => file.startsWith('grocery-list-backup-') && file.endsWith('.json'))
        .sort()
        .reverse(); // Newest first
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }

  async restoreBackup(backupFileName: string, targetFile: string): Promise<boolean> {
    try {
      const backupPath = path.join(this.backupDir, backupFileName);
      
      if (!await fs.pathExists(backupPath)) {
        console.error(`Backup file not found: ${backupPath}`);
        return false;
      }

      // Create a backup of current file before restoring
      if (await fs.pathExists(targetFile)) {
        await this.createBackup(targetFile);
      }

      await fs.copy(backupPath, targetFile);
      console.log(`Restored backup: ${backupFileName} -> ${targetFile}`);
      return true;
    } catch (error) {
      console.error('Failed to restore backup:', error);
      return false;
    }
  }

  async getBackupInfo(backupFileName: string): Promise<{ size: number; modified: Date; items: string[] } | null> {
    try {
      const backupPath = path.join(this.backupDir, backupFileName);
      
      if (!await fs.pathExists(backupPath)) {
        return null;
      }

      const stats = await fs.stat(backupPath);
      const data = await fs.readJson(backupPath);
      
      return {
        size: stats.size,
        modified: stats.mtime,
        items: Array.isArray(data.items) ? data.items : []
      };
    } catch (error) {
      console.error('Failed to get backup info:', error);
      return null;
    }
  }
}

// Create a singleton instance
let backupInstance: GroceryListBackup | null = null;

export function getBackupManager(): GroceryListBackup {
  if (!backupInstance) {
    backupInstance = new GroceryListBackup();
  }
  return backupInstance;
}

