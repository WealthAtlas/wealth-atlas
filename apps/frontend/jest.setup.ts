// jest.setup.ts
// This file is imported in jest.config.ts to setup global test environment

// Mock fetch API
global.fetch = jest.fn(() => 
  Promise.resolve({
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers(),
  } as Response)
) as jest.Mock;

// Mock window methods used by scriptExecutor
Object.defineProperty(window, 'setTimeout', {
  value: global.setTimeout,
  writable: true,
});

Object.defineProperty(window, 'clearTimeout', {
  value: global.clearTimeout,
  writable: true,
});

// Reset mocks before each test
beforeEach(() => {
  jest.resetAllMocks();
});
