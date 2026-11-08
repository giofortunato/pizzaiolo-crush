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
| `App.js` | Schermata di gioco: HUD, ordine del cliente, obiettivi, finestre di inizio, vittoria e sconfitta |
| `src/engine.js` | Tutta la logica: griglia, match, tessere speciali, cascate, gravità, mosse, vibrazioni |
| `src/Board.js` | Griglia animata (`Animated` + `PanResponder`), effetti forno e punteggi |
| `src/Pizza.js` | Pizza disegnata con `react-native-svg` che si compone durante la partita |
| `src/data.js` | Ingredienti, livelli e frasi dei clienti: **qui si aggiungono nuovi ordini** |

## Regole

- Allinea 3 o più ingredienti uguali.
- **4 in fila → Forno**: brucia un'intera riga o colonna.
- **5 in fila, a L o a T → Pala**: scambiala con un ingrediente per prenderli tutti. Due pale insieme svuotano la griglia.
- Completi l'ordine prima di finire le mosse e le mosse avanzate diventano punti bonus.

## Prossimi passi possibili

- Salvare i progressi (`@react-native-async-storage/async-storage`)
- Suoni (`expo-audio`) e font personalizzato (`expo-font`)
- Icona e splash con una pizza vera (`assets/`)
- "Pizzeria del giorno": livello unico per tutti, con classifica per città (serve un backend)
