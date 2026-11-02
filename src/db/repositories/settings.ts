import type { Settings } from '@/domain/types';
import { settingsSchema } from '@/domain/schemas';
import type { TideDatabase } from '@/db/database';
import { AppError } from '@/db/errors';
import { defaultSettings } from '@/db/defaults';
import { nowIso } from '@/lib/ids';

export type SettingsPatch = Partial<
  Omit<Settings, 'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'>
>;

export function createSettingsRepository(database: TideDatabase) {
  return {
    async get(): Promise<Settings> {
      const record = await database.settings.get('app');
      if (!record) {
        throw new AppError(
          'NOT_FOUND',
          'Tide could not find its settings. Reload to finish setup.',
        );
      }
      return record;
    },

    async ensure(): Promise<Settings> {
      const existing = await database.settings.get('app');
      if (existing) return existing;
      const created = defaultSettings();
      const parsed = settingsSchema.safeParse(created);
      if (!parsed.success) {
        throw new AppError('VALIDATION', 'Tide could not create its initial settings.');
      }
      await database.settings.add(parsed.data);
      return parsed.data;
    },

    async update(patch: SettingsPatch): Promise<Settings> {
      const current = await this.get();
      const next: Settings = {
        ...current,
        ...patch,
        id: 'app',
        schemaVersion: 2,
        updatedAt: nowIso(),
      };
      const parsed = settingsSchema.safeParse(next);
      if (!parsed.success) {
        throw new AppError(
          'VALIDATION',
          'Those settings could not be saved.',
          parsed.error.issues.map((issue) => issue.message),
        );
      }
      await database.settings.put(parsed.data);
      return parsed.data;
    },

    async completeOnboarding(patch: SettingsPatch): Promise<Settings> {
      return this.update({ ...patch, onboardingComplete: true });
    },
  };
}

export type SettingsRepository = ReturnType<typeof createSettingsRepository>;
