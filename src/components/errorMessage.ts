/**
 * Reads a human-readable message from a caught value of unknown type.
 * Works for Error instances and for plain error objects such as Supabase's
 * PostgrestError, which are not Error instances but carry a string `message`.
 * Returns undefined when no message is present, so callers can fall back with `??`/`||`.
 */
export const errorMessage = (error: unknown): string | undefined => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return undefined;
};
