# Polisutbildningen Malmö – Schema HT2026

En snabb, mobilanpassad och installerbar webbapp för schemat i TimeEdit-exporten `TimeEdit_2026-08-12_13_40.xlsx`. Appen är byggd med HTML, CSS och JavaScript utan server, databas, ramverk eller externa resurser.

## Källor och avgränsning

- `TimeEdit_2026-08-12_13_40.xlsx` är aktuell schemakälla och innehåller 144 poster från 31 augusti 2026 till 15 januari 2027. Filen uppdaterades den 14 augusti 2026 och har ersatt tidigare innehåll helt.
- Informationen som användaren lämnade om terminens upplägg, närstudieveckor, kursansvariga och basgrupper finns i `TERM_INFO` i `schedule-data.js`. Där finns också momentöversikter, förberedelser och ansvariga lärare från Canvas för samtliga fem närstudieveckor. Canvas-översikterna kompletterar schemat men skapar inte schemahändelser eller ersätter dagar, tider och lokaler från TimeEdit.
- Under terminsinformationen skapas automatiskt en översikt över ordinarie tentor och examinationer från `SCHEDULE_DATA`, med veckodag, datum, tid och eventuell basgrupp. Omexaminationer, omtentor och examensceremonin ingår inte i översikten.
- `Malmö University grafisk profil.pdf` styr färger och typografiska principer. Cherry Red `#E4022D` används som huvudfärg. Arial används som lokalt ersättningstypsnitt eftersom inga fristående webbfonter finns i projektet.
- Den lokala filen `Inför hösten HT2026 Temin 5 T5.txt` är fortfarande tom. Terminsinformationen kommer därför från texten som lämnades direkt i uppgiften, inte från filens innehåll på disk.
- De uttryckliga basgrupperna i den nya exporten är BG1, BG2, BG3 och BG4. Poster utan gruppsuffix behandlas som gemensamma och visas för alla fyra grupper.
- `icons/logga.png` är källan till DPU1-loggan. En optimerad variant visas i sidhuvudet och samma motiv används för app-, favicon- och hemskärmsikoner.

## Schemadata

All data ligger i `schedule-data.js`. `SCHEDULE_DATA` är en lista av schemaobjekt och `TERM_INFO` innehåller terminens beskrivning, närstudieveckor, Canvas-moment, förberedelser, ansvariga lärare, kursansvariga och basgruppsmedlemmar. Varje schemapost har bland annat datum, start-/sluttid, basgrupper, kurs/delkurs, lokal-id, lokalnamn, undervisningstyp, momenttext, momentnummer och tentamensinformation. Fält som saknas i TimeEdit visas inte i appen.

`sourceRow` pekar på ursprungsraden i Excel-filen. Det gör det enklare att kontrollera en post mot källan. Kalenderposter som helgdagar och terminsmarkeringar finns kvar men får en egen visuell behandling.

### Ändra schemat

1. Uppdatera TimeEdit-exporten och kontrollera att kolumnerna motsvarar den nuvarande filen.
2. Uppdatera objekten i `schedule-data.js` utan att ändra faktauppgifter eller gissa saknade värden.
3. Behåll posterna sorterade på datum och starttid.
4. Ändra `sourceFile`, `sourceExportedAt`, `sourcePeriod` och `eventCount` i `SCHEDULE_META`.
5. Höj versionsnumret i `CACHE_NAME` och versionsparametern `?v=` i appens statiska länkar. Då hämtas ny CSS och JavaScript direkt samtidigt som gammal offlinecache tas bort kontrollerat.
6. Kör kvalitetskontrollerna igen före publicering.

## Funktioner

- basgruppsfilter för BG1–BG4 med sparat val i webbläsarens lokala lagring
- utfällbar terminsinformation med kursupplägg, kursansvariga, fem närstudieveckor, examensstatus och gruppindelning
- veckofilter med ISO-veckor och år
- direkt fritextsökning i samtliga schemafält
- snabbval för idag, denna vecka, nästa vecka och alla poster
- dynamisk sortering där tidigare veckor fälls ihop automatiskt
- markering av avslutad, pågående och nästa aktivitet
- svensk datumvisning, tillgängliga formulär och tydliga fokusmarkeringar
- mobil-först-layout utan breda tabeller
- PWA-manifest, Android-installation, iOS-instruktion och offlinecache
- väl synligt reglage för ljust och mörkt läge; systeminställningen används första gången och användarens val sparas lokalt
- relativa sökvägar som fungerar under ett projektnamn på GitHub Pages

## Integritet och publiceringsbedömning

Excel-filen innehåller inga lösenord, API-nycklar, privata telefonnummer eller personnamn. Den grafiska manualen innehåller allmän kontaktinformation till universitetets kommunikationsavdelning, men den informationen har inte byggts in i appen.

Terminsinformationen innehåller förnamn på studenter och två fullständiga namn på kursansvariga. Studentnamnen är personuppgifter och gruppindelningen kan vara intern. De har lagts in eftersom det uttryckligen efterfrågades, men de bör tas bort eller publiceringen godkännas av ansvarig vid Malmö universitet innan repositoryt görs publikt.

Schemat innehåller däremot exakta datum, tider och rums-id för polisiär utbildning samt moment om bland annat vapen, taktik, sambandstjänst och pågående dödligt våld. Detta kan vara internt eller säkerhetskänsligt även om det inte är märkt så i filen. Publicera därför inte projektet öppet på GitHub Pages innan Malmö universitet eller ansvarig utbildningsledning uttryckligen har godkänt att dessa uppgifter får vara offentliga. GitHub Pages ger inte åtkomstkontroll.

## Köra lokalt

Service workers fungerar inte när `index.html` öppnas direkt som en fil. Starta därför en enkel lokal webbserver i projektmappen. Om Python finns installerat:

```text
python -m http.server 8080
```

Öppna sedan `http://localhost:8080/`. Stoppa servern med Ctrl+C.

## Publicera på GitHub Pages

Gör detta först efter godkänd publiceringsbedömning:

1. Skapa ett GitHub-repository och lägg projektfilerna i repositoryts rot.
2. Ladda upp `index.html`, `styles.css`, `app.js`, `schedule-data.js`, `manifest.json`, `service-worker.js`, `icons/` och `README.md`. Originalunderlagen behöver inte publiceras och bör hållas utanför repositoryt om de är interna.
3. Gå till **Settings → Pages** i repositoryt.
4. Under **Build and deployment**, välj **Deploy from a branch**.
5. Välj grenen `main` och mappen `/ (root)`, och klicka **Save**.
6. Öppna adressen som GitHub visar och kontrollera appen på mobil. Första besöket fyller offlinecachen.

## Installera appen

På iPhone/iPad: öppna sidan i Safari, tryck **Dela**, välj **Lägg till på hemskärmen** och bekräfta. Appens egen knapp visar samma instruktion när iOS identifieras.

På Android/Samsung: öppna sidan i Chrome eller Samsung Internet och välj **Installera app** när knappen visas. Webbläsaren kan också erbjuda installation i sin meny.

## Offline och uppdateringar

Efter första lyckade besöket cachar `service-worker.js` appens statiska filer. Sidnavigering använder nätverket först och faller tillbaka till den cachade sidan offline. Övriga resurser visas direkt från cache medan en ny kopia hämtas i bakgrunden. När `CACHE_NAME` ändras rensas tidigare appcache kontrollerat.
