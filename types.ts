
export enum TeamColor {
  RED = 'RED',
  GREEN = 'GREEN',
  BLUE = 'BLUE'
}

export interface PlayerState {
  id: string;
  team: TeamColor;
  isAI: boolean;
  position: [number, number, number];
  rotation: number;
  goldCarried: number; // Changed from hasGold: boolean
  isJailed: boolean;
  jailTimeRemaining: number;
  velocity: [number, number, number];
}

export interface Upgrades {
  moveSpeedLevel: number;
  capacityLevel: number;
}

export interface GameState {
  players: PlayerState[];
  scores: Record<TeamColor, number>;
  goldInBases: Record<TeamColor, number>;
  gameStatus: 'LOBBY' | 'PLAYING' | 'FINISHED';
  winner?: TeamColor;
}

export type Vector3Tuple = [number, number, number];
