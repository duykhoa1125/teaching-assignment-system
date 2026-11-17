const clearListeners = new Set<() => void>();

export function subscribeToastClear(listener: () => void): () => void {
    clearListeners.add(listener);
    return () => {
        clearListeners.delete(listener);
    };
}

export function clearActiveToasts(): void {
    for (const listener of clearListeners) {
        listener();
    }
}
