import { APP_ERROR_CODES, parseAppError } from '../shared/app-errors.mjs';

export function getErrorPresentation(error) {
    const parsed = parseAppError(error);

    switch (parsed.code) {
        case APP_ERROR_CODES.LICENSE_REQUIRED:
            return {
                title: 'Keine aktive Lizenz',
                appearance: 'warning',
                description: parsed.message,
                recoveryHint:
                    'Aktiviere eine Trial- oder Paid-Lizenz für diese Installation, bevor die Analyse weiter genutzt wird.'
            };
        case APP_ERROR_CODES.DAILY_LIMIT_REACHED:
            return {
                title: 'Tageslimit erreicht',
                appearance: 'warning',
                description: parsed.message,
                recoveryHint:
                    'Dieses Tenant-Kontingent wird am nächsten Tag automatisch zurückgesetzt.'
            };
        case APP_ERROR_CODES.MONTHLY_LIMIT_REACHED:
            return {
                title: 'Monatslimit erreicht',
                appearance: 'warning',
                description: parsed.message,
                recoveryHint:
                    'Das Monatskontingent wird im nächsten Kalendermonat automatisch zurückgesetzt.'
            };
        case APP_ERROR_CODES.USER_HOURLY_LIMIT_REACHED:
            return {
                title: 'Zu viele Anfragen in kurzer Zeit',
                appearance: 'warning',
                description: parsed.message,
                recoveryHint:
                    'Bitte warte bis zum Beginn der nächsten Stunde, bevor du erneut eine Analyse startest.'
            };
        default:
            return {
                title: 'Analyse konnte nicht abgeschlossen werden',
                appearance: 'error',
                description: parsed.message || 'Bitte erneut versuchen.',
                recoveryHint:
                    'Prüfe `OPEN_API_KEY`, Jira-Berechtigungen und ob Beschreibung oder Akzeptanzkriterien vorhanden sind.'
            };
    }
}
