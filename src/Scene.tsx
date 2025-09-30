import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { IoSettingsSharp } from 'react-icons/io5';
import { RotatingCube } from './RotatingCube';
import { SettingsModal } from './components/SettingsModal';

export function Scene() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="w-screen h-screen relative">
      {/* Settings Button */}
      <button
        onClick={() => setIsSettingsOpen(true)}
        className="absolute top-4 right-4 z-10 p-3 bg-white/90 hover:bg-white rounded-lg shadow-lg transition-all hover:shadow-xl"
        aria-label="Settings"
      >
        <IoSettingsSharp size={24} className="text-gray-700" />
      </button>

      {/* 3D Canvas */}
      <Canvas
        camera={{
          position: [1, 1, 1], // 100cm = 1 unit in Three.js (we'll use meters)
          fov: 50,
        }}
        style={{ background: '#d3d3d3' }}
      >
        {/* Ambient light for general illumination */}
        <ambientLight intensity={0.5} />

        {/* Directional light for shadows and depth */}
        <directionalLight position={[5, 5, 5]} intensity={1} />

        {/* Grid on horizontal plane (XZ), visible from both sides */}
        <Grid
          args={[10, 10]} // 10m x 10m grid
          cellSize={0.1} // 10cm cells
          cellThickness={1}
          cellColor="#6b7280"
          sectionSize={1} // 1m sections
          sectionThickness={1.5}
          sectionColor="#374151"
          fadeDistance={25}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid={false}
          side={2} // THREE.DoubleSide - visible from both sides
        />

        {/* Rotating cube at center */}
        <RotatingCube />

        {/* Orbit controls for camera rotation and zoom */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          target={[0, 0, 0]} // Look at origin
        />
      </Canvas>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
