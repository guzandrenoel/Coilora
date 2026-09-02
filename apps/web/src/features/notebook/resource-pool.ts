type Resource<T> = {
  key: string;
  value: Promise<T>;
  users: number;
  used: number;
  evicting?: boolean;
};

/** A bounded, lease-based cache. Busy resources are never evicted. */
export class ResourcePool<T> {
  private entries = new Map<string, Resource<T>>();
  private waiting = new Set<() => void>();
  private disposed = false;
  private clock = 0;
  private capacity: number;
  private load: (key: string) => Promise<T>;
  private destroy: (value: T) => Promise<void>;
  constructor(
    capacity: number,
    load: (key: string) => Promise<T>,
    destroy: (value: T) => Promise<void>,
  ) {
    if (!Number.isInteger(capacity) || capacity < 1)
      throw new Error("Invalid pool capacity.");
    this.capacity = capacity;
    this.load = load;
    this.destroy = destroy;
  }
  async acquire(
    key: string,
    signal: AbortSignal,
  ): Promise<{ value: T; release: () => void }> {
    while (true) {
      signal.throwIfAborted();
      if (this.disposed) throw new Error("Notebook closed.");
      let entry = this.entries.get(key);
      if (entry?.evicting) {
        await this.wait(signal);
        continue;
      }
      if (!entry && this.entries.size >= this.capacity) {
        const oldest = [...this.entries.values()]
          .filter((item) => item.users === 0)
          .sort((a, b) => a.used - b.used)[0];
        if (oldest) {
          oldest.users++;
          oldest.evicting = true;
          await oldest.value.then(this.destroy).catch(() => undefined);
          this.entries.delete(oldest.key);
          this.wake();
          continue;
        }
        await this.wait(signal);
        continue;
      }
      if (!entry) {
        entry = { key, value: this.load(key), users: 0, used: ++this.clock };
        this.entries.set(key, entry);
      }
      entry.users++;
      let loaded = false;
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        entry.users--;
        entry.used = ++this.clock;
        this.wake();
      };
      try {
        const value = await entry.value;
        loaded = true;
        signal.throwIfAborted();
        if (this.disposed) throw new Error("Notebook closed.");
        return { value, release };
      } catch (error) {
        release();
        if (!loaded && entry.users === 0 && this.entries.get(key) === entry) {
          this.entries.delete(key);
          void entry.value.then(this.destroy).catch(() => undefined);
          this.wake();
        }
        throw error;
      }
    }
  }
  private wait(signal: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
      const wake = () => {
        signal.removeEventListener("abort", abort);
        this.waiting.delete(wake);
        resolve();
      };
      const abort = () => {
        this.waiting.delete(wake);
        reject(new DOMException("Cancelled", "AbortError"));
      };
      this.waiting.add(wake);
      signal.addEventListener("abort", abort, { once: true });
    });
  }
  private wake() {
    for (const wake of [...this.waiting]) wake();
  }
  dispose() {
    this.disposed = true;
    for (const entry of this.entries.values()) {
      if (!entry.evicting)
        void entry.value.then(this.destroy).catch(() => undefined);
    }
    this.entries.clear();
    this.wake();
  }
}
