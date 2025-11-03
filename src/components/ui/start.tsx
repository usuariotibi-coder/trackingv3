"use client";
import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

// 1. Define las constantes de la animación
const TARGET_X = 0; // Posición Z donde queremos que se detenga el título (ajustada para R3F)
const START_X = -10; // Posición Z inicial (bien lejos)
const SPEED = 0.5; // Velocidad de la animación

// 2. Componente de Texto Animado
const AnimatingText: React.FC = () => {
  // Usa useRef para acceder a la malla del texto (Mesh)
  const textRef = useRef<THREE.Mesh>(null!);

  // Mueve el objeto en cada frame (similar al requestAnimationFrame de Three.js)
  useFrame((delta: any) => {
    if (textRef.current && textRef.current.position.x < TARGET_X) {
      // Delta asegura que la animación sea fluida sin importar el framerate
      textRef.current.position.x += SPEED * delta * 15;
    }
  });

  return (
    <Text
      ref={textRef}
      // *POSICIÓN INICIAL PARA EL EFECTO "DESDE ATRÁS"*
      position={[START_X, 0, 0]} // [X, Y, Z]
      fontSize={1}
      color="#000000" // Color Cian
      // **CAMBIA ESTO** a tu fuente .woff o .ttf
      anchorX="center"
      anchorY="middle"
      // Propiedades 3D adicionales
      // Puedes usar `material` o `castShadow`, etc.
    >
      Entrar
    </Text>
  );
};

// 3. Componente Principal de la Escena
const EntradaTitulo: React.FC = () => {
  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 75, far: 1000 }} // La cámara ve hasta Z=1000
      style={{ textAlign: "start", width: "50%", height: "100vh" }}
    >
      {/* Iluminación */}
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 0, 10]} intensity={1} />

      {/* El componente que contiene la lógica de animación */}
      <AnimatingText />
    </Canvas>
  );
};

export default EntradaTitulo;
