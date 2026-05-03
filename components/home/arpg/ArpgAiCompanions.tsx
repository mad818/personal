"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { AGENTS } from "@/components/home/office/constants";
import type { AgentId } from "@/components/home/office/types";
import type { DispatchBar } from "@/components/home/office/officeCommandCenterConfig";

const COMPANION_POSITIONS: Record<AgentId, [number, number, number]> = {
  jansky: [0, 0.42, -2.05],
  orbit: [0.74, 0.36, -1.82],
  nova: [-0.74, 0.36, -1.82],
  cipher: [1.26, 0.34, -1.28],
  flux: [-1.26, 0.34, -1.28],
};

interface ArpgAiCompanionsProps {
  activeAgent: AgentId | null;
  dispatchBar: DispatchBar | null;
  motionIntensity: number;
  reducedMotion: boolean;
}

function CompanionOrb({
  agentId,
  activeAgent,
  dispatchBar,
  motionIntensity,
  reducedMotion,
}: ArpgAiCompanionsProps & { agentId: AgentId }) {
  const groupRef = useRef<THREE.Group>(null);
  const agent = AGENTS[agentId];
  const dispatching =
    dispatchBar?.from === agentId || dispatchBar?.to === agentId;
  const active = activeAgent === agentId || dispatching;

  useFrame(({ clock }) => {
    if (!groupRef.current || reducedMotion) return;
    const t = clock.getElapsedTime();
    groupRef.current.position.y =
      COMPANION_POSITIONS[agentId][1] +
      Math.sin(t * (1.2 + motionIntensity * 0.7) + agentId.length) *
        (active ? 0.08 : 0.035);
    groupRef.current.rotation.y = t * (active ? 0.75 : 0.28);
  });

  return (
    <group ref={groupRef} position={COMPANION_POSITIONS[agentId]}>
      <mesh>
        <sphereGeometry args={[active ? 0.16 : 0.1, 18, 18]} />
        <meshStandardMaterial
          color={agent.color}
          emissive={agent.color}
          emissiveIntensity={active ? 1.6 : 0.35}
          roughness={0.35}
          metalness={0.15}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[active ? 0.24 : 0.17, 0.01, 8, 36]} />
        <meshBasicMaterial color={agent.color} transparent opacity={active ? 0.75 : 0.24} />
      </mesh>
      {active ? (
        <mesh position={[0, 0.33, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.28, 0.31, 18]} />
          <meshBasicMaterial color={agent.color} transparent opacity={0.72} />
        </mesh>
      ) : null}
    </group>
  );
}

export default function ArpgAiCompanions(props: ArpgAiCompanionsProps) {
  const agents = useMemo<AgentId[]>(
    () => ["jansky", "orbit", "nova", "cipher", "flux"],
    [],
  );

  return (
    <group>
      {agents.map((agentId) => (
        <CompanionOrb key={agentId} agentId={agentId} {...props} />
      ))}
    </group>
  );
}
