# Mindful

Mental health companion app for Hack for Humanity hackathon.

## Status

Pre-hackathon scaffold only. This repository currently contains **no feature
code** — just the configured project shell (Vite + React + TypeScript +
Tailwind CSS + ESLint) so that feature development can start cleanly on
**Aug 7**.

## Stack

| Concern    | Choice                                  |
| ---------- | --------------------------------------- |
| Build tool | Vite 6                                  |
| UI         | React 18 + TypeScript                   |
| Styling    | Tailwind CSS v3 (via PostCSS)           |
| Linting    | ESLint 9 (flat config) + typescript-eslint |

## Getting started

Requires Node.js 18+ (20+ recommended).

```bash
npm install
npm run dev
```

The dev server runs at http://localhost:5173.

## Scripts

| Command           | Description                                      |
| ----------------- | ------------------------------------------------ |
| `npm run dev`     | Start the Vite dev server with HMR                |
| `npm run build`   | Type-check (`tsc -b`) and build to `dist/`        |
| `npm run preview` | Serve the production build locally                |
| `npm run lint`    | Run ESLint over the project                       |

## Project structure

```
mindful/
├── index.html            # App shell, PWA-ready meta tags
├── public/
│   └── favicon.svg
├── src/
│   ├── App.tsx           # Placeholder root component
│   ├── main.tsx          # React entry point
│   ├── index.css         # Tailwind directives
│   └── vite-env.d.ts
├── eslint.config.js
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json         # Project references
├── tsconfig.app.json     # src/ config
├── tsconfig.node.json    # Vite config tooling
└── vite.config.ts
```

## Conventions for the hackathon

- Add feature code under `src/`; keep `App.tsx` as the composition root.
- Style with Tailwind utility classes; extend the design tokens in
  `tailwind.config.js` under `theme.extend` rather than adding global CSS.
- Run `npm run lint` and `npm run build` before pushing.
