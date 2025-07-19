# Repository Agent Guidelines

This repository contains an HTML/JS game built for Node 18. All gameplay modules live in the `game/` directory. Vendor bundles such as `pixi.min.js` and `pixi-filters.min.js` should not be edited.

## Required checks

Before submitting a PR you must run:

```bash
npm install
npm run build
npm run lint
npm test
```

The build must succeed and ESLint should report no errors.

## Style notes

- Use ES module syntax and organize new logic under `game/`.
- Keep documentation in `docs/` up to date when adding or changing features.

## Commit messages

Use concise messages like `feat: add combat timer` or `fix: null enemy reference`.
