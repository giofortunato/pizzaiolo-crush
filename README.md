# 🍕 Pizzaiolo Crush

Un match-3 in cui gli ingredienti che allinei finiscono sulla pizza del cliente.
È fatto con Expo SDK 58 (React Native 0.88).

## Avvio

```bash
npm install
npx expo start
```

Poi inquadra il QR code con **Expo Go** (iOS o Android). Puoi anche premere `w` per aprirlo nel browser.

## Provarlo sul telefono senza il Mac acceso

Il progetto usa EAS Update (`@giofortunato/pizzaiolo-crush` su expo.dev).

```bash
npx eas-cli@latest update --channel preview --environment preview --message "cosa è cambiato"
```

Poi apri **Expo Go** con lo stesso account: il progetto compare nell'elenco, con l'ultimo aggiornamento del ramo `preview`.

## Musica

La musica parte quando inforni e si ferma a pizza finita; sulla mappa non suona. È spenta finché
non la accendi con 🎵. Ogni pizza ha un "umore" (`mood` in `src/data.js`): napoletana, piccante,
americana, lenta, mare. In `src/music.js` si collega un brano a ogni umore; quelli senza brano
usano `napoletana`.

Due brani sono di **Sascha Ende** ([ende.app](https://ende.app)), licenza
[CC BY 4.0](https://ende.app/standard-license): uso gratuito anche commerciale, con obbligo di citare
l'autore (fatto qui e in fondo alla mappa). Per le condizioni del sito: non dichiararli propri, non
registrarli in sistemi di riconoscimento audio (Content ID).

Tre brani sono generati con **Suno** (suno.com) dall'account del progetto, con il **piano gratuito**:
valgono solo per **uso non commerciale**. Prima di pubblicare il gioco su uno store vanno rigenerati
con un abbonamento Suno a pagamento (i diritti dipendono dal piano al momento della creazione) oppure
sostituiti.

| Umore | Brano | Fonte | File |
|---|---|---|---|
| napoletana | [Italy - Espresso in the Piazza](https://ende.app/en/song/13956-italy-espresso-in-the-piazza) | Sascha Ende, CC BY 4.0 | `napoletana.m4a` |
| piccante | [Italy - Kitchen Tarantella](https://ende.app/en/song/13958-italy-kitchen-tarantella) | Sascha Ende, CC BY 4.0 | `piccante.m4a` |
| americana | Pizzaiolo Crush - allegra | Suno, piano gratuito | `americana.m4a` |
| lenta | Pizzaiolo Crush - valzer (versione 1) | Suno, piano gratuito | `lenta.m4a` |
| mare | Pizzaiolo Crush - valzer (versione 2) | Suno, piano gratuito | `mare.m4a` |

Descrizioni usate su Suno (modalità Advanced, testo vuoto = strumentale), scelte per legare con i due brani di Sascha Ende:

- allegra: `Italian folk instrumental, playful accordion and mandolin, acoustic guitar, upright bass, bouncy oom-pah tuba, medium tempo, cheerful and humorous, Italian restaurant, acoustic, no vocals`
- valzer (le due versioni della stessa richiesta): `Italian folk instrumental, accordion lead melody, Neapolitan mandolin, acoustic guitar, upright bass, slow gentle 3/4 waltz, warm trattoria atmosphere, sunny and nostalgic, acoustic, no vocals`

I file sono in `assets/sounds/music/`, compressi con `afconvert -f m4af -d aac -b 96000 brano.mp3 assets/sounds/music/<umore>.m4a`
(da Suno scaricare in MP3: l'M4A di Suno è in Opus e afconvert non lo legge).

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
