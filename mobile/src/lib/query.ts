import { QueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

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

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "toolkit-query-cache-v1",
  throttleTime: 1_000,
});

export const QUERY_CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
