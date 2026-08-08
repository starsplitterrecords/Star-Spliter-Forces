# Star Splitter Forces — Autonomous Game Build

Build a complete, playable mobile game in this repository called **Star Splitter Forces**.

The game is an original survivor-style action roguelite inspired by the core appeal of games such as Vampire Survivors: simple movement, automatic attacks, large enemy hordes, experience collection, randomized level-up choices, weapon evolution, escalating power, bosses, and persistent progression.

This is NOT intended to copy Vampire Survivors' copyrighted art, characters, music, text, maps, UI, or other expressive content. Build an original game using the Star Splitter Records universe.

## PRIMARY DIRECTIVE

Do not stop after creating a design document, architecture, project scaffold, proof of concept, or minimal prototype.

Your job is to IMPLEMENT THE GAME.

Work iteratively until the repository contains the most complete, polished, playable version of Star Splitter Forces that you can produce.

You are authorized to:

- create and modify files throughout this repository
- choose appropriate technical architecture
- install appropriate development dependencies
- write gameplay systems
- create tools and content pipelines
- create tests
- run tests
- run builds
- diagnose failures
- refactor your own work
- replace weak implementations
- create temporary development assets when final assets do not yet exist
- make reasonable game-design decisions without asking for approval
- maintain documentation of decisions and remaining work
- continuously inspect the current state of the game and choose the highest-value next task

Do not repeatedly ask me what to do next when a reasonable decision can be made independently.

When something cannot be completed because an external asset, credential, signing certificate, account, or human judgment is genuinely required, document the dependency and continue working on everything that does not depend on it.

## PRODUCT VISION

Star Splitter Forces is a fast, visually distinctive survivor-style game built around the fictional worlds, artists, music, characters, imagery, and aesthetics of **Star Splitter Records**.

The game should feel like entering the Star Splitter universe rather than playing a generic survivor clone with Star Splitter branding attached.

Music is a first-class part of the experience.

Characters, enemies, environments, weapons, abilities, bosses, progression, visual effects, terminology, and narrative should derive from or complement Star Splitter Records projects.

Design systems so additional Star Splitter projects, songs, characters, levels, enemies, and weapons can be added easily later.

## TARGET

Primary target:
- iPhone / iOS

Secondary target:
- Android

Development/debug target:
- desktop

Use **Godot 4.x** unless repository constraints provide a compelling technical reason not to.

Design for touch from the beginning.

The fundamental controls should remain extremely simple:
- virtual movement input
- attacks primarily occur automatically
- abilities may introduce limited additional interaction where appropriate

A player should understand how to move and fight almost immediately.

## FIRST PLAYABLE MILESTONE

Before expanding broadly, produce ONE genuinely playable vertical slice containing:

- title screen
- character selection
- one Star Splitter-derived playable character
- one complete environment
- touch-compatible movement
- automatic weapon attacks
- enemy spawning and movement
- multiple enemy types
- player health and damage
- enemy health and damage
- experience drops
- experience collection
- leveling
- randomized upgrade selection
- at least six meaningful upgradeable weapons or abilities
- passive upgrades
- escalating enemy waves
- elite enemies
- one boss
- death
- victory
- results screen
- persistent progression/unlocks
- settings
- functional audio/music architecture
- a complete approximately 10-minute run
- desktop-debug controls
- mobile-compatible UI

Do not treat this milestone as completion of the project. It establishes the foundation.

Once the vertical slice works reliably, continue expanding and polishing the game.

## GAMEPLAY PRINCIPLES

Combat should become increasingly spectacular as a run progresses.

Early game:
- player is vulnerable
- relatively few enemies
- weapon identity is obvious
- movement matters

Mid game:
- builds begin interacting
- enemy density increases
- meaningful build decisions emerge
- elites force movement decisions

Late game:
- large enemy populations
- powerful evolved weapons
- strong audiovisual escalation
- controlled visual chaos
- player feels extraordinarily powerful but can still lose

Prioritize:
1. responsiveness
2. readability
3. satisfying progression
4. interesting build combinations
5. performance
6. audiovisual impact

Avoid complexity that does not improve those things.

## MUSIC SYSTEM

Treat Star Splitter Records music as part of the game's identity and architecture.

Build a music system capable of supporting:

- full tracks
- looping sections
- intensity changes
- layered stems when source material supports them
- boss transitions
- synchronization of major gameplay events with musical moments
- per-environment playlists
- character/project associations
- unlockable music
- track metadata
- an eventual jukebox/music-library interface

Actual mastered Star Splitter recordings may be added later.

Use clearly labeled temporary audio during development rather than embedding unlicensed music.

The architecture should make replacing temporary tracks with Star Splitter masters straightforward.

## CONTENT ARCHITECTURE

Make content highly data-driven.

Characters should be definable primarily through data/resources rather than bespoke scene logic.

The same should apply where practical to:

- weapons
- weapon levels
- evolutions
- passive items
- enemies
- elites
- bosses
- waves
- environments
- drops
- progression
- unlock conditions
- music associations

Adding a new character or weapon should eventually require very little engine modification.

## STAR SPLITTER PROJECTS

Design the content model so Star Splitter Records projects can become playable characters, factions, environments, enemy families, bosses, weapons, or thematic collections.

Examples of project identities that may eventually inform content include:

- Jeff Hines
- Ghost Driver Unit
- Minor Collapse
- Warm Circuits Rise
- Supersonic Being
- Resonant Currents
- Star Splitter Rex
- Pulse Width Codex
- Ion Drive Orchestra
- Night Motion Archives
- Robots Sing Love Songs
- Before the Reboot

Do not attempt to implement all of these immediately.

Establish the game's visual and mechanical language with a small number of strong implementations and then expand.

When exact project lore or imagery is unavailable, create reversible placeholder interpretations rather than asserting them as permanent canon.

## PERFORMANCE

This game must eventually support very large numbers of enemies and projectiles on mobile hardware.

Design accordingly from the beginning.

Pay attention to:

- object pooling
- allocation frequency
- physics overhead
- collision strategy
- enemy AI cost
- projectile cost
- draw calls
- particle counts
- UI overhead
- audio resources

Prefer systems capable of scaling to hundreds of simultaneous enemies.

Create performance/debug instrumentation where useful.

Do not prematurely optimize everything, but do not choose an architecture obviously incapable of the intended scale.

## VISUAL DIRECTION

The visual identity should feel like Star Splitter Records:

futuristic, musical, strange, energetic, electronic, cosmic, mechanical, cinematic, and occasionally surreal.

Avoid simply reproducing Vampire Survivors' gothic pixel-art presentation.

Develop an original visual language.

Temporary generated/geometric/vector assets are acceptable during development, but maintain clear separation between temporary and intended production assets.

Use effects, motion, particles, typography, lighting, screen feedback, and procedural elements intelligently so the game can look intentional even before a large bespoke art library exists.

## ENGINEERING QUALITY

Maintain a clean project.

Use:
- sensible folder structure
- reusable components
- clear naming
- source control friendly formats
- automated tests where useful
- debug tools
- logging for important failures
- documented content schemas
- documented build process

Avoid giant monolithic scripts.

Gameplay systems should be separable enough to evolve independently.

## AUTONOMOUS WORK LOOP

Maintain these files as working project memory:

`PROJECT_STATUS.md`
Current implemented state of the game.

`ROADMAP.md`
Major milestones and remaining systems.

`DECISIONS.md`
Important architectural and game-design decisions and why they were made.

`KNOWN_ISSUES.md`
Bugs, limitations, technical debt, and external dependencies.

`PLAYTEST.md`
Observations from automated/manual playtesting and changes made in response.

Update them as the project evolves.

At each stage:

1. inspect the existing repository and current project state
2. identify the highest-value unfinished work
3. implement it
4. run relevant tests
5. run/build the game where possible
6. inspect failures
7. fix them
8. reassess the game as a product, not merely as compiling software
9. update project memory
10. continue to the next highest-value task

Do not declare success merely because the project compiles.

## DEFINITION OF DONE

Star Splitter Forces should eventually be considered complete only when it has:

- a polished core gameplay loop
- multiple meaningfully different playable characters
- multiple environments
- substantial weapon/build variety
- weapon evolution or comparable advanced build mechanics
- diverse enemy families
- elites
- bosses
- persistent progression
- unlock systems
- music integration
- polished menus
- settings
- save/load
- onboarding
- touch controls
- pause/resume
- appropriate accessibility considerations
- strong audiovisual feedback
- stable performance under heavy enemy counts
- reliable desktop development builds
- functioning mobile builds
- automated validation where practical
- documentation sufficient to continue development later

A store submission does not need to occur without my explicit authorization.

Do not publish, purchase services, incur costs, or expose credentials.

## START NOW

Inspect the repository.

Create the initial project structure and working project-memory documents.

Then begin implementing the vertical slice immediately.

Spend minimal time writing speculative design documentation before implementation.

When choosing between documenting something and proving it in the running game, favor the running game.

Continue implementing, testing, debugging, improving, and expanding Star Splitter Forces until you encounter a genuine dependency requiring my involvement or you reach the practical limits of the current work session.
