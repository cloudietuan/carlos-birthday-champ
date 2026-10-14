# Carlos, this is not your present.

A small original birthday puzzle adventure inspired by the fourth-wall humor and screen puzzles of *There Is No Game*. All dialogue, art, code, and puzzles here were made for Carlos.

**Play:** https://cloudietuan.github.io/carlos-birthday-champ/

## Play

Click or tap the scene. Loose props can be moved around the screen with a mouse or finger. The narrator is not especially reliable. Find loose signs, collect objects, use the fallen title sign to break a glass case, use your boxing glove, uncover music, solve a dance-floor memory puzzle, and bribe a key-stealing raccoon with cake to reach the birthday present.

Select an item from your pockets, then tap its destination. On desktop, you can also drag items. There are no movement arrows. `STUCK?` gives a clue for the current puzzle.

Enter with sound to hear 36 locally hosted, recorded narrator lines. Replay repeats the last line; muting leaves captions and every puzzle available. Narration uses MP3 playback rather than browser text-to-speech. The raccoon’s clues appear as speech bubbles. No login, tracking, or downloads needed.

## Run locally

Serve this folder with a static server:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. No build step or dependencies.

## Files

- `index.html` — scene controls and birthday note.
- `style.css` — responsive stage and interface.
- `game.js` — story, puzzle state, mouse/touch dragging, audio playback, and original pixel illustrations.
- `narration.js` and `assets/audio/` — recorded dialogue and original punch/glass effects.

The personal message lives in the `letter` element in `index.html`. Narrator dialogue and puzzle sequence are in `game.js`.

## Font

Press Start 2P by CodeMan38 is bundled under the SIL Open Font License. See `assets/FONT-LICENSE.txt`.
