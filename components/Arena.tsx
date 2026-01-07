
import React from 'react';
import { Box, Plane, Cylinder } from '@react-three/drei';
import { TeamColor } from '../types';
import { TEAM_CONFIG, JAIL_POSITION } from '../constants';

const Wall: React.FC<{ pos: [number, number, number], size: [number, number, number], rot?: [number, number, number] }> = ({ pos, size, rot = [0, 0, 0] }) => (
  <Box position={pos} args={size} rotation={rot}>
    <meshStandardMaterial color="#4a2c2a" roughness={0.8} />
  </Box>
);

const GoldPile: React.FC<{ team: TeamColor, count: number }> = ({ team, count }) => {
  const config = TEAM_CONFIG[team];
  return (
    <group position={config.basePos}>
      {/* Base Platform */}
      <Cylinder args={[3, 3, 0.2, 32]} position={[0, -0.4, 0]}>
        <meshStandardMaterial color={config.color} opacity={0.3} transparent />
      </Cylinder>
      
      {/* Visual Gold */}
      {Array.from({ length: count }).map((_, i) => (
        <Box 
          key={i} 
          position={[Math.sin(i) * 0.8, i * 0.1, Math.cos(i) * 0.8]} 
          rotation={[Math.random(), Math.random(), Math.random()]}
          args={[0.5, 0.5, 0.5]}
        >
          <meshStandardMaterial color="#ffd700" metalness={0.8} roughness={0.2} />
        </Box>
      ))}
    </group>
  );
};

export const Arena: React.FC<{ goldCounts: Record<TeamColor, number> }> = ({ goldCounts }) => {
  return (
    <group>
      {/* Floor */}
      <Plane args={[100, 100]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <meshStandardMaterial color="#2d1a18" roughness={1} />
      </Plane>

      {/* Outer Walls */}
      <Wall pos={[0, 5, 50]} size={[100, 10, 1]} />
      <Wall pos={[0, 5, -50]} size={[100, 10, 1]} />
      <Wall pos={[50, 5, 0]} size={[1, 10, 100]} />
      <Wall pos={[-50, 5, 0]} size={[1, 10, 100]} />

      {/* Internal Ship Maze - Twists and Turns */}
      <Wall pos={[10, 2, 10]} size={[15, 5, 2]} />
      <Wall pos={[-10, 2, 10]} size={[15, 5, 2]} />
      <Wall pos={[0, 2, 25]} size={[2, 5, 10]} />
      
      <Wall pos={[25, 2, 0]} size={[2, 5, 20]} />
      <Wall pos={[-25, 2, 0]} size={[2, 5, 20]} />
      
      <Wall pos={[0, 2, -15]} size={[30, 5, 2]} />
      <Wall pos={[15, 2, -30]} size={[2, 5, 15]} />
      <Wall pos={[-15, 2, -30]} size={[2, 5, 15]} />

      {/* Jail Visuals */}
      <group position={JAIL_POSITION}>
        <Wall pos={[3, 2.5, 0]} size={[0.2, 6, 6]} />
        <Wall pos={[-3, 2.5, 0]} size={[0.2, 6, 6]} />
        <Wall pos={[0, 2.5, 3]} size={[6, 6, 0.2]} />
        <Wall pos={[0, 2.5, -3]} size={[6, 6, 0.2]} />
        {/* Iron Bars look */}
        {Array.from({ length: 12 }).map((_, i) => (
            <Cylinder key={i} args={[0.05, 0.05, 6]} position={[-3 + (i * 0.5), 2.5, 3]}>
                <meshStandardMaterial color="#333" />
            </Cylinder>
        ))}
      </group>

      {/* Team Bases with Gold */}
      <GoldPile team={TeamColor.RED} count={goldCounts[TeamColor.RED]} />
      <GoldPile team={TeamColor.GREEN} count={goldCounts[TeamColor.GREEN]} />
      <GoldPile team={TeamColor.BLUE} count={goldCounts[TeamColor.BLUE]} />

      {/* Ambient Props */}
      <Box position={[5, 0.5, 5]} args={[1.5, 1.5, 1.5]}>
        <meshStandardMaterial color="#5d4037" />
      </Box>
      <Box position={[-12, 0.5, -8]} args={[1.2, 1.2, 1.2]}>
        <meshStandardMaterial color="#5d4037" />
      </Box>
      
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1.5} castShadow />
      <pointLight position={[-10, 10, -10]} intensity={1} color="#ffaa00" />
    </group>
  );
};
