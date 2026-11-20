// Offline POS Sync Manager using LocalStorage / IndexedDB fallback

export interface QueuedOfflineSale {
  id: string; // queue item id
  idempotency_key: string;
  tenant_id: string;
  branch_id: string;
  payload: any;
  queued_at: string;
}

const OFFLINE_QUEUE_KEY = 'omni_retail_pos_offline_queue';
const OFFLINE_FORCE_KEY = 'omni_retail_pos_force_offline';

export const offlineSync = {
  isSimulatedOffline(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(OFFLINE_FORCE_KEY) === 'true';
  },

  setSimulatedOffline(value: boolean) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(OFFLINE_FORCE_KEY, value ? 'true' : 'false');
    window.dispatchEvent(new Event('offline-state-change'));
  },

  isOnline(): boolean {
    if (typeof window === 'undefined') return true;
    if (this.isSimulatedOffline()) return false;
    return navigator.onLine;
  },

  getQueuedSales(tenantId?: string): QueuedOfflineSale[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!data) return [];
      const queue: QueuedOfflineSale[] = JSON.parse(data);
      if (tenantId) {
        return queue.filter(q => q.tenant_id === tenantId);
      }
      return queue;
    } catch {
      return [];
    }
  },

  enqueueSale(tenantId: string, branchId: string, idempotencyKey: string, payload: any): QueuedOfflineSale {
    const queue = this.getQueuedSales();
    const item: QueuedOfflineSale = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      idempotency_key: idempotencyKey,
      tenant_id: tenantId,
      branch_id: branchId,
      payload,
      queued_at: new Date().toISOString(),
    };
    queue.push(item);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new Event('offline-queue-change'));
    return item;
  },

  removeQueuedSale(queueId: string) {
    const queue = this.getQueuedSales().filter(q => q.id !== queueId);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new Event('offline-queue-change'));
  },

  clearQueue(tenantId?: string) {
    if (tenantId) {
      const queue = this.getQueuedSales().filter(q => q.tenant_id !== tenantId);
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } else {
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
    }
    window.dispatchEvent(new Event('offline-queue-change'));
  },

  async syncAllQueuedSales(tenantId: string): Promise<{ synced: number; failed: number }> {
    const queue = this.getQueuedSales(tenantId);
    let synced = 0;
    let failed = 0;

    for (const item of queue) {
      try {
        const res = await fetch('/api/pos/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': item.tenant_id,
            'X-Idempotency-Key': item.idempotency_key,
          },
          body: JSON.stringify(item.payload),
        });

        if (res.ok) {
          this.removeQueuedSale(item.id);
          synced++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return { synced, failed };
  },
};
