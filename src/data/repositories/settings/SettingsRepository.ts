import { db } from '@/data/database';
import { defaultSettings, ISettings, SETTINGS_ID } from '@/domain/entities/shared/Settings';

/**
 * The settings singleton. `get` never returns undefined: a store that has not
 * been seeded yet (a fresh install, or a snapshot pulled from a device running
 * an older schema) answers with the defaults rather than forcing every caller
 * to handle a missing row.
 */
export class SettingsRepository {
  public async get(): Promise<ISettings> {
    return (await db.settings.get(SETTINGS_ID)) ?? defaultSettings();
  }

  public async save(settings: ISettings): Promise<ISettings> {
    const row = { ...settings, id: SETTINGS_ID };
    await db.settings.put(row);
    return row;
  }
}
