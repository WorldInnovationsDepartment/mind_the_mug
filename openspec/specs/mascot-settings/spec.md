# mascot-settings Specification

## Purpose

Defines the two settings a person can change (when the mascot shows, and which mascot) and the ways to change them, so that setup takes one short command or nothing at all.

## Requirements

### Requirement: Defaults are once a day, with the cat
With nothing configured the mod SHALL show once a day and SHALL show the cat.

#### Scenario: No configuration
- **WHEN** the plugin runs with no options and no stored choice
- **THEN** the settings in force are `daily` and `cat`

### Requirement: When it shows is one of daily, always, off
The `show` setting SHALL accept `daily` (after the first answered turn of the day), `always` (after every turn, interrupted and failed ones included) and `off` (never). Any other value SHALL count as `daily`.

#### Scenario: Always
- **WHEN** `show` is `always` and three turns complete
- **THEN** the mascot shows after each, and leaves at each next prompt

#### Scenario: Off
- **WHEN** `show` is `off`
- **THEN** no mascot shows

### Requirement: The mascot is one of five, or random
The `mascot` setting SHALL accept `cat`, `dog`, `hen`, `lake`, `oven` and `random`. With `random` the mod SHALL pick one of the five for each show. Any other value SHALL count as `cat`.

#### Scenario: Specific mascot
- **WHEN** `mascot` is `dog`
- **THEN** every show is the dog

#### Scenario: Random
- **WHEN** `mascot` is `random` over many shows
- **THEN** more than one mascot appears

### Requirement: One command shows and changes the settings
The mod SHALL register the command `/mascot`. With no arguments it SHALL print the settings in force, every option and the reminder. With arguments it SHALL read words in any order: a mascot id, name or alias; `random`; `daily`, `always`, `off` and plain-language forms such as `every prompt` and `once a day`; `reset` for the defaults; and `now` to show the mascot after the next turn whatever the setting. A word it does not know SHALL change nothing and be named in the answer.

#### Scenario: Two settings at once
- **WHEN** the person runs `/mascot always dog`
- **THEN** the answer confirms both, and the next completed turn shows the dog

#### Scenario: Unknown word
- **WHEN** the person runs `/mascot zebra`
- **THEN** nothing changes and the answer says `zebra` is not a mascot or a setting

#### Scenario: Preview
- **WHEN** the person runs `/mascot now` on a day the mascot already showed
- **THEN** the mascot shows after the next turn, once

### Requirement: Settings are also rows in the config menu, and the last change wins
The two settings SHALL be declared as `userConfig` picker fields so that they are asked for at install and listed in `/config`. A choice made with `/mascot` SHALL take effect even where the rows cannot be written, SHALL survive a reload and a new session, and SHALL be superseded, field by field, by a later change to that row in `/config`.

#### Scenario: Command, then menu
- **WHEN** the person runs `/mascot dog` and later sets the mascot row in `/config` to `hen`
- **THEN** the hen shows

#### Scenario: Rows cannot be written
- **WHEN** `/mascot hen` runs where writing the config row fails
- **THEN** the hen still shows, in this session and the next
