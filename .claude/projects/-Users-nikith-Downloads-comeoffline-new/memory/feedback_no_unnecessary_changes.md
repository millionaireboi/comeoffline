---
name: No unnecessary file changes
description: Don't modify files beyond what's explicitly asked — ask before adding extra steps or changes
type: feedback
---

Don't make changes to files that weren't requested. If only one file needs editing, don't touch others "while we're at it."

**Why:** User got frustrated when cloudbuild.yaml was modified with push/deploy steps when they only asked to remove the GitHub Actions deploy job. The cloudbuild.yaml was fine as-is.

**How to apply:** Stick to exactly what's asked. If you think a related file needs changes, ask first instead of assuming.
