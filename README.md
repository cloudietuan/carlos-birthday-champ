# Carlos Birthday Champ

A birthday arcade for Carlos: punch presents, fight the giant cake, and finish on the dance floor. Built with original pixel art, HTML Canvas, CSS, and JavaScript.

**Play:** https://cloudietuan.github.io/carlos-birthday-champ/

## Controls

- Hold **Left / Right** to move; press **Space** to punch.
- During the dance round, tap the matching **arrow key** when a note reaches the gold line.
- On phones, use the buttons below the game.
- **Escape** or **Pause** pauses the action. Sound is optional and starts after you turn it on.

## Run locally

Open `index.html`, or serve this folder with a static web server:

```sh
python3 -m http.server 8000
```

Visit http://localhost:8000. No build tools or installation required.

## Personalize

Edit the opening message and date in `index.html`. The final birthday note is inside `win()`, and the character's colors are in `pixelCarlos()`.

Scores stay in the player's browser. No account, tracking, or server required.

## Font

Press Start 2P by CodeMan38 is bundled locally under the SIL Open Font License. See `assets/FONT-LICENSE.txt`.
