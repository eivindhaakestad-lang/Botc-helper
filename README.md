# Botc Helper

Storyteller-assistent for *Blood on the Clocktower* i klasserommet. Appen fordeler roller, leder deg gjennom natten steg for steg og lager ferdige meldinger du kopierer til Teams. Du bestemmer alltid – appen foreslår.

**Status:** Milepæl 1 (Storyteller-kjernen) er ferdig. Trouble Brewing er fullt modellert. Andre roller fungerer i manuell modus.

## Publisering på Cloudflare

Appen er bare statiske filer i `public/`. Den trenger ingen byggesteg og ingen database.

### Alternativ A – koblet til GitHub (anbefalt)

Hver endring i repoet publiseres automatisk.

1. Gå til Cloudflare-dashbordet → **Workers & Pages** → **Create** → **Import a repository**.
2. Velg `Botc-helper`.
3. La build command stå tom. Deploy command skal være `npx wrangler deploy`, som er standard.
4. Trykk **Deploy**. Du får en adresse som `botc-helper.<ditt-navn>.workers.dev`.

`wrangler.jsonc` forteller Cloudflare at filene ligger i `public/`. I milepæl 2 (live) legges selve spillrommet (Durable Objects) til i samme fil.

### Alternativ B – dra og slipp

1. **Workers & Pages** → **Create** → **Pages** → **Upload assets**.
2. Dra inn mappen `public`.

## Slik brukes appen

1. **Klasser:** Legg til klasse og elever. Du kan skrive inn én og én, lime inn fra Excel eller velge en CSV-fil. Appen finner kolonnen «Fornavn» selv og lagrer bare fornavn. Grupper og elevmerker («Ikke Demon», «Ikke ond», «Enkel rolle») settes her.
2. **Nytt spill:** Klasse → gruppe → fravær → par (to elever på én plass) → script og språk → trekk roller → plassering → setup.
3. **Før natt 1:** Kopier rollekortene til hver elev. Drunk får sin falske rolle.
4. **Natt:** Ett kort per steg i offisiell night order. Kortet viser hint og sann verdi, og foreslår falsk info når spilleren er forgiftet eller Drunk. Du ser alltid om meldingen er sann eller usann før du kopierer.
5. **Dag:** Nominasjoner, stemmer (med ghost votes og terskel), henrettelse, Virgin, Slayer, Saint, Scarlet Woman og vinnersjekk.

**Snarveier i spillet:** Enter = fullfør steg · C = kopier melding · ← → = forrige/neste steg · Ctrl+Z / Ctrl+Y = angre/gjør om · N = notat · F = fokusmodus

## Personvern

- Alle data (klasser, elever, spill og historikk) lagres bare i nettleseren på maskinen du bruker (localStorage). Ingenting sendes til noen server.
- Fontene ligger i appen, så nettleseren gjør ingen forespørsler til Google eller andre.
- Historikk lagres med fornavn og slettes automatisk etter et valgfritt antall uker. Den kan også slås av.
- Under Innstillinger kan du laste ned backup (filen inneholder elevnavn) eller slette alt.

## Rolletekster og opphavsrett

Appen inneholder bare funksjonelle data om rollene: ID, navn, team, night order og mekanikk. Beskrivelsene er egne, korte omskrivinger. Vil du bruke de offisielle evnetekstene, importerer du dem selv under **Innstillinger → Rolletekster**. Da kan du for eksempel bruke `resources/data/roles.json` fra [ThePandemoniumInstitute/botc-release](https://github.com/ThePandemoniumInstitute/botc-release).

Night order og sammensetningstabellen kommer fra det offisielle repoet. Tabellen kan genereres på nytt med `node tools/gen-official.mjs <sti-til-botc-release>`.

## Struktur

```
public/                 alt som publiseres
  index.html, app.css, _headers, fonts/
  js/engine/            spillmotor – ren JS uten DOM, kan kjøres i nettleser og Cloudflare Worker
    data/official.js    offisielle ID-er, team og night order (generert)
    defs.js             regelmotor-data for modellerte roller (Trouble Brewing)
    state.js            hendelseslogg → tilstand (replay), angre/gjør om, effekter
    setup.js            sammensetning, trekking, validering, bluffs, rollekort
    night.js            nattkø, hint, sann/falsk info, meldinger og effekter
    day.js              nominasjoner, stemmer, henrettelse, vinnersjekk
    script.js           import av scripts og rolletekster
    text.js, sttext.js  meldinger til elever og Storyteller-tekster (NO/EN)
  js/app/               grensesnitt (vanilla JS)
tests/                  motortester: node --test tests/*.test.js
tools/                  generering av offisielle data og én-fils forhåndsvisning
```

### Arkitektur i korte trekk

- **Hendelseslogg:** Alt du gjør blir en hendelse. Tilstanden regnes ut på nytt fra loggen, og det gir angre/gjør om og lagring. Når du retter et nattsteg eller en avstemning, erstattes den forrige versjonen, så effektene aldri dobles.
- **Regelmotor:** Hver rolle beskrives med data (`defs.js`): nattsteg, betingelser, setup-endringer og registrering (Spy/Recluse). Nye roller legges til der, uten å endre resten av appen. Roller som ikke er modellert, får et manuelt nattsteg i riktig offisiell rekkefølge.
- **Forslag, ikke beslutninger:** Motoren regner ut sann verdi og konsekvenser, for eksempel at Monk beskytter, at Soldier overlever, starpass eller at Scarlet Woman tar over. Alt vises som forslag du bekrefter.
- **Versjonering:** Lagrede data har `schemaVersion`, og migreringer ligger i `store.js`.

## Veien videre

- **M2 – live:** QR-kode på storskjerm, elevene claimer plass, rollekort og meldinger rett på elevens skjerm, og nattvalg sendes direkte (Cloudflare Durable Objects).
- **M3 – dag live:** Avstemning med viser på storskjerm.
- **M4:** Flere utgaver fullt modellert, og egne roller.

## Utvikling

```
node --test tests/*.test.js     # motortester
node tools/build-preview.mjs    # én selvstendig HTML-fil i dist/
python3 -m http.server -d public 8080
```
