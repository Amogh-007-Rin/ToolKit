import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: (attempt, error) => {
        const status = error instanceof ApiError ? error.status : 0;
        return status >= 400 && status < 500 ? false : attempt < 2;
      },
    },
    mutations: { retry: false },
  },
});

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
