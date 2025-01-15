class LocalGallery {
  constructor() {
    this.dbName = 'imageGalleryDB';
    this.dbVersion = 1;
    this.storeName = 'images';
    this.db = null;
    this.initDB();
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error("Error opening local gallery DB");
        reject(request.error);
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('username', 'username', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
        }
      };
    });
  }

  async addImage(image) {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(image);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getImages() {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteImage(id) {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateImage(id, updates) {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        const image = request.result;
        const updatedImage = { ...image, ...updates };
        const putRequest = store.put(updatedImage);
        putRequest.onsuccess = () => resolve(updatedImage);
        putRequest.onerror = () => reject(putRequest.error);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async ensureDB() {
    if (!this.db) {
      await this.initDB();
    }
  }

  async syncWithRemote(remoteImages) {
    await this.ensureDB();
    const localImages = await this.getImages();
    
    // Create a map of remote images by ID
    const remoteImageMap = new Map(remoteImages.map(img => [img.id, img]));
    
    // Update or add remote images locally
    for (const remoteImage of remoteImages) {
      await this.addImage(remoteImage);
    }
    
    // Remove local images that no longer exist remotely
    for (const localImage of localImages) {
      if (!remoteImageMap.has(localImage.id)) {
        await this.deleteImage(localImage.id);
      }
    }
  }
}