export async function measureServerOperation<T>(
  name: string,
  operation: () => Promise<T>,
): Promise<T> {
  if (process.env.NODE_ENV !== "development") return operation();

  const startedAt = performance.now();
  try {
    return await operation();
  } finally {
    console.info(
      `[perf] ${name}: ${(performance.now() - startedAt).toFixed(1)}ms`,
    );
  }
}
