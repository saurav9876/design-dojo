# Design Dojo

A local, offline-friendly learning platform for high-level (HLD) and low-level (LLD) software design.

## Run

```bash
./start.sh          # then open http://localhost:8765
```

Or just open `index.html` in a browser. No build step, no dependencies.

## What is inside

- 22 lessons: foundations, 11 HLD, 9 LLD, each with a typed key idea, tables, code, a quiz and video links
- 7 simulators: request flow, load balancer, LRU cache, consistent hashing ring, quorum, token bucket, observer
- Quiz questions become spaced-repetition flashcards
- 12 timed practice drills (HLD and LLD pages) with clarifying questions and a coverage checklist
- Capacity estimator, latency numbers, decision cheat sheet
- Books, channels, repos and engineering blogs

- Search everything with Ctrl/Cmd+K (or `/`), and write per-lesson notes you can download as Markdown

Progress and notes are stored in your browser's localStorage.

After editing a file in `js/` or `styles.css`, bump the `?v=` number in `index.html` so the browser reloads it.

## Adding content

Lessons live in `js/lessons-*.js` as plain objects. Add one to the array and it appears in the sidebar, flashcards and path. Drills, books and links are in `js/extras.js`.
