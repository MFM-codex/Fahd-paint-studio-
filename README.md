# Vibe Draw — Stage 3

Adds Undo/Redo, plus an auto-update fix so future stages load automatically.

## What's new in this stage

- **Undo** button steps backward through your last strokes (up to 20 steps).
- **Redo** button brings back what you just undid.
- Undo/redo works per-layer — undoing a stroke on Layer 2 won't touch Layer 1.
- Buttons dim out when there's nothing to undo/redo.
- **Auto-update fix:** the app now detects when a new version has been pushed to GitHub and reloads itself automatically. You should no longer need to manually clear browser cache after this stage.

## Updating your repo with this stage

Same as before — extract this zip into your project folder (overwrite when asked), then:

```bash
cd ~/storage/shared/"Anime studio app(GEMINI version)"/vibe-draw-stage1-1
git add .
git commit -m "Stage 3: undo/redo + auto-update fix"
git push
```

**Heads up:** this is likely the *last* time you'll need to manually clear cache. Since your phone hasn't yet loaded a version with the auto-update code in it, this jump (Stage 2 → Stage 3) still needs one manual refresh. From Stage 3 onward, updates should apply themselves.

If the new toolbar buttons don't show up within a minute of reopening the app, do the same cache-clear as last time (Browsing history + Cookies and site data + Cached images, "Last hour", Delete data) one more time. After that, it should self-update going forward.

## Try it

- Draw a few strokes, then tap Undo a few times — watch them disappear one at a time.
- Tap Redo to bring them back.
- Switch to a different layer, draw something, undo it — confirm it only affects that layer.

## Coming next (Stage 4)

Offline PWA polish — making sure the app installs cleanly and works with zero internet connection, plus a proper app icon.
