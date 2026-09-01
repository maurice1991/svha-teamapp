# SVHA MO13-1 Teamapp v8

Deze versie is gekoppeld aan het opgegeven **Supabase-project** en is voorbereid als **PWA** voor installatie op iPhone en Android.

## Wat al gekoppeld is
- Project URL: ingesteld in `config.js`
- Supabase publishable key: ingesteld in `config.js`
- Magic-link login: actief zodra de app via HTTPS wordt geopend
- Centrale data: speelsters, wedstrijden, trainingen, afmeldingen, rijschema en wastas
- PWA: manifest, iconen en service worker aanwezig

> De publishable key is bedoeld voor gebruik in client-apps. Zet nooit een `service_role` of secret key in deze map.

## Nog 1 verplichte Supabase-stap
Open in Supabase **SQL Editor** en voer de volledige inhoud van `supabase/schema.sql` uit.

Dit maakt:
- `players`
- `profiles`
- `parent_players`
- `events`
- `absences`
- `transport_assignments`
- `laundry_assignments`
- Row Level Security-regels
- de huidige speelsters, wedstrijden, rijschema en wastasplanning

## Daarna: URL-instellingen voor login
Zodra je de app op Vercel hebt gepubliceerd:
1. Open Supabase → **Authentication** → **URL Configuration**.
2. Zet **Site URL** op de uiteindelijke Vercel-URL.
3. Voeg dezelfde URL toe aan **Redirect URLs**.

Voor lokaal testen kun je eventueel ook `http://localhost:8000` toevoegen.

## Eerste trainer/beheerder
1. Log één keer in via de teamapp met jouw e-mailadres.
2. Open Supabase → **Table Editor** → `profiles`.
3. Verander bij jouw profiel `role` van `parent` naar `coach`.

## Ouders koppelen aan een speelster
Nadat een ouder één keer heeft ingelogd:
1. Zoek de user UUID in Supabase Authentication.
2. Zoek de speelster-ID in `players`.
3. Voeg in `parent_players` een regel toe met `user_id` en `player_id`.

Daarna kan een ouder alleen de gekoppelde speelster afmelden en alleen bij haar eigen rij-/wastaak de status wijzigen.

## Installeren op telefoon
### iPhone
Safari → Deel → **Zet op beginscherm** → Voeg toe.

### Android
Chrome → menu → **App installeren** / **Toevoegen aan startscherm**.

De PWA moet via HTTPS draaien. Vercel is hiervoor geschikt.

## Lokaal bekijken
Open de map niet rechtstreeks met `file://`. Gebruik bijvoorbeeld:

```bash
python -m http.server 8000
```

Open daarna `http://localhost:8000`.


## v8.1 login-diagnose
De login toont nu de echte Supabase-foutmelding en blokkeert een nieuwe magic-link aanvraag 60 seconden na een succesvolle aanvraag. Dit voorkomt onduidelijke meldingen bij de standaard Supabase rate limit.


## v8.2
Deze versie forceert verse JS/CSS-bestanden op Vercel/PWA, gebruikt een nieuwe service-worker cache en toont de 60-seconden teller ook wanneer Supabase een rate-limit teruggeeft.
