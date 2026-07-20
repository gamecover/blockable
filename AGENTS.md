# Game Project Instructions

## Required documentation

Before planning or modifying code, read:

- `docs/CODEX_DEVELOPMENT_GUIDE.md`
- `docs/GAME_DESIGN.md`tre

Follow that document unless the current user request explicitly overrides it.

## Core rule

Do not place all code in `App.jsx`, `main.jsx`, or a single Phaser Scene.

Separate code according to responsibility:

- React: screens, HUD, menus, overlays
- Phaser: game canvas, puzzle board, sprites, pointer input, tile movement, game effects
- Motion for React: React DOM animations only
- Zustand + Immer: shared and persistent game data
- XState: game flow, turn phases, encounter flow, and monster state machines
- Howler.js: sound through the shared SoundManager
- `src/game/systems/`: engine-independent game rules and calculations

## Source of truth

Each piece of state must have one owner.

- Zustand: deck, health, gold, map progress, inventory, run data
- XState: workflow states and transitions
- Phaser: temporary sprites, tweens, particles, and pointer state
- React local state: temporary component UI state

Do not mirror the same source-of-truth state across React, Phaser, Zustand, and XState.

## Architecture boundaries

- Do not implement battle calculations inside React components.
- Do not store persistent game data inside Phaser Scenes.
- Do not store Phaser objects in Zustand.
- Do not implement a custom generic state-machine engine when using XState.
- Do not manipulate React DOM directly from Phaser.
- React and Phaser must communicate through an explicit bridge or event interface.
- Use Phaser Tween or Animation for Phaser Canvas objects.
- Use Motion for React only for DOM UI animations.
- Play audio only through the shared Howler.js SoundManager.

## File placement

- Screen-specific code: `src/screens/<screen>/`
- Game rules: `src/game/systems/`
- XState machines: `src/game/machines/`
- Zustand stores: `src/game/state/`
- Phaser code: `src/game/phaser/`
- Shared events: `src/game/events/`
- Monster-specific code: `src/objects/monsters/<monster>/`
- Shared assets: `src/assets/`
- Screen-specific assets: the screen's `assets/` directory
- Monster-specific assets: the monster's `assets/` directory

Do not use `${PWD}` as a runtime asset URL.

## Working procedure

Before editing:

1. Inspect the existing directory structure.
2. Read the relevant files.
3. Check `package.json` and the lock file.
4. Reuse existing systems instead of duplicating them.
5. Keep the requested change narrowly scoped.

After editing:

1. Check imports and asset paths.
2. Run the relevant lint command.
3. Run relevant tests.
4. Run the production build.
5. Report anything that could not be tested.
6. Do not leave unused, temporary, or duplicate code.

## Dependency policy

- Do not add a production dependency without explaining why it is needed.
- Do not change major dependency versions unless explicitly requested.
- Preserve the existing package manager and lock file.
- Do not replace React, Phaser, Zustand, XState, Immer, Motion, or Howler.js unless explicitly requested.

## Security

- Never place secrets or private API keys in frontend code.
- Treat localStorage, URL parameters, imported save data, and user input as untrusted.
- Do not use `eval`, `new Function`, or unsanitized `dangerouslySetInnerHTML`.
- Client-calculated scores must not be treated as trustworthy for an online ranking.
