declare module "bun:test" {
  export function describe(name: string, body: () => void): void;
  export function test(name: string, body: () => void | Promise<void>): void;
  export function expect<T>(actual: T): {
    toEqual(expected: unknown): void;
    toBe(expected: unknown): void;
  };
}
