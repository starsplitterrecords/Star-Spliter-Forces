# Playtest Log

## Automated/static pass — initial implementation

The game loop was inspected for start → select → run → level choices → boss → result → persistent unlock flow. A hard enemy cap and increasing spawn cadence are present. Upgrade pools exclude maxed items, and the run can terminate by player death, boss kill after the target time, or timeout.

### First interactive playtest goals

- Determine whether level 1 feels dangerous enough without being punishing.
- Check whether XP cadence produces roughly 15–25 upgrade decisions in a run.
- Confirm Pulse Bolt remains readable when evolved.
- Check that Orbit Shard damage is not excessive because it is continuous.
- Confirm The Silence can be killed in ~45–90 seconds by a competent late-game build.
- Record enemy count and frame rate at minutes 6, 8, 9, and boss spawn.
