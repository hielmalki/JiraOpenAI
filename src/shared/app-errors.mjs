export const APP_ERROR_CODES = {
    LICENSE_REQUIRED: 'LICENSE_REQUIRED',
    DAILY_LIMIT_REACHED: 'DAILY_LIMIT_REACHED',
    MONTHLY_LIMIT_REACHED: 'MONTHLY_LIMIT_REACHED',
    USER_HOURLY_LIMIT_REACHED: 'USER_HOURLY_LIMIT_REACHED',
    GENERIC: 'GENERIC'
};

const ERROR_PREFIX = 'APP_ERROR::';

export function createAppError(code, message) {
    const error = new Error(serializeAppError({ code, message }));
    error.code = code;
    return error;
}

export function serializeAppError({ code, message }) {
    return `${ERROR_PREFIX}${JSON.stringify({ code, message })}`;
}

export function parseAppError(rawError) {
    const message = rawError instanceof Error ? rawError.message : String(rawError || '');
    if (!message.startsWith(ERROR_PREFIX)) {
        return {
            code: APP_ERROR_CODES.GENERIC,
            message
        };
    }

    try {
        const parsed = JSON.parse(message.slice(ERROR_PREFIX.length));
        return {
            code: parsed?.code || APP_ERROR_CODES.GENERIC,
            message: parsed?.message || 'Unbekannter Fehler'
        };
    } catch {
        return {
            code: APP_ERROR_CODES.GENERIC,
            message
        };
    }
}
