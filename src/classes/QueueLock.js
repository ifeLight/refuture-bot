/**
 * This Lock is to prevent Idicators and startegies from running at the same time
 */

 class QueueLock {
     constructor() {
        this._locks = {};
     }

     createKey(key1, key2) {
         return `${key1}_${key2}`;
     }

     open(key1, key2) {
        const key = this.createKey(key1, key2);
        this._locks[key] = false;
     }
     

     close (key1, key2) {
        const key = this.createKey(key1, key2);
        this._locks[key] = true;
     }

     isOpen(key1, key2) {
        const key = this.createKey(key1, key2);
        return !this._locks[key] ? true : false;
     }
 }

 module.exports = QueueLock;