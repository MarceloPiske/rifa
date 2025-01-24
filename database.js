class RifaDatabase {
  constructor() {
    this.dbName = 'RifasDB';
    this.dbVersion = 1;
    this.db = null;
  }

  async openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        this.db = event.target.result;
        if (!this.db.objectStoreNames.contains('rifas')) {
          this.db.createObjectStore('rifas', { keyPath: 'id', autoIncrement: true });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        reject('Erro ao abrir banco de dados');
      };
    });
  }

  async addRifa(rifa) {
    await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['rifas'], 'readwrite');
      const store = transaction.objectStore('rifas');
      const request = store.add(rifa);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject('Erro ao adicionar rifa');
    });
  }

  async getAllRifas() {
    await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['rifas'], 'readonly');
      const store = transaction.objectStore('rifas');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject('Erro ao buscar rifas');
    });
  }

  async updateRifa(rifa) {
    await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['rifas'], 'readwrite');
      const store = transaction.objectStore('rifas');
      const request = store.put(rifa);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject('Erro ao atualizar rifa');
    });
  }
}
