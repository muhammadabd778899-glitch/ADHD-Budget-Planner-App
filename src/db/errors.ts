export type AppErrorCode =
  'VALIDATION' | 'NOT_FOUND' | 'CONFLICT' | 'STORAGE' | 'RESTORE' | 'READ_ONLY' | 'UNKNOWN';

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly details?: string[];

  constructor(code: AppErrorCode, message: string, details?: string[]) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function asAppError(error: unknown): AppError {
  if (isAppError(error)) return error;
  if (error instanceof Error) {
    if (/quota/i.test(error.name) || /quota/i.test(error.message)) {
      return new AppError(
        'STORAGE',
        'This browser is out of storage space for Harbor. Export a backup, then free some space.',
      );
    }
    if (/DatabaseClosed|InvalidState|VersionError/i.test(error.name)) {
      return new AppError(
        'STORAGE',
        'Harbor could not open its local database. Close other Harbor tabs and reload.',
      );
    }
    return new AppError('UNKNOWN', 'Something went wrong. Your saved data was not changed.');
  }
  return new AppError('UNKNOWN', 'Something went wrong. Your saved data was not changed.');
}

export interface UserSafeError {
  title: string;
  message: string;
  details?: string[];
}

export function describeError(error: unknown): UserSafeError {
  const appError = asAppError(error);
  switch (appError.code) {
    case 'VALIDATION':
      return {
        title: 'Please check the details',
        message: appError.message,
        details: appError.details,
      };
    case 'NOT_FOUND':
      return { title: 'That record is no longer here', message: appError.message };
    case 'CONFLICT':
      return { title: 'That action is not available', message: appError.message };
    case 'STORAGE':
      return { title: 'Local storage needs attention', message: appError.message };
    case 'RESTORE':
      return {
        title: 'This restore was stopped',
        message: appError.message,
        details: appError.details,
      };
    default:
      return { title: 'Something did not finish', message: appError.message };
  }
}
