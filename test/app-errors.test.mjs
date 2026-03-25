import test from 'node:test';
import assert from 'node:assert/strict';
import {
    APP_ERROR_CODES,
    createAppError,
    parseAppError,
    serializeAppError
} from '../src/shared/app-errors.mjs';
import { getErrorPresentation } from '../src/frontend/error-utils.mjs';

test('serializeAppError and parseAppError round-trip app errors', () => {
    const raw = serializeAppError({
        code: APP_ERROR_CODES.DAILY_LIMIT_REACHED,
        message: 'Tageslimit erreicht'
    });

    assert.deepEqual(parseAppError(raw), {
        code: APP_ERROR_CODES.DAILY_LIMIT_REACHED,
        message: 'Tageslimit erreicht'
    });
});

test('createAppError creates a parseable error payload', () => {
    const error = createAppError(APP_ERROR_CODES.LICENSE_REQUIRED, 'Lizenz fehlt');

    assert.deepEqual(parseAppError(error), {
        code: APP_ERROR_CODES.LICENSE_REQUIRED,
        message: 'Lizenz fehlt'
    });
});

test('parseAppError falls back to generic errors for plain messages', () => {
    assert.deepEqual(parseAppError(new Error('Etwas ist schiefgelaufen')), {
        code: APP_ERROR_CODES.GENERIC,
        message: 'Etwas ist schiefgelaufen'
    });
});

test('parseAppError extracts embedded app errors from invoke wrapper messages', () => {
    assert.deepEqual(
        parseAppError(
            new Error(
                'There was an error invoking the function - APP_ERROR::{"code":"USER_HOURLY_LIMIT_REACHED","message":"Limit"}'
            )
        ),
        {
            code: APP_ERROR_CODES.USER_HOURLY_LIMIT_REACHED,
            message: 'Limit'
        }
    );
});

test('getErrorPresentation maps daily limit errors to a warning state', () => {
    const error = createAppError(
        APP_ERROR_CODES.DAILY_LIMIT_REACHED,
        'Tageslimit für diese Installation erreicht. Bitte morgen erneut versuchen.'
    );

    assert.deepEqual(getErrorPresentation(error), {
        title: 'Tageslimit erreicht',
        appearance: 'warning',
        description: 'Bitte versuche es morgen erneut.'
    });
});

test('getErrorPresentation maps monthly, hourly and license errors correctly', () => {
    assert.equal(
        getErrorPresentation(createAppError(APP_ERROR_CODES.MONTHLY_LIMIT_REACHED, 'Monatslimit')).title,
        'Monatslimit erreicht'
    );
    assert.equal(
        getErrorPresentation(createAppError(APP_ERROR_CODES.MONTHLY_LIMIT_REACHED, 'Monatslimit')).description,
        'Bitte versuche es im nächsten Monat erneut.'
    );
    assert.equal(
        getErrorPresentation(createAppError(APP_ERROR_CODES.USER_HOURLY_LIMIT_REACHED, 'Stundenlimit')).title,
        'Stundenlimit erreicht'
    );
    assert.equal(
        getErrorPresentation(createAppError(APP_ERROR_CODES.USER_HOURLY_LIMIT_REACHED, 'Stundenlimit')).description,
        'Bitte versuche es in der nächsten Stunde erneut.'
    );
    assert.equal(
        getErrorPresentation(createAppError(APP_ERROR_CODES.LICENSE_REQUIRED, 'Lizenz fehlt')).title,
        'Keine aktive Lizenz'
    );
});
