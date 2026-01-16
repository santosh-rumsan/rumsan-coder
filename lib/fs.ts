/**
 * Browser filesystem wrapper using LightningFS (IndexedDB)
 */
import FS from '@isomorphic-git/lightning-fs';

let fsInstance: FS | null = null;

export function getFS(): FS {
  if (typeof window === 'undefined') {
    throw new Error('LightningFS only works in browser');
  }
  
  if (!fsInstance) {
    fsInstance = new FS('fs', { wipe: false });
  }
  
  return fsInstance;
}

export function resetFS(): void {
  if (typeof window === 'undefined') return;
  fsInstance = new FS('fs', { wipe: true });
}
