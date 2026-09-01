# SVHA MO13-1 Teamapp v9

Deze versie gebruikt **e-mail + wachtwoord** via Supabase Auth. Er zijn geen magic links, Resend of SMTP nodig voor normaal inloggen.

## Supabase instellen zonder e-mail

1. Ga naar **Authentication → Providers → Email** en laat de Email-provider ingeschakeld.
2. Ga naar de algemene Auth-instellingen en zet **Allow new users to sign up** uit. De app heeft bewust geen openbare registratie.
3. Maak ouders handmatig aan via **Authentication → Users → Add user → Create new user**.
4. Vul e-mailadres en een tijdelijk/afgesproken wachtwoord in en laat **Auto Confirm User** aan staan. Zo hoeft de ouder geen bevestigingsmail te ontvangen.
5. Koppel daarna het Auth-user-id aan de juiste speelster in `parent_players`.
6. Zet het profiel van de trainer in `profiles.role` op `coach`.

## Bestaand magic-link testaccount

Als een bestaand testaccount nog geen wachtwoord heeft, is het voor deze kleine pilot het eenvoudigst om dat account onder **Authentication → Users** te verwijderen en opnieuw aan te maken met e-mail + wachtwoord en Auto Confirm aan.

## Deploy

Kopieer de bestanden over je huidige Git-project en voer uit:

```powershell
git add .
git commit -m "Switch to password login"
git push
```

Vercel deployt daarna automatisch.

## Belangrijk

Zet nooit een Supabase `service_role` of secret key in deze frontend. Alleen de publishable key hoort in `config.js`.
