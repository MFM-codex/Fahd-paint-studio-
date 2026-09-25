# Vibe Draw — Stage 1

Basic pressure-sensitive canvas drawing, installable as a PWA, works offline.

## First-time setup in Termux (only do this once)

1. Install git if you don't have it:
   ```
   pkg install git -y
   ```

2. Go to (or create) your project folder:
   ```
   cd ~
   mkdir vibe-draw
   cd vibe-draw
   git init
   ```

3. Connect it to a GitHub repo you've created on github.com (name it e.g. `vibe-draw`):
   ```
   git remote add origin https://github.com/YOUR_USERNAME/vibe-draw.git
   ```
   (You'll be asked for your GitHub username and a Personal Access Token as the password the first time — GitHub no longer accepts your normal password over git. Create a free token at github.com → Settings → Developer settings → Personal access tokens → generate one with "repo" permission, and save it somewhere safe.)

## Every time I send you a new zip

1. Unzip it into your project folder, overwriting old files:
   ```
   cd ~/vibe-draw
   unzip -o /path/to/the.zip -d .
   ```
   (Termux usually downloads to `~/storage/downloads/` if you've run `termux-setup-storage` — adjust the path to wherever the zip landed.)

2. Push it to GitHub:
   ```
   git add .
   git commit -m "Stage 1: basic canvas drawing"
   git push -u origin main
   ```
   (First push may ask you to set the branch name — if it errors about "main" vs "master", run `git branch -M main` first, then push again.)

## Turning on GitHub Pages (only do this once)

On github.com, go to your repo → Settings → Pages → under "Source" pick the `main` branch and `/ (root)` folder → Save. GitHub gives you a URL like:
```
https://YOUR_USERNAME.github.io/vibe-draw/
```
Open that on your phone, then use the browser menu → "Add to Home Screen".

## What's in this stage

- `index.html` — the page structure and toolbar
- `style.css` — layout and dark toolbar styling
- `app.js` — the actual drawing logic (Pointer Events + pressure)
- `manifest.json` — makes it installable as an app
- `service-worker.js` — caches files so it works with no internet
- `icon-192.png`, `icon-512.png` — placeholder app icons (we can make nicer ones later)

## Try it

- Draw with your finger or stylus — press harder with a stylus and the line should get thicker.
- Change color, size, opacity from the top bar.
- "Save PNG" downloads your drawing.
- "Clear" wipes the canvas.

## Coming next (Stage 2)

Multi-layer support — add/delete layers, adjust per-layer opacity, reorder them.
