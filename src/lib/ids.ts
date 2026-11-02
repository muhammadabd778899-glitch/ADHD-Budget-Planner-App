export function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function isSampleId(id: string): boolean {
  return id.startsWith('sample-');
}

export function safeId(prefix: string, seed: string): string {
  return `${prefix}-${seed.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}
