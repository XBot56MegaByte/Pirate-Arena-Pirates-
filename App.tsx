
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Stars, PerspectiveCamera } from '@react-three/drei';
import { Arena } from './components/Arena';
import { Character } from './components/Character';
import { GameState, TeamColor, PlayerState, Vector3Tuple, Upgrades } from './types';
import { 
  TEAM_CONFIG, 
  INITIAL_GOLD, 
  WIN_SCORE,
  JAIL_TIME, 
  BASE_MOVE_SPEED, 
  AI_SPEED, 
  TAG_DISTANCE, 
  STEAL_DISTANCE, 
  JAIL_POSITION,
  BRAINROT_PHRASES,
  BOOTY_PER_WIN,
  UPGRADE_BASE_COST
} from './constants';
import { getBrainrotCommentary } from './services/geminiService';

const App: React.FC = () => {
  // Persistent meta-state
  const [pirateBooty, setPirateBooty] = useState<number>(0);
  const [upgrades, setUpgrades] = useState<Upgrades>({
    moveSpeedLevel: 0,
    capacityLevel: 0
  });

  const [gameState, setGameState] = useState<GameState>({
    players: [],
    scores: { [TeamColor.RED]: 0, [TeamColor.GREEN]: 0, [TeamColor.BLUE]: 0 },
    goldInBases: { [TeamColor.RED]: INITIAL_GOLD, [TeamColor.GREEN]: INITIAL_GOLD, [TeamColor.BLUE]: INITIAL_GOLD },
    gameStatus: 'LOBBY',
  });

  const [commentary, setCommentary] = useState<string>("WELCOME TO THE ARENA, SKIBIDI PIRATE!");
  const [showBrainrotText, setShowBrainrotText] = useState(false);
  const [brainrotText, setBrainrotText] = useState("");

  const keys = useRef<Record<string, boolean>>({});

  const triggerBrainrot = (text?: string) => {
    const phrase = text || BRAINROT_PHRASES[Math.floor(Math.random() * BRAINROT_PHRASES.length)];
    setBrainrotText(phrase);
    setShowBrainrotText(true);
    setTimeout(() => setShowBrainrotText(false), 2000);
  };

  const handleEvent = useCallback(async (event: string, forcePopupText?: string) => {
    const msg = await getBrainrotCommentary(event);
    setCommentary(msg);
    triggerBrainrot(forcePopupText);
  }, []);

  const startGame = () => {
    const initialPlayers: PlayerState[] = [];
    const teams = [TeamColor.RED, TeamColor.GREEN, TeamColor.BLUE];
    
    teams.forEach((team) => {
      for (let i = 0; i < 3; i++) {
        const isUser = team === TeamColor.RED && i === 0;
        initialPlayers.push({
          id: `${team}-${i}`,
          team: team,
          isAI: !isUser,
          position: [...TEAM_CONFIG[team].basePos],
          rotation: 0,
          goldCarried: 0,
          isJailed: false,
          jailTimeRemaining: 0,
          velocity: [0, 0, 0],
        });
      }
    });
    
    setGameState({
      players: initialPlayers,
      scores: { [TeamColor.RED]: 0, [TeamColor.GREEN]: 0, [TeamColor.BLUE]: 0 },
      goldInBases: { [TeamColor.RED]: INITIAL_GOLD, [TeamColor.GREEN]: INITIAL_GOLD, [TeamColor.BLUE]: INITIAL_GOLD },
      gameStatus: 'PLAYING',
    });
  };

  const buyUpgrade = (type: 'speed' | 'capacity') => {
    const level = type === 'speed' ? upgrades.moveSpeedLevel : upgrades.capacityLevel;
    const cost = UPGRADE_BASE_COST * (level + 1);
    
    if (pirateBooty >= cost) {
      setPirateBooty(p => p - cost);
      setUpgrades(u => ({
        ...u,
        [type === 'speed' ? 'moveSpeedLevel' : 'capacityLevel']: level + 1
      }));
      handleEvent(`UPGRADE BOUGHT: ${type.toUpperCase()} LVL ${level + 1}`, "W PROGRESSION");
    }
  };

  // Input listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Game Loop
  useEffect(() => {
    if (gameState.gameStatus !== 'PLAYING') return;

    const interval = setInterval(() => {
      setGameState((prev) => {
        const nextPlayers = [...prev.players];
        const nextGold = { ...prev.goldInBases };
        const nextScores = { ...prev.scores };

        // 1. Update Player (User)
        const user = nextPlayers.find(p => !p.isAI);
        if (user && !user.isJailed) {
          const currentPlayerMoveSpeed = BASE_MOVE_SPEED + (upgrades.moveSpeedLevel * 0.05);
          const currentCapacity = 1 + upgrades.capacityLevel;

          let dx = 0, dz = 0;
          if (keys.current['ArrowUp']) dz -= currentPlayerMoveSpeed;
          if (keys.current['ArrowDown']) dz += currentPlayerMoveSpeed;
          if (keys.current['ArrowLeft']) dx -= currentPlayerMoveSpeed;
          if (keys.current['ArrowRight']) dx += currentPlayerMoveSpeed;

          user.position[0] += dx;
          user.position[2] += dz;
          if (dx !== 0 || dz !== 0) {
            user.rotation = Math.atan2(dx, dz);
          }

          // Steal (S)
          if (keys.current['KeyS'] && user.goldCarried < currentCapacity) {
            Object.entries(TEAM_CONFIG).forEach(([team, config]) => {
              const t = team as TeamColor;
              if (t !== user.team && nextGold[t] > 0) {
                const dist = Math.sqrt(
                  (user.position[0] - config.basePos[0])**2 +
                  (user.position[2] - config.basePos[2])**2
                );
                if (dist < STEAL_DISTANCE) {
                  user.goldCarried++;
                  nextGold[t]--;
                  handleEvent(`Stealing gold! Capacity: ${user.goldCarried}/${currentCapacity}`, "67");
                }
              }
            });
          }

          // Tag (T)
          if (keys.current['KeyT']) {
            nextPlayers.forEach(other => {
              if (other.team !== user.team && !other.isJailed) {
                const dist = Math.sqrt((user.position[0] - other.position[0])**2 + (user.position[2] - other.position[2])**2);
                if (dist < TAG_DISTANCE) {
                  other.isJailed = true;
                  other.jailTimeRemaining = JAIL_TIME;
                  other.position = [...JAIL_POSITION] as Vector3Tuple;
                  if (other.goldCarried > 0) {
                    nextGold[other.team] += other.goldCarried;
                    other.goldCarried = 0;
                  }
                  handleEvent(`You tagged an enemy! L BOZO!`);
                }
              }
            });
          }

          // Return gold
          if (user.goldCarried > 0) {
            const basePos = TEAM_CONFIG[user.team].basePos;
            const dist = Math.sqrt((user.position[0] - basePos[0])**2 + (user.position[2] - basePos[2])**2);
            if (dist < STEAL_DISTANCE) {
              nextScores[user.team] += user.goldCarried;
              user.goldCarried = 0;
              handleEvent(`Secured the bag! W RIZZ!`);
            }
          }
        }

        // 2. Update AI
        nextPlayers.filter(p => p.isAI).forEach(ai => {
          if (ai.isJailed) {
            ai.jailTimeRemaining -= 0.05;
            if (ai.jailTimeRemaining <= 0) {
              ai.isJailed = false;
              ai.position = [...TEAM_CONFIG[ai.team].basePos] as Vector3Tuple;
            }
            return;
          }

          let targetPos: Vector3Tuple = [...TEAM_CONFIG[ai.team].basePos] as Vector3Tuple;
          
          if (ai.goldCarried === 0) {
            const targetTeam = Object.keys(nextGold).find(t => t !== ai.team && nextGold[t as TeamColor] > 0) as TeamColor;
            if (targetTeam) {
              targetPos = [...TEAM_CONFIG[targetTeam].basePos] as Vector3Tuple;
              const dist = Math.sqrt((ai.position[0] - targetPos[0])**2 + (ai.position[2] - targetPos[2])**2);
              if (dist < STEAL_DISTANCE) {
                ai.goldCarried = 1; // AI capacity is always 1 for balance
                nextGold[targetTeam]--;
                if (Math.random() > 0.95) handleEvent(`Enemy stealing!`, "67");
              }
            }
          } else {
            targetPos = [...TEAM_CONFIG[ai.team].basePos] as Vector3Tuple;
            const dist = Math.sqrt((ai.position[0] - targetPos[0])**2 + (ai.position[2] - targetPos[2])**2);
            if (dist < STEAL_DISTANCE) {
              nextScores[ai.team] += ai.goldCarried;
              ai.goldCarried = 0;
            }
          }

          // AI Defense
          const myBase = TEAM_CONFIG[ai.team].basePos;
          const enemy = nextPlayers.find(p => {
             if (p.team === ai.team || p.isJailed) return false;
             const distToMyBase = Math.sqrt((p.position[0] - myBase[0])**2 + (p.position[2] - myBase[2])**2);
             return distToMyBase < 15;
          });
          if (enemy) {
            targetPos = [...enemy.position] as Vector3Tuple;
            const tagDist = Math.sqrt((ai.position[0] - enemy.position[0])**2 + (ai.position[2] - enemy.position[2])**2);
            if (tagDist < TAG_DISTANCE) {
              enemy.isJailed = true;
              enemy.jailTimeRemaining = JAIL_TIME;
              enemy.position = [...JAIL_POSITION] as Vector3Tuple;
              if (enemy.goldCarried > 0) {
                nextGold[enemy.team] += enemy.goldCarried;
                enemy.goldCarried = 0;
              }
            }
          }

          const dx = targetPos[0] - ai.position[0], dz = targetPos[2] - ai.position[2];
          const dist = Math.sqrt(dx*dx + dz*dz);
          if (dist > 0.1) {
            ai.position[0] += (dx / dist) * AI_SPEED;
            ai.position[2] += (dz / dist) * AI_SPEED;
            ai.rotation = Math.atan2(dx, dz);
          }
        });

        const winner = [TeamColor.RED, TeamColor.GREEN, TeamColor.BLUE].find(t => nextScores[t] >= WIN_SCORE);
        if (winner) {
           if (winner === TeamColor.RED) {
             setPirateBooty(b => b + BOOTY_PER_WIN);
           }
           return { ...prev, gameStatus: 'FINISHED', winner };
        }

        return { ...prev, players: nextPlayers, goldInBases: nextGold, scores: nextScores };
      });
    }, 50);

    return () => clearInterval(interval);
  }, [gameState.gameStatus, handleEvent, upgrades]);

  const userPlayer = gameState.players.find(p => !p.isAI);

  return (
    <div className="relative w-full h-full bg-slate-900 overflow-hidden font-sans">
      
      {/* Lobby / Upgrade Shop Overlay */}
      {gameState.gameStatus === 'LOBBY' && (
        <div className="absolute inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center p-6 backdrop-blur-sm">
          <h2 className="text-7xl font-black text-white mb-2 italic tracking-tighter">PIRATE ARENA</h2>
          <p className="text-yellow-400 font-bold text-xl mb-12">BRAINROT EDITION</p>
          
          <div className="grid grid-cols-2 gap-8 w-full max-w-4xl mb-12">
            <div className="bg-white/5 p-6 rounded-3xl border-2 border-white/10 flex flex-col items-center text-center">
              <h3 className="text-2xl font-black text-white mb-4">CAPTAIN'S BOOTY</h3>
              <div className="text-5xl font-black text-yellow-500 mb-2">🏴‍☠️ {pirateBooty}</div>
              <p className="text-white/40 text-sm">Win games to earn more!</p>
            </div>

            <div className="bg-white/5 p-6 rounded-3xl border-2 border-white/10 space-y-4">
              <h3 className="text-2xl font-black text-white mb-4 text-center">SHIP UPGRADES</h3>
              
              <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl">
                <div>
                  <p className="text-white font-bold">Fast Boots (Lvl {upgrades.moveSpeedLevel})</p>
                  <p className="text-white/40 text-xs">Increase Move Speed</p>
                </div>
                <button 
                  onClick={() => buyUpgrade('speed')}
                  className={`px-4 py-2 rounded-lg font-black transition-colors ${pirateBooty >= UPGRADE_BASE_COST * (upgrades.moveSpeedLevel+1) ? 'bg-green-500 text-black hover:bg-green-400' : 'bg-white/10 text-white/20'}`}
                >
                  COST {UPGRADE_BASE_COST * (upgrades.moveSpeedLevel+1)}
                </button>
              </div>

              <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl">
                <div>
                  <p className="text-white font-bold">Deep Pockets (Lvl {upgrades.capacityLevel})</p>
                  <p className="text-white/40 text-xs">Carry More Gold (Current: {1 + upgrades.capacityLevel})</p>
                </div>
                <button 
                  onClick={() => buyUpgrade('capacity')}
                  className={`px-4 py-2 rounded-lg font-black transition-colors ${pirateBooty >= UPGRADE_BASE_COST * (upgrades.capacityLevel+1) ? 'bg-green-500 text-black hover:bg-green-400' : 'bg-white/10 text-white/20'}`}
                >
                  COST {UPGRADE_BASE_COST * (upgrades.capacityLevel+1)}
                </button>
              </div>
            </div>
          </div>

          <button 
            onClick={startGame}
            className="px-16 py-6 bg-red-600 text-white font-black text-4xl rounded-full hover:scale-105 transition-transform hover:bg-red-500 shadow-[0_0_50px_rgba(220,38,38,0.5)] uppercase italic"
          >
            Enter Arena
          </button>
        </div>
      )}

      {/* UI Overlays */}
      <div className="absolute top-4 left-4 z-10 space-y-2 pointer-events-none">
        <div className="bg-black/60 p-4 rounded-xl border-2 border-white/20 backdrop-blur-md">
          <h1 className="text-2xl font-black text-white italic tracking-tighter">PIRATE ARENA</h1>
          <div className="flex gap-4 mt-2">
            <div className="text-red-500 font-bold">RED: {gameState.scores[TeamColor.RED]}</div>
            <div className="text-green-500 font-bold">GREEN: {gameState.scores[TeamColor.GREEN]}</div>
            <div className="text-blue-500 font-bold">BLUE: {gameState.scores[TeamColor.BLUE]}</div>
          </div>
          <p className="text-white/50 text-[10px] mt-1 uppercase">FIRST TO {WIN_SCORE} WINS | BOOTY: {pirateBooty}</p>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 w-full max-w-lg pointer-events-none">
        <div className="bg-black/80 p-4 rounded-2xl border-4 border-yellow-500 text-center shadow-[0_0_20px_rgba(234,179,8,0.5)]">
           <p className="text-yellow-400 font-bold uppercase tracking-widest text-[10px] mb-1">Live Commentary</p>
           <p className="text-white text-lg font-black italic">"{commentary}"</p>
        </div>
      </div>

      {showBrainrotText && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
           <div className="text-9xl font-black text-yellow-400 animate-bounce select-none drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)] uppercase italic">
              {brainrotText}
           </div>
        </div>
      )}

      {/* Game End Overlay */}
      {gameState.gameStatus === 'FINISHED' && (
        <div className="absolute inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-10">
          <h2 className="text-8xl font-black text-white mb-4 italic">TEAM {gameState.winner} WINS!</h2>
          <p className="text-yellow-400 text-4xl font-bold animate-pulse">
            {gameState.winner === TeamColor.RED ? `EARNED 🏴‍☠️ ${BOOTY_PER_WIN} BOOTY!` : "L BOZO WE LOST"}
          </p>
          <button 
            onClick={() => setGameState(prev => ({ ...prev, gameStatus: 'LOBBY' }))}
            className="mt-10 px-8 py-4 bg-yellow-500 text-black font-black rounded-full hover:scale-110 transition-transform text-2xl uppercase"
          >
            Back to Base
          </button>
        </div>
      )}

      {/* 3D Scene */}
      <Canvas shadows>
        <PerspectiveCamera 
            makeDefault 
            position={userPlayer ? [userPlayer.position[0], userPlayer.position[1] + 15, userPlayer.position[2] + 20] : [0, 50, 50]} 
            fov={45} 
        />
        {userPlayer && (
          <OrbitControls 
            target={[userPlayer.position[0], userPlayer.position[1], userPlayer.position[2]]} 
            maxPolarAngle={Math.PI / 2.5}
            enableZoom={false}
          />
        )}
        
        <Sky sunPosition={[100, 20, 100]} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <Arena goldCounts={gameState.goldInBases} />
        
        {gameState.players.map((p) => (
          <Character key={p.id} state={p} isPlayer={!p.isAI} />
        ))}
        
        <fog attach="fog" args={['#1a1a1a', 10, 80]} />
      </Canvas>
    </div>
  );
};

export default App;
