import { Platform } from 'react-native';
import { unlockAudio } from './sound';

// Solo sul web (soprattutto Safari su iPhone): la pagina non deve scorrere né rimbalzare,
// altrimenti trascinando le tessere si sposta tutto e la parte alta finisce sotto la barra del browser.
// L'altezza usa "dvh", cioè quella visibile davvero tra le barre di Safari.
export function setupWeb() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = `
    html, body { height: 100%; height: 100dvh; overscroll-behavior: none; }
    body { position: fixed; inset: 0; overflow: hidden; touch-action: manipulation; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
    #root { height: 100%; height: 100dvh; }
  `;
  document.head.appendChild(style);

  // Il browser blocca l'audio finché non si tocca la pagina. Su iPhone vale solo il momento in cui si
  // solleva il dito (touchend), non quando lo si appoggia: per questo si ascoltano touchend, click e tasti.
  for (const ev of ['touchend', 'click', 'keydown']) window.addEventListener(ev, () => unlockAudio(), true);
}
