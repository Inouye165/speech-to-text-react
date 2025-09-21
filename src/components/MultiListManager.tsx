import { useState, useEffect } from 'react';
import ListPane from './ListPane';
import { ListType } from './types';
import type { List, ListTypeConfig, CreateListRequest } from './types';

interface MultiListManagerProps {
  transcript: string;
}

export default function MultiListManager({ transcript }: MultiListManagerProps) {
  const [lists, setLists] = useState<List[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [listTypes, setListTypes] = useState<ListTypeConfig[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListData, setNewListData] = useState<CreateListRequest>({
    type: ListType.GROCERY,
    name: '',
    description: ''
  });

  // Load lists and list types on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setStatus('loading');
        
        // Load list types
        const typesResponse = await fetch('http://localhost:8787/api/lists/types');
        const typesData = await typesResponse.json();
        setListTypes(typesData.types || []);
        
        // Load existing lists
        const listsResponse = await fetch('http://localhost:8787/api/lists');
        const listsData = await listsResponse.json();
        let loadedLists = listsData.lists || [];
        
        // Check if we need to migrate grocery list
        const hasGroceryList = loadedLists.some((list: List) => list.type === 'grocery');
        if (!hasGroceryList) {
          try {
            const migrateResponse = await fetch('http://localhost:8787/api/lists/migrate-grocery', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            const migrateData = await migrateResponse.json();
            if (migrateData.list) {
              loadedLists = [migrateData.list, ...loadedLists];
            }
          } catch (migrateError) {
            console.warn('Failed to migrate grocery list:', migrateError);
          }
        }
        
        setLists(loadedLists);
        
        // Select first list if none selected and lists exist
        if (loadedLists.length > 0 && !selectedListId) {
          setSelectedListId(loadedLists[0].id);
        }
        
        setStatus('idle');
      } catch (error) {
        console.error('Failed to load data:', error);
        setStatus('error');
      }
    };

    loadData();
  }, [selectedListId]);

  const createList = async () => {
    if (!newListData.name.trim()) return;
    
    try {
      setStatus('loading');
      const response = await fetch('http://localhost:8787/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newListData),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to create list');
      
      const newList = data.list;
      setLists(prev => [...prev, newList]);
      setSelectedListId(newList.id);
      setShowCreateForm(false);
      setNewListData({ type: ListType.GROCERY, name: '', description: '' });
      setStatus('idle');
    } catch (error) {
      console.error('Failed to create list:', error);
      setStatus('error');
    }
  };

  const deleteList = async (listId: string) => {
    if (!confirm('Are you sure you want to delete this list? This action cannot be undone.')) {
      return;
    }
    
    try {
      setStatus('loading');
      const response = await fetch(`http://localhost:8787/api/lists/${listId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || 'Failed to delete list');
      }
      
      setLists(prev => prev.filter(list => list.id !== listId));
      
      // Select another list if the deleted one was selected
      if (selectedListId === listId) {
        const remainingLists = lists.filter(list => list.id !== listId);
        setSelectedListId(remainingLists.length > 0 ? remainingLists[0].id : null);
      }
      
      setStatus('idle');
    } catch (error) {
      console.error('Failed to delete list:', error);
      setStatus('error');
    }
  };

  const selectedList = lists.find(list => list.id === selectedListId);
  const selectedListType = listTypes.find(type => type.type === newListData.type);

  return (
    <div style={{ display: 'flex', gap: '1rem', minHeight: '400px' }}>
      {/* Lists Sidebar */}
      <div style={{ 
        width: '250px', 
        border: '1px solid #424242', 
        borderRadius: 4, 
        padding: '1rem',
        background: '#1a1a1a',
        color: '#e0e0e0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, color: '#e0e0e0' }}>My Lists</h3>
          <button
            onClick={() => setShowCreateForm(true)}
            style={{
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              padding: '0.25rem 0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            + New
          </button>
        </div>

        {/* Create List Form */}
        {showCreateForm && (
          <div style={{ 
            border: '1px solid #424242', 
            borderRadius: 4, 
            padding: '1rem', 
            marginBottom: '1rem',
            background: '#2a2a2a'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem' }}>Create New List</h4>
            
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Type:</label>
              <select
                value={newListData.type}
                onChange={(e) => setNewListData(prev => ({ ...prev, type: e.target.value as ListType }))}
                style={{
                  width: '100%',
                  padding: '0.25rem',
                  background: '#1a1a1a',
                  color: '#e0e0e0',
                  border: '1px solid #424242',
                  borderRadius: 4
                }}
              >
                {listTypes.map(type => (
                  <option key={type.type} value={type.type}>
                    {type.icon} {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Name:</label>
              <input
                type="text"
                value={newListData.name}
                onChange={(e) => setNewListData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter list name"
                style={{
                  width: '100%',
                  padding: '0.25rem',
                  background: '#1a1a1a',
                  color: '#e0e0e0',
                  border: '1px solid #424242',
                  borderRadius: 4
                }}
              />
            </div>

            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Description:</label>
              <input
                type="text"
                value={newListData.description || ''}
                onChange={(e) => setNewListData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
                style={{
                  width: '100%',
                  padding: '0.25rem',
                  background: '#1a1a1a',
                  color: '#e0e0e0',
                  border: '1px solid #424242',
                  borderRadius: 4
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={createList}
                disabled={!newListData.name.trim() || status === 'loading'}
                style={{
                  flex: 1,
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  padding: '0.25rem',
                  cursor: 'pointer',
                  fontSize: '0.75rem'
                }}
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewListData({ type: ListType.GROCERY, name: '', description: '' });
                }}
                style={{
                  flex: 1,
                  background: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  padding: '0.25rem',
                  cursor: 'pointer',
                  fontSize: '0.75rem'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* List Type Info - only show when creating a new list */}
        {selectedListType && showCreateForm && (
          <div style={{ 
            fontSize: '0.75rem', 
            color: '#aaa', 
            marginBottom: '0.5rem',
            padding: '0.5rem',
            background: '#2a2a2a',
            borderRadius: 4
          }}>
            <div>{selectedListType.icon} {selectedListType.name}</div>
            <div style={{ fontSize: '0.625rem', marginTop: '0.25rem' }}>
              {selectedListType.description}
            </div>
          </div>
        )}

        {/* Lists */}
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {lists.length === 0 ? (
            <div style={{ fontSize: '0.75rem', color: '#666', textAlign: 'center', padding: '1rem' }}>
              No lists yet. Create your first list!
            </div>
          ) : (
            lists.map(list => (
              <div
                key={list.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem',
                  marginBottom: '0.25rem',
                  background: selectedListId === list.id ? '#333' : 'transparent',
                  borderRadius: 4,
                  cursor: 'pointer',
                  border: selectedListId === list.id ? '1px solid #4CAF50' : '1px solid transparent'
                }}
                onClick={() => setSelectedListId(list.id)}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>
                    {list.metadata.icon} {list.metadata.name}
                  </div>
                  <div style={{ fontSize: '0.625rem', color: '#aaa' }}>
                    {list.items.length} items
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteList(list.id);
                  }}
                  style={{
                    background: 'transparent',
                    color: '#666',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    fontSize: '0.75rem'
                  }}
                  title="Delete list"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Selected List Content */}
      <div style={{ flex: 1 }}>
        {selectedList ? (
          <ListPane 
            list={selectedList} 
            transcript={transcript}
            onListUpdate={(updatedList: List) => {
              setLists(prev => prev.map(list => 
                list.id === updatedList.id ? updatedList : list
              ));
            }}
          />
        ) : (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '300px',
            color: '#666',
            fontSize: '1.125rem'
          }}>
            {lists.length === 0 ? 'Create your first list to get started!' : 'Select a list to view its contents'}
          </div>
        )}
      </div>
    </div>
  );
}
