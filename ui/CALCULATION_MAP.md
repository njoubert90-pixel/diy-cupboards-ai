# Calculation Logic Map (Single Source of Truth)

This document maps the existing working calculation and persistence flow that must be preserved during UI restructuring.

## 1) Core Calculation Engines

### Layout solver
- File: `src/layoutSolver.js`
- Entry point: `solveLayout(input)`
- Responsibilities:
  - Build required special units (corner, sink, extractor, fridge, tall oven)
  - Solve remaining run width using cabinet width combinations with filler constraints
  - Produce final run sequence and grouped rows
- Key internals:
  - `buildSpecials(config)`
  - `searchBestMix(target, options, maxItems)`
  - `arrangeSequence(mode, fillKeys, specialGroups, config)`
  - `groupRows(keys)`

### Cabinet calculator
- File: `src/cabinetCalculator.js`
- Data source: `cabinetLibrary`
- Entry point: `calculateCabinet(cabinetKey, qty)`
- Responsibilities:
  - Build full cutting parts list for standard and corner cabinets
  - Compute board area, back area, front area, edging totals
  - Generate hardware requirements for each cabinet
- Key internals:
  - `buildCabinetParts(...)`
  - `buildCornerBaseParts(...)`
  - `buildCornerWallParts(...)`

## 2) Frontend Orchestration Layer

### Main orchestrator
- File: `src/App.jsx`
- Responsibilities:
  - Collect inputs from project/design UI
  - Call `solveLayout(...)` for single/all runs
  - Convert layout outputs into cabinet rows and run previews
  - Call `calculateCabinet(...)` for report totals and breakdowns
  - Persist/load project, room, and layout via API layer
  - Build quote payload and fetch quote results

### Important flow functions in App
- Project/persistence:
  - `ensureProject()`
  - `persistRoomAndLayout(...)`
  - `handleSaveProject()`
  - `handleLoadProject()`
- Layout generation:
  - `generateRunForWidth(mode, runWidthMm)`
  - `handleGenerateLayout()`
  - `handleGenerateAllLayouts()`
  - `updateRunPreview(...)`
  - `applyCombinedRunPreviews(...)`
- Quote and pricing path:
  - `handleCreateQuote()`
  - `handleLookupQuote(...)`

## 3) API Layer (No Business Logic Duplication)

### API wrapper
- File: `src/api.js`
- Responsibility: HTTP transport only. No calculation logic.
- Endpoints used:
  - Projects: `createProject`, `listProjects`, `getProject`, `updateProject`
  - Room: `saveRoomSpec`, `getRoomSpec`
  - Layouts: `saveProjectLayout`, `listProjectLayouts`
  - Quotes: `createQuote`, `getQuote`

## 4) Derived Production Data (Frontend)

The UI derives production views from one source: cabinet rows + quote payload/results.

- Cutting list report:
  - Local calculation path from `calculateCabinet(...)`
  - Or quote-provided cutting list when available
- Manufacturing breakdown and hardware report:
  - Derived from cutting list and hardware rows
- Combined totals:
  - Computed with memoized reducers in `App.jsx`

## 5) Non-Negotiable Preservation Rules

1. Keep `solveLayout(...)` as the only layout-solving engine.
2. Keep `calculateCabinet(...)` as the only cabinet/cutting/hardware engine.
3. Keep `cabinetLibrary` as authoritative cabinet spec source.
4. Keep `api.js` transport-focused; do not embed duplicate business rules there.
5. UI refactor should only reorganize where and when outputs are shown.

## 6) Refactor Safety Checklist

Before replacing any UI section, verify it still invokes the same functions:
- Layout generation still calls `solveLayout(...)`.
- Reports still originate from `calculateCabinet(...)` or quote payload.
- Save/load still uses existing project/room/layout endpoints.
- Quote still uses `createQuote(...)` with existing payload fields.
