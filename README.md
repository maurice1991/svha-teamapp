SVHA Teamapp v10.6

Nieuw in v10.6:
- Op pc staat de hoofdnavigatie nu direct onder de groene header.
- De desktopnavigatie blijft zichtbaar tijdens scrollen.
- Op mobiel blijft de bestaande navigatie onderaan staan.
- Actieve pagina wordt in beide navigaties tegelijk gemarkeerd.

## Deploy
Kopieer de bestanden over je huidige Git-project en voer uit:

```powershell
git add .
git commit -m "Add desktop navigation under header"
git push
```

Vercel deployt daarna automatisch.

---

SVHA Teamapp v10.5

Nieuw: oog-icoon bij het wachtwoordveld op het inlogscherm om het wachtwoord te tonen/verbergen.

# SVHA MO13-1 Teamapp v10.4

Nieuw in v10.4:
- Coach kan met één knop de 13 standaard ouderaccounts aanmaken en automatisch aan de juiste speelster koppelen.
- Standaard tijdelijk wachtwoord: `MO13team!`.
- De `@mo13.nl` adressen worden alleen als login/gebruikersnaam gebruikt; er hoeft geen mailbox te bestaan.
- Inloglijst kan vanuit Team beheren > Ouders gekopieerd worden.
- Bij Afmelden kan de naam van de speelster worden ingetypt. Voor een ouder met één gekoppeld kind wordt de speelster automatisch ingevuld en vergrendeld.

## Deploy
Kopieer de bestanden over je huidige Git-project en voer uit:

```powershell
git add .
git commit -m "Add standard parent accounts and faster absence form"
git push
```

Vercel deployt daarna automatisch.


## v10.7
- Desktopnavigatie volledig opnieuw ontworpen met moderne SVG-iconen.
- Hover-, focus- en klikinteracties toegevoegd.
- Geselecteerde route krijgt zowel `selected` als `active` en `aria-current="page"`.
- Mobiele navigatie blijft ongewijzigd.
