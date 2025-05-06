export interface Context {
  req: {
    headers: Record<string, string>;
    user?: {
      userId: string;
    };
  };
}