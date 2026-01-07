
import { TeamColor } from './types';

export const TEAM_CONFIG = {
  [TeamColor.RED]: { color: '#ef4444', basePos: [20, 0, 20] as [number, number, number] },
  [TeamColor.GREEN]: { color: '#22c55e', basePos: [-20, 0, 20] as [number, number, number] },
  [TeamColor.BLUE]: { color: '#3b82f6', basePos: [0, 0, -25] as [number, number, number] },
};

export const JAIL_POSITION: [number, number, number] = [0, 0, 0];
export const JAIL_TIME = 15; // Reduced jail time for faster flow
export const INITIAL_GOLD = 10;
export const WIN_SCORE = 5; 
export const BASE_MOVE_SPEED = 0.28;
export const AI_SPEED = 0.22;
export const TAG_DISTANCE = 2.5;
export const STEAL_DISTANCE = 2.0;

export const BOOTY_PER_WIN = 100;
export const UPGRADE_BASE_COST = 50;

export const BRAINROT_PHRASES = [
  "67",
  "SKIBIDI SKRILLA!",
  "NO CAP PIRATE",
  "GYATT THAT GOLD",
  "PIRATE RIZZ +1000",
  "OHIO SHIPWRECK",
  "Mewing in the Brig",
  "L BOZO",
  "W GOLD STEAL",
  "FANUM TAX!",
  "Sussus Amongus Pirate"
];
