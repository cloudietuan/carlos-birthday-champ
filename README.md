# Carlos, this is not your present.

A small original birthday puzzle adventure inspired by the fourth-wall humor and screen puzzles of *There Is No Game*. All dialogue, art, code, and puzzles here were made for Carlos.

**Play:** https://cloudietuan.github.io/carlos-birthday-champ/

## Play

Click or tap the scene. The narrator is not especially reliable. Find loose signs, collect objects, use your boxing glove, uncover music, and solve a dance-floor memory puzzle to reach the birthday present.

Select an item from your pockets, then tap its destination. On desktop, you can also drag items. There are no movement arrows. `STUCK?` gives a clue for the current puzzle.

Every narrator line appears as a caption. Optional voice and tones use your browser's speech and audio capabilities; voice availability varies by device. No login, tracking, or downloads needed.

## Run locally

Serve this folder with a static server:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. No build step or dependencies.

## Files

- `index.html` — scene controls and birthday note.
- `style.css` — responsive stage and interface.
- `game.js` — story, puzzle state, input, speech, and original pixel illustrations.

The personal message lives in the `letter` element in `index.html`. Narrator dialogue and puzzle sequence are in `game.js`.

## Font

Press Start 2P by CodeMan38 is bundled under the SIL Open Font License. See `assets/FONT-LICENSE.txt`.
