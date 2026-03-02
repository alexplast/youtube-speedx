export const sleep = (timeoutMs: number) => new Promise<void>(resolve => setTimeout(resolve, timeoutMs));

