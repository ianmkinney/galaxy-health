"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { ColonyBuilding } from "@/lib/civilization";
import {
  buildingAnchor,
  hashSeed,
  spherePoint,
  splitVoxels,
  voxelsForKind,
} from "@/lib/voxel-buildings";

const UP = new THREE.Vector3(0, 1, 0);
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const _base = new THREE.Color();

function ensureInstanceColor(mesh: THREE.InstancedMesh, capacity: number) {
  const need = Math.max(1, capacity) * 3;
  if (!mesh.instanceColor || mesh.instanceColor.count < capacity) {
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(need), 3);
  }
}

function applyInstance(
  mesh: THREE.InstancedMesh,
  i: number,
  x: number,
  y: number,
  z: number,
  size: number,
  rx: number,
  ry: number,
  rz: number,
  hex: string,
  tone: number,
  dim: number
) {
  _dummy.position.set(x, y, z);
  _dummy.rotation.set(rx, ry, rz);
  _dummy.scale.setScalar(size * 0.92);
  _dummy.updateMatrix();
  mesh.setMatrixAt(i, _dummy.matrix);
  _base.set(hex);
  const shade = 0.55 + tone * 0.28;
  _color.setRGB(
    Math.min(1, _base.r * shade * dim),
    Math.min(1, _base.g * shade * dim),
    Math.min(1, _base.b * shade * dim)
  );
  mesh.setColorAt(i, _color);
}

function VoxelStack({
  building,
  color,
  voxelSize,
  freshness,
  mode,
}: {
  building: ColonyBuilding;
  color: string;
  voxelSize: number;
  freshness: number;
  mode: "orbit" | "surface";
}) {
  const intactMesh = useRef<THREE.InstancedMesh>(null);
  const debrisMesh = useRef<THREE.InstancedMesh>(null);
  const seed = hashSeed(building.id);
  const voxels = useMemo(
    () => voxelsForKind(building.kind, seed, building.complexity),
    [building.kind, seed, building.complexity]
  );
  const { intact, shed } = useMemo(
    () => splitVoxels(voxels, freshness),
    [voxels, freshness]
  );
  const dim = 0.55 + freshness * 0.45;
  const height = (Math.max(0, ...voxels.map((v) => v.y)) + 1) * voxelSize;
  const fallMul = mode === "orbit" ? 16 : 9;

  useLayoutEffect(() => {
    const mesh = intactMesh.current;
    if (!mesh) return;
    ensureInstanceColor(mesh, voxels.length);
    intact.forEach((v, i) => {
      applyInstance(
        mesh,
        i,
        v.x * voxelSize,
        (v.y + 0.5) * voxelSize,
        v.z * voxelSize,
        voxelSize,
        0,
        0,
        0,
        color,
        v.t,
        dim
      );
    });
    mesh.count = intact.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [intact, voxelSize, color, dim, voxels.length]);

  useLayoutEffect(() => {
    const mesh = debrisMesh.current;
    if (!mesh || !shed.length) return;
    ensureInstanceColor(mesh, shed.length);
    mesh.count = shed.length;
    shed.forEach((v, i) => {
      applyInstance(
        mesh,
        i,
        v.x * voxelSize,
        (v.y + 0.5) * voxelSize,
        v.z * voxelSize,
        voxelSize,
        0,
        0,
        0,
        color,
        v.t,
        dim * 0.75
      );
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [shed, voxelSize, color, dim]);

  useFrame(({ clock }) => {
    const mesh = debrisMesh.current;
    if (!mesh || !shed.length) return;
    const t = clock.getElapsedTime();
    shed.forEach((v, i) => {
      const cycle = 3.6 + (hashSeed(building.id + i) % 17) * 0.18;
      const phase = (hashSeed(building.id + ":" + i) % 100) / 100;
      const u = ((t + phase * cycle) % cycle) / cycle;
      const fall = u < 0.12 ? 0 : ((u - 0.12) / 0.88) ** 2;
      const drift = (phase - 0.5) * voxelSize * 6 * fall;
      applyInstance(
        mesh,
        i,
        v.x * voxelSize + drift,
        (v.y + 0.5) * voxelSize - fall * voxelSize * (fallMul + v.y),
        v.z * voxelSize + (0.5 - phase) * voxelSize * 5 * fall,
        voxelSize * (1 - fall * 0.25),
        fall * 4.2,
        fall * 2.1,
        fall * 3.3,
        color,
        v.t,
        dim * 0.7
      );
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh
        ref={intactMesh}
        args={[undefined, undefined, Math.max(1, voxels.length)]}
        castShadow={mode === "surface"}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={color}
          roughness={0.42}
          metalness={0.22}
          emissive={color}
          emissiveIntensity={mode === "orbit" ? 0.55 + freshness * 0.4 : 0.16 + freshness * 0.38}
        />
      </instancedMesh>
      {shed.length > 0 ? (
        <instancedMesh
          ref={debrisMesh}
          args={[undefined, undefined, Math.max(1, shed.length)]}
          frustumCulled={false}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color={color}
            roughness={0.7}
            metalness={0.08}
            emissive={color}
            emissiveIntensity={mode === "orbit" ? 0.45 : 0.1}
            transparent
            opacity={0.92}
          />
        </instancedMesh>
      ) : null}
      {mode === "surface" ? (
        <Html distanceFactor={7} position={[0, height + voxelSize * 1.2, 0]} style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap rounded-md bg-black/65 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/85">
            {building.name}
            {building.condition !== "sound" ? (
              <span className="ml-1 text-white/40">{building.condition}</span>
            ) : null}
          </div>
        </Html>
      ) : null}
    </group>
  );
}

export function VoxelBuildingField({
  buildings,
  color,
  mode,
  planetRadius = 1,
}: {
  buildings: ColonyBuilding[];
  color: string;
  mode: "orbit" | "surface";
  planetRadius?: number;
}) {
  const voxelSize = mode === "orbit" ? Math.max(0.011, planetRadius * 0.05) : 0.052;
  const sites = useMemo(
    () =>
      buildings.map((building, index) => {
        const { theta, lift } = buildingAnchor(index, buildings.length);
        if (mode === "orbit") {
          const p = spherePoint(planetRadius * 1.018, theta, lift);
          const quaternion = new THREE.Quaternion().setFromUnitVectors(
            UP,
            new THREE.Vector3(p.x, p.y, p.z).normalize()
          );
          return { building, position: [p.x, p.y, p.z] as const, quaternion };
        }
        const r = 1.05 + (index % 3) * 0.28;
        return {
          building,
          position: [Math.cos(theta) * r, 0, Math.sin(theta) * r] as const,
          quaternion: null,
        };
      }),
    [buildings, mode, planetRadius]
  );

  return (
    <group>
      {sites.map(({ building, position, quaternion }) => (
        <group
          key={`${building.id}:${building.complexity}`}
          position={position}
          quaternion={quaternion ?? undefined}
        >
          <VoxelStack
            building={building}
            color={color}
            voxelSize={voxelSize * (mode === "orbit" ? building.scale : Math.min(1.25, building.scale))}
            freshness={building.freshness}
            mode={mode}
          />
        </group>
      ))}
    </group>
  );
}
