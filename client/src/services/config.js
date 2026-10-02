export const config = {
  useMocks: import.meta.env.VITE_USE_MOCKS === 'true',
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, ''),
  mockLatencyMs: Number(import.meta.env.VITE_MOCK_LATENCY_MS ?? 400),
}
