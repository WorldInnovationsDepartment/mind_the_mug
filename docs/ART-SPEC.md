# Art spec

What the mascots look like, what they do, and what they say. The source of
truth is the code in `lib/scenes/`, `lib/mascots.js` and `lib/show.js`; this
document is the brief they implement.

## 1. Brief

Daylight, not neon. Five small worlds you would be happy to see once a day:
three pets (a cat, a dog, a hen) and two places (a lake, a kitchen). Flat
pixel art, soft pastel grounds, one dark accent per world. No casino, no
credits, no weapons, nothing that asks you to play again.

Every world tells the same story in three beats (you ask, something
happens while you wait, something comes back) and ends on the same kind
reminder, with its own word for the mug:

> Don't delegate your reasoning.
> Or you'll get a mug.

## 2. Geometry

- 40 × 20 pixels, drawn as 40 columns × 10 rows of `▀` half-block cells
  (top pixel = foreground, bottom pixel = background). Every cell is
  painted.
- Bottom-right of the `AbovePrompt` band. The caption sits to its left,
  right-aligned, 2 cells away, at most 7 lines.
- 10 frames a second while it moves; then one frame, held.
- Text inside the picture uses a 5 px tall font, capitals only: letters are
  3 px wide (M and W are 5, so they do not read as H), 1 px apart, centred
  in a 7 px label band.

## 3. The story (`lib/show.js`)

| Beat | Phase | Length | What happens |
| --- | --- | --- | --- |
| The ask | `start` | 1.0 s | The mascot reacts to your prompt. |
| The wait | `work` | 1.2 s + 0.5 s per tap | One small reaction per tool call of the turn, at most four. |
| What comes back | `reveal` | 4.4 s | The outcome, sparkles for anything but nothing, then the label band. |
| Interrupted | `abort` | 2.8 s | Instead of the reveal, when the turn was interrupted. |
| Error | `error` | 2.8 s | Instead of the reveal, when the turn failed. |
| Rest | | until the next prompt | The last frame of the beat above, frozen. |

## 4. The five worlds

| | cat · Shelf Life | dog · Fetch | hen · Hatch | lake · Catch of the Day | oven · Proof |
| --- | --- | --- | --- | --- | --- |
| Scene | a shelf with a mug, a rubber duck, a phone and a plant, over a desk | a yard, a picket fence, a bush | a yard, a barn, a nest | a dock, a rod, reeds, hills | a countertop oven, a window, a cooling rack |
| The ask | it gets up and strolls | you throw, it runs into the bush | grain falls, she settles on the nest | the cast | the tray slides in, the oven lights |
| A tap | a paw tap; one thing hops, `!` | the bush shakes, `!` | a cluck, a feather | a nibble; the bobber dips | a puff of steam, a flash |
| nothing · 85% | the mug · `MUG` | a sock · `SOCK` | a plain egg · `EGG` | an old boot · `BOOT` | a roll · `ROLL` |
| FEATURE · 10% | the rubber duck | the ball | a blue egg | a perch | a croissant |
| CLIENT · 4% | the phone | a letter | a golden egg | a salmon | a cake |
| A LIFE · 1% | the plant, a heart sparkle | the leash, hearts | a chick, hearts | a life ring, and the sky turns to sunset | a picnic basket, and the window fills with sun |
| Interrupted | a loaf and `z`s · `NAP` | a squirrel on the fence · `SQUIRREL` | she flies off · `FLEW OFF` | the fish jumps free · `GOT AWAY` | the dough falls · `IT FELL` |
| Error | `HAIRBALL` | it comes back muddy · `MUDDY` | `CRACKED` | caught in the reeds · `SNAGGED` | smoke · `BURNT` |
| What it keeps on display | nothing (the shelf is refilled) | a pile by the door | a basket | a bucket (boots are thrown back) | the cooling rack |

Winning outcomes are labelled `FEATURE`, `CLIENT` and `A LIFE` in every
world. The outcome is rolled when the turn ends and is unrelated to the
turn (see CONCEPT.md).

The cat is the default: all four outcomes are on the shelf the whole time,
so the randomness is in plain sight.

## 5. Palettes

Each scene declares its own palette at the top of its file (`PALETTE`
export). The grounds:

| World | Ground | Accent | Label band |
| --- | --- | --- | --- |
| cat | lilac wall `#f3e6f7`, wooden shelf `#d39b5f` and desk `#e0b07a` | the cat `#3a3540`, eyes `#ffd84a` | `#3a3540` |
| dog | sky `#93d5f5`, grass `#69c55a`, white fence | the dog `#e8a752`, collar `#3d7dd8`, ball `#e5484d` | white, at the top |
| hen | pale sky `#bfe6f5` over `#ffeec7`, meadow `#b9dc7a`, red barn `#d9534a` | the hen `#c8693a`, comb `#e5484d` | `#5a3a26` |
| lake | sky `#8fd3f4`, water `#3bb0c9` to `#1f7395`, dock `#b07a47` | bobber `#e8483a`, sun `#ffe066` | `#1f4e5f` |
| oven | cream wall `#fff4e2`, mint oven `#9ed9c3`, counter `#d39b5f` | glow `#ffb04a`, element `#ff5a3d` | `#4a3426` |

Caption and turn line use the terminal's own text colours plus one accent,
`#d97757`, for the `✻` and for the two lines of the idea.

## 6. The words

Beside the picture (`captionLines`):

```
Shelf Life · the mug, again            name · what came back      bold
You can ask. The cat decides.          the world's line
You can't pick what falls.             the lesson, line 1         dim
You pick what goes on the shelf.       the lesson, line 2         dim

Don't delegate your reasoning.                                    accent
Or you'll get a mug.                 (a sock, a plain egg, …)     accent, bold
```

In the transcript, replacing the turn's closing line (`resultText`):

```
✻ Deliberated for 42s · the mug, again · 3 off the shelf
```

| | Verb | Tally | Interrupted | Error |
| --- | --- | --- | --- | --- |
| cat | Deliberated for | N off the shelf | lost interest · napping | hairball · ask again |
| dog | Fetched in | N by the door | squirrel! · it'll be back | rolled in mud · throw again |
| hen | Brooded for | N in the basket | startled · she flew off | cracked · try again |
| lake | Fished for | N in the bucket | line cut · the one that got away | snagged on the reeds · cast again |
| oven | Baked for | N on the rack | door opened · it fell | something burnt · bake again |

The tally counts showings (for the lake, only what was kept). It is not a
score.

In a band too small for the picture, one line:

```
✻ Shelf Life · the mug, again · Don't delegate your reasoning, or you'll get a mug.
```

## 7. Writing rules

- The reminder is kind. It never says the person did something wrong; it
  says which part of the work is theirs.
- Say what the person controls, not only what they don't. Every lesson is a
  pair: "You can't pick …" / "You pick …".
- Every mascot has a dud, the thing you get for delegating your reasoning:
  a mug, a sock, a plain egg, an old boot, a plain roll.
- Dry, short, no exclamation marks except the squirrel.
- No casino words: no credits, spins, reels, jackpots, wins or losses.
- No names from other people's films, games, shows or brands.

## 8. Icon and contact sheet

`node scripts/dev/contact-sheet.js` writes `.claude-plugin/icon.png` (the
cat waiting on its shelf, 960 × 960) and `docs/mascots.png` (one row per
mascot: the ask, a tap, then the resting frame of every outcome). Both are
deterministic.

## 9. Launch video (`art/src/LaunchV3.tsx`, `art/src/timeline-v3.json`)

1920 × 1080, 30 fps, 51 s (1530 frames), H.264 + AAC, written to
`docs/launch-v3.mp4` (gitignored, regenerable). Cut for a feed, but slow
enough to read: every line is on screen as type so it works with the sound
off, every line is held for at least two seconds, and cuts and hits sit on
a 120 BPM grid.

| Scene | Frames | On screen |
| --- | --- | --- |
| hook | 0–180 | "You wanted a feature." The cat knocks the mug off (thud at 75). "You got **a mug.**" |
| again | 180–420 | "So you ask again." Three more mugs on the beat (×2, ×3, ×4). "That's not reasoning. That's **re-rolling.**", held 4 s |
| turn | 420–780 | "You can't control what the model returns." Then under it (510): "You control what you **delegate.**" On the drop (600), a dark ground: "Don't delegate your **reasoning.**" A mug falls in and lands (675): "Or you'll get a mug." |
| product | 780–1050 | "Mind the Mug. A kind reminder, in your terminal." A prompt, tool calls, an answer; the cat pops in above the prompt (855). "Once a day." "After the last response." The next prompt is typed and it leaves: "Gone at your next prompt." |
| mascots | 1050–1320 | Two of the other four, 4.5 s each: `/mascot dog`, Fetch, "Or you'll get **a sock.**"; `/mascot hen`, Hatch, "Or you'll get **a plain egg.**" Footer: "Not a cat person? Five mascots. Pick yours with /mascot" |
| cta | 1320–1530 | The cat on its shelf, "Mind the Mug", "Don't delegate your reasoning.", the two install lines. The cat knocks the mug off one last time; it lands at 1440 as "Or you'll get a mug." appears, and the card holds for 3 s |

Rules: every mascot is drawn by `lib/scenes/` through `PixelScene`
(`art/src/launch-v3/Kit.tsx`), never redrawn for the video. Daylight
grounds (a drifting pastel mesh per world), one dark scene for the drop.
One hero colour per frame: coral `#d9603b` on light grounds, the cat's-eye
yellow `#ffd84a` on the dark one. Display type is Fredoka, terminal type is
JetBrains Mono (`@remotion/google-fonts`). Entrances are springs (slams and
pops), exits are 4-frame snaps, every hit punches the camera. Colours,
easings and springs live in `art/src/launch-v3/theme3.ts`.

The soundtrack (`scripts/dev/make-music-v3.js`) is synthesized from the same
timeline: plucks over C, Am, F, G, a sine bass, a soft kick and claps, a
riser into the drop; a thud for every mug, a slam for every headline, a pop
for every mascot. The progression starts over on the drop and on the end
card so both land on C. The loop stops when the end card starts: only a
held C chord and three slow plucks play under it, and the last sound is the
last mug landing (`final` in the timeline), which rings out and reaches
silence on the final frame. `scripts/dev/verify-launch-v3.py` probes the
file, grabs a frame after every scene start and hit into `docs/review-v3/`,
and checks that the track is not silent, that every slam lands in the
audio, and that the ending dies away after the last hit.

## 10. Launch videos of version 1

`art/src/Launch.tsx` and its timeline render the launch video of the first
version, the neon slot machine: 1920 × 1080, 30 fps, H.264 + AAC, 60 s
(`docs/launch.mp4`, gitignored and regenerable), with a synthesized track
from `scripts/dev/make-music.js` and checks in
`scripts/dev/verify-launch.py`. Its machine art lives only under
`art/src/machine/`.

### Second cut (`art/src/LaunchV2.tsx`, `art/src/timeline-v2.json`)

Same resolution and codecs, 30 s (900 frames), 160 BPM, written to
`docs/launch-v2.mp4` with its track from `make-music.js --v2`. The same six
beats cut to half the length: title 1.6 s, terminal 5.2 s, three 4 s pulls, a
6.2 s jackpot pull, a 5 s payoff. Scenes hard-cut (6-frame zoom-settle in,
5-frame snap out), every reel stop punches the camera and flashes the outcome
colour (peak opacity 0.5, so no frame reads as white), speed streaks run
behind the machine while it spins, a HUD counts the pull and the credits, and
a hero-colour progress strip runs along the bottom edge. The jackpot is
labelled **TOUCH GRASS**: headline, result line, payoff card, and the
machine's own band, which alternates `TOUCH` / `GRASS` per blink through the
video-only `bandWords` override on `overlayGrid`.
