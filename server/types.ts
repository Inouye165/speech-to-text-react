// List types and interfaces for the multi-list system

export interface ListItem {
  id: string;
  text: string;
  completed?: boolean;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface ListMetadata {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface List {
  id: string;
  type: ListType;
  metadata: ListMetadata;
  items: ListItem[];
  settings: ListSettings;
}

export interface ListSettings {
  allowDuplicates: boolean;
  maxItems?: number;
  sortOrder: 'manual' | 'alphabetical' | 'created' | 'updated';
  autoComplete?: boolean;
}

export enum ListType {
  GROCERY = 'grocery',
  TODO = 'todo',
  MOVIE = 'movie',
  BIRTHDAY = 'birthday',
  IMPORTANT_DATES = 'important_dates',
  CUSTOM = 'custom'
}

export interface ListTypeConfig {
  type: ListType;
  name: string;
  description: string;
  icon: string;
  color: string;
  systemPrompt: string;
  defaultSettings: ListSettings;
  itemTemplate?: string;
}

export interface CreateListRequest {
  type: ListType;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  settings?: Partial<ListSettings>;
}

export interface UpdateListRequest {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  settings?: Partial<ListSettings>;
}

export interface ProcessTranscriptRequest {
  listId: string;
  transcript: string;
}

export interface ProcessTranscriptResponse {
  items: ListItem[];
  reasoning: string;
  changes: {
    added: ListItem[];
    removed: ListItem[];
    modified: ListItem[];
  };
}
