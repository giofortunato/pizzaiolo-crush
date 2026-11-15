import { useWindowDimensions } from 'react-native';

// Misure dello schermo: su telefono una colonna stretta, su iPad (o finestre larghe) tutto più grande.
// "wide" scatta da 700 punti di larghezza: tutti gli iPad in verticale, nessun iPhone.
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const wide = width >= 700;
  const colW = wide ? Math.min(width - 48, 760) : Math.min(width, 464);
  // La scacchiera prende la larghezza della colonna, ma lascia spazio sopra (comanda) e sotto (pizza e obiettivi).
  const boardW = Math.max(240, Math.min(colW - 24, wide ? 740 : 440, height - (wide ? 380 : 340)));
  return {
    width, height, wide, colW, boardW,
    pizza: wide ? 150 : 104,        // pizza sotto la scacchiera
    pizzaFinal: wide ? 260 : 190,   // pizza nella finestra di vittoria
    cardMax: wide ? 480 : 360,      // larghezza massima delle finestre
    mapCols: wide ? 5 : 3,          // ordini per riga nella mappa
  };
}
