# Interface Information Architecture

This file defines the intended single primary navigation and what each stage is allowed to display.

## Primary Navigation

- PROJECT
- DESIGN
- PRODUCTION
- QUOTE
- ORDER

Only one primary navigation set exists and drives stage visibility.

## Stage Responsibilities

### PROJECT
- Project details
- Customer details
- Room and measurement setup
- Layout wizard setup steps

### DESIGN
- Cabinet library and cabinet rows
- Layout/workspace preview and design views
- Cabinet and hardware configuration
- Layout/filler adjustments

### PRODUCTION (Admin view)
- Cutting list report
- Manufacturing breakdown
- Hardware report
- Production quantity totals

### QUOTE
- Quote generation actions
- Quote lookup/navigation
- Final quote result and totals

### ORDER
- Customer approval state
- Payment state
- Order state

## Role Visibility

### Customer mode
- Sees: PROJECT, DESIGN, QUOTE, ORDER
- Does not see: PRODUCTION

### Admin / Panda Kitchens mode
- Sees: PROJECT, DESIGN, PRODUCTION, QUOTE, ORDER

## Single Source of Truth Rules

- Layout solving remains in `src/layoutSolver.js`.
- Cabinet/cutting/hardware logic remains in `src/cabinetCalculator.js`.
- API transport remains in `src/api.js`.
- UI stage changes must not duplicate business logic.
