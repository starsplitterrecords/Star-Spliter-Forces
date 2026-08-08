# Known Issues / External Dependencies

1. Godot is not installed in the authoring execution environment, so this commit has not yet been parsed by the Godot engine.
2. No iOS signing certificate, Apple developer profile, or physical-device test environment is available here.
3. Final Star Splitter audio masters/stems have not been added; current audio layer is architecture only.
4. Procedural vector visuals are intentional development art, not final project-derived character/environment art.
5. Collision checks are currently straightforward O(projectiles × enemies) loops. Population is capped at 450; profiling may require grid partitioning or pooled entities.
6. Touch joystick rendering is basic and needs safe-area/device tuning.
7. Full pause UI, controller remapping, haptics, accessibility text scaling, and device-specific graphics settings remain production tasks.
