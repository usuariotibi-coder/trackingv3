"use client";
import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere } from "@react-three/drei";
import * as THREE from "three";

// 1. Define las constantes de la animación
const MIN_X = -5; // Límite izquierdo (posición X)
const MAX_X = 5; // Límite derecho (posición X)
const SPEED = 2; // Velocidad de la esfera

interface BouncingSphereProps {
  color?: string; // Propiedad opcional para el color
  radius?: number; // Propiedad opcional para el radio
}

// 2. Componente de la esfera animada
const BouncingSphere: React.FC<BouncingSphereProps> = ({
  color = "#7575ffff", // Color por defecto: Rojo Tomate
  radius = 1,
}) => {
  // Referencia a la malla de la esfera para manipular su posición
  const sphereRef = useRef<THREE.Mesh>(null!);
  // Referencia para la dirección de movimiento (true = derecha, false = izquierda)
  const direction = useRef(true);

  // useFrame se ejecuta en cada fotograma del renderizado
  useFrame((delta: any) => {
    if (sphereRef.current) {
      let currentX = sphereRef.current.position.x;

      if (direction.current) {
        // Mover a la derecha
        currentX += SPEED * delta;
        if (currentX >= MAX_X) {
          currentX = MAX_X; // Asegura que no sobrepase el límite
          direction.current = false; // Cambiar dirección a izquierda
        }
      } else {
        // Mover a la izquierda
        currentX -= SPEED * delta;
        if (currentX <= MIN_X) {
          currentX = MIN_X; // Asegura que no sobrepase el límite
          direction.current = true; // Cambiar dirección a derecha
        }
      }
      sphereRef.current.position.x = currentX;
    }
  });

  return (
    <Sphere args={[radius, 32, 32]} ref={sphereRef}>
      <meshPhysicalMaterial
        color={color}
        metalness={1} // Qué tan metálico es (cerca de 1 es muy reflectante)
        roughness={0.2} // Qué tan pulido es (cerca de 0 es muy pulido)
        clearcoat={0.5} // Una capa extra de brillo (como una laca)
        clearcoatRoughness={0.5} // La laca es perfectamente lisa
      />
    </Sphere>
  );
};

// 3. Componente Principal que renderiza la escena y la esfera
const EsferaRebotando: React.FC = () => {
  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 75 }}
      // Sugerencia: El negro resalta mejor el material brillante
      style={{ width: "100vw", height: "100vh", background: "#ffffffff" }}
    >
      {/* 1. Luz Ambiental (suave) */}
      <ambientLight intensity={0.9} />

      {/* 2. Luz Puntual Fuerte (Principal) */}
      <pointLight position={[10, 10, 10]} intensity={5} color="#ffffff" />

      {/* 3. Luz Puntual de Relleno (Contraluz) */}
      <pointLight position={[-10, -10, -10]} intensity={3} color="#7575ffff" />

      {/* La esfera que rebota */}
      <BouncingSphere color="#1e90ff" radius={1.5} />
    </Canvas>
  );
};

export default EsferaRebotando;
