// ─────────────────────────────────────────────────────────────
// App.tsx — HUD del juego (React) sobre el canvas 3D.
// ─────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from 'react';
import './App.css';
import { audio } from './game/audio';
import { TOWERS, TOWER_ORDER, VICTORY_WAVE } from './game/config';
import { GameEngine, type GameStats, type TowerInfo } from './game/engine';

const SPRITE = (k: string) => `${import.meta.env.BASE_URL}sprites/${k.startsWith('tower_') ? `${k}.svg` : k === 'boxer_portrait' ? 'boxer_portrait.webp' : `${k}.png`}`;

type LanguageCode = 'es' | 'en' | 'pt' | 'fr';

const LANGUAGE_OPTIONS: Array<{ code: LanguageCode; label: string }> = [
  { code: 'es', label: 'ES' },
  { code: 'en', label: 'EN' },
  { code: 'pt', label: 'PT' },
  { code: 'fr', label: 'FR' },
];

const UI_TEXT: Record<LanguageCode, Record<string, string>> = {
  es: {
    language: 'Idioma',
    subtitle: '¡Defiende tu reino con tus pollitos favoritos!',
    menuHint: 'Coloca torres en las parcelas de piedra y detén a los monstruos antes de que lleguen al castillo.',
    play: '¡JUGAR!',
    loading: 'Cargando…',
    wave: 'Oleada',
    firstWave: '¡Empezar Oleada 1!',
    nextWave: '¡Oleada {wave}!',
    music: 'Música',
    soundEffects: 'Efectos de sonido',
    level: 'Nv.',
    damage: 'Daño',
    range: 'Rango',
    upgrade: '⬆ Mejorar · {cost}',
    maxLevel: '¡NIVEL MÁX!',
    sell: 'Vender · +{value}',
    previousTowers: 'Torres anteriores',
    moreTowers: 'Más torres',
    towerScrollHint: '{count} torres · usa las flechas para ver todas',
    buildHint: 'Toca una parcela de piedra para construir · toca de nuevo la carta para cancelar',
    victory: '¡VICTORIA!',
    victoryText: 'Has defendido el Reino Gelatina durante {wave} oleadas.',
    endless: 'Modo Infinito ∞',
    replay: 'Jugar de nuevo',
    defeat: '¡EL CASTILLO HA CAÍDO!',
    survived: 'Sobreviviste hasta la oleada {wave}.',
    again: '¡Otra vez!',
    earlyBonus: 'Bonus por adelantar +{amount}',
    noGold: 'Sin oro',
    chooseTower: 'Elige una torre abajo',
    tower_archer: 'Perro Arquero',
    desc_archer: 'Rápido y barato',
    tower_cannon: 'Perro Bomba',
    desc_cannon: 'Daño en área',
    tower_frost: 'Perro Mago de Hielo',
    desc_frost: 'Ralentiza enemigos',
    tower_normaldog: 'Normal Dog',
    desc_normaldog: 'Unidad inicial económica',
    tower_sneaker: 'Sneaker Dog',
    desc_sneaker: 'Cada quinto golpe hace daño crítico',
    tower_boxer: 'Boxer Dog',
    desc_boxer: '20% de probabilidad de aturdir',
    tower_sunflower: 'Sunflower Dog',
    desc_sunflower: 'Genera 150 monedas cada 10 segundos',
    tower_bard: 'Bard Dog',
    desc_bard: 'Aumenta 15% la velocidad de ataque cercana',
    tower_bubble: 'Bubble Dog',
    desc_bubble: 'Cada cuarto ataque inmoviliza brevemente',
    tower_firemage: 'Fire Mage Dog',
    desc_firemage: 'Daño en área y quemadura',
    tower_crystal: 'Crystal Dog',
    desc_crystal: 'Ralentiza a los enemigos',
    tower_electrician: 'Electrician Dog',
    desc_electrician: 'El rayo rebota hasta a 3 enemigos',
    tower_mecha: 'Mecha Dog',
    desc_mecha: 'Cada cuarto ataque dispara dos proyectiles',
    tower_mummy: 'Mummy Dog',
    desc_mummy: 'Reduce 50% la velocidad del objetivo',
  },
  en: {
    language: 'Language',
    subtitle: 'Defend your kingdom with your favorite little dogs!',
    menuHint: 'Place towers on the stone plots and stop the monsters before they reach the castle.',
    play: 'PLAY!',
    loading: 'Loading…',
    wave: 'Wave',
    firstWave: 'Start Wave 1!',
    nextWave: 'Wave {wave}!',
    music: 'Music',
    soundEffects: 'Sound effects',
    level: 'Lv.',
    damage: 'Damage',
    range: 'Range',
    upgrade: '⬆ Upgrade · {cost}',
    maxLevel: 'MAX LEVEL!',
    sell: 'Sell · +{value}',
    previousTowers: 'Previous towers',
    moreTowers: 'More towers',
    towerScrollHint: '{count} towers · use arrows to see them all',
    buildHint: 'Tap a stone plot to build · tap the card again to cancel',
    victory: 'VICTORY!',
    victoryText: 'You defended the Jelly Kingdom for {wave} waves.',
    endless: 'Endless Mode ∞',
    replay: 'Play again',
    defeat: 'THE CASTLE HAS FALLEN!',
    survived: 'You survived until wave {wave}.',
    again: 'Try again!',
    earlyBonus: 'Early wave bonus +{amount}',
    noGold: 'Not enough gold',
    chooseTower: 'Choose a tower below',
    tower_archer: 'Archer Dog',
    desc_archer: 'Fast and cheap',
    tower_cannon: 'Bomb Dog',
    desc_cannon: 'Area damage',
    tower_frost: 'Ice Mage Dog',
    desc_frost: 'Slows enemies',
    tower_normaldog: 'Normal Dog',
    desc_normaldog: 'Affordable starter unit',
    tower_sneaker: 'Sneaker Dog',
    desc_sneaker: 'Every fifth hit deals critical damage',
    tower_boxer: 'Boxer Dog',
    desc_boxer: '20% chance to stun',
    tower_sunflower: 'Sunflower Dog',
    desc_sunflower: 'Generates 150 coins every 10 seconds',
    tower_bard: 'Bard Dog',
    desc_bard: 'Increases nearby attack speed by 15%',
    tower_bubble: 'Bubble Dog',
    desc_bubble: 'Every fourth attack briefly immobilizes',
    tower_firemage: 'Fire Mage Dog',
    desc_firemage: 'Area damage and burn',
    tower_crystal: 'Crystal Dog',
    desc_crystal: 'Slows enemies',
    tower_electrician: 'Electrician Dog',
    desc_electrician: 'Lightning bounces to up to 3 enemies',
    tower_mecha: 'Mecha Dog',
    desc_mecha: 'Every fourth attack fires two projectiles',
    tower_mummy: 'Mummy Dog',
    desc_mummy: 'Reduces target speed by 50%',
  },
  pt: {
    language: 'Idioma',
    subtitle: 'Defenda seu reino com seus cachorrinhos favoritos!',
    menuHint: 'Coloque torres nas plataformas de pedra e impeça os monstros de chegar ao castelo.',
    play: 'JOGAR!',
    loading: 'Carregando…',
    wave: 'Onda',
    firstWave: 'Começar Onda 1!',
    nextWave: 'Onda {wave}!',
    music: 'Música',
    soundEffects: 'Efeitos sonoros',
    level: 'Nv.',
    damage: 'Dano',
    range: 'Alcance',
    upgrade: '⬆ Melhorar · {cost}',
    maxLevel: 'NÍVEL MÁXIMO!',
    sell: 'Vender · +{value}',
    previousTowers: 'Torres anteriores',
    moreTowers: 'Mais torres',
    towerScrollHint: '{count} torres · use as setas para ver todas',
    buildHint: 'Toque numa plataforma de pedra para construir · toque no cartão novamente para cancelar',
    victory: 'VITÓRIA!',
    victoryText: 'Você defendeu o Reino Gelatina por {wave} ondas.',
    endless: 'Modo Infinito ∞',
    replay: 'Jogar novamente',
    defeat: 'O CASTELO CAIU!',
    survived: 'Você sobreviveu até a onda {wave}.',
    again: 'Tentar novamente!',
    earlyBonus: 'Bônus por adiantar +{amount}',
    noGold: 'Ouro insuficiente',
    chooseTower: 'Escolha uma torre abaixo',
    tower_archer: 'Cão Arqueiro',
    desc_archer: 'Rápido e barato',
    tower_cannon: 'Cão Bomba',
    desc_cannon: 'Dano em área',
    tower_frost: 'Cão Mago do Gelo',
    desc_frost: 'Desacelera inimigos',
    tower_normaldog: 'Normal Dog',
    desc_normaldog: 'Unidade inicial econômica',
    tower_sneaker: 'Sneaker Dog',
    desc_sneaker: 'A cada quinto golpe causa dano crítico',
    tower_boxer: 'Boxer Dog',
    desc_boxer: '20% de chance de atordoar',
    tower_sunflower: 'Sunflower Dog',
    desc_sunflower: 'Gera 150 moedas a cada 10 segundos',
    tower_bard: 'Bard Dog',
    desc_bard: 'Aumenta em 15% a velocidade de ataque próxima',
    tower_bubble: 'Bubble Dog',
    desc_bubble: 'A cada quarto ataque imobiliza brevemente',
    tower_firemage: 'Fire Mage Dog',
    desc_firemage: 'Dano em área e queimadura',
    tower_crystal: 'Crystal Dog',
    desc_crystal: 'Desacelera os inimigos',
    tower_electrician: 'Electrician Dog',
    desc_electrician: 'O raio salta para até 3 inimigos',
    tower_mecha: 'Mecha Dog',
    desc_mecha: 'A cada quarto ataque dispara dois projéteis',
    tower_mummy: 'Mummy Dog',
    desc_mummy: 'Reduz a velocidade do alvo em 50%',
  },
  fr: {
    language: 'Langue',
    subtitle: 'Défends ton royaume avec tes chiens préférés !',
    menuHint: 'Place des tours sur les dalles de pierre et arrête les monstres avant qu’ils atteignent le château.',
    play: 'JOUER !',
    loading: 'Chargement…',
    wave: 'Vague',
    firstWave: 'Lancer la vague 1 !',
    nextWave: 'Vague {wave} !',
    music: 'Musique',
    soundEffects: 'Effets sonores',
    level: 'Nv.',
    damage: 'Dégâts',
    range: 'Portée',
    upgrade: '⬆ Améliorer · {cost}',
    maxLevel: 'NIVEAU MAX !',
    sell: 'Vendre · +{value}',
    previousTowers: 'Tours précédentes',
    moreTowers: 'Autres tours',
    towerScrollHint: '{count} tours · utilise les flèches pour tout voir',
    buildHint: 'Touche une dalle de pierre pour construire · touche à nouveau la carte pour annuler',
    victory: 'VICTOIRE !',
    victoryText: 'Tu as défendu le Royaume Gelée pendant {wave} vagues.',
    endless: 'Mode infini ∞',
    replay: 'Rejouer',
    defeat: 'LE CHÂTEAU EST TOMBÉ !',
    survived: 'Tu as survécu jusqu’à la vague {wave}.',
    again: 'Réessayer !',
    earlyBonus: 'Bonus de vague anticipée +{amount}',
    noGold: 'Pas assez d’or',
    chooseTower: 'Choisis une tour ci-dessous',
    tower_archer: 'Chien Archer',
    desc_archer: 'Rapide et économique',
    tower_cannon: 'Chien Bombe',
    desc_cannon: 'Dégâts de zone',
    tower_frost: 'Chien Mage de Glace',
    desc_frost: 'Ralentit les ennemis',
    tower_normaldog: 'Normal Dog',
    desc_normaldog: 'Unité de départ économique',
    tower_sneaker: 'Sneaker Dog',
    desc_sneaker: 'Chaque cinquième coup inflige un coup critique',
    tower_boxer: 'Boxer Dog',
    desc_boxer: '20 % de chances d’étourdir',
    tower_sunflower: 'Sunflower Dog',
    desc_sunflower: 'Génère 150 pièces toutes les 10 secondes',
    tower_bard: 'Bard Dog',
    desc_bard: 'Augmente la vitesse d’attaque proche de 15 %',
    tower_bubble: 'Bubble Dog',
    desc_bubble: 'Chaque quatrième attaque immobilise brièvement',
    tower_firemage: 'Fire Mage Dog',
    desc_firemage: 'Dégâts de zone et brûlure',
    tower_crystal: 'Crystal Dog',
    desc_crystal: 'Ralentit les ennemis',
    tower_electrician: 'Electrician Dog',
    desc_electrician: 'La foudre rebondit sur jusqu’à 3 ennemis',
    tower_mecha: 'Mecha Dog',
    desc_mecha: 'Chaque quatrième attaque tire deux projectiles',
    tower_mummy: 'Mummy Dog',
    desc_mummy: 'Réduit la vitesse de la cible de 50 %',
  },
};


const SPRITE_FALLBACKS: Record<string, string> = {
  normaldog: 'dog_runner',
  sneaker: 'dog_runner',
  dog_runner: 'normaldog',
  boxer: 'dog_boxer',
  dog_boxer: 'boxer',
  boxer_portrait: 'dog_boxer',
  sunflower: 'dog_flower',
  dog_flower: 'sunflower',
  bard: 'dog_bard',
  dog_bard: 'bard',
  bubble: 'dog_bubble',
  dog_bubble: 'bubble',
  firemage: 'dog_mage',
  dog_mage: 'firemage',
  crystal: 'dog_star',
  dog_star: 'crystal',
  electrician: 'dog_worker',
  dog_worker: 'electrician',
  mecha: 'dog_cyborg',
  dog_cyborg: 'mecha',
  mummy: 'dog_mummy',
  dog_mummy: 'mummy',
  tower_boxer: 'dog_boxer',
  tower_sunflower: 'dog_flower',
  tower_bubble: 'dog_bubble',
  tower_bard: 'dog_bard',
};

function recoverSprite(event: SyntheticEvent<HTMLImageElement>, key: string) {
  const img = event.currentTarget;
  const fallback = SPRITE_FALLBACKS[key] ?? 'dog_runner';
  if (!img.dataset.spriteRetry) {
    img.dataset.spriteRetry = 'alias';
    img.src = SPRITE(fallback);
    return;
  }
  if (img.dataset.spriteRetry === 'alias') {
    img.dataset.spriteRetry = 'root';
    img.src = `/sprites/${fallback}.png`;
    return;
  }
  img.onerror = null;
  img.style.visibility = 'hidden';
}

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const towerBarRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [gameOverForced, setGameOverForced] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [towerInfo, setTowerInfo] = useState<TowerInfo | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [musicOn, setMusicOn] = useState(true);
  const [sfxOn, setSfxOn] = useState(true);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [language, setLanguage] = useState<LanguageCode>(() => {
    if (typeof window === 'undefined') return 'es';
    try {
      const saved = window.localStorage.getItem('tangoMayhemLanguage');
      if (saved === 'es' || saved === 'en' || saved === 'pt' || saved === 'fr') return saved;
    } catch {
      // Storage can be unavailable in private browsing; Spanish remains the default.
    }
    return 'es';
  });
  const toastTimer = useRef<number | null>(null);

  const t = (key: string, values: Record<string, string | number> = {}) => {
    let result = UI_TEXT[language][key] ?? UI_TEXT.es[key] ?? key;
    for (const [name, value] of Object.entries(values)) {
      result = result.replaceAll(`{${name}}`, String(value));
    }
    return result;
  };

  const chooseLanguage = (nextLanguage: LanguageCode) => {
    setLanguage(nextLanguage);
    setLanguageMenuOpen(false);
    try {
      window.localStorage.setItem('tangoMayhemLanguage', nextLanguage);
    } catch {
      // The choice still applies for the current session.
    }
  };

  const localizeToast = (message: string) => {
    if (message.startsWith('Bonus adelantar +')) {
      return t('earlyBonus', { amount: message.slice('Bonus adelantar +'.length) });
    }
    if (message === 'Sin oro') return t('noGold');
    if (message === 'Elige torre abajo') return t('chooseTower');
    return message;
  };

  const languageButtons = (
    <div className="language-picker" role="group" aria-label={t('language')}>
      {LANGUAGE_OPTIONS.map((option) => (
        <button
          key={option.code}
          type="button"
          className={`language-button ${language === option.code ? 'active' : ''}`}
          onClick={() => chooseLanguage(option.code)}
          aria-pressed={language === option.code}
          aria-label={t('language') + ': ' + option.label}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const musicEnabledRef = useRef(true);

  // Reproduce music2.mp3 tras el primer clic (requisito de los navegadores).
  // Si el archivo todavía no existe o falla, se conserva la música sintetizada.
  useEffect(() => {
    const track = new Audio(`${import.meta.env.BASE_URL}music2.mp3`);
    track.loop = true;
    track.volume = 0.3;
    bgMusicRef.current = track;

    const fallbackToSynth = () => {
      if (musicEnabledRef.current) audio.setMusic(true);
    };
    const startTrack = () => {
      if (!musicEnabledRef.current) return;
      void track.play()
        .then(() => audio.setMusic(false))
        .catch(fallbackToSynth);
    };

    track.addEventListener('error', fallbackToSynth);
    document.addEventListener('click', startTrack, { once: true });

    return () => {
      document.removeEventListener('click', startTrack);
      track.removeEventListener('error', fallbackToSynth);
      track.pause();
      track.removeAttribute('src');
      track.load();
      bgMusicRef.current = null;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const container = containerRef.current!;
    const overlay = overlayRef.current!;
    const engine = new GameEngine(container, overlay, {
      onStats: (s) => {
        setStats(s);
        const ended = s.gameOver || s.lives <= 0;
        setGameOverForced(ended);
        // Keep the React game layer mounted even if started and engine state drift apart.
        if (ended) setStarted(true);
      },
      onTowerSelected: (t) => {
        setTowerInfo(t);
        if (t) setSelectedType(null);
      },
      onToast: (msg) => {
        setToast(msg);
        if (toastTimer.current) window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => setToast(null), 2200);
      },
    });
    engineRef.current = engine;
    (window as unknown as { __engine: GameEngine }).__engine = engine;
    engine.init().then(() => setReady(true)).catch(console.error);
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const pickTower = useCallback(
    (type: string) => {
      const next = selectedType === type ? null : type;
      setSelectedType(next);
      setTowerInfo(null);
      engineRef.current?.setSelectedType(next);
    },
    [selectedType],
  );

  const begin = () => {
    audio.init();
    audio.setMusic(false); // La pista externa sustituye la música sintetizada cuando carga.
    setStarted(true);
    engineRef.current?.startGame();
  };

  const scrollTowers = (direction: -1 | 1) => {
    const bar = towerBarRef.current;
    if (!bar) return;
    bar.scrollBy({ left: direction * Math.max(240, bar.clientWidth * 0.75), behavior: 'smooth' });
  };

  const gold = stats?.gold ?? 0;
  const waveInProgress = stats?.waveInProgress ?? false;
  // Use the life counter as a UI-side safety net if the engine flag ever gets out of sync.
  const gameOver = gameOverForced || (!!stats && (stats.gameOver || stats.lives <= 0));
  const victory = stats?.victory ?? false;

  return (
    <div className="game-root">
      <div ref={containerRef} className="game-canvas" />
      <div ref={overlayRef} className="fx-overlay" />

      {!started && (
        <div className="menu-screen">
          <div className="menu-panel">
            <h1 className="game-title">
              <span>TANGO</span>
              <span className="title-alt">MAYHEM</span>
            </h1>
            <p className="game-subtitle">{t('subtitle')}</p>
            {languageButtons}
            <div className="menu-chars">
              <img src={SPRITE('dog_runner')} onError={(event) => recoverSprite(event, 'dog_runner')} alt="Normal Dog" />
              <img src={SPRITE('slime')} onError={(event) => recoverSprite(event, 'slime')} alt="Slime" />
              <img src={SPRITE('firemage')} onError={(event) => recoverSprite(event, 'firemage')} alt="Fire Mage Dog" />
            </div>
            <button className="btn-3d btn-play" onClick={begin} disabled={!ready}>
              {ready ? t('play') : t('loading')}
            </button>
            <p className="menu-hint">{t('menuHint')}</p>
          </div>
        </div>
      )}

      {started && stats && (
        <>
          <div className="hud-top">
            <div className="hud-group">
              <div className="hud-pill hud-lives">
                <span className="hud-icon">♥</span>
                <span>{stats.lives}</span>
              </div>
              <div className="hud-pill hud-gold">
                <span className="hud-icon">●</span>
                <span>{stats.gold}</span>
              </div>
              <div className="hud-pill hud-wave">
                <span className="hud-label">{t('wave')}</span>
                <span>{stats.wave}{stats.wave > VICTORY_WAVE ? ' ∞' : `/${VICTORY_WAVE}`}</span>
              </div>
            </div>
            <div className="hud-group">
              <button
                className={`btn-3d btn-small ${stats.speed === 2 ? 'btn-active' : ''}`}
                onClick={() => engineRef.current?.setSpeed(stats.speed === 2 ? 1 : 2)}
              >
                {stats.speed === 2 ? '▶▶ x2' : '▶ x1'}
              </button>
              <button
                className={`btn-3d btn-small ${musicOn ? '' : 'btn-off'}`}
                onClick={() => {
                  const v = !musicOn;
                  setMusicOn(v);
                  musicEnabledRef.current = v;
                  const track = bgMusicRef.current;
                  if (!v) {
                    track?.pause();
                    audio.setMusic(false);
                  } else if (track) {
                    void track.play()
                      .then(() => audio.setMusic(false))
                      .catch(() => audio.setMusic(true));
                  } else {
                    audio.setMusic(true);
                  }
                }}
                aria-label={t('music')}
              >
                {musicOn ? '♫' : '♪̶'}
              </button>
              <button
                className={`btn-3d btn-small ${sfxOn ? '' : 'btn-off'}`}
                onClick={() => {
                  const v = !sfxOn;
                  setSfxOn(v);
                  audio.setSfx(v);
                }}
                aria-label={t('soundEffects')}
              >
                {sfxOn ? '🔊' : '🔇'}
              </button>
              <button
                type="button"
                className={`btn-3d btn-small language-toggle ${languageMenuOpen ? 'btn-active' : ''}`}
                onClick={() => setLanguageMenuOpen((open) => !open)}
                aria-label={t('language')}
                aria-expanded={languageMenuOpen}
                title={t('language')}
              >
                🌐 {language.toUpperCase()}
              </button>
            </div>
          </div>

          {languageMenuOpen && (
            <div className="language-picker in-game-language-picker" role="group" aria-label={t('language')}>
              {LANGUAGE_OPTIONS.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  className={`language-button ${language === option.code ? 'active' : ''}`}
                  onClick={() => chooseLanguage(option.code)}
                  aria-pressed={language === option.code}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {!waveInProgress && !gameOver && !victory && (
            <button className="btn-3d btn-wave pulse" onClick={() => engineRef.current?.startWave(stats.wave > 0)}>
              {stats.wave === 0 ? t('firstWave') : t('nextWave', { wave: stats.wave + 1 })}
            </button>
          )}

          {towerInfo && TOWERS[towerInfo.type] && (
            <div className="tower-popup">
              <div className="tower-popup-head">
                <img src={SPRITE(TOWERS[towerInfo.type].key)} onError={(event) => recoverSprite(event, TOWERS[towerInfo.type].key)} alt={TOWERS[towerInfo.type].name} />
                <div>
                  <strong>{t('tower_' + towerInfo.type)}</strong>
                  <span className="tower-popup-sub">
                    {t('level')} {towerInfo.level} · {t('damage')} {towerInfo.dmg} · {t('range')} {towerInfo.range}
                  </span>
                </div>
              </div>
              <div className="tower-popup-actions">
                {towerInfo.upgradeCost !== null ? (
                  <button
                    className="btn-3d btn-upgrade"
                    disabled={gold < towerInfo.upgradeCost}
                    onClick={() => engineRef.current?.upgradeSelected()}
                  >
                    {t('upgrade', { cost: towerInfo.upgradeCost })}
                  </button>
                ) : (
                  <span className="max-level">{t('maxLevel')}</span>
                )}
                <button className="btn-3d btn-sell" onClick={() => engineRef.current?.sellSelected()}>
                  {t('sell', { value: towerInfo.sellValue })}
                </button>
              </div>
            </div>
          )}

          <div className="tower-selector">
            <button type="button" className="tower-scroll-btn" onClick={() => scrollTowers(-1)} aria-label={t('previousTowers')}>‹</button>
            <div
              ref={towerBarRef}
              className="tower-bar"
              onWheel={(event) => {
                if (event.deltaY !== 0) event.currentTarget.scrollLeft += event.deltaY;
              }}
            >
            {TOWER_ORDER.map((key) => {
              const def = TOWERS[key];
              const affordable = gold >= def.cost;
              return (
                <button
                  key={key}
                  className={`tower-card ${selectedType === key ? 'selected' : ''} ${affordable ? '' : 'cant-afford'}`}
                  onClick={() => pickTower(key)}
                >
                  <img src={SPRITE(def.key)} onError={(event) => recoverSprite(event, def.key)} alt={def.name} draggable={false} />
                  <div className="tower-card-info">
                    <strong>{t('tower_' + key)}</strong>
                    <span className="tower-desc">{t('desc_' + key)}</span>
                    <span className="tower-cost">● {def.cost}</span>
                  </div>
                </button>
              );
            })}
            </div>
            <button type="button" className="tower-scroll-btn" onClick={() => scrollTowers(1)} aria-label={t('moreTowers')}>›</button>
            <div className="tower-scroll-hint">{t('towerScrollHint', { count: TOWER_ORDER.length })}</div>
          </div>

          {selectedType && (
            <div className="hint-bar">{t('buildHint')}</div>
          )}

          {toast && <div className="toast">{localizeToast(toast)}</div>}

          {victory && !gameOver && (
            <div className="end-screen">
              <div className="end-panel victory-panel">
                <h2 className="end-game-title">TANGO MAYHEM</h2>
                <p className="end-status">{t('victory')}</p>
                <p>{t('victoryText', { wave: VICTORY_WAVE })}</p>
                <div className="menu-chars end-chars">
                  <img src={SPRITE('dog_runner')} onError={(event) => recoverSprite(event, 'dog_runner')} alt="Pollito defensor" />
                  <img src={SPRITE('slime')} onError={(event) => recoverSprite(event, 'slime')} alt="Enemigo gelatinoso" />
                  <img src={SPRITE('firemage')} onError={(event) => recoverSprite(event, 'firemage')} alt="Pollito mágico" />
                </div>
                <div className="end-actions">
                  <button className="btn-3d btn-play" onClick={() => engineRef.current?.continueEndless()}>
                    {t('endless')}
                  </button>
                  <button className="btn-3d btn-secondary" onClick={() => engineRef.current?.restart()}>
                    {t('replay')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {gameOver && (
            <div className="end-screen">
              <div className="end-panel">
                <h2 className="end-game-title">TANGO MAYHEM</h2>
                <p className="end-status">{t('defeat')}</p>
                <p>{t('survived', { wave: stats.wave })}</p>
                <div className="end-actions">
                  <button className="btn-3d btn-play" onClick={() => engineRef.current?.restart()}>
                    {t('again')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
