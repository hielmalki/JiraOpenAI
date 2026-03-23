# Reflection for Jira

Reflection for Jira ist eine Atlassian-Forge-App fuer Jira Cloud. Die App analysiert Jira-Issues direkt im Issue-Panel und bewertet Requirements in drei Kategorien:

- Verstaendlichkeit
- Konsistenz
- Business Value

Zusätzlich erzeugt die App konkrete Verbesserungsvorschlaege auf Basis der Jira-Beschreibung und der Akzeptanzkriterien.

## Funktionsumfang

- Anzeige als `jira:issuePanel` direkt im Jira-Issue
- Analyse von `Summary`, `Description` und `customfield_10047`
- OpenAI-basierte Bewertung mit strukturiertem JSON-Output
- UI Kit 2 Oberfläche mit Insight-Dashboard-Layout
- Durchschnittsscore sowie Einzelscores mit visueller Gewichtung
- Verbesserungsbereich mit lesbaren Handlungsempfehlungen
- Lade-, Leer- und Fehlerzustaende fuer den Panel-Workflow

## Technischer Stack

- Atlassian Forge
- Forge UI Kit 2 (`@forge/react`)
- Resolver mit `@forge/resolver`
- Jira API via `@forge/api`
- OpenAI Chat Completions API
- React 18

## Architektur

### Frontend

Die UI wird in [src/frontend/index.jsx](/Users/hichamelmalki/projects/JiraOpenAI/JiraOpenAI/src/frontend/index.jsx) gerendert. Das Panel:

1. laedt Jira-Kontextdaten ueber den Resolver `getIssueData`
2. erzeugt daraus einen Prompt
3. ruft ueber den Resolver `callOpenAI` die OpenAI-API auf
4. rendert die Antwort als Insight Dashboard

Wichtige UI-Komponenten:

- [src/frontend/components/ReflectionHeader.jsx](/Users/hichamelmalki/projects/JiraOpenAI/JiraOpenAI/src/frontend/components/ReflectionHeader.jsx)
- [src/frontend/components/ScoreRow.jsx](/Users/hichamelmalki/projects/JiraOpenAI/JiraOpenAI/src/frontend/components/ScoreRow.jsx)
- [src/frontend/components/SuggestionsList.jsx](/Users/hichamelmalki/projects/JiraOpenAI/JiraOpenAI/src/frontend/components/SuggestionsList.jsx)

### Backend

Die Resolver liegen in [src/resolvers/index.js](/Users/hichamelmalki/projects/JiraOpenAI/JiraOpenAI/src/resolvers/index.js).

Aktuell gibt es zwei Kern-Resolver:

- `getIssueData`: liest Jira-Issue-Daten ueber `api.asApp().requestJira(...)`
- `callOpenAI`: sendet den Prompt an OpenAI und erwartet strukturiertes JSON zurueck

## Jira-Datenbasis

Die App liest derzeit diese Felder:

- `summary`
- `description`
- `customfield_10047`

Hinweis: `customfield_10047` ist aktuell fest im Resolver hinterlegt. Falls dieses Feld in einer anderen Jira-Instanz eine andere Feld-ID hat, muss der Code angepasst oder konfigurierbar gemacht werden.

## Voraussetzungen

### Lokale Voraussetzungen

- Node.js 22.x
- Forge CLI
- Atlassian-Account mit Zugriff auf die Ziel-Site
- OpenAI API Key

### Verwendete Umgebung

Die Forge-Runtime in [manifest.yml](/Users/hichamelmalki/projects/JiraOpenAI/JiraOpenAI/manifest.yml) ist aktuell auf `nodejs22.x` gesetzt.

## Installation und Setup

### 1. Abhaengigkeiten installieren

```bash
npm ci
```

### 2. Bei Forge anmelden

```bash
forge login
```

### 3. OpenAI-Secret setzen

Die App erwartet den Secret-Namen `OPEN_API_KEY`.

Beispiel:

```bash
forge variables set OPEN_API_KEY
```

Danach den API-Key eingeben.

### 4. Lint ausfuehren

```bash
npm run lint
forge lint
npm test
```

## Lokale Entwicklung

### Entwicklungs-Deploy

```bash
forge deploy -e development
```

### App auf der Jira-Site installieren oder aktualisieren

```bash
forge install --upgrade --product jira --site hielmalki1994.atlassian.net -e development
```

### Tunnel

```bash
forge tunnel
```

Wichtig:

- `forge tunnel` ist nur fuer aktive lokale Entwicklung gedacht.
- Wenn `forge tunnel` laeuft, kann Jira eine lokale Dev-Version der App laden.
- Nach dem Debugging sollte der Tunnel wieder beendet werden.
- Wenn Jira danach an einer lokalen Version haengen bleibt, Tunnel-Prozess beenden und die App neu deployen.

## Deployment

### Development

```bash
forge deploy -e development
forge install --upgrade --product jira --site hielmalki1994.atlassian.net -e development
```

### Production

Vor einem Produktions-Deploy muessen mindestens diese Punkte geklaert sein:

- Lizenzierungsstrategie
- Datenschutz- und Security-Dokumentation
- Marketplace-Listing-Assets
- Testabdeckung
- stabile Fehlerbehandlung fuer externe API-Calls

Produktions-Deploy:

```bash
forge deploy -e production
forge install --upgrade --product jira --site <deine-site>.atlassian.net -e production
```

## Konfiguration

### Manifest

Die App-Konfiguration liegt in [manifest.yml](/Users/hichamelmalki/projects/JiraOpenAI/JiraOpenAI/manifest.yml).

Aktueller Stand:

- Modul: `jira:issuePanel`
- Render-Modus: `native`
- UI-Technologie: Forge UI Kit
- Scope: `read:jira-work`
- Externer Egress: `api.openai.com`

### Umgebungsvariable

- `OPEN_API_KEY`: OpenAI API Key fuer den Resolver `callOpenAI`
- `LICENSE_OVERRIDE`: optionaler Schalter fuer Nicht-Produktionsumgebungen mit den Werten `active` oder `inactive`

## Qualitaetssicherung

### Lint

```bash
npm run lint
forge lint
```

### Tests

Das Repository enthaelt jetzt ein leichtgewichtiges Unit-Test-Grundgeruest auf Basis von `node:test`.

Aktuell sind insbesondere diese Bereiche abgedeckt:

- Parsing- und Transformationshilfen der Reflection-Analyse
- Resolver-nahe Service-Logik fuer Jira- und OpenAI-Requests

Testlauf:

```bash
npm test
```

Vor einem Marketplace-Launch sollten zusaetzlich Integrations-Tests fuer echte Forge-/Jira-Laufzeiten ergänzt werden.

## Bekannte technische Punkte

- Das Feld `customfield_10047` ist aktuell nicht konfigurierbar.
- README, Privacy Policy, Terms of Service und Security Policy muessen vor einem Marketplace-Launch finalisiert werden.

## Production-Readiness

Dieses Repository ist aktuell funktional fuer Entwicklung und interne Tests, aber noch nicht vollstaendig production-ready fuer einen Marketplace-Launch.

Offene Themen vor dem Launch:

- Security- und Privacy-Unterlagen erstellen
- Marketplace-Branding und Listing vorbereiten
- Support- und Betriebsprozess definieren

## Support und Betrieb

Fuer den produktiven Betrieb sollten diese organisatorischen Punkte definiert werden:

- Support-Kanal
- Incident-Prozess
- Release-Prozess
- Changelog
- Datenschutz- und Loeschkonzept

## Repository-Struktur

```text
.
|-- manifest.yml
|-- package.json
|-- src
|   |-- index.js
|   |-- frontend
|   |   |-- index.jsx
|   |   `-- components
|   |       |-- ReflectionHeader.jsx
|   |       |-- ScoreRow.jsx
|   |       `-- SuggestionsList.jsx
|   `-- resolvers
|       `-- index.js
`-- README.md
```

## Naechste sinnvolle Schritte

1. Lizenzierungsstrategie und Preisgestaltung final festlegen
2. Privacy Policy, Terms und Security Policy schreiben
3. Marketplace-Listing und Assets vorbereiten
4. Integrations- und End-to-End-Tests ergaenzen
5. Production-Deploy und Listing-Submission vorbereiten
