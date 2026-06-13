# Frontend Stack Audit — X_KA_HASH vs OpenAlgo

## X_KA_HASH Current Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Language | TypeScript 6 |
| Bundler | Vite 8 |
| Styling | Tailwind CSS v4 (custom UI, no shadcn) |
| Query | @tanstack/react-query |
| State | zustand |
| Flow Builder | @xyflow/react |
| Charts | lightweight-charts |
| Analytics | plotly.js-dist-min |
| Code Editor | @monaco-editor/react |
| Icons | lucide-react |
| Linter | ESLint |

## OpenAlgo Upstream Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Language | TypeScript 5 |
| Bundler | Vite 8 |
| Styling | Tailwind CSS v4 + shadcn/ui + Radix UI primitives |
| Query | @tanstack/react-query |
| State | zustand |
| Flow Builder | @xyflow/react |
| Charts | lightweight-charts |
| Analytics | react-plotly.js (wrapper) |
| Code Editor | CodeMirror (@codemirror, @uiw/react-codemirror) |
| Icons | lucide-react |
| Linter | Biome |
| Testing | Vitest + Playwright + jest-axe |

## Key Differences & Recommendations

### 1. shadcn/ui vs Custom Components

X_KA_HASH uses a custom UI built on Tailwind CSS v4. OpenAlgo uses shadcn/ui with Radix UI primitives.

**Recommendation:** Migrating to shadcn/ui is optional but recommended for consistency, accessibility, and reduced maintenance. If migrating, add these dependencies:

```bash
npm install sonner next-themes tailwind-merge clsx class-variance-authority
npm install react-resizable-panels  # for IDE-like layouts
```

Required config files for shadcn compatibility:
- `tailwind.config.ts` with `tailwindcss-animate` plugin
- `cn()` utility using `tailwind-merge` and `clsx`

### 2. Monaco vs CodeMirror

X_KA_HASH uses `@monaco-editor/react`. OpenAlgo uses CodeMirror (`@codemirror`, `@uiw/react-codemirror`).

**Recommendation:** Both are excellent. Monaco has richer IDE features (IntelliSense, debugging). Stay with Monaco unless bundle size is a concern (Monaco is ~5MB vs CodeMirror ~500KB).

### 3. Biome vs ESLint

OpenAlgo uses **Biome** — a Rust-based linter/formatter that is 10-100x faster than ESLint.

**Recommendation:** Consider switching to Biome for faster linting and formatting:

```bash
npm install --save-dev @biomejs/biome
npx @biomejs/biome init
```

### 4. Testing

X_KA_HASH does not appear to have Vitest or Playwright set up. OpenAlgo uses:
- **Vitest** for unit tests
- **Playwright** for E2E tests
- **jest-axe** for accessibility tests

**Recommendation:** Add testing infrastructure:

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
npm install --save-dev @playwright/test
```

### 5. Additional Dependencies for shadcn Compatibility

If migrating to shadcn/ui, add:

| Package | Purpose |
|---------|---------|
| `sonner` | Toast notifications |
| `next-themes` | Theme switching |
| `tailwind-merge` | Merge Tailwind classes |
| `clsx` | Conditional class names |
| `class-variance-authority` | Component variants (cva) |
| `react-resizable-panels` | Resizable panel layouts |

## Summary

| Area | Recommendation | Priority |
|------|---------------|----------|
| shadcn/ui | Optional migration | Medium |
| Monaco → CodeMirror | Stay with Monaco | Low |
| ESLint → Biome | Consider switching | Medium |
| Testing (Vitest + Playwright) | Add if not present | High |
| shadcn deps (sonner, cva, etc) | Add if migrating | Medium |
