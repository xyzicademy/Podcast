export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('audio-studio-db', 1);
    
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('backups')) {
        db.createObjectStore('backups');
      }
    };
    
    request.onsuccess = (e: any) => resolve(e.target.result);
    request.onerror = (e) => reject(e);
  });
};

export const saveBackup = async (key: string, data: any): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('backups', 'readwrite');
    const store = tx.objectStore('backups');
    const request = store.put(data, key);
    
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e);
  });
};

export const loadBackup = async (key: string): Promise<any> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('backups', 'readonly');
    const store = tx.objectStore('backups');
    const request = store.get(key);
    
    request.onsuccess = (e: any) => resolve(e.target.result);
    request.onerror = (e) => reject(e);
  });
};

export const deleteBackup = async (key: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('backups', 'readwrite');
    const store = tx.objectStore('backups');
    const request = store.delete(key);
    
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e);
  });
};
