// Domain Asset entity - will evolve into a class with business logic
export interface Asset {
  id?: number;
  name: string;
  description?: string;
}

// Future: This will become a class like this:
/*
export class Asset {
  constructor(
    public readonly id: number | undefined,
    public readonly name: string,
    public readonly description?: string
  ) {
    this.validateName();
  }

  private validateName(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Asset name cannot be empty');
    }
  }

  // Business logic methods
  isSimilarTo(other: Asset): boolean {
    return this.name.toLowerCase() === other.name.toLowerCase();
  }

  getDisplayName(): string {
    return this.description ? `${this.name} - ${this.description}` : this.name;
  }

  // Add more business logic as needed
}
*/