import { fetchNewsFeed, NewsSourceError } from '@/data/news/AlphaVantageNews';
import { clearCachedFeed } from '@/data/news/NewsCache';
import { SettingsRepository } from '@/data/repositories/settings/SettingsRepository';
import { INewsProviderSettings, normaliseNewsProviderSettings } from '../entities/shared/Settings';

/**
 * The news provider key.
 *
 * A service of its own rather than another field on the AI provider editor: the
 * two are different services with different keys, and a user running a local
 * model has no AI key to attach a news key to. Deliberately *not* a
 * `src/data/llm/state.ts`-style synchronous cache — that pattern exists so
 * `settings.ai` can be read during render, and it carries the obligation to
 * re-hydrate after every path that replaces the settings row. Nothing here needs
 * to be read synchronously.
 */
export class NewsService {
  private readonly settingsRepository: SettingsRepository;

  constructor() {
    this.settingsRepository = new SettingsRepository();
  }

  public async getSettings(): Promise<INewsProviderSettings> {
    return normaliseNewsProviderSettings((await this.settingsRepository.get()).news);
  }

  public async saveSettings(news: INewsProviderSettings): Promise<INewsProviderSettings> {
    const normalised = normaliseNewsProviderSettings(news);
    const settings = await this.settingsRepository.get();
    await this.settingsRepository.save({ ...settings, news: normalised });

    // The cached feed was fetched under the old key. Dropping it means the next
    // question fetches afresh rather than serving articles the new key never
    // paid for — and, if the key was removed, that nothing is served at all.
    clearCachedFeed();

    return normalised;
  }

  /**
   * Verifies the key by fetching once. Costs one request out of the free tier's
   * 25 a day, which is why the view says so before the user presses it.
   *
   * The fetched feed is *not* cached: a test is a check on the credential, and
   * priming the cache from it would make the next question's freshness depend on
   * when the user last visited Settings.
   *
   * Zero articles fails the test rather than passing it with a count of nothing.
   * The point of this button is to answer "will the assistant get news?", and a
   * key that authenticates onto an empty feed answers no — which is exactly what
   * the topic-filter bug did, while reporting "Fetched 0 articles." as a success.
   * A test that renders its own failure symptom as a tick is worse than no test.
   */
  public async testConnection(apiKey: string): Promise<string> {
    const articles = await fetchNewsFeed(apiKey);

    if (articles.length === 0) {
      throw new NewsSourceError(
        'The key was accepted, but the provider returned no articles — the assistant would see no news.'
      );
    }

    return `Fetched ${articles.length} articles.`;
  }
}
