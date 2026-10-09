// ─────────────────────────────────────────────────────────────
// App.tsx — HUD del juego (React) sobre el canvas 3D.
// ─────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import { audio } from './game/audio';
import { TOWERS, TOWER_ORDER, VICTORY_WAVE } from './game/config';
import { GameEngine, type GameStats, type TowerInfo } from './game/engine';

const SPRITE = (k: string) => `${import.meta.env.BASE_URL}sprites/${k}.png`;

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [towerInfo, setTowerInfo] = useState<TowerInfo | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [musicOn, setMusicOn] = useState(true);
  const [sfxOn, setSfxOn] = useState(true);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current!;
    const overlay = overlayRef.current!;
    const engine = new GameEngine(container, overlay, {
      onStats: (s) => setStats(s),
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
    setStarted(true);
    engineRef.current?.startGame();
  };

  const gold = stats?.gold ?? 0;
  const waveInProgress = stats?.waveInProgress ?? false;
  const gameOver = stats?.gameOver ?? false;
  const victory = stats?.victory ?? false;

  return (
    <div className="game-root">
      <div ref={containerRef} className="game-canvas" />
      <div ref={overlayRef} className="fx-overlay" />

      {!started && (
        <div className="menu-screen">
          <div className="menu-panel">
            <h1 className="game-title">
              <span>SLIME</span>
              <span className="title-alt">SIEGE</span>
            </h1>
            <p className="game-subtitle">Defensa de torres del Reino Gelatina</p>
            <div className="menu-chars">
              <img src={SPRITE('archer')} alt="Normal Dog" />
              <img src={SPRITE('slime')} alt="Slime" />
              <img src={SPRITE('frost')} alt="Bard Dog" />
            </div>
            <button className="btn-3d btn-play" onClick={begin} disabled={!ready}>
              {ready ? '¡JUGAR!' : 'Cargando…'}
            </button>
            <p className="menu-hint">
              Coloca torres en las parcelas de piedra y detén a los monstruos antes de que lleguen al castillo.
            </p>
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
                <span className="hud-label">Oleada</span>
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
                  audio.setMusic(v);
                }}
                aria-label="Música"
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
                aria-label="Efectos de sonido"
              >
                {sfxOn ? '🔊' : '🔇'}
              </button>
            </div>
          </div>

          {!waveInProgress && !gameOver && !victory && (
            <button className="btn-3d btn-wave pulse" onClick={() => engineRef.current?.startWave(stats.wave > 0)}>
              {stats.wave === 0 ? '¡Empezar Oleada 1!' : `¡Oleada ${stats.wave + 1}!`}
            </button>
          )}

          {towerInfo && TOWERS[towerInfo.type] && (
            <div className="tower-popup">
              <div className="tower-popup-head">
                <img src={SPRITE(TOWERS[towerInfo.type].sprite)} alt={TOWERS[towerInfo.type].name} />
                <div>
                  <strong>{TOWERS[towerInfo.type].name}</strong>
                  <span className="tower-popup-sub">
                    Nv. {towerInfo.level} · Daño {towerInfo.dmg} · Rango {towerInfo.range}
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
                    ⬆ Mejorar · {towerInfo.upgradeCost}
                  </button>
                ) : (
                  <span className="max-level">¡NIVEL MÁX!</span>
                )}
                <button className="btn-3d btn-sell" onClick={() => engineRef.current?.sellSelected()}>
                  Vender · +{towerInfo.sellValue}
                </button>
              </div>
            </div>
          )}

          <div className="tower-bar">
            {TOWER_ORDER.map((key) => {
              const def = TOWERS[key];
              const affordable = gold >= def.cost;
              return (
                <button
                  key={key}
                  className={`tower-card ${selectedType === key ? 'selected' : ''} ${affordable ? '' : 'cant-afford'}`}
                  onClick={() => pickTower(key)}
                >
                  <img src={SPRITE(def.sprite)} alt={def.name} draggable={false} />
                  <div className="tower-card-info">
                    <strong>{def.name}</strong>
                    <span className="tower-desc">{def.desc}</span>
                    <span className="tower-cost">● {def.cost}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedType && (
            <div className="hint-bar">Toca una parcela de piedra para construir · toca de nuevo la carta para cancelar</div>
          )}

          {toast && <div className="toast">{toast}</div>}

          {victory && !gameOver && (
            <div className="end-screen">
              <div className="end-panel victory-panel">
                <h2>¡VICTORIA!</h2>
                <p>Has defendido el Reino Gelatina durante {VICTORY_WAVE} oleadas.</p>
                <img className="end-img" src={SPRITE('golem')} alt="Gólem derrotado" />
                <div className="end-actions">
                  <button className="btn-3d btn-play" onClick={() => engineRef.current?.continueEndless()}>
                    Modo Infinito ∞
                  </button>
                  <button className="btn-3d btn-secondary" onClick={() => engineRef.current?.restart()}>
                    Jugar de nuevo
                  </button>
                </div>
              </div>
            </div>
          )}

          {gameOver && (
            <div className="end-screen">
              <div className="end-panel">
                <h2>¡EL CASTILLO HA CAÍDO!</h2>
                <p>Sobreviviste hasta la oleada {stats.wave}.</p>
                <div className="end-actions">
                  <button className="btn-3d btn-play" onClick={() => engineRef.current?.restart()}>
                    ¡Otra vez!
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
