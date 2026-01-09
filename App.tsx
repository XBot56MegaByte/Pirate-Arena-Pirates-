
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
    gameStatus: 'INTRO',
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
      // Adjusted to 4 players per team (12 total)
      for (let i = 0; i < 4; i++) {
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
            const basePos = TEAM_CONFIG[user.team].