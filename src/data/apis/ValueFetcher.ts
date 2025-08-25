export class ValueFetcher {
  async fetchValue(path: string): Promise<number> {
    const response = await fetch(path);
    const data = await response.json();
    return data.value;
  }
}
