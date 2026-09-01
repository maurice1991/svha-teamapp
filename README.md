# SVHA MO13-1 Teamapp v10.3

Nieuw in v10.3:
- Coach kan speelsters direct toevoegen en wijzigen in **Team beheren → Speelsters**.
- Coach kan ouderaccounts direct toevoegen in **Team beheren → Ouders** en meteen aan een speelster koppelen.
- Nieuwe speelsters verschijnen automatisch in de teamlijst, afmeldkeuze en taak-/ouderkoppelingen.
- Geen handmatige Table Editor-acties in Supabase nodig voor nieuwe speelsters of ouders.

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


## v10.1
Coach- en ouderaccounts kunnen vanuit Mijn account zelf een wachtwoord instellen of wijzigen. Dit is vooral bedoeld voor accounts die eerder via een magic link zijn aangemaakt en nog geen wachtwoord hebben.


## v10.2 — Beschikbaarheid voor coach
In Team beheren staat nu een tab **Aanwezigheid**. Per komende training en wedstrijd ziet de coach:
- hoeveel speelsters verwacht aanwezig zijn;
- welke speelsters zijn afgemeld en met welke reden;
- bij wedstrijden: wie rijdt en wie de wastas heeft;
- of een rij-/wastaak bevestigd is, nog niet bevestigd is of vervanging nodig heeft.

Groen betekent **verwacht aanwezig**: ouders hoeven alleen af te melden, dus dit is geen expliciete aanwezigheidsbevestiging.
