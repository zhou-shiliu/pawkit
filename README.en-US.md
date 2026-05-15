# Pawkit

English | [简体中文](README.md)

A lightweight desktop pet player compatible with Codex Pet-style packages. Put a tiny animated companion on your desktop, drag it around, swap its appearance, and let it quietly stay with you while you work.

> Current version: `v0.1.0-mvp`
>
> Positioning: a Codex Pet-compatible desktop pet player

## Why Pawkit?

Many desktop pet apps quickly become complicated care simulators, settings panels, or notification systems. Pawkit starts smaller: make the core companion experience feel good first.

- You can see a pet as soon as the app starts.
- The pet is animated, not just a static image.
- You can drag it anywhere you like.
- You can replace its appearance with your favorite pet package.
- It remembers your last selected pet after restart.
- It stays lightweight and avoids interrupting your work.

Pawkit is meant to feel like a small companion on your desktop, not another task manager.

## Core Features

### Animated desktop pet

Pawkit displays a transparent desktop pet window. The pet is animated from a spritesheet and supports states such as idle, working, attention, success, failed, sleepy, moving left, and moving right.

### Codex Pet package compatibility

Pawkit supports common Codex Pet-style assets:

```text
pet.json
spritesheet.webp
```

You can import a `.zip` package or an extracted directory.

### Dragging and placement memory

Hold and drag the pet to move it. While dragging, the pet switches between left-running and right-running animations based on the current movement direction. Its position is saved after you release it.

If the pet ends up somewhere inconvenient, you can reset its position from the tray menu.

### Pet switching and startup memory

After importing multiple pets, you can switch between them from the tray menu. Pawkit remembers your last selected pet and restores it on the next launch.

### Lightweight status bubbles

For states like clicking, moving, working, or failing, Pawkit can show a short message above the pet. The bubble is temporary and intentionally non-intrusive.

## Installation and Launch

```bash
npm install
npm run dev
```

Local production-style launch:

```bash
npm start
```

Web-only preview:

```bash
npm run dev:web
```

Legacy care UI preview:

```bash
npm run dev:legacy
```

## Usage

### Import a pet

1. Open Pawkit from the system tray menu.
2. Click `导入宠物包…` / `Import pet package…`.
3. Choose a `.zip` pet package or an extracted directory.
4. Pawkit switches to the imported pet after a successful import.

Imported pet assets are copied into the user data directory and are not written into the repository.

### Switch pets

1. Open the tray menu.
2. Go to `切换宠物` / `Switch pet`.
3. Pick the pet you want.

Pawkit restores the selected pet next time it starts.

### Move the pet

Hold the pet with your mouse and drag it. The pet stays where you release it.

### Reset position

If the pet is hard to reach, use the tray menu action:

```text
找回 / 重置位置
```

## Pet Package Format

Minimal `pet.json` example:

```json
{
  "id": "example-pet",
  "displayName": "Example Pet",
  "description": "A tiny companion.",
  "spritesheetPath": "spritesheet.webp"
}
```

Supported standard animation names include:

- `idle`
- `waiting`
- `waving` / `wave`
- `jumping` / `jump`
- `failed` / `fail`
- `running` / `run`
- `running-left` / `run left`
- `running-right` / `run right`
- `review`

If a pet package does not explicitly define animations, Pawkit fills in default row mappings based on common Codex Pet atlas conventions.

## What is not included yet?

`v0.1.0-mvp` focuses on the pet-player experience. It does not include:

- AI chat
- Voice interaction
- Complex settings pages
- Advanced multi-display controls
- Public installer release flow
- Complex virtual-pet stats systems
- Default care HUD

Earlier care-focused experiments remain in legacy code and historical documents, but they are not part of the default MVP experience.

## Development Checks

```bash
npm test
npm run verify:pet-mvp
npm run verify:pet-dialog
npx tsc --noEmit --project tsconfig.json
npm run build
git diff --check
```

## Project Status

- Current version: `v0.1.0-mvp`
- Main branch: `main`
- MVP release notes: `docs/RELEASE-v0.1.0-MVP.md`
- MVP manual QA: `docs/PET-MVP-QA.md`
- MVP architecture notes: `docs/PET-MVP-RESET-ARCHITECTURE.md`

## What comes next?

After the MVP, the next step is not to add a complex system immediately. The first priority is to observe real usage:

- Is pet package import smooth?
- Does the pet size feel comfortable?
- Are status bubbles charming without being distracting?
- Are dragging and placement restore stable?
- Do users want more built-in pets?

If the feedback is stable, Pawkit can move toward lightweight `v0.2.0` improvements.
