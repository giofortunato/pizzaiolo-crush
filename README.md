# 🍕 Pizzaiolo Crush

Un match-3 in cui gli ingredienti che allinei finiscono sulla pizza del cliente.
È fatto con Expo SDK 58 (React Native 0.88).

## Avvio

```bash
npm install
npx expo start
```

Poi inquadra il QR code con **Expo Go** (iOS o Android). Puoi anche premere `w` per aprirlo nel browser.

## Struttura

| File | Cosa fa |
|---|---|
| `App.js` | Avvio, passaggio mappa ↔ partita, schermata di gioco e finestre (inizio, ripresa, vittoria, sconfitta) |
| `src/Map.js` | Mappa degli ordini: stelle, record, ordine successivo, "ricomincia da capo" |
| `src/engine.js` | Il gioco in movimento: stato della partita, animazioni, suoni, vibrazioni, salvataggio |
| `src/rules.js` | Regole pure, senza React: file, mosse valide, tessere speciali, ostacoli, gravità |
| `src/progress.js` | Progressi (ordini sbloccati, stelle, record) e controllo dei salvataggi letti dal disco |
| `src/save.js` | Lettura e scrittura su `AsyncStorage` |
| `src/Board.js` | Griglia animata (`Animated` + `PanResponder`), effetti forno e punteggi |
| `src/Pizza.js` | Pizza disegnata con `react-native-svg` che si compone durante la partita |
| `src/data.js` | Ingredienti, livelli e frasi dei clienti: **qui si aggiungono nuovi ordini** |
| `test/` | Test di regole e progressi |
| `scripts/sim.mjs` | Simulatore: gioca ogni ordine centinaia di volte per tarare la difficoltà |

## Regole

- Allinea 3 o più ingredienti uguali.
- **4 in fila → Forno**: brucia un'intera riga o colonna.
- **5 in fila, a L o a T → Pala**: scambiala con un ingrediente per prenderli tutti. Due pale insieme svuotano la griglia.
- Completi l'ordine prima di finire le mosse e le mosse avanzate diventano punti bonus e stelle (da 1 a 3).
- **Ingredienti infarinati** (dal 6° ordine): non si spostano, ma se finiscono in una fila vengono via come gli altri.
- **Impasto crudo** (dal 7° ordine): non si sposta e non fa fila. Servono due file lì accanto (o due colpi di Forno) per cuocerlo.
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

- Power-up del pizzaiolo (pala, mattarello, mosse extra) guadagnati con le stelle
- Modalità a tempo "ora di punta"
- Musica di fondo e tutorial al primo avvio
- "Pizzeria del giorno": livello unico per tutti, con classifica per città (serve un backend)
