# QR Code Dinosaur 🦕

Generate scannable QR codes with a dinosaur in the center. Free, instant, fully offline after load — no signup, no backend.

## Run locally

```bash
cd qr-dino
npm install
npm run dev
```

Open http://localhost:5173/qr/

## Build

```bash
npm run build   # outputs to qr-dino/dist/
```

The built files are copied to `/qr/` at the repo root for Vercel static deployment (base path `/qr/`).

## Tech stack

- React 18 + TypeScript
- Vite 5
- Tailwind CSS 3
- [qr-code-styling](https://github.com/kozakdenys/qr-code-styling) — QR generation with dot styles and center logo

## Features

- Live preview as you type (debounced)
- 4 built-in dinosaurs (T-Rex, Stegosaurus, Brontosaurus, Triceratops) bundled as inline SVGs
- 5 color presets
- Download as PNG or SVG
- Copy to clipboard
- Light / dark mode (respects system preference, persisted in localStorage)
- Fully offline after initial page load
