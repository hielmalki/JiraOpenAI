import { APP_ERROR_CODES, parseAppError } from '../shared/app-errors.mjs';

export function getErrorPresentation(error) {
    const parsed = parseAppError(error);

    switch (parsed.code) {
        case APP_ERROR_CODES.LICENSE_REQUIRED:
            return {
                title: 'Keine aktive Lizenz',
                appearance: 'warning',
                description: 'Für diese Installation ist aktuell keine aktive Lizenz vorhanden.'
            };
        case APP_ERROR_CODES.TRIAL_EXPIRED:
            return {
                title: 'Testzeitraum beendet',
                appearance: 'warning',
                description: 'Bitte aktiviere eine bezahlte Lizenz, um weitere Analysen zu starten.'
            };
        case APP_ERROR_CODES.DAILY_LIMIT_REACHED:
            return {
                title: 'Tageslimit erreicht',
                appearance: 'warning',
                description: 'Bitte versuche es morgen erneut.'
            };
        case APP_ERROR_CODES.MONTHLY_LIMIT_REACHED:
            return {
                title: 'Monatslimit erreicht',
                appearance: 'warning',
                description: 'Bitte versuche es im nächsten Monat erneut.'
            };
        case APP_ERROR_CODES.USER_HOURLY_LIMIT_REACHED:
            return {
                title: 'Stundenlimit erreicht',
                appearance: 'warning',
                description: 'Bitte versuche es in der nächsten Stunde erneut.'
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
