# Readability Spec — Bulletproof Body

> Status: Active UI standard
> Last updated: 2026-03-08

## Goal
No squinting. No decoding. Users should scan and decide fast, even when mentally depleted.

## Typography Baseline (Mobile-First)
- UI labels/caps: minimum `text-sm` (14px)
- Body/supporting text: default `text-base` (16px)
- Card titles: `text-xl` (20px) minimum
- Key impact numbers: `text-3xl` to `text-5xl`
- Never use `text-[10px]` for critical information

## Contrast Baseline (Dark UI)
- Primary text: `text-white` or `text-zinc-100`
- Secondary text: `text-zinc-300` to `text-zinc-400`
- Avoid low-contrast defaults (`text-zinc-500/600`) for important copy
- Inputs/placeholders must remain readable (`placeholder-zinc-500` or brighter)

## Spacing + Touch
- Minimum tap target: 36px height
- Card padding: 16-20px (`p-4`/`p-5`)
- Vertical rhythm should separate: title -> metrics -> actions

## Card Information Hierarchy
1. Item name (largest text)
2. Key number (calories saved / weekly impact)
3. Macro summary (short, single row)
4. Rationale (brief, readable sentence)

## Copy Density Rules
- Keep lines short and plain.
- Prefer one sentence over one paragraph.
- Any explanatory text must be skimmable at a glance.

## Compliance Checklist
A screen passes only if:
- User can identify current item vs swap in under 2 seconds
- Weekly impact is visible without scrolling inside card
- No critical data is rendered below `text-sm`
- No key copy is low contrast
