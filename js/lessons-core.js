(function () {
  window.LESSONS.push(
    {
      id: "f1",
      track: "found",
      title: "The design mindset and a repeatable framework",
      min: 10,
      summary: "Design is choosing trade-offs under constraints. Learn the loop that makes every later lesson stick.",
      key: "There is no best design, only the best design for these requirements, at this scale, with this team. Your job is to make the trade-offs visible and defensible.",
      sections: [
        {
          h: "Two kinds of design, one skill",
          p: [
            "**High-level design (HLD)** decides the big boxes: services, databases, caches, queues, and how they talk. It is about scale, latency, availability and cost.",
            "**Low-level design (LLD)** decides what lives inside a box: classes, interfaces, responsibilities and how they change over time. It is about clarity, extensibility and testability.",
            "Both are the same skill: take a fuzzy problem, find what is likely to change or break, and put boundaries exactly there.",
          ],
        },
        {
          h: "The HLD framework (use it every time)",
          steps: [
            "**Clarify requirements.** Functional (what it does) and non-functional (scale, latency, availability, consistency, durability). Ask, do not assume.",
            "**Estimate.** Requests per second, storage per year, bandwidth. Rough numbers are enough, they decide the architecture.",
            "**Define the API and data model.** The two or three core entities and the main calls.",
            "**Draw the simple version first.** Client, service, database. Make it work before making it scale.",
            "**Find the bottleneck and scale it.** Cache, replicate, shard, queue. Justify each addition with a number or a failure.",
            "**Discuss trade-offs and failures.** What if a node dies, a region is lost, traffic doubles? What did you give up?",
          ],
        },
        {
          h: "The LLD framework",
          steps: [
            "**Clarify requirements** and list use cases as short sentences.",
            "**Find the nouns** (candidate classes) and **verbs** (candidate methods).",
            "**Assign responsibilities.** Each class should have one clear reason to change.",
            "**Define relationships.** Has-a (composition), is-a (inheritance, sparingly), uses (dependency).",
            "**Apply a pattern only where change hurts.** If a rule will vary (pricing, allocation), hide it behind an interface.",
            "**Code the core path**, then walk through one extension to prove the design bends instead of breaks.",
          ],
        },
        {
          h: "The learning loop that works",
          p: [
            "Across discussions on Hacker News, Reddit and Blind, the advice converges: do not memorise solutions. Learn the building blocks, then practise combining them, then compare your answer with others.",
          ],
          steps: [
            "**Learn** one concept from a lesson here.",
            "**See it move** in the simulator, break it on purpose.",
            "**Recall** it with the quiz and flashcards the next day (spaced repetition).",
            "**Apply** it in a drill: design something without notes, out loud, for 35 minutes.",
            "**Compare** with a video or write-up of the same problem and note what you missed.",
          ],
          note: { kind: "tip", text: "Teach it. If you can explain why a cache needs a TTL to a friend (or a rubber duck) without notes, you own it." },
        },
      ],
      videos: [
        { t: "System design interview framework", q: "system design interview framework step by step" },
        { t: "How to approach any design problem", q: "how to approach software design problems trade-offs" },
      ],
      quiz: [
        {
          q: "What should you do first in a system design discussion?",
          o: ["Draw the final architecture with all components", "Clarify functional and non-functional requirements", "Pick a database", "List design patterns to use"],
          a: 1,
          why: "Requirements (especially scale, latency and consistency) drive every later decision. Without them you are guessing.",
        },
        {
          q: "Which statement about 'best' designs is most accurate?",
          o: ["Microservices are always better than a monolith", "A design is good relative to requirements and constraints", "The most scalable design is always the best", "Use as many patterns as possible"],
          a: 1,
          why: "Design is trade-offs. A simple monolith can beat microservices for a small team; the reverse holds at other scales.",
        },
        {
          q: "When should an LLD apply a design pattern?",
          o: ["Always, to show knowledge", "Where a rule is likely to vary or change", "Only for creational problems", "Never, patterns are outdated"],
          a: 1,
          why: "Patterns are tools to isolate change. Applying them without a reason adds indirection and no value.",
        },
      ],
    },
    {
      id: "f2",
      track: "found",
      title: "Back-of-the-envelope estimation",
      min: 12,
      summary: "Turn 'a lot of users' into QPS, storage and bandwidth in two minutes, and let numbers choose your architecture.",
      key: "A day is about 100,000 seconds. So 1 million requests per day is about 10 requests per second. Everything else follows from that.",
      sections: [
        {
          h: "Numbers worth memorising",
          p: ["One day has 86,400 seconds, round it to about 10^5. Peak traffic is commonly 2x to 3x the average, so plan for peak, not average."],
          table: {
            head: ["Quantity", "Rule of thumb"],
            rows: [
              ["1 million requests / day", "about 12 requests / second"],
              ["1 billion requests / day", "about 12,000 requests / second"],
              ["1 million users x 1 KB each", "1 GB"],
              ["1 KB = 10^3 B, 1 MB = 10^6 B", "1 GB = 10^9 B, 1 TB = 10^12 B"],
              ["Seconds in a year", "about 31.5 million (3 x 10^7)"],
            ],
          },
        },
        {
          h: "Latency numbers every engineer should feel",
          p: ["These are the classic orders of magnitude. Exact values vary by hardware, but the ratios are what matter: memory is far faster than SSD, and SSD is far faster than a cross-continent round trip."],
          table: {
            head: ["Operation", "Approx. time"],
            rows: [
              ["Main memory reference", "100 ns"],
              ["Read 1 MB sequentially from memory", "250 us"],
              ["Round trip within the same data centre", "500 us"],
              ["Read 1 MB sequentially from SSD", "1 ms"],
              ["Disk seek (spinning disk)", "10 ms"],
              ["Packet round trip California to Netherlands", "150 ms"],
            ],
          },
          note: { kind: "info", text: "Takeaway: avoid network hops when you can, keep hot data in memory, and never do a cross-region call in the middle of a request unless you must." },
        },
        {
          h: "A worked example",
          p: ["Design a photo app with 50 million daily active users. Each uploads 2 photos per day on average (200 KB each) and views 40 photos per day."],
          ul: [
            "Writes: 50M x 2 = 100M uploads/day, which is about 1,160 per second on average. At 3x peak, about 3,500 per second.",
            "Reads: 50M x 40 = 2B views/day, about 23,000 per second on average. Reads outnumber writes 20 to 1, so caches and a CDN are essential.",
            "Storage: 100M x 200 KB = 20 TB/day, about 7.3 PB/year before replication. This means object storage, not a relational database.",
            "Bandwidth in: 20 TB/day is about 230 MB/s. Out: 2B x 200 KB = 400 TB/day, about 4.6 GB/s, which a CDN must absorb.",
          ],
          note: { kind: "tip", text: "Use the Estimator in the Tools page to play with these numbers. The point is the order of magnitude, never precision." },
        },
      ],
      videos: [
        { t: "Back of the envelope estimation", q: "back of the envelope estimation system design" },
        { t: "Latency numbers every programmer should know", q: "latency numbers every programmer should know explained" },
      ],
      quiz: [
        {
          q: "About how many requests per second is 100 million requests per day (average)?",
          o: ["About 120", "About 1,200", "About 12,000", "About 120,000"],
          a: 1,
          why: "100,000,000 / 86,400 is roughly 1,157, so about 1,200 per second.",
        },
        {
          q: "Why estimate peak traffic separately from the average?",
          o: ["It is required by every database", "Systems fail at peak, so capacity must handle it", "Averages are illegal to use", "To make numbers bigger"],
          a: 1,
          why: "Traffic is bursty. Provisioning for the average means failures during daily or event peaks.",
        },
        {
          q: "You get 20 TB of new photo data per day. Which store fits best?",
          o: ["A single relational database", "An in-memory cache only", "Object storage (blob store)", "A message queue"],
          a: 2,
          why: "Large immutable blobs belong in object storage, with metadata in a database and delivery via a CDN.",
        },
      ],
    }
  );
})();
