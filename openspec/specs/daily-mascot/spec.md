# daily-mascot Specification

## Purpose

Defines when the mascot appears above the prompt and when it leaves. The mascot is a kind reminder not to delegate one's reasoning (the person cannot control what the model returns, they control what they delegate, and reasoning is the part that stays theirs), so it appears at the moment an answer has landed: after the last response of a turn, once a day by default, until the next prompt is sent.

## Requirements

### Requirement: The mascot appears only after the last response of a turn
The mod SHALL draw the mascot in the band above the prompt only once the main loop's turn has completed. It SHALL draw nothing while a turn is running, nothing for responses in the middle of a turn, and nothing for a subagent's turn.

#### Scenario: Turn with several steps
- **WHEN** a turn makes tool calls and writes text between them
- **THEN** the band stays empty until the turn completes, and the mascot appears after the final response

#### Scenario: Subagent finishes
- **WHEN** a subagent's turn completes while the main turn is still running
- **THEN** no mascot appears

### Requirement: The mascot stays until the next prompt is sent
Once shown, the mascot SHALL remain in the band, on its resting frame, until the person sends the next prompt, and SHALL then be removed. A slash command that starts no turn SHALL NOT remove it.

#### Scenario: Person takes their time
- **WHEN** the mascot has come to rest and hours pass with no prompt
- **THEN** the same frame is still shown, and no timer is running

#### Scenario: Next prompt
- **WHEN** the person submits a prompt and nothing drops it
- **THEN** the band is empty before the new turn's first response

### Requirement: By default the mascot shows once a day
With the `daily` setting the mod SHALL show the mascot after the first turn of the local calendar day that ended with an answer, and SHALL NOT show it again that day, in any session on the machine. A turn that was interrupted or failed SHALL neither show the mascot nor count as the day's showing.

#### Scenario: Second turn of the day
- **WHEN** the mascot has already shown today and another turn completes
- **THEN** no mascot appears and the turn's closing line is the engine's own

#### Scenario: Next day
- **WHEN** a turn completes with an answer on a later local day
- **THEN** the mascot shows again

#### Scenario: First turn interrupted
- **WHEN** the first turn of the day is interrupted and the second ends with an answer
- **THEN** the mascot shows after the second

### Requirement: A show plays the turn back and comes to rest
A show SHALL play, in order, the ask (1.0 s), the wait (1.2 s plus 0.5 s per tool call of the turn, at most four), and what came back (4.4 s; 2.8 s for an interrupted or failed turn), at 10 frames a second, and SHALL then hold its last frame unchanged.

#### Scenario: Turn with three tool calls
- **WHEN** a turn that made three tool calls gets a show
- **THEN** the mascot reacts three times during the wait

#### Scenario: Resting
- **WHEN** the show's frame is sampled at any two instants after it came to rest
- **THEN** the two frames are identical

### Requirement: What comes back is rolled from a fixed table
The outcome SHALL be rolled when the turn ends from the table FEATURE 10%, CLIENT 4%, A LIFE 1%, nothing 85%, from a seed, independently of the turn's content. There SHALL be no credits, no cost per prompt and no score.

#### Scenario: Distribution
- **WHEN** the roll is made over many seeds
- **THEN** each outcome's share is within half a percentage point of the table

### Requirement: The reminder is stated in words
Beside the mascot the mod SHALL show the mascot's name and what came back, its line, its two-line lesson ("You can't pick …" / "You pick …"), and the reminder in two lines: "Don't delegate your reasoning." and "Or you'll get a mug." (the second line naming that mascot's own dud: a sock, a plain egg, an old boot, a plain roll) The turn's closing line in the transcript SHALL name what came back.

#### Scenario: Wide terminal
- **WHEN** the band is wide enough for the caption beside the 40-column picture
- **THEN** the caption is shown to the left of the picture, right-aligned

#### Scenario: Narrow terminal
- **WHEN** the band has no room for the caption beside the picture
- **THEN** the picture is shown alone, and in a band with fewer than 40 columns or 10 rows a single line carries the name, the outcome and the reminder

### Requirement: Plugin loads on current Claude Code without configuration
The plugin SHALL load as a mod with no environment variable and no edits to the person's settings, SHALL pass `claude plugin validate` with zero errors, and a failure in any of its hooks SHALL leave the prompt, the turn and the engine's own drawing unaffected.

#### Scenario: Fresh install
- **WHEN** the plugin is installed and a prompt is answered
- **THEN** the default mascot shows with no further setup
