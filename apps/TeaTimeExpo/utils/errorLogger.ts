type ErrorContext = Record<string, unknown>;

const buildErrorDetails = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error) {
    const details: Record<string, unknown> = {
      name: error.name,
      message: error.message,
    };

    if (error.stack) {
      details.stack = error.stack;
    }

    const typedError = error as Error & {
      recoverySuggestion?: unknown;
      underlyingError?: unknown;
    };

    if (typeof typedError.recoverySuggestion !== 'undefined') {
      details.recoverySuggestion = typedError.recoverySuggestion;
    }

    if (typeof typedError.underlyingError !== 'undefined') {
      details.underlyingError = typedError.underlyingError;
    }

    return details;
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  if (error && typeof error === 'object') {
    return error as Record<string, unknown>;
  }

  return { message: 'Unknown error' };
};

export const logError = (
  scope: string,
  step: string,
  error: unknown,
  context?: ErrorContext
): void => {
  console.error(`[${scope}] ${step} failed`, {
    ...(context ?? {}),
    ...buildErrorDetails(error),
  });
};
