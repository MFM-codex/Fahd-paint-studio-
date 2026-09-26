# Vibe Draw — Stage 2

Adds multi-layer support on top of Stage 1's pressure-sensitive drawing.

## What's new in this stage

- Tap **"Layers"** in the toolbar to open/close the layer panel on the right.
- **+ Add** creates a new transparent layer above the current one.
- Tap a layer's name to make it the active one (that's the layer you'll draw on).
- Each layer has its own **opacity slider**.
- **↑ / ↓** reorder a layer (move it up or down the stack).
- **✕** deletes a layer (you can't delete the last remaining layer).
- "Clear Layer" now only clears the currently active layer, not everything.
- "Save PNG" flattens all visible layers into one image, same as before.

## Updating your repo with this stage

Same routine as before — from your Termux folder:

```
cd ~/storage/shared/"Anime studio app(GEMINI version)"/vibe-draw-stage1-1
```

(or wherever you extract this new zip to — if it's a new folder, `cd` into that instead)

Then unzip this new stage's files in, overwriting the old ones, and push:

```
git add .
git commit -m "Stage 2: multi-layer system"
git push
```

Your GitHub Pages link updates automatically within a minute or so of the push — no extra setup needed.

## Try it

- Add a couple of layers, draw something different on each.
- Lower one layer's opacity and watch it blend with what's underneath.
- Reorder layers and see how it changes which drawing sits "on top."
- Delete a layer you don't need.

## Coming next (Stage 3)

Undo/redo history, so you can step backward and forward through your strokes.
