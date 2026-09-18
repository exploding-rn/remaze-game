# GLIDE

A phone-first, ad-free paint maze. Swipe or use arrow keys/WASD. One move slides until a wall. Paint all floor tiles to finish.

- Levels 1–100 gradually grow from tiny mazes to medium-hard mazes.
- Levels 101+ vary independently of the level number. Same level number always creates the same maze.
- The generator tests whether sliding from the start can cover every tile. A guaranteed winding corridor is used if a random layout fails after 180 attempts.
- Progress, coins, and cosmetics are saved in this browser with localStorage. Each level tracks completion separately; jumping does not claim earlier levels.
- The shop accepts coins, or offers the same item free when you have too few. Nothing connects to an ad or payment provider.
- Offline play is available after the first successful visit if the service worker finishes caching. Clearing site data removes progress.

## Publish from an iPhone

1. Create a **public** GitHub repository named `glide-maze`.
2. Upload all files from this folder into the **root** of the repository (not inside a `maze-glide` subfolder). On GitHub mobile web: **Add file → Upload files**. GitHub's mobile browser may require requesting the desktop site for multi-file upload; the easiest route is to unzip this project in the Files app, then select the files.
3. In repository **Settings → Pages**, select **Deploy from a branch**, branch `main`, folder `/ (root)`, then save.
4. Open `https://YOUR-USERNAME.github.io/glide-maze/` in Safari. Once it loads, use Share → Add to Home Screen.

GitHub Pages may take a few minutes to activate. If upload from iOS Safari is awkward, GitHub's web editor can create each file individually.

## Local testing

Open `index.html` to play online; for offline caching, serve the directory over HTTP (for example `python3 -m http.server 8000`). Run `node verify.cjs` to check deterministic generation and slide coverage on representative levels.
