(function () {
  const yt = (q) => "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);

  window.YT = yt;

  window.INSIGHTS = [
    ["Fundamentals before frameworks", "Read a free primer first, then a deep book (Designing Data-Intensive Applications) once you have context. Beginners who start with the deep book often stall."],
    ["Trade-offs, not answers", "Interviewers and senior engineers care about why you chose something and what it costs. Memorised 'solutions' fall apart at the first follow-up."],
    ["For LLD, write real code", "Reading about patterns is not enough. Implement small designs (parking lot, vending machine, LRU cache) and extend them with a new requirement."],
    ["Patterns are tools, not goals", "Experienced developers repeatedly warn against pattern overuse. Reach for one when change hurts. A Philosophy of Software Design is the common counterweight."],
    ["Compare multiple solutions", "Watch two or three different explanations of the same problem and note what each one missed. This builds judgement faster than watching more problems."],
    ["Learn from real systems", "Engineering blogs and post-mortems show how designs fail in production. They teach more than idealised diagrams."],
    ["Practise out loud, with a diagram", "Explain on a whiteboard or a free canvas for 35 minutes with a timer. Communication is part of the skill."],
  ];

  // Picked from public forum discussion only (Blind, dev.to, LeetCode Discuss snippets, GitHub primer lists). No YouTube statistics used.
  window.LLD_PICKS = [
    {
      role: "Main LLD problems playlist",
      title: "Low Level System Design",
      channel: "Udit Agarwal",
      url: "https://www.youtube.com/playlist?list=PL564gOx0bCLqTolRIHIsR2JPv11w8LESW",
      stat: "recommended by name on Blind, and listed in the dev.to and GitHub LLD primer lists",
      why: "The only YouTube LLD source a forum commenter personally endorsed ('Watch Udit Agarwal'), and it also appears in two community lists. The dev.to list links worked cache and chess designs from the same author.",
    },
    {
      role: "Patterns theory",
      title: "Design Patterns in Object Oriented Programming",
      channel: "Christopher Okhravi",
      url: "https://www.youtube.com/playlist?list=PLrhzvIcii6GNjpARdnO4ueTUAVR9eMBpc",
      stat: "listed in the LeetCode and dev.to LLD resource lists",
      why: "Appears in the same community lists as the problems playlist, and in roundups as the clearest patterns explanation. Watch it when a lesson uses a pattern.",
    },
  ];
  window.LLD_RUNNERS = [
    ["The Code Mate", "Low Level Design series", "Listed in the same LeetCode and dev.to lists", "https://www.youtube.com/playlist?list=PLAC2AM9O1C5KioUMeH9qIjbAV_RMmX8rd"],
    ["Derek Banas", "Design patterns / OOP playlists", "Listed in the same lists (Java)", "https://www.youtube.com/results?search_query=Derek+Banas+design+patterns"],
    ["Concept && Coding (Shrayansh)", "Low Level Design from Basics to Advanced", "Mentioned positively by a LeetCode interview write-up; the Udemy version was cited by another candidate", "https://www.youtube.com/playlist?list=PL6W8uoQQ2c61X_9e6Net0WdYZidm7zooW"],
    ["Gaurav Sen", "Low Level Design", "Named in a fresher roadmap; one Blind poster criticised his channel (HLD) and nobody defended it on that thread", "https://www.youtube.com/playlist?list=PLMCXHnjXnTnvQVh7WsgZ8SurU1O2v_UM7"],
  ];
  window.LLD_METHOD = [
    "**Basics first, in order:** OOP fundamentals, then SOLID, then the common patterns, and learn when and why to use each, not only how.",
    "**Write complete, working code.** Machine-coding rounds ask for runnable object-oriented code in about 90 minutes. Candidates say it gets easy with enough practice.",
    "**Practise the usual problems:** parking lot, Sudoku, in-memory cache, feed, expense splitting, warehouse management, elevator.",
    "**Attempt it yourself before watching the solution.** Then compare.",
    "**Use a repeatable structure.** One commenter notes many tutorials are made for viewing, so copy a method: models first, then service, then controller and storage. Another starts from the top-level API and works down.",
    "**Get your code reviewed** by someone and iterate.",
    "**Do not over-invest.** Some Blind commenters say these rounds are easy or uncommon. Check whether your target companies actually run one.",
  ];

  window.PATH = [
    { w: "Week 1", t: "Foundations", items: ["f1", "f2", "h1"], goal: "Use the framework and do a rough estimate without notes." },
    { w: "Weeks 2 to 3", t: "Core building blocks", items: ["h2", "h3", "h4", "h5"], goal: "Explain when to cache, replicate or shard, and why." },
    { w: "Week 4", t: "Distributed thinking", items: ["h6", "h7", "h8"], goal: "State what you give up during a partition, and design an idempotent consumer." },
    { w: "Week 5", t: "Interfaces and resilience", items: ["h9", "h10", "h11"], goal: "Complete the URL shortener case study from a blank page." },
    { w: "Weeks 6 to 7", t: "LLD fundamentals", items: ["l1", "l2", "l3", "l4"], goal: "Refactor an if/else chain into strategies and explain why." },
    { w: "Weeks 8 to 9", t: "LLD in practice", items: ["l5", "l6", "l7", "l8", "l9"], goal: "Design a vending machine or library system in code in 45 minutes." },
    { w: "Ongoing", t: "Drills and review", items: [], goal: "One drill per week, flashcards every few days, one engineering blog post per week." },
  ];

  window.DRILLS = [
    {
      id: "d1", kind: "HLD", title: "Design a URL shortener", time: 35,
      prompt: "Users submit long URLs and get short links that redirect. Design the system.",
      ask: ["Expected scale (new links per month, redirects per second)?", "Custom aliases? Expiry? Analytics?", "Latency and availability targets?"],
      cover: ["Back-of-envelope: writes, reads, storage", "API and data model (key-value)", "Short code generation and collision strategy", "Cache for hot links, read replicas", "301 vs 302 and analytics via a queue", "Sharding by code, abuse protection"],
    },
    {
      id: "d2", kind: "HLD", title: "Design a rate limiter", time: 30,
      prompt: "Limit each API key to a number of requests per time window across a fleet of servers.",
      ask: ["Per user, per IP, or per endpoint?", "Hard or soft limits? Burst allowed?", "Latency budget for the check?"],
      cover: ["Algorithm choice and why (token bucket, sliding window)", "Where it lives (gateway vs service)", "Shared store with atomic operations", "Failure mode: fail open or closed", "429 with Retry-After", "Config changes without redeploys"],
    },
    {
      id: "d3", kind: "HLD", title: "Design a news feed", time: 40,
      prompt: "Users follow others and see a ranked feed of recent posts.",
      ask: ["How many users and followers per user (celebrities)?", "Real-time or near real-time?", "Ranking: chronological or algorithmic?"],
      cover: ["Fan-out on write vs fan-out on read, and a hybrid for celebrities", "Feed cache per user", "Post storage and media in object storage + CDN", "Queues for fan-out workers", "Pagination with cursors", "Consistency expectations (eventual is fine)"],
    },
    {
      id: "d4", kind: "HLD", title: "Design a chat system", time: 40,
      prompt: "One-to-one and group messaging with online presence and delivery receipts.",
      ask: ["Group size limits? Message history retention?", "Multi-device?", "Scale of concurrent connections?"],
      cover: ["Persistent connections (WebSocket) and connection gateways", "Routing messages to the right gateway", "Message storage partitioned by conversation", "Delivery states and offline queueing", "Ordering within a conversation", "Presence with heartbeats"],
    },
    {
      id: "d5", kind: "HLD", title: "Design a notification service", time: 30,
      prompt: "Send email, SMS and push notifications triggered by many internal services.",
      ask: ["Priority levels? Scheduled sends?", "User preferences and opt-outs?", "Volume and burst patterns?"],
      cover: ["Queue per channel, workers per provider", "Idempotency and de-duplication", "Retries with backoff and a dead-letter queue", "Templates and preferences service", "Provider failover", "Rate limits per user and provider"],
    },
    {
      id: "d6", kind: "HLD", title: "Design a web crawler", time: 35,
      prompt: "Crawl a large part of the web, store pages, and avoid hammering any site.",
      ask: ["Scale (pages per day)? Freshness needs?", "Only HTML, or media too?", "Respect robots.txt?"],
      cover: ["URL frontier with priority and politeness per host", "Duplicate URL and content detection (hashing, Bloom filter)", "Distributed workers and partitioning by host", "Storage of raw pages", "Traps and loops, depth limits", "Re-crawl scheduling"],
    },
    {
      id: "d7", kind: "HLD", title: "Design file storage and sync (Dropbox style)", time: 40,
      prompt: "Users upload files and keep them in sync across devices.",
      ask: ["File size limits? Sharing and permissions?", "Versioning?", "Offline edits?"],
      cover: ["Chunking files and de-duplicating by hash", "Metadata service vs blob storage", "Sync protocol and change notifications", "Conflict handling", "Resumable uploads", "Replication and durability"],
    },
    {
      id: "d8", kind: "LLD", title: "Design a parking lot", time: 40,
      prompt: "Vehicles enter, get a ticket and a spot, and pay on exit.",
      ask: ["Vehicle and spot types?", "Pricing rules?", "Multiple floors and entrances?"],
      cover: ["Vehicle, Spot, Ticket, ParkingLot responsibilities", "Allocation strategy interface", "Fee policy interface", "Injected clock for tests", "Error cases: lot full, unknown ticket", "Thread safety on park()"],
    },
    {
      id: "d9", kind: "LLD", title: "Design an LRU cache", time: 30,
      prompt: "Implement a fixed-capacity cache that evicts the least recently used entry. get and put should be O(1).",
      ask: ["Thread safety needed?", "TTL support?", "Generic key/value types?"],
      cover: ["Hash map plus doubly linked list", "Move-to-front on access", "Evict tail on overflow", "Edge cases: capacity 1, updating existing key", "Lock strategy if concurrent", "Pluggable eviction policy (Strategy)"],
    },
    {
      id: "d10", kind: "LLD", title: "Design a vending machine", time: 35,
      prompt: "Accept coins, let a user select an item, dispense it and return change.",
      ask: ["Payment types? Refunds?", "Inventory refill?", "Failure cases like jammed dispenser?"],
      cover: ["State pattern or enum + transitions", "Inventory and Product model", "Change calculation", "Money as a value type", "Illegal actions in each state", "Extensibility for card payments"],
    },
    {
      id: "d11", kind: "LLD", title: "Design an elevator system", time: 45,
      prompt: "Several elevators serve a building. Requests come from floors and from inside cars.",
      ask: ["Number of elevators and floors?", "Optimise for wait time or energy?", "Priority or maintenance modes?"],
      cover: ["Elevator, Request, Controller", "Scheduling strategy interface", "Direction and stop queue per elevator", "State for moving/idle/doors", "Concurrency of incoming requests", "Edge cases: overload, emergency"],
    },
    {
      id: "d12", kind: "LLD", title: "Design an expense-splitting app (Splitwise style)", time: 45,
      prompt: "Users share expenses in groups with equal, exact or percentage splits and can see who owes whom.",
      ask: ["Split types?", "Multiple currencies?", "Simplify debts?"],
      cover: ["User, Group, Expense, Split types", "Split strategy interface", "Balance sheet per pair and net balances", "Money as integer cents, no floats", "Debt simplification", "Validation: split totals must equal the amount"],
    },
  ];

  window.RESOURCES = [
    {
      group: "Start here (free)",
      items: [
        ["System Design Primer", "https://github.com/donnemartin/system-design-primer", "Free GitHub repo with fundamentals, trade-offs and flashcards. The most frequently recommended free starting point."],
        ["Refactoring Guru", "https://refactoring.guru", "Clear, illustrated explanations of design patterns, code smells and refactoring."],
        ["Martin Fowler's site", "https://martinfowler.com", "Authoritative articles on architecture, refactoring and patterns."],
        ["High Scalability", "https://highscalability.com", "Long-running archive of how real companies scaled."],
        ["AWS Builders' Library", "https://aws.amazon.com/builders-library/", "Practical articles on reliability, timeouts, retries and operations from Amazon engineers."],
        ["Raft visualisation", "https://thesecretlivesofdata.com/raft/", "Animated walkthrough of the Raft consensus algorithm."],
      ],
    },
    {
      group: "LLD practice repositories",
      items: [
        ["low-level-design-primer", "https://github.com/prasadgujar/low-level-design-primer", "A primer for LLD and machine-coding rounds, with questions and solutions."],
        ["awesome-low-level-design", "https://github.com/ashishps1/awesome-low-level-design", "Curated LLD concepts and interview problems with code."],
        ["System design resources (InterviewReady)", "https://github.com/InterviewReady/system-design-resources", "Curated reading list of papers and articles."],
      ],
    },
    {
      group: "Interactive and paid courses (check reviews)",
      items: [
        ["ByteByteGo", "https://bytebytego.com", "Visual system design content from the author of the System Design Interview books."],
        ["Hello Interview", "https://www.hellointerview.com", "Structured system design and LLD interview prep, often praised for its framework."],
        ["AlgoMaster blog", "https://blog.algomaster.io", "Newsletter with HLD and LLD guides."],
      ],
    },
    {
      group: "Tools to practise with",
      items: [
        ["Excalidraw", "https://excalidraw.com", "Free whiteboard for sketching architectures. Practise drawing while talking."],
        ["diagrams.net", "https://app.diagrams.net", "Free diagram editor with UML and cloud shapes."],
      ],
    },
    {
      group: "Engineering blogs (learn from real systems)",
      items: [
        ["Netflix Tech Blog", "https://netflixtechblog.com", "Streaming, resilience and data infrastructure at scale."],
        ["Cloudflare Blog", "https://blog.cloudflare.com", "Networking, edge and detailed post-mortems."],
        ["Uber Engineering", "https://www.uber.com/blog/engineering/", "Marketplace, geo, and data platform designs."],
        ["Stripe Engineering", "https://stripe.com/blog/engineering", "Payments, API design, idempotency and reliability."],
      ],
    },
  ];

  window.BOOKS = [
    ["A Philosophy of Software Design", "John Ousterhout", "LLD", "Short and opinionated. Deep modules, complexity, information hiding. Most recommended first LLD book."],
    ["Designing Data-Intensive Applications", "Martin Kleppmann", "HLD", "The deep reference on storage, replication, consistency and streams. Dense, read it with context and over time."],
    ["System Design Interview, Volumes 1 and 2", "Alex Xu", "HLD", "Step-by-step worked problems with diagrams. Good for structure."],
    ["Head First Design Patterns", "Freeman and Robson", "LLD", "Beginner friendly introduction to patterns."],
    ["Design Patterns", "Gamma, Helm, Johnson, Vlissides", "LLD", "The original catalogue (GoF). A reference, not a cover-to-cover read."],
    ["Refactoring", "Martin Fowler", "LLD", "Catalogue of safe, named refactorings and smells."],
    ["The Pragmatic Programmer", "Hunt and Thomas", "Both", "Habits and judgement for working engineers."],
    ["Building Microservices", "Sam Newman", "HLD", "Service boundaries, communication and operations, with honest trade-offs."],
    ["Release It!", "Michael Nygard", "HLD", "Stability patterns: timeouts, circuit breakers, bulkheads, from real outages."],
    ["Software Engineering at Google", "Winters, Manshreck, Wright", "Both", "How a large organisation handles testing, dependencies and change."],
    ["Domain-Driven Design", "Eric Evans", "Both", "Modelling complex domains. Advanced; start with summaries."],
  ];

  window.CHANNELS = [
    ["ByteByteGo", "Visual, concise system design explanations."],
    ["Gaurav Sen", "Fundamentals and classic system design problems."],
    ["Tech Dummies (Narendra L)", "Covers both HLD and LLD walkthroughs."],
    ["codeKarle", "HLD and LLD interview problems."],
    ["Hello Interview", "Interview frameworks and breakdowns."],
    ["Hussein Nasser", "Backend, networking and databases internals."],
    ["Arpit Bhayani", "Deep dives into databases and systems internals."],
    ["ArjanCodes", "Design principles and patterns (examples in Python, ideas carry over to Java)."],
    ["Christopher Okhravi", "Design patterns playlist with the theory explained carefully."],
    ["Jordan Has No Life", "Long, detailed, opinionated system design videos."],
    ["freeCodeCamp.org", "Full-length system design and OOP courses."],
  ];

  window.DECISIONS = [
    ["Which database?", "Start relational (PostgreSQL/MySQL). Move to key-value or wide-column only for a named limit: key-based access at massive scale, huge write volume, or flexible documents."],
    ["Read-heavy and slow?", "Add caching (cache-aside), a CDN for static content, then read replicas."],
    ["Write-heavy?", "Queue and batch writes, partition/shard by a high-cardinality key, use append-optimised stores."],
    ["Need to absorb spikes or decouple?", "Message queue or log with idempotent consumers and a dead-letter queue."],
    ["Strong or eventual consistency?", "Money, inventory, uniqueness: strong. Feeds, counts, recommendations: eventual."],
    ["Spread keys over changing servers?", "Consistent hashing (or fixed partitions) instead of hash mod N."],
    ["Protect against overload?", "Rate limiting at the edge, timeouts everywhere, backoff with jitter, circuit breakers."],
    ["Rule varies a lot (pricing, allocation)?", "Strategy behind an interface, injected."],
    ["Behaviour depends on status?", "State pattern or an explicit transition table."],
    ["Add behaviour to something without changing it?", "Decorator."],
    ["Third-party API shape differs?", "Adapter."],
    ["Hard to unit test?", "Inject databases, clocks, randomness and network clients."],
  ];
})();
