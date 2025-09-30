# Play3D - 3D Scene Editor

A modern 3D scene editor built with React, Three.js, and TypeScript. Features an interactive 3D viewport with camera controls, grid system, and settings management.

## ✨ Features

### 🎨 3D Viewport

- **Full-screen 3D canvas** powered by Three.js and React Three Fiber
- **Interactive camera controls** - Drag to rotate around the scene, scroll to zoom in/out
- **Grid system** - 10cm cell grid on the horizontal plane, visible from both sides
- **Lighting** - Ambient and directional lighting for realistic rendering
- **Placeholder objects** - Rotating cube demo at the scene center

### ⚙️ Settings Management

- **Settings modal** - Clean UI for application configuration
- **API Key storage** - Secure Gemini API key storage in browser localStorage
- **Persistent state** - Custom `usePersistedState` hook for automatic state persistence
- **Settings button** - Easy access via top-right corner icon

### 🛠️ Development Tools

- **Hot Module Replacement (HMR)** - Instant updates during development
- **ESLint** - Code quality enforcement with TypeScript support
- **Prettier** - Automatic code formatting
- **Type safety** - Full TypeScript coverage

## 🚀 Tech Stack

### Core Framework

- **React 19** - Modern UI library with latest features
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool and dev server

### 3D Graphics

- **Three.js** - Powerful 3D graphics library
- **@react-three/fiber** - React renderer for Three.js
- **@react-three/drei** - Useful helpers and abstractions (Grid, OrbitControls)

### Styling & UI

- **Tailwind CSS v4** - Utility-first CSS framework
- **React Icons** - Icon library for UI components
- **PostCSS** - CSS processing with Autoprefixer

### Code Quality

- **ESLint** - Linting with TypeScript and React plugins
- **Prettier** - Code formatting with ESLint integration

## 📦 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Visit `http://localhost:5173` (or the port shown in terminal)

### Building

```bash
npm run build
```

### Linting

```bash
npm run lint
npm run lint:fix  # Fix auto-fixable issues
```

### Formatting

```bash
npm run format
```

## 📁 Project Structure

```
src/
├── components/
│   └── SettingsModal.tsx    # Settings modal component
├── hooks/
│   └── usePersistedState.ts # Custom hook for localStorage persistence
├── assets/                   # Static assets
├── App.tsx                   # Main app component
├── Scene.tsx                 # 3D scene with canvas and controls
├── RotatingCube.tsx         # Demo 3D object
├── main.tsx                  # App entry point
└── index.css                 # Global styles with Tailwind
```

## 🎮 Usage

### Camera Controls

- **Left-click + drag** - Rotate camera around the center
- **Scroll wheel** - Zoom in/out
- **Right-click + drag** - Pan the camera (if enabled)

### Settings

1. Click the settings icon (⚙️) in the top-right corner
2. Enter your Gemini API key
3. Click "Save" to persist the key to localStorage

## 🔧 Configuration

### Camera Settings

Default camera position: `(100cm, 100cm, 100cm)` looking at origin `(0, 0, 0)`

Modify in `src/Scene.tsx`:

```tsx
camera={{
  position: [1, 1, 1], // in meters
  fov: 50,
}}
```

### Grid Settings

- Cell size: 10cm (0.1m)
- Grid size: 10m × 10m
- Double-sided rendering

Modify in `src/Scene.tsx`:

```tsx
<Grid
  args={[10, 10]}
  cellSize={0.1}
  // ... other props
/>
```

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x';
import reactDom from 'eslint-plugin-react-dom';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```
