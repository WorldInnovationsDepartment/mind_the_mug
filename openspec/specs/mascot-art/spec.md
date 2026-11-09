# mascot-art Specification

## Purpose

Defines the five worlds the mascot can be, their fixed size, and the rules their drawings and words follow.

## Requirements

### Requirement: There are five worlds and the cat is the default
The plugin SHALL ship five mascots: `cat` (Shelf Life), `dog` (Fetch), `hen` (Hatch), `lake` (Catch of the Day) and `oven` (Proof). Each SHALL have a scene for the ask, the wait with taps, each of the four outcomes, an interrupted turn and a failed turn.

#### Scenario: Every moment of every world
- **WHEN** any mascot is drawn at any instant of a show with any outcome or ending
- **THEN** it draws without error

### Requirement: The picture has a fixed footprint and paints every cell
The picture SHALL be 40 by 20 pixels, drawn as 40 columns by 10 rows of `▀` cells whose foreground is the top pixel and background the bottom pixel, so that every cell carries two colours.

#### Scenario: Frame shape
- **WHEN** any frame of any mascot is produced
- **THEN** it has 10 lines of exactly 40 cells, every span made only of `▀` with both a foreground and a background colour

### Requirement: Scenes are drawn by code, with no build step
Each scene SHALL be a pure function of its state and the clock, drawn procedurally at run time. The plugin SHALL NOT depend on a generated sprite sheet or on anything under `art/`.

#### Scenario: Deterministic
- **WHEN** the contact sheet script is run twice
- **THEN** the two outputs are byte-identical

### Requirement: Every world states what the person controls
Each mascot SHALL carry a name, a line, a two-line lesson of the form "You can't pick …" / "You pick …", a dud (what delegating your reasoning gets you: a mug, a sock, a plain egg, an old boot, a plain roll), a past-tense verb for the turn line, a name for each outcome, a tally phrase, and one line each for an interrupted and a failed turn. The words SHALL NOT use casino vocabulary (credits, spins, reels, jackpots) or names from third-party films, games, shows or brands.

#### Scenario: Complete copy
- **WHEN** the mascot registry is checked
- **THEN** every mascot has every one of those strings

### Requirement: The daylight brief
The worlds SHALL use light, pastel grounds with one dark accent each, and SHALL contain no casino imagery, no weapons and no neon-on-black styling.

#### Scenario: Review
- **WHEN** `docs/mascots.png` is reviewed
- **THEN** each row reads as a daylight scene and each outcome is recognisable at 40 by 20 pixels
