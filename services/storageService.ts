
import { StoryData, Scene, Character } from '../types';
import { useStoryStore } from '../store/useStoryStore';

const DB_NAME = 'StoryBoardDB';
const DB_VERSION = 2;
const STORE_NAME = 'stories';

// Helpers for Blob <-> Base64 conversion
const base64ToBlob = async (base64: string): Promise<Blob> => {
  const res = await fetch(base64);
  return res.blob();
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const storageService = {
  async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
        // Clean up old store if exists from version 1
        if (db.objectStoreNames.contains('drafts')) {
            db.deleteObjectStore('drafts');
        }
      };

      request.onsuccess = () => resolve(request.result);
    });
  },

  /**
   * Serializes the story state, converting heavy Base64 strings to Blobs for efficient storage.
   */
  async prepareForStorage(story: StoryData, settings: any, savedCharacters: Character[]): Promise<any> {
    const clonedStory = JSON.parse(JSON.stringify(story));
    const clonedSettings = JSON.parse(JSON.stringify(settings));
    const clonedChars = JSON.parse(JSON.stringify(savedCharacters));

    // 1. Process Scenes Images
    for (const scene of clonedStory.scenes) {
      if (scene.imageUrl && scene.imageUrl.startsWith('data:')) {
        scene.imageUrl = await base64ToBlob(scene.imageUrl);
      }
    }

    // 2. Process Settings (Original Images)
    if (clonedSettings.originalImages) {
        clonedSettings.originalImages = await Promise.all(
            clonedSettings.originalImages.map(async (img: any) => {
                if (typeof img === 'string' && img.startsWith('data:')) {
                    return await base64ToBlob(img);
                }
                return img;
            })
        );
    }

    // 3. Process Saved Characters
    for (const char of clonedChars) {
      if (char.imageUrl && char.imageUrl.startsWith('data:')) {
        char.imageUrl = await base64ToBlob(char.imageUrl);
      }
    }

    return {
      ...clonedStory,
      _settings: clonedSettings,
      _savedCharacters: clonedChars,
      lastModified: Date.now()
    };
  },

  /**
   * Deserializes the story state, converting stored Blobs back to Base64 strings.
   */
  async restoreFromStorage(storedData: any): Promise<{ story: StoryData, settings: any, savedCharacters: Character[] }> {
    // 1. Restore Scenes
    for (const scene of storedData.scenes) {
      if (scene.imageUrl instanceof Blob) {
        scene.imageUrl = await blobToBase64(scene.imageUrl);
      }
    }

    // 2. Restore Settings
    const settings = storedData._settings || {};
    if (settings.originalImages) {
        settings.originalImages = await Promise.all(
            settings.originalImages.map(async (img: any) => {
                if (img instanceof Blob) {
                    return await blobToBase64(img);
                }
                return img;
            })
        );
    }

    // 3. Restore Characters
    const savedCharacters = storedData._savedCharacters || [];
    for (const char of savedCharacters) {
      if (char.imageUrl instanceof Blob) {
        char.imageUrl = await blobToBase64(char.imageUrl);
      }
    }

    // Clean up internal fields
    const story = { ...storedData };
    delete story._settings;
    delete story._savedCharacters;

    return { story, settings, savedCharacters };
  },

  async saveStory(story: StoryData, settings: any, savedCharacters: Character[]): Promise<void> {
    try {
      const db = await this.getDB();
      const dataToSave = await this.prepareForStorage(story, settings, savedCharacters);
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(dataToSave);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to save story:', error);
      throw error;
    }
  },

  async loadStory(id: string): Promise<{ story: StoryData, settings: any, savedCharacters: Character[] } | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = async () => {
           if (request.result) {
              const restored = await this.restoreFromStorage(request.result);
              resolve(restored);
           } else {
              resolve(null);
           }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to load story:', error);
      return null;
    }
  },

  async getAllStories(): Promise<Partial<StoryData>[]> {
     try {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
           const transaction = db.transaction(STORE_NAME, 'readonly');
           const store = transaction.objectStore(STORE_NAME);
           const request = store.getAll(); // Be careful if too many items, might need cursor
           
           request.onsuccess = async () => {
              // Only return lightweight metadata + thumbnail
              const summaries = await Promise.all(request.result.map(async (item: any) => {
                 // Try to get a thumbnail
                 let thumbnail = null;
                 if (item.scenes && item.scenes.length > 0) {
                    const firstImg = item.scenes.find((s:any) => s.imageUrl)?.imageUrl;
                    if (firstImg instanceof Blob) {
                        thumbnail = await blobToBase64(firstImg);
                    } else {
                        thumbnail = firstImg;
                    }
                 }

                 return {
                    id: item.id,
                    title: item.title,
                    createdAt: item.createdAt,
                    lastModified: item.lastModified,
                    mode: item.mode,
                    thumbnail // Add a thumbnail property to the partial
                 };
              }));
              
              // Sort by last modified descending
              summaries.sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
              resolve(summaries);
           };
           request.onerror = () => reject(request.error);
        });
     } catch (error) {
        return [];
     }
  },

  async deleteStory(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to delete story:', error);
    }
  }
};
