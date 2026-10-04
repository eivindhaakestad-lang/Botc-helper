# Botc Helper

Storyteller-assistent for *Blood on the Clocktower* i klasserommet. Appen fordeler roller, leder deg gjennom natten steg for steg og lager ferdige meldinger du kopierer til Teams. Du bestemmer alltid – appen foreslår.

**Status:** Milepæl 1 (Storyteller-kjernen) og milepæl 2 (live) er ferdige: elevene blir med på egne PC-er, får rollekort og nattkort rett i appen, svarer på nattvalg, spiller drømmespillet om natten, og spillet avsluttes med grim reveal på storskjermen. Trouble Brewing er fullt modellert. Andre roller fungerer i manuell modus.

## Publisering på Cloudflare

Appen er en Cloudflare Worker: statiske filer fra `public/`, og ett Durable Object per live-rom (`worker/`). Den har ingen byggesteg og ingen avhengigheter. Gratisplanen holder godt for klasserom.

### Koble til GitHub (nødvendig for live)

Hver endring i repoet publiseres automatisk.

1. Gå til Cloudflare-dashbordet → **Workers & Pages** → **Create** → **Import a repository**.
2. Velg `Botc-helper`.
3. La build command stå tom. Deploy command skal være `npx wrangler deploy`, som er standard.
4. Trykk **Deploy**. Du får en adresse som `botc-helper.<ditt-navn>.workers.dev`.

`wrangler.jsonc` beskriver alt Cloudflare trenger: filene i `public/`, Worker-koden og Durable Object-klassen `Room` (SQLite-lagring, som er med på gratisplanen).

### Uten live: dra og slipp

Vil du bare bruke Storyteller-delen med Teams-kopiering, kan du laste opp mappen `public` under **Workers & Pages → Create → Pages → Upload assets**. Live-rom virker ikke da, fordi de trenger Worker-koden.

## Slik brukes appen

1. **Klasser:** Legg til klasse og elever. Du kan skrive inn én og én, lime inn fra Excel eller velge en CSV-fil. Appen finner kolonnen «Fornavn» selv og lagrer bare fornavn. Grupper og elevmerker («Ikke Demon», «Ikke ond», «Enkel rolle») settes her.
2. **Nytt spill:** Klasse → gruppe → fravær → par (to elever på én plass) → script og språk → trekk roller → plassering → setup.
3. **Før natt 1:** Kopier rollekortene til hver elev. Drunk får sin falske rolle.
4. **Natt:** Ett kort per steg i offisiell night order. Kortet viser hint og sann verdi, og foreslår falsk info når spilleren er forgiftet eller Drunk. Du ser alltid om meldingen er sann eller usann før du kopierer.
5. **Dag:** Nominasjoner, stemmer (med ghost votes og terskel), henrettelse, Virgin, Slayer, Saint, Scarlet Woman og vinnersjekk.

### Live i klasserommet

1. Trykk **📡 Live → Start live-rom** i spillet.
2. Åpne **storskjermen** på PC-en som er koblet til projektoren. Den viser QR-kode og romkode, og elevene skanner eller går til `…/play` og trykker på navnet sitt.
3. Når alle har satt seg og alt ser riktig ut, trykker du **📨 Send ut roller** (i Rollekort-fanen). Før det ser elevene alt annet, men ikke rollen eller meldingsboksen. Så ser hver elev rollen sin ved å holde inne. Starter du natt 1 uten å ha trykket, sendes rollene ut automatisk. Lås gjerne rommet.
4. Om natten trykker du **Be om alle nattvalg**. Elevene velger i appen, og svarene fyller inn feltene i nattkortet ditt (✉ i nattkøen). **Send og fullfør** (Enter) sender meldingen rett til eleven.
5. **Drømmespillet:** om natten kan elevene spille drømmespillet: hopp over hinder, ett poeng per hinder. Farten øker jevnt hele tiden, og hindrene kommer tettere. Fra rundt 30 poeng kommer det av og til ørner i ulik høyde over hodet, og da må man la være å hoppe. Omtrent 1 av 30 hinder har en 🎁 powerup: 🚀 raketter som sprenger de neste 3 hindrene (du får fortsatt poeng), 🛡 skjold som tåler ett treff, 🎆 superhopp med rakett på ryggen over 10 hinder, ⏱ sakte tid i 8 sekunder og ✨ dobbel poeng i 20 sekunder. Rekord og toppliste gjelder spillrunden. Når du sender et kort, pauses spillet til eleven har lest eller valgt. Om dagen stenges spillet.
6. **Falske vekkinger:** alle får 1–2 like kort i løpet av natten («Ingenting skjer – sov videre»), så sidemannen ikke ser hvem som faktisk blir vekket. Den tomme meldingen forsvinner av seg selv etter 10 sekunder, og den fjernes med en gang hvis eleven får et ekte kort fra deg. Roller som vekkes av deg om natten, får sjeldnere tomme meldinger. Elever som er midt i en runde i drømmespillet med mer enn 10 poeng, får ikke falske vekkinger. Har eleven mer enn 20 poeng når et kort fra deg pauser spillet, er sauen udødelig og blinker i 4 sekunder etter at spillet fortsetter. Slås av i Live-panelet.
7. **Grim reveal:** **Avslutt spillet – grim reveal** (fra forslaget når Demonen er død eller to lever, eller fra ⋯ Spill). Storskjermen og elevene ser da bare grimen med navn. Du trykker på spillerne for å avsløre rollene én og én, og annonserer vinneren når du vil.
8. **Lagre og lukk** sletter rommet. Rommet slettes også automatisk etter 12 timer uten aktivitet.

**Håndsopprekning:** Før spillet og om dagen kan elevene rekke opp hånden på PC-en. Rekkefølgen vises hos deg, hos eleven og på storskjermen. Trykk på navnet (eller H for den første) når eleven har snakket. Rekker de opp igjen, havner de nederst. Køen tømmes ved hvert faseskifte.

**Nominasjon:** Trykk **⚖️ Nominasjon** i Dag-fanen og dra i grimen fra spilleren som nominerer til den som blir nominert (eller trykk på begge). Esc avbryter.

**Avstemning:** Når du registrerer en nominasjon (for eksempel ved å dra), åpnes avstemningen av seg selv på elevenes PC-er. Du starter klokka når du er klar. Elevene stemmer på egen PC (døde bare med ghost vote igjen), og storskjermen viser hvem som stemmer og antallet mot terskelen. **Lukk avstemningen** lagrer stemmene i spillet, og storskjermen viser nominasjonene i dag og hvem som er på blokka.

**Avstemningsklokka:** Når avstemningen er åpen, trykker du **🕐 Start klokka**. Etter 3 sekunders nedtelling går en viser rundt sirkelen, én plass om gangen. Hver elev må stemme før viseren når dem, og da låses stemmen. Viseren starter hos spilleren etter den nominerte og ender hos den nominerte, som i de offisielle reglene. I Live-panelet kan du heller velge at den starter hos den som nominerer, og hvor lang tid den bruker per plass. Når viseren er ferdig, lagres stemmene av seg selv. Storskjermen og elevene ser en pil fra den som nominerer til den som er nominert. Din egen grim viser det samme i enklere form: pil fra nominerer til nominert, merkelapper (NOMINERER/NOMINERT), en grønn ✋ på alle som har stemt, stemmetall «2 / 4» med uavgjort-tekst i midten, og viseren som går rundt – så du slipper å snu deg mot storskjermen.

**Uavgjort og blokka:** Er noen allerede på blokka, regner appen ut det nye målet. Har Frida 4 stemmer, står det ved neste nominasjon «4 = uavgjort med Frida (ingen dør)» og «5 = Emil på blokka». Det vises hos deg, på storskjermen og hos elevene.

**Etter avstemningen:** Trykk **✓ Ferdig – fjern fra skjermen** for å få vekk avstemningsvisningen. Den ryddes også av seg selv når du registrerer en ny nominasjon eller en henrettelse. Den som er på blokka, får en 💀 og rød glød på storskjermen, i grimen din og i elevenes byliste, helt til noen er henrettet.

**Slayer:** Under Dagsevner velger du hvem som bruker Slayer-evnen og hvem de skyter på, og trykker **🏹 Skyt**. Storskjermen viser en pil fra skytteren til målet. Treffer den (Demonen, eller en Recluse eller Spy du lar dø), smeller det, målet rister og dør. Ellers kommer det et matt dunk. Elevene får beskjed på sin PC.

**Scriptet:** Elevene har knappen **📜 Se scriptet – alle roller** øverst. Den viser alle rollene i scriptet med beskrivelse, sortert etter Townsfolk, Outsiders, Minions og Demon. Har du importert de offisielle rolletekstene, er det dem elevene ser.

**Travellers (TB):** Under **⋯ Spill → Legg til Traveller** legger du til en elev som kommer sent, som Scapegoat, Gunslinger, Beggar, Bureaucrat eller Thief, velger lag og plass i sirkelen. Rollen er offentlig (vises på storskjermen), laget er hemmelig. Travellers teller ikke i sammensetningen, men teller med i stemmeterskelen. Bureaucrat og Thief velger om natten; stemmen teller 3 eller negativt dagen etter (vises med ×3 eller −1 på storskjermen). I Dag-fanen kan du forvise Travellers, og Gunslinger kan skyte en som stemte i den første avstemningen. En låst rom slipper fortsatt inn eleven på en ledig Traveller-plass.

**Spy:** Når du sender Spy-steget, får Spy-eleven en «Åpne grimoiren»-knapp som viser hele grimen som en sirkel med roller, ikoner, døde og påminnelser.

**For elevene:** En statuslinje viser «Du lever», «Du er død – du har 1 ghost vote igjen» osv. I bylista kan eleven trykke **✎ Notater** og markere hver spiller som god/ond/usikker, velge rollen de påstår og skrive et kort notat. Notatene lagres bare på elevens egen PC.

**Drømmemestere:** Etter grim reveal kan du vise topp 3 i drømmespillet på storskjermen, én plass om gangen (3. → 2. → vinneren), på en pall.

**Stemningsmusikk:** Storskjermen har egen knapp **🎵 Slå på musikk**: dyster, rolig musikk om natten, laget i nettleseren. Den er uavhengig av lydeffektene.

**Statistikk:** Under **Tidligere spill → 📊 Statistikk** ser du per elev: antall spill, seire, god/ond, Demon, hvor ofte de overlevde og rollen de oftest har hatt. Regnes ut fra historikken på din PC.

**Rolleikoner:** Appen bruker egne enkle ikoner (emoji). Importerer du rolletekster med bildelenker, vises bildene i grimen din.

**Elevenes valg:** Nattvalg (Poisoner, Monk, Fortune Teller, Imp osv.) gjøres ved å trykke på spillere i en sirkel, som i grimen.

**Nominasjonsforslag:** Om dagen har elevene **⚖️ Foreslå nominasjon** ved siden av «Rekk opp hånden». De velger hvem i sirkelen, og forslaget havner i håndsopprekningskøen din («Markus ⚖️→ Nora»). **✓ Godkjenn** oppretter nominasjonen og åpner avstemningen på storskjermen. Døde og elever som allerede har nominert i dag, kan ikke foreslå. Slås av under **⋯ Spill** hvis det blir for mange forslag.

**Dødsanimasjon:** Hver gang en spiller dør og det vises for byen (henrettelse, kunngjort natt, eksil, Slayer osv.), rister tokenet på storskjermen, en hodeskalle stiger opp og korset faller på plass, med dyp klokkelyd.

**Timer og lyd:** Timeren i Dag-fanen vises stort på storskjermen og hos elevene. De siste 10 sekundene blir den rød. Storskjermen har lyder laget i nettleseren: gong når natten kommer, morgenklang om dagen, klubbeslag ved ny avstemning, tikking når viseren går, bjelle når tiden er ute og mer. Trykk **🔇 Slå på lyd** på storskjermen én gang (nettlesere krever et klikk). Elevene har lyd av som standard.

**Daggry:** Dødsfall om natten (for eksempel Demonens drap) vises ikke på storskjermen eller hos elevene mens det er natt. Når du starter dagen, ser de at det er dag, men ikke hvem som døde («Byen våkner …»). Du ser hvem som døde, og trykker **📣 Kunngjør natten** (eller Enter) når du er klar. Da dukker dødsfallene og morgenmeldingen opp, og storskjermen spiller en lyd.

**Siste melding:** Alle elever har en «Hold inne for å se siste melding»-boks ved siden av rollekortet, også de som aldri får info. Da står det bare «Du har ikke fått melding ennå», så sidemannen ikke kan se hvem som får noe.

**Chat:** Elevene kan skrive til deg og til de to naboene sine i sirkelen. Under **💬 Chat** i spillet ser du trådene til deg (med uleste meldinger) og svarer der. Du kan også lese all naboprat, uten at elevene ser at du leser. Nabopraten er hvisking og er åpen hele tiden, også om natten. Du kan slå den av i Chat-fanen. Meldinger til deg går alltid. Chatten lagres bare i live-rommet og slettes med det.

**Dag og natt:** Bakgrunnen toner over til gul om dagen og mørk blå natthimmel om natten, hos deg, på storskjermen og hos elevene.

**Drømmespillet** er åpent både før spillet starter og om natten. Topplisten gjelder hele spillrunden.

Kopier-knappene virker fortsatt for elever uten PC.

**Overgang mellom dag og natt:** Storskjermen viser byen i silhuett når fasen skifter. Sola går ned og månen opp (eller omvendt), vinduene tennes eller slukkes, og klokketårnet slår like mange slag som natt- eller dagnummeret. Om natten står et stearinlys midt i sirkelen og brenner sakte ned med tiden. Det sier ingenting om hvem eller hvor mange som vekkes. Storskjermen har også vær: om natten blir det tilfeldig regn, skyer og fullmåne eller halvmåne (av og til alt samtidig), og om dagen sol, av og til skyer og en ørn som flyr forbi nå og da. Været kan slås av med «Deaktiver vær» i Live-panelet eller under ⋯ Spill.

**Storskjermen er helt ren:** Alle knapper (fullskjerm, lyd, musikk, deaktiver vær) ligger bak et lite ⚙-tannhjul øverst til høyre. Det vises de første sekundene og når musa beveges på storskjerm-PC-en, ellers er både tannhjul og musepeker skjult. Lyd og fullskjerm må slås på der, på storskjerm-PC-en selv (nettleseren krever et klikk på den maskinen).

**Balanse (bare for deg):** Under dag- og nattpanelet ligger en liten balansemåler: en linje fra «Gode» til «Onde» og en kort vurdering. Trykk for å se detaljene: hvor mange gode og onde som lever, hvor mye av informasjonen til de gode som var riktig, om demonen er nominert, hvem som er forgiftet og omtrent hvor mange dager det er til finalen. Det er en tommelfingerregel og skjules når du trykker G.

**Død spiller:** Når en elev er død (henrettet, drept om natten, skutt – uansett årsak), renner det blod ned fra toppen av elevens egen skjerm, og kantene får et mørkerødt skjær. Det kommer først når døden er kunngjort, så nattens dødsfall avsløres ikke før morgenen.

**Sauer, mynter og Saueboden:** Når eleven trykker på navnet sitt, lager hen sin egen sau: bytt ansikt med pilene (12 uttrykk) og velg en av 12 farger. Sauen erstatter forbokstavene i alle sirkler – på storskjermen, i stemmesirkelen, når elevene velger spillere, i grim reveal, i gjennomgangen og i Min grim – og vises som et lite bilde ved navnet i din grim, i bylista, på drømmetoppen og på pallen.
- **Mynter:** 1 hinder i drømmespillet = 1 mynt. Når runden er over, «renner» poengene inn i mynt-telleren øverst. I tillegg får alle 50 mynter for å være med et helt spill og vinnerlaget 100 (når du annonserer vinneren).
- **Hvor mye tjener de?** Et hinder kommer ca. hvert 1,2–1,5 sekund. En runde på 30 sekunder gir ca. 20 mynter, ett minutt ca. 40. Med 15–20 minutter drømmespill per time blir det ca. 500–650 mynter i timen.
- **Saueboden** (🛍) er åpen før spillet, om natten og etter spillet – stengt på dagen, så diskusjonen får full oppmerksomhet. Du kan stenge den helt i Live-panelet eller under ⋯ Spill. Elevene kan prøve alt på sauen sin før de kjøper.
- **Priser:** de 12 basisfargene er enkle og dempede. Luksusfargene skinner (en glans glir over ulla) og mange er animert: sølv, rosegull, perlemor, neon, midnatt, lava, is, gull, holografisk, regnbue, galakse og diamant (400–4800). Kulere ansikter 200–2500 (solbriller, hjerteøyne, … laserblikk), hatter 100–1200, sko 100–1800, spor 300–3800 (bobler, løv, hjerter, noter, stjerner, ild, spøkelser, regnbue, mynter, stjernestøv), kjæledyr 600–4500 (kylling … minidrage) og **rammer** 250–4200 – en ring rundt sauen i grimen: treramme, sølv, blomster, hjerter, gull, neon, stjernebane, is, ild, demonring, lyn, regnbue og galaksevirvel. Noe kan kjøpes første time; de råeste tingene tar ca. 6–8 timer å spare til. En krone kan ikke kjøpes – den er forbeholdt drømmemesteren.
- **Frisyrer** (400–1150) endrer formen på ulla: topp-dott, afro, musefletter, superkrøller, hanekam (barbert på sidene, rosa tupper) og piggsveis.
- **Kapper** (600–2800) henger bak sauen og flagrer i drømmespillet: superhelt, vampyr (med høy krage), stjernekappe, kongekappe og ildkappe.
- **Vinger** (1200–3200) slår med vingene både i grimen og i drømmespillet: flaggermus, engel, sommerfugl, fe og drage.
- **Dødsanimasjoner** (500–3500) bestemmer hvordan sauen dør på storskjermen: ullpuff («POFF!»), løvvirvel, konfettikanon, lynnedslag, UFO-bortføring og sort hull. I Saueboden spilles animasjonen av når eleven prøver den. Uten kjøpt animasjon brukes den vanlige (risting, rødt glimt og hodeskalle).
- **Dagens tilbud:** hver dag er én tilfeldig ting eleven ikke har 30 % billigere (vises øverst i Saueboden og med «−30 %» i rutenettet). Tilbudet er det samme hele dagen, også etter kjøp.
- **Bytt inn:** en kjøpt ting kan byttes inn for halve (vanlige) prisen. Det krever to trykk, så det ikke skjer ved et uhell.
- **Mesterkrona:** den som leder drømmetoppen akkurat nå, får en animert gullkrone med juveler og gnister i stedet for hatten. Den kan ikke kjøpes, og den går videre til nestemann som tar ledelsen.
- **I drømmespillet** løper elevens egen sau med farge, ansikt, frisyre, hatt, sko, kappe, vinger, spor bak seg og kjæledyret ved siden av. Innimellom svever det **mynter** i lufta – på bakken, i en bue over gjerdet eller høyt oppe. De gir ekstra mynter (ca. 15–20 % mer i timen) men teller ikke på topplista. Den nye powerupen **🧲 magnet** trekker myntene til sauen i 15 sekunder. Slår eleven sin egen rekord, smeller det **fyrverkeri** med «NY REKORD!».

**Sauene lever i grimen:** Sauene reagerer på det som skjer, i alle sirkler (storskjermen, stemmesirkelen, elevenes sirkler, grim reveal og gjennomgangen):
- **Om natten sover de** (øynene lukket og «zzz»), og våkner når dagen kommer.
- **Døde blir spøkelser:** nesten usynlige (bare et blekt, blåaktig omriss), svevende, med bølgende spøkelseshale i stedet for bein, og rammen blekner. Ved siden av henger en **lykt** som lyser så lenge spøkelset har ghost vote igjen, og som slukkes når den er brukt. Eleven ser også sin egen sau som spøkelse.
- **Den nominerte svetter** og ser nervøs ut i stemmesirkelen.
- **Stemmer:** sirkelen blir lysende grønn og en stor ✋ spretter fram nede til høyre. Et spøkelse som bruker ghost vote-en, synes litt bedre mens det stemmer.
- **Alle ser overrasket ut** et øyeblikk når noen dør (store øyne og «!»).
- **Grim reveal:** når du kunngjør vinneren, hopper vinnerlagets sauer og jubler med begge hovene i været mens det drysser konfetti over storskjermen. Taperlaget ser lei seg ut (med en tåre) en liten stund.
- **Navneskilt:** navnet til hver elev står på et lite skilt som alltid ligger foran rammer, vinger og effekter, så det er lett å lese.
- **Saueparade:** når du låser rommet (Live-panelet), marsjerer sauene inn fra venstre på storskjermen og hopper opp på plassen sin én og én – med bræk. Paraden kan også spilles av fra tannhjulet på storskjermen.
- **Lagring:** mynter, kjøp og sau lagres bare på elevens egen PC (samme nettleser) og følger eleven fra spill til spill. Ingenting av dette lagres på nett utover at rommet vet hvilken sau som sitter på hvilken plass mens spillet pågår. En enkel sjekksum gjør at det ikke holder å endre tallet i nettleseren (da nullstilles myntene), men en elev med utviklerverktøy kan i prinsippet jukse.

**Min grim for elevene:** Under «Byen» har elevene knappen 🎭 Min grim. Den viser en sirkel som i den offisielle appen. Eleven trykker på en spiller og velger en rolle-token, markerer 😇/😈/❓ og skriver et kort notat. Alt lagres bare på elevens egen PC.

**Tips på rollekortet:** Når eleven holder inne for å se rollen, vises også et kort tips om hvordan rollen spilles (Trouble Brewing og Travellers, norsk og engelsk). Tipsene er skrevet for appen og er ikke offisielle tekster. En Drunk får tipset til rollen den tror den har.

**Grim reveal-intro:** Når spillet avsluttes, slås en grimoire opp på storskjermen og hos elevene med lyn, lysstråler, gnister og klokkeslag. Deretter deles de skjulte tokenene ut én og én rundt sirkelen. I din egen grim ser du tydelig hva som er avslørt: grønn ring og «👁 avslørt», mens skjulte er dempet og stiplet (samme i tabellen). Døde spillere får en 💀 øverst på ringen i stedet for å bli grå, så rollen synes godt når den avsløres.

**Slik gikk det egentlig:** Når spillet er slutt, ligger en gjennomgang under grim reveal. Den går natt for natt og dag for dag gjennom hvem som ble forgiftet, beskyttet, drept av demonen eller henrettet, hvem som overlevde et angrep, og hvem som fikk feil informasjon. Den sier aldri hvem som gjorde det: demonen og minionene avsløres ikke. Du styrer hvert steg selv med Neste/Tilbake (eller piltastene), kan hoppe til neste kapittel og kan når som helst avslutte. Før eller underveis kan du skjule punkter (avkrysning) eller skrive dem om (✎). Storskjermen viser sirkelen med merker på dem det gjelder, og elevene ser det samme på sin skjerm. Vil du avsløre mer, trykker du på en spiller i grimen din som vanlig: rollen snus da også under gjennomgangen.

**Snarveier i spillet:** Enter = fullfør steg · C = kopier melding · ← → = forrige/neste steg · Ctrl+Z / Ctrl+Y = angre/gjør om · N = notat · F = fokusmodus · G = skjul/vis roller (når elever kommer bort til deg)

**Passord:** «Nytt spill» og «Start live-rom» krever passord. Passordet huskes på maskinen etter første gang. Serveren nekter også å opprette live-rom uten passordet.

**Drømmespillet og dagen:** Er en elev midt i en runde når dagen starter (eller trykker Tilbake), lagres runden. Neste natt fortsetter den der eleven slapp, med nedtelling og 4 sekunders beskyttelse.

## Personvern

- Klassebibliotek, elevmerker, spill og historikk lagres bare i nettleseren på maskinen du bruker (localStorage).
- Grimoiren forlater aldri PC-en din. Et live-rom får bare fornavn, plassering, levende/døde, hver elevs eget rollekort, kortene du sender, chatmeldinger og topplisten. Storskjermen får aldri roller før du avslører dem.
- Live-rommet slettes når du lukker det, eller etter 12 timer uten aktivitet. Elevene har ingen kontoer.
- Tjenester som behandler elevdata kan kreve databehandleravtale – sjekk med skolen før dere bruker live-rom.
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
  js/live/              felles WebSocket-klient, QR, grim reveal, lyder og sauene
    sheep.js            sauekatalogen og tegningen (SVG): farger, ansikter, frisyrer, hatter, kapper, vinger, humør, spøkelser
    deathfx.js          dødsanimasjonene (CSS-partikler)
  js/play/              elevvisning, drømmespillet, Saueboden (wardrobe.js) og lommeboka (wallet.js)
  js/screen/            storskjerm (Town Square), overganger (cine.js), vær og saueparaden (parade.js)
  play.html, screen.html
worker/                 Cloudflare Worker (index.js) og spillrommet (room.js, Durable Object)
tests/                  motortester og romtester: node --test tests/*.test.js
tools/                  lokal utviklingsserver, generering av offisielle data og én-fils forhåndsvisning
```

### Arkitektur i korte trekk

- **Hendelseslogg:** Alt du gjør blir en hendelse. Tilstanden regnes ut på nytt fra loggen, og det gir angre/gjør om og lagring. Når du retter et nattsteg eller en avstemning, erstattes den forrige versjonen, så effektene aldri dobles.
- **Regelmotor:** Hver rolle beskrives med data (`defs.js`): nattsteg, betingelser, setup-endringer og registrering (Spy/Recluse). Nye roller legges til der, uten å endre resten av appen. Roller som ikke er modellert, får et manuelt nattsteg i riktig offisiell rekkefølge.
- **Forslag, ikke beslutninger:** Motoren regner ut sann verdi og konsekvenser, for eksempel at Monk beskytter, at Soldier overlever, starpass eller at Scarlet Woman tar over. Alt vises som forslag du bekrefter.
- **Versjonering:** Lagrede data har `schemaVersion`, og migreringer ligger i `store.js`.

## Veien videre

- **M4:** Flere utgaver fullt modellert, og egne roller.

## Utvikling

```
node --test tests/*.test.js     # motor- og romtester
node tools/dev-server.mjs       # hele appen lokalt, inkludert live-rom: http://localhost:8787
node tools/build-preview.mjs    # én selvstendig HTML-fil i dist/ (uten live)
```
