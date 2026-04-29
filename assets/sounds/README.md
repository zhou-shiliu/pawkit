# Pawkit Sound Library

Pawkit now uses a category-based sound layout aligned with the trust-driven sound system:

```text
assets/sounds/
├── ambient/
├── meow/
├── event/
├── voice/
└── sources.json
```

## Generate Placeholder WAV Files

Run:

```bash
npm run download-sounds
```

This command creates placeholder `.wav` files in each category and writes `sources.json`
with royalty-free search URLs for replacing placeholders with real recordings.

Use `npm run download-sounds -- --force` to overwrite existing generated files.
