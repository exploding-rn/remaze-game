# GLIDE

A phone-first, ad-free paint maze with a full-screen touch area, quick level/shop/coin controls and a Settings menu. Drag in any direction and turn without lifting your finger, or use arrow keys/WASD. Each turn slides until a wall, now about 75% faster. Paint all floor tiles to finish.

- Levels 1–100 gradually grow from tiny mazes to medium-hard mazes.
- Settings offers Light, Dark, Sun (bright white/lavender) and OLED (pure black) brightness, plus sound and difficulty. Drag anywhere on the game screen to steer; controls and dialogs keep their tap behavior.
- Optional Brain Mode uses larger mazes and two numbered beacons that must be reached in order while painting every tile. It has separate completion records and awards extra coins.
- Levels 101+ vary independently of the level number. Same level number always creates the same maze.
- The generator tests whether sliding from the start can cover every tile. A guaranteed winding corridor is used if a random layout fails after 180 attempts.
- Progress, coins, and cosmetics are saved in this browser with localStorage. Each level tracks completion separately; jumping does not claim earlier levels.
- The shop accepts coins, or offers the same item free when you have too few. Nothing connects to an ad or payment provider.
- Settings includes separate paint, ball, accent, and beacon color pickers. Colors and brightness are saved locally.
- Endless Run starts at stage 1 with three lives. Every stage has a move budget; clearing adds score and coins, while running out of moves or retrying costs a life. You can return to Classic without losing an unfinished run.
- Stats tracks clears, tiles, moves, swipes, glide distance, restarts, play time on completed/failed stages, coins earned, and endless records. Older saves begin tracking these from this version onward.
- Mod Packs imports local JSON data for colors and up to 30 hand-built levels per pack. Export the example from the menu to see the schema. Imported grids must be rectangular 0/1 arrays with reachable floor tiles; ordered beacons are checked. Packs cannot execute scripts. Up to 12 packs are stored in this browser.
- Teleporters appear as paired letters: entering one paints both endpoints and stops at the other. Orange bounce tiles reverse the current glide. They appear in later Classic levels, Brain Mode and Endless. JSON levels can define `teleporters: [{"a":{"x":3,"y":3},"b":{"x":1,"y":3}}]` and `bouncers: [{"x":2,"y":3}]`. Specials cannot overlap the start or beacons. The importer checks slide coverage and beacon order with the new physics.
- Endless difficulty choices are Baby, Easy, Medium, Hard, Hardcore and Impossiglide. Lives, move budgets and special tile frequency vary. Changing the setting affects the next new run; an unfinished run retains its difficulty.
- The shop now offers 12 ball looks, 8 backgrounds, 10 trail styles and 6 beacon looks. The ball and trail CSS now honors the equipped choice (previous selectors were overridden by the board's base rules).
- Offline play is available after the first successful visit if the service worker finishes caching. Clearing site data removes progress.

## Publish from an iPhone

1. Create a **public** GitHub repository named `remaze-game`.
2. Upload all files from this folder into the **root** of the repository (not inside a `maze-glide` subfolder). On GitHub mobile web: **Add file → Upload files**. GitHub's mobile browser may require requesting the desktop site for multi-file upload; the easiest route is to unzip this project in the Files app, then select the files.
3. In repository **Settings → Pages**, select **Deploy from a branch**, branch `main`, folder `/ (root)`, then save.
4. Open `https://YOUR-USERNAME.github.io/remaze-game/` in Safari. Once it loads, use Share → Add to Home Screen.

GitHub Pages may take a few minutes to activate. If upload from iOS Safari is awkward, GitHub's web editor can create each file individually.

## Local testing

Open `index.html` to play online; for offline caching, serve the directory over HTTP (for example `python3 -m http.server 8000`). Run `node verify.cjs` to check deterministic generation and slide coverage on representative levels.
