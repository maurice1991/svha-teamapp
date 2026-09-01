# SVHA MO13-1 Teamapp v10

Deze versie voegt een coach/beheeromgeving toe aan de bestaande ouderapp.

## Nieuw in v10
- Coach-only tandwielknop rechtsboven.
- Ouderaccounts aanmaken met e-mail + tijdelijk wachtwoord.
- Ouders aan speelsters koppelen.
- Wachtwoord van een ouder opnieuw instellen.
- Ouderaccount verwijderen.
- Wedstrijden toevoegen, wijzigen en verwijderen.
- Rijtaken en wastaken toevoegen/verwijderen.
- Alle wijzigingen gaan direct naar Supabase en zijn daarna voor ouders zichtbaar.
- Mobielvriendelijke beheer-tabs.

## Beveiliging
Privileged accountbeheer gebeurt via de Supabase Edge Function `team-admin-users`.
De service-role key staat dus niet in de browser, GitHub of Vercel-code.
De functie controleert daarnaast of de ingelogde gebruiker de rol `coach` heeft.

## Publiceren
Vervang de bestanden in je bestaande Git-project door deze versie en voer uit:

```powershell
git add .
git commit -m "Add coach management dashboard"
git push
```

Vercel deployt daarna automatisch.
