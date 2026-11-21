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

  // Il browser blocca la musica finché non si tocca la pagina: al primo tocco (o tasto) parte.
  const unlock = () => {
    unlockAudio();
    window.removeEventListener('pointerdown', unlock, true);
    window.removeEventListener('keydown', unlock, true);
  };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
}
