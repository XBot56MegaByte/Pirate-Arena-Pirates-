
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Text, Cylinder } from '@react-three/drei';
import * as THREE from 'three';
import { TeamColor, PlayerState } from '../types';
import { TEAM_CONFIG } from '../constants';

interface CharacterProps {
  state: PlayerState;
  isPlayer: boolean;
}

export const Character: React.FC<CharacterProps> = ({ state, isPlayer }) => {
  const meshRef = useRef<THREE.Group>(null);
  const color = TEAM_CONFIG[state.team].color;

  useFrame((stateFrame) => {
    if (meshRef.current) {
      meshRef.current.position.set(...state.position);
      meshRef.current.rotation.y = state.rotation;
      
      if (state.isJailed) {
        meshRef.current.position.y = 1 + Math.sin(stateFrame.clock.getElapsedTime() * 5) * 0.5;
      }
    }
  });

  return (
    <group ref={meshRef}>
      {/* Body */}
      <Box args={[0.9, 1.4, 0.5]} position={[0, 0.7, 0]}>
        <meshStandardMaterial color="#eeeeee" />
      </Box>
      <Box args={[1, 1.2, 0.55]} position={[0, 0.8, 0]}>
        <meshStandardMaterial color={color} />
      </Box>

      {/* Legs */}
      <Box args={[0.35, 0.8, 0.35]} position={[-0.25, 0, 0]}>
        <meshStandardMaterial color="#332211" />
      </Box>
      <Cylinder args={[0.1, 0.15, 0.8, 8]} position={[0.25, 0, 0]}>
        <meshStandardMaterial color="#5d4037" roughness={1} />
      </Cylinder>

      {/* Arms */}
      <Box args={[0.25, 1.0, 0.25]} position={[-0.6, 0.8, 0]}>
        <meshStandardMaterial color={color} />
      </Box>
      <Box args={[0.25, 1.0, 0.25]} position={[0.6, 0.8, 0]}>
        <meshStandardMaterial color={color} />
      </Box>

      {/* Head */}
      <group position={[0, 1.7, 0]}>
        <Box args={[0.7, 0.7, 0.7]}>
          <meshStandardMaterial color="#ffccaa" />
        </Box>
        <Box args={[0.2, 0.2, 0.1]} position={[0.15, 0.1, 0.35]}>
          <meshStandardMaterial color="#111" />
        </Box>
        <Box args={[0.72, 0.05, 0.72]} position={[0, 0.1, 0]}>
          <meshStandardMaterial color="#111" />
        </Box>
        <Box args={[0.5, 0.1, 0.1]} position={[0, -0.15, 0.36]}>
          <meshStandardMaterial color="#442200" />
        </Box>
        <group position={[0, 0.45, 0]}>
          <Box args={[1.3, 0.4, 0.6]}>
             <meshStandardMaterial color="#1a1a1a" />
          </Box>
          <Box args={[1.35, 0.1, 0.65]} position={[0, 0.2, 0]}>
            <meshStandardMaterial color={color} />
          </Box>
        </group>
      </group>

      {/* Carried Gold Visuals */}
      {state.goldCarried > 0 && Array.from({ length: state.goldCarried }).map((_, i) => (
        <group key={i} position={[0, 0.8 + (i * 0.4), 0.6]}>
          <Box args={[0.4, 0.4, 0.4]}>
            <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={0.5} />
          </Box>
        </group>
      ))}

      {isPlayer && (
        <Text
          position={[0, 3.5, 0]}
          fontSize={0.6}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="black"
        >
          CAPTAIN YOU
        </Text>
      )}

      {state.isJailed && (
        <Text
          position={[0, 3.2, 0]}
          fontSize={0.5}
          color="#ff4444"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="black"
        >
          IN BRIG ({Math.ceil(state.jailTimeRemaining)}s)
        </Text>
      )}
    </group>
  );
};
