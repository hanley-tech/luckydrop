# LuckyDrop default sound set — licensing

Every file in this folder is **CC0 1.0 (public domain)**. No attribution is
legally required and the set may be redistributed with this repo, which is why
it lives here rather than in the gitignored parent folder. Credits are listed
anyway because the authors deserve them.

## Sound effects — Kenney (kenney.nl), CC0

| File | Source pack | Original |
|---|---|---|
| `player-joined.mp3`   | Digital Audio  | `pepSound1.ogg` |
| `game-start.mp3`      | Digital Audio  | `zapThreeToneUp.ogg` |
| `ball-center.mp3`     | Digital Audio  | `threeTone1.ogg` |
| `round-complete.mp3`  | Music Jingles  | `8-Bit jingles/jingles_NES07.ogg` |
| `retry.mp3`           | Digital Audio  | `lowDown.ogg` |
| `power-up.mp3`        | Digital Audio  | `powerUp5.ogg` |

Kenney releases all assets under CC0: <https://kenney.nl/assets/category:Audio>

| File | Source | Author | Licence |
|---|---|---|---|
| `winner-cheers.mp3` | [Fireworks With Applause Happy People](https://opengameart.org/content/fireworks-with-applause-happy-people) | OpenGameArt | CC0 |

## Music — OpenGameArt, CC0

| File | Track | Author | Source |
|---|---|---|---|
| `lobby.mp3`      | 5 Chiptunes (Action) — *level1* | Juhani Junkala | [OGA](https://opengameart.org/content/5-chiptunes-action) |
| `game.mp3`       | Cyberpunk Moonlight Sonata v2   | Joth           | [OGA](https://opengameart.org/content/cyberpunk-moonlight-sonata) |
| `transition.mp3` | 5 Chiptunes (Action) — *title screen* | Juhani Junkala | [OGA](https://opengameart.org/content/5-chiptunes-action) |
| `winner.mp3`     | 5 Chiptunes (Action) — *ending*  | Juhani Junkala | [OGA](https://opengameart.org/content/5-chiptunes-action) |

## Processing applied

- SFX peak-normalised to −1 dBFS, encoded 128 kbps / 44.1 kHz.
- Music normalised to −16 LUFS (`loudnorm I=-16:TP=-1.5:LRA=11`), 192 kbps / 44.1 kHz,
  so the lobby → game → winner crossfades sit at a consistent level.
- `winner-cheers.mp3` is a 6 s excerpt (from 22 s) of the 95 s original, with a
  0.25 s fade-in and 1 s fade-out.

All music tracks loop (`el.loop = true`) and are pitched up to +35% by the
finale tempo ramp, so they were chosen to survive time-stretching.
