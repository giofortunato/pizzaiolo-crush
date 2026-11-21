# 🍕 Pizzaiolo Pazzo

Un match-3 in cui gli ingredienti che allinei finiscono sulla pizza del cliente.
È fatto con Expo SDK 58 (React Native 0.88).

## Avvio

```bash
npm install
npx expo start
```

Poi inquadra il QR code con **Expo Go** (iOS o Android). Puoi anche premere `w` per aprirlo nel browser.

## Versione web

Online su **https://pizzaiolo-pazzo.expo.app** (EAS Hosting). Per aggiornarla:

```bash
npx expo export --platform web
npx eas-cli@latest deploy --prod
```

## Provarlo sul telefono senza il Mac acceso

Il progetto usa EAS Update (`@giofortunato/pizzaiolo-crush` su expo.dev).

> Il gioco si chiamava **Pizzaiolo Crush**: nome cambiato per evitare confusione con Candy Crush.
> Restano col vecchio nome lo `slug` in `app.json` (collegato al progetto su expo.dev), il repository
> e le chiavi di salvataggio (cambiarle farebbe perdere i progressi).

```bash
npx eas-cli@latest update --channel preview --environment preview --message "cosa è cambiato"
```

Poi apri **Expo Go** con lo stesso account: il progetto compare nell'elenco, con l'ultimo aggiornamento del ramo `preview`.

## Musica

Sulla schermata iniziale e sulla mappa suona la musica del menu; in partita parte quella della pizza
quando inforni e si ferma a pizza finita. È accesa di
serie e si spegne con 🎵. Ogni pizza ha un "umore" (`mood` in `src/data.js`): napoletana, piccante,
hawaiana, americana, lenta, mare. In `src/music.js` si collega un brano a ogni umore; quelli senza brano
usano `napoletana`.

Due brani sono di **Sascha Ende** ([ende.app](https://ende.app)), licenza
[CC BY 4.0](https://ende.app/standard-license): uso gratuito anche commerciale, con obbligo di citare
l'autore (fatto qui e in fondo alla mappa). Per le condizioni del sito: non dichiararli propri, non
registrarli in sistemi di riconoscimento audio (Content ID).

Cinque brani vengono da **Pixabay**, con la [Pixabay Content License](https://pixabay.com/service/license-summary/):
uso gratuito anche commerciale, attribuzione non obbligatoria (la diamo comunque); non si possono
ridistribuire da soli, fuori dal gioco. Tutti tranne quello del menu sono **senza Content ID**: con quello,
chi pubblica un video del gioco su YouTube può ricevere un avviso, che si risolve mostrando la licenza.

| Umore | Brano | Fonte | File |
|---|---|---|---|
| napoletana | [Italy - Espresso in the Piazza](https://ende.app/en/song/13956-italy-espresso-in-the-piazza) | Sascha Ende, CC BY 4.0 | `napoletana.m4a` |
| piccante | [Italy - Kitchen Tarantella](https://ende.app/en/song/13958-italy-kitchen-tarantella) | Sascha Ende, CC BY 4.0 | `piccante.m4a` |
| hawaiana (solo Hawaiana) | [Atlas • Hawaii](https://pixabay.com/music/island-atlas-hawaii-559410/) | Vadim_Makes_Sound, Pixabay | `hawaiana.m4a` |
| americana | [Italian Tarantella](https://pixabay.com/music/world-italian-tarantella-571958/) | Art_Roseman, Pixabay | `americana.m4a` |
| lenta | [Notte Stellata - Italian Accordion Music](https://pixabay.com/music/folk-notte-stellata-italian-accordion-music-345499/) | BFCMUSIC, Pixabay | `lenta.m4a` |
| mare | [Atlas • Italy](https://pixabay.com/music/orchestral-atlas-italy-555394/) | Vadim_Makes_Sound, Pixabay | `mare.m4a` |
| menu (schermata iniziale e mappa) | [Italian Pizza](https://pixabay.com/music/cartoons-italian-pizza-562041/) | Art_Roseman, Pixabay (con Content ID) | `menu.m4a` |

I file sono in `assets/sounds/music/`, compressi con `afconvert -f m4af -d aac -b 96000 brano.mp3 assets/sounds/music/<umore>.m4a`

## Struttura

| File | Cosa fa |
|---|---|
| `App.js` | Avvio, passaggio mappa ↔ partita, schermata di gioco e finestre (inizio, ripresa, vittoria, sconfitta) |
| `src/Map.js` | Mappa: ordini con stelle e record, pizza del giorno, ora di punta, gettoni, impostazioni, statistiche |
| `src/engine.js` | Il gioco in movimento: stato della partita, modalità, attrezzi, animazioni, salvataggio |
| `src/rules.js` | Regole pure, senza React: file, mosse valide, tessere speciali, ostacoli, gravità |
| `src/progress.js` | Progressi (stelle, record, gettoni, statistiche, serie giornaliera) e controllo dei salvataggi |
| `src/sound.js`, `src/haptic.js`, `src/motion.js` | Effetti e musica, vibrazione, "riduci movimento" |
| `src/save.js` | Lettura e scrittura su `AsyncStorage` |
| `src/Board.js` | Griglia animata (`Animated` + `PanResponder`), effetti forno e punteggi |
| `src/Pizza.js` | Pizza disegnata con `react-native-svg` che si compone durante la partita |
| `src/data.js` | Ingredienti, livelli e frasi dei clienti: **qui si aggiungono nuovi ordini** |
| `test/` | Test di regole e progressi |
| `scripts/sim.mjs` | Simulatore: gioca ogni ordine centinaia di volte per tarare la difficoltà |
| `scripts/make-sounds.py` | Genera gli effetti sonori (sintetizzati) |
| `src/music.js` | Brani di sottofondo per umore e crediti |

## Regole

- Allinea 3 o più ingredienti uguali.
- **4 in fila → Forno**: brucia un'intera riga o colonna.
- **5 in fila, a L o a T → Pala**: scambiala con un ingrediente per prenderli tutti. Due pale insieme svuotano la griglia.
- Completi l'ordine prima di finire le mosse e le mosse avanzate diventano punti bonus e stelle (da 1 a 3).
- **Ingredienti infarinati** (dal 6° ordine): non si spostano, ma se finiscono in una fila vengono via come gli altri.
- **Impasto crudo** (dal 7° ordine): non si sposta e non fa fila. Servono due file lì accanto (o due colpi di Forno) per cuocerlo.
- **Due speciali insieme**: Forno + Forno fa una croce, Pala + Forno trasforma in Forni tutti gli ingredienti di quel tipo.
- **Gettoni 🪙**: uno per ogni stella nuova, due per la pizza del giorno. Si spendono in attrezzi che non consumano mosse:
  🔪 Coltello (1) toglie un ingrediente, 🍴 Forchetta (2) una riga, 🪵 Legna (3) dà 5 mosse quando il cliente sta per andarsene.
- **Pizza del giorno**: stesso ordine e stessa scacchiera di partenza per tutti; servirla ogni giorno allunga la serie.
- **Ora di punta** (dopo 3 ordini): 60 secondi, niente ordine, solo punti.
- Dalla mappa puoi rifare un ordine già servito per migliorare stelle e record.
- La partita si salva dopo ogni mossa: se chiudi l'app a metà ordine, riparti da lì.

## Test e difficoltà

```bash
npm test          # regole e progressi (node:test, nessuna dipendenza in più)
npm run sim       # percentuale di vittorie per ordine, giocando a caso e giocando con attenzione
```

Quando aggiungi o modifichi un ordine in `src/data.js`, lancia `npm run sim` e regola `moves`
finché la percentuale "a caso" scende piano piano da un ordine al successivo.

## Prossimi passi possibili

- Classifica della pizza del giorno per città (serve un backend)
- Ostacolo fisso sulla scacchiera ("cella bruciata"): richiede una gravità diversa
- Build per gli store con EAS Build
