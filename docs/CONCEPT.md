# Mind the Mug — concept

**Don't delegate your reasoning. Or you'll get a mug.**

## What it is

A kind reminder that lives in Claude Code. Once a day, after Claude's last
response to a prompt, a small pixel-art cat appears above the prompt and
stays until you send the next one. It sits on a shelf next to a mug, a
rubber duck, a phone and a plant. You asked; the cat walked the shelf,
tapped a thing or two, looked you in the eye and knocked one of them off.
Almost always the mug.

It is not a game and not a score. Nothing is at stake except how you work.

## The idea

It comes in three steps, and the third is the one the plugin is named for.

1. **You can't control what the model returns.** Language models are not
   deterministic. Send the same prompt twice and you can get two different
   answers. No wording makes the output yours to decide.
2. **You control what you delegate.** Which task you hand over and which
   you keep, how you frame it, what context you give, how big a piece you
   hand over at once, and what you check before you accept the result.
3. **So delegate the work, never your reasoning.** Working out what you
   actually want, why, and whether what came back is right is the part that
   is yours. The moment you hand that over as well ("just make it work",
   glance, "not quite", prompt again) you have stopped reasoning and
   started re-rolling. You are asking a cat for a feature, and you get a
   mug.

The mug is not a punishment. It is what asking without thinking gets you,
drawn small enough to be funny. Mind the mug: keep your mind on your side
of the shelf.

## What "delegating your reasoning" looks like

- Prompting for the outcome you want without knowing what the outcome is.
- Accepting an answer because it looks finished, not because you checked it.
- Answering "not quite" with the same prompt again, hoping for a better roll.
- Letting the model decide what the problem is, and then solve it.

And what keeping it looks like: you decide what the task is and where it
ends, you hand over the typing, the searching and the first draft, and you
read what came back as if a colleague you respect had written it and might
be wrong.

## Why a cat

The first version of this plugin was a slot machine: every prompt pulled a
lever, and the reels spun while Claude worked. It made a point about
randomness, but it was a casino on screen all day, and it put the weight on
the lever instead of on the person.

The cat makes the point without the casino:

- **You can ask. The cat decides.** It does not work for you, and it is not
  being difficult. This is simply what asking a cat is like.
- **Everything that can happen is on the shelf, in plain sight.** The four
  outcomes sit there the whole time. The randomness is honest.
- **The shelf is yours.** You can't pick what falls. You pick what goes on
  the shelf. That is the part that takes reasoning, and it is the part
  nobody else can do for you.

The other four worlds say the same thing in their own words, for people who
would rather have a dog:

| World | The line | You can't pick… | You pick… | Or you'll get… |
| --- | --- | --- | --- | --- |
| Shelf Life (cat) | You can ask. The cat decides. | what falls | what goes on the shelf | a mug |
| Fetch (dog) | Every throw comes back different. | what comes back | what you throw | a sock |
| Hatch (hen) | Same hen, different egg. | the egg | what you feed her | a plain egg |
| Catch of the Day (lake) | Same bait, different fish. | the fish | where you cast | an old boot |
| Proof (oven) | Same recipe, different bake. | how it bakes | what goes in | a plain roll |

## Why once a day, and why after the last response

- **Once a day**, because a reminder you see on every prompt stops being
  read. One showing a day stays a small event.
- **After the last response**, never during the work and never for the
  responses in the middle of a turn, because that is the moment the
  reasoning is due: an answer has come back, and deciding what it is worth
  is your job.
- **Until the next prompt**, because the next prompt is you delegating
  again. The cat leaves exactly when you act on what it said.

People who want it more often can have it after every answer; it is one
word (`/mascot always`).

## What comes back is random on purpose

FEATURE 10%, CLIENT 4%, A LIFE 1%, nothing 85%. The roll happens when the
turn ends and has nothing to do with the quality of the answer or of your
prompt. The cat does not know whether you thought. That is deliberate: if
the picture tracked the work it would be a score, and it would pull your
attention back to the output. The mug is a reminder, not a verdict.

## What it's not saying

It isn't saying the models are bad. They are remarkably capable, and that is
why a reminder is worth having: the tool is good enough that the risk is no
longer "it can't do it" but "I stopped thinking, because it usually works".
It isn't saying don't delegate, either. Delegate a lot. Delegate the work.
And the cat's indifference is not a portrait of the model. The cat is the
randomness. The person is the one the piece is about.

## Design rules that keep it kind

1. Nothing to win or lose: no credits, no cost per prompt, no score, no
   streaks. The tally ("3 off the shelf") counts showings, not success.
2. Quiet by default: once a day, no sound, nothing on screen while Claude
   works, gone at the next prompt.
3. It never judges a prompt or an answer. It cannot tell, and it does not
   pretend to.
4. The odds are published and fixed, and the roll is not tuned to bring you
   back.
5. One command changes or switches it off (`/mascot off`), one keystroke
   collapses it (`ctrl+x ctrl+a`), and uninstalling leaves nothing behind
   but one small store file.
6. Unofficial fan project, not affiliated with or endorsed by Anthropic.
