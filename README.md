# Play3D - AI-Powered 3D Model Generator

An innovative 3D model generation tool built with React, Three.js, and AI. Transform text prompts into 2D images and then into fully textured 3D models, all displayed in an interactive 3D viewport.

## ✨ Features

### 🤖 AI-Powered Generation

- **Text-to-Image** - Generate images from text prompts using Google Gemini AI
- **Image-to-3D** - Convert generated images to 3D models using Hunyuan3D (via fal.ai)
- **Smart prompt enhancement** - Automatically optimizes prompts for better 3D generation
- **Intelligent caching** - Stores generated images and models in IndexedDB for instant reuse
- **Global prompt input** - Start typing anywhere to create new models

### 🎨 3D Viewport

- **Interactive 3D canvas** - Full-screen Three.js viewport powered by React Three Fiber
- **Orbit controls** - Drag to rotate, scroll to zoom, explore your models from any angle
- **Grid system** - 10cm cell grid on horizontal plane, visible from both sides
- **Professional lighting** - Ambient and directional lights for realistic rendering
- **Auto-loading** - Generated 3D models automatically appear in the scene
- **Multi-object support** - Display multiple 3D models simultaneously
- **Persistent scene** - All objects and their transforms saved to IndexedDB
- **Scene persistence** - Your 3D scene is restored automatically on page reload
- **Selection & transforms** - Click to select, Move/Rotate/Scale gizmo, ground snap with 15cm threshold and bottom-face highlight
- **Render modes** - Switch between Textured and Solid Color
- **Solid Color mode** - Unique pastel color per object with crisp mesh lines on top
- **Persistent render choice** - Render mode toggle (center-top) is saved across reloads
- **Safer selection** - Hovering/dragging the transform gizmo prevents selecting objects behind it

### 📦 Modal System

- **Prompt Input Modal** - Clean floating input that appears on keypress
- **Image Display Modal** - Shows AI-generated images with download option
- **3D Generation UI** - One-click 3D model generation from images
- **Model Preview** - Download generated .glb files directly from the modal
- **No backdrop interference** - Transparent modals that don't obscure the 3D scene
- **History Modal** - Browse previously generated 3D objects from IndexedDB and add them back to the scene

### ⚙️ Settings Management

- **Dual API configuration** - Manage Gemini (image) and fal.ai (3D) API keys
- **Persistent storage** - API keys saved securely in browser localStorage
- **Custom hooks** - `usePersistedState` for automatic state persistence
- **Easy access** - Settings button with gear icon in top-right corner

### 🛠️ Development Tools

- **Hot Module Replacement** - Instant updates during development
- **ESLint & Prettier** - Code quality and formatting enforcement
- **TypeScript** - Full type safety across the entire codebase
- **Build optimization** - Production-ready builds with Vite

## 🚀 Tech Stack

### Core Framework

- **React 19** - Modern UI library with latest features
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool and dev server

### 3D Graphics

- **Three.js** - Powerful 3D graphics library
- **@react-three/fiber** - React renderer for Three.js
- **@react-three/drei** - Useful helpers (Grid, OrbitControls, useGLTF)

### AI & Storage

- **@google/genai** - Google Gemini AI for text-to-image generation
- **@fal-ai/client** - fal.ai client for Hunyuan3D model generation
- **idb-keyval** - IndexedDB wrapper for caching images and models

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
│   ├── Model3D.tsx          # 3D model loader component
│   ├── PromptInput.tsx      # Global prompt input modal
│   ├── PromptModal.tsx      # Image/model display modal
│   ├── HistoryModal.tsx     # History browser for stored 3D objects
│   └── SettingsModal.tsx    # API key settings modal
├── hooks/
│   └── usePersistedState.ts # Custom hook for localStorage persistence
├── services/
│   ├── gemini.ts            # Google Gemini AI integration
│   ├── synexa.ts            # fal.ai Hunyuan3D integration
│   ├── storage.ts           # IndexedDB caching utilities
│   └── types.ts             # Shared TypeScript interfaces
├── assets/                   # Static assets
├── App.tsx                   # Main app component
├── Scene.tsx                 # Main 3D scene orchestrator
├── RotatingCube.tsx         # Placeholder 3D object
├── main.tsx                  # App entry point
└── index.css                 # Global styles with Tailwind
```

## 🎮 Usage

### Quick Start Guide

1. **Configure API Keys**
   - Click the settings icon (⚙️) in the top-right corner
   - Enter your [Google Gemini API key](https://aistudio.google.com/app/apikey)
   - Enter your [fal.ai API key](https://fal.ai/dashboard/keys)
   - Click "Save" to persist keys to localStorage

2. **Generate a 3D Model**
   - Start typing anywhere (e.g., "red sports car")
   - Press `Enter` to submit the prompt
   - Wait for the image to generate (shows in modal)
   - Click "Generate 3D Model" button
   - Wait for 3D generation to complete (~30-60 seconds)
   - Model automatically appears in the 3D viewport!

3. **Explore Your Models**
   - **Left-click + drag** - Rotate camera around the models
   - **Scroll wheel** - Zoom in/out
   - **Click a model** - Select it and show transform gizmo
   - **Move/Rotate/Scale** - Use the toolbar on the top-left to change modes
   - **Drag to move** - Bottom sticks to ground when within 15cm of y=0
   - **Ground highlight** - Transparent orange bottom face indicates stickiness
   - **Close modal** - Model stays in the scene
   - **Generate new model** - Adds to the scene (no replacement)
   - **Delete selected** - Red trash icon (top-right) or `Delete` key removes the currently selected object
   - **History** - Clock icon (top-right) opens a list of known 3D objects from IndexedDB; click "Add to scene" to insert
   - **Render mode** - Center-top toggle between Textured and Solid; Solid shows unique pastel fills and mesh lines
   - **Reload page** - Your entire scene is automatically restored!

### Keyboard Shortcuts

- **Any letter/number** - Opens prompt input modal
- **Enter** - Submit prompt and generate image
- **Escape** - Close prompt input (without submitting)
- **Delete** - Remove the currently selected object from the scene
- Coming soon: `W` Move, `E` Rotate, `R` Scale

### Modal Features

- **Generated Image** - Preview and verify before 3D generation
- **Download Image** - Save the generated image as PNG
- **Generate 3D** - One-click conversion to 3D model
- **Download Model** - Save generated .glb file for use in other tools
- **Smart Caching** - Same prompt = instant retrieval from IndexedDB

### Scene Persistence

- **Automatic saving** - Scene state saved to IndexedDB whenever objects are added
- **Full restoration** - Close browser, reboot computer - scene is preserved
- **Multiple objects** - Build up a collection of models over time
- **No duplicates** - Same model won't be added twice
- **Edit anytime** - Remove objects individually (trash icon or `Delete` key); changes persist automatically
- **Transform storage** - Position, rotation, and scale saved for each object (ready for future manual editing)

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

### AI Generation Settings

**Gemini Image Generation:**

- Prompts are automatically enhanced with: `"Create an image for me: {prompt}. White background, no shadow, top-corner view. No other objects in the image."`
- This optimization ensures better results for 3D conversion
- Modify template in `src/Scene.tsx` → `handlePromptSubmit()`

**Hunyuan3D Model Generation:**

- Uses fal.ai's Hunyuan3D v2 API
- Supports data URLs (base64 images)
- Default settings: seed=1234, steps=50, guidance=5.5, resolution=256
- Modify in `src/services/synexa.ts` → `generate3DModel()`

### Storage & Caching

- **Images cached in IndexedDB** - Key format: `image_{hash(prompt)}`
- **Models cached in IndexedDB** - Key format: `model3d_{hash(prompt)}`
- **Scene state in IndexedDB** - All objects with transforms persisted automatically
- **API keys in localStorage** - Keys: `gemini-api-key`, `fal-api-key`
- Cache persists across sessions for instant reloading
- Scene is fully restored on page reload with all objects and positions
- **History scanning** - History modal scans IndexedDB for entries containing a `modelUrl`

## 💡 Tips & Best Practices

### For Best Results

1. **Prompt Writing**
   - Be specific and descriptive (e.g., "blue ceramic coffee mug" vs "mug")
   - Single objects work better than complex scenes
   - Mention colors, materials, and style

2. **3D Generation**
   - Generation takes 30-60 seconds - be patient!
   - First generation requires model download (may take longer)
   - Check browser console for progress updates
   - Models are cached - same prompt = instant reload

3. **Performance**
   - Complex models may impact viewport performance
   - Adjust model scale in `Model3D.tsx` if needed (default: 0.1)
   - Close unused modals to reduce UI overhead

### Known Limitations

- Manual positioning is supported via the transform gizmo (position/rotation/scale). New models are placed at origin by default.
- 3D generation requires active internet connection
- API rate limits apply based on your plan
- Large models (high detail) may take longer to generate
- Model quality depends on input image clarity
- Duplicate models (same URL) are prevented automatically

## 🔐 API Keys & Privacy

- **API keys are stored locally** in your browser's localStorage
- Keys are never sent to any server except the respective AI services
- Clear browser data to remove cached keys
- Keep your API keys secure and never commit them to version control

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
