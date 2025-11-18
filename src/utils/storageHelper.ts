/**
 * StorageHelper - Wrapper cho localStorage với fallback mechanism
 * 
 * Giải quyết vấn đề:
 * - localStorage không hoạt động trên một số trình duyệt cũ/yếu
 * - Private/Incognito mode disable localStorage
 * - Thiết bị yếu có bộ nhớ hạn chế
 * - File:// protocol không hỗ trợ localStorage
 * 
 * @example
 * ```typescript
 * import { StorageHelper } from './storageHelper';
 * 
 * StorageHelper.setItem('token', 'abc123');
 * const token = StorageHelper.getItem('token');
 * ```
 */

export class StorageHelper {
    private static memoryStorage: Map<string, string> = new Map();
    private static isLocalStorageAvailable: boolean | null = null;

    /**
     * Kiểm tra xem localStorage có hoạt động không
     */
    static checkLocalStorage(): boolean {
        // Cache result để tránh check nhiều lần
        if (this.isLocalStorageAvailable !== null) {
            return this.isLocalStorageAvailable;
        }

        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            this.isLocalStorageAvailable = true;
            console.log('✅ localStorage is available');
            return true;
        } catch (e) {
            console.warn('⚠️ localStorage not available, using memory fallback', e);
            this.isLocalStorageAvailable = false;
            return false;
        }
    }

    /**
     * Lưu item vào storage
     * Tự động fallback sang memory nếu localStorage fail
     */
    static setItem(key: string, value: string): void {
        try {
            if (this.checkLocalStorage()) {
                localStorage.setItem(key, value);
            }
            // Always save to memory as backup
            this.memoryStorage.set(key, value);
        } catch (error) {
            console.error('❌ Error saving to localStorage, using memory fallback:', error);
            this.memoryStorage.set(key, value);
        }
    }

    /**
     * Lấy item từ storage
     * Tự động fallback sang memory nếu localStorage fail
     */
    static getItem(key: string): string | null {
        try {
            if (this.checkLocalStorage()) {
                const value = localStorage.getItem(key);
                if (value !== null) {
                    // Sync to memory for consistency
                    this.memoryStorage.set(key, value);
                    return value;
                }
            }
        } catch (error) {
            console.error('❌ Error reading from localStorage, using memory fallback:', error);
        }
        
        // Fallback to memory
        return this.memoryStorage.get(key) || null;
    }

    /**
     * Xóa item khỏi storage
     */
    static removeItem(key: string): void {
        try {
            if (this.checkLocalStorage()) {
                localStorage.removeItem(key);
            }
        } catch (error) {
            console.error('❌ Error removing from localStorage:', error);
        }
        this.memoryStorage.delete(key);
    }

    /**
     * Xóa toàn bộ storage
     */
    static clear(): void {
        try {
            if (this.checkLocalStorage()) {
                localStorage.clear();
            }
        } catch (error) {
            console.error('❌ Error clearing localStorage:', error);
        }
        this.memoryStorage.clear();
    }

    /**
     * Lấy tất cả keys trong storage
     */
    static keys(): string[] {
        const keys = new Set<string>();

        try {
            if (this.checkLocalStorage()) {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key) keys.add(key);
                }
            }
        } catch (error) {
            console.error('❌ Error reading localStorage keys:', error);
        }

        // Add memory keys
        this.memoryStorage.forEach((_, key) => keys.add(key));

        return Array.from(keys);
    }

    /**
     * Kiểm tra key có tồn tại không
     */
    static hasItem(key: string): boolean {
        return this.getItem(key) !== null;
    }

    /**
     * Get storage info for debugging
     */
    static getStorageInfo(): {
        isLocalStorageAvailable: boolean;
        memoryStorageSize: number;
        localStorageSize: number;
    } {
        let localStorageSize = 0;
        try {
            if (this.checkLocalStorage()) {
                localStorageSize = localStorage.length;
            }
        } catch (error) {
            console.error('Error getting localStorage size:', error);
        }

        return {
            isLocalStorageAvailable: this.isLocalStorageAvailable ?? false,
            memoryStorageSize: this.memoryStorage.size,
            localStorageSize
        };
    }
}
