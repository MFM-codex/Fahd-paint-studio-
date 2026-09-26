# Vibe Draw — Stage 4

Split-screen layout, a human-tone color palette, and layer grouping/ordering.

## What's new

**Split-screen layer panel**
The Layers panel now docks at the bottom of the screen instead of floating over your art. Canvas stays fully visible up top; layers live in their own strip below, so you can see both while you work.

**Human-tone color palette**
Next to the color wheel, there's a row of preset swatches: skin tones (light to deep), blush/lip tones, hair colors, and eye colors — tap one to load it as your brush color instantly, then fine-tune with the wheel if needed.

**Layer grouping & ordering**
- Check the box on 2+ layers, tap **Group** — they become a labeled group, clustered together in the list.
- **Ungroup** on a group's header splits them back into individual layers.
- **⤒** = bring to front (top of the stack), **⤓** = send to back (bottom).
- **↑ / ↓** still nudge a layer one step at a time (disabled while a layer is inside a group — reorder the whole group with ⤒/⤓ instead, or ungroup first).
- Front/back and group buttons also appear on a group's header, moving the whole group as one block.

## One thing to know about groups

Right now, grouping is organizational — it clusters layers together in the list and lets you move them as one block. It doesn't yet do things like "group opacity" (dimming the whole group at once) — each layer inside still uses its own opacity slider. If you want group-wide opacity later, that's a reasonable Stage 5 addition.

## Updating your repo

```bash
cd ~/storage/shared/"Anime studio app(GEMINI version)"/vibe-draw-stage1-1
git add .
git commit -m "Stage 4: split-screen layout, palette, groups, layer ordering"
git push
```

Auto-update should still be working from Stage 3, so just close and reopen the app after pushing.

## Try it

- Tap "Layers" — panel slides up from the bottom, canvas stays visible above it.
- Tap a few palette swatches while drawing — notice the color wheel doesn't need touching for common tones.
- Add 3 layers, check two of them, tap Group — see them cluster with a group header.
- Try ⤒ / ⤓ on a regular layer and on a group.
