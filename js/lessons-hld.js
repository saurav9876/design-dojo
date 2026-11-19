(function () {
  window.LESSONS.push(
    {
      id: "h1",
      track: "hld",
      title: "How a request travels: scalability basics",
      min: 12,
      sim: "flow",
      summary: "Follow one request through DNS, CDN, load balancer, app, cache and database, and learn what 'stateless' buys you.",
      key: "Scale the part that is the bottleneck, and make everything else stateless so it can be copied.",
      sections: [
        {
          h: "Watch one request",
          p: ["Press Play below. Each stop is a place where you can add capacity, cache results, or fail. Most system design is deciding which stops you need and what each one costs."],
          simSlot: true,
        },
        {
          h: "Vertical vs horizontal scaling",
          table: {
            head: ["", "Vertical (scale up)", "Horizontal (scale out)"],
            rows: [
              ["What", "Bigger machine", "More machines"],
              ["Pros", "Simple, no code changes", "Near-linear capacity, fault tolerant"],
              ["Cons", "Hard ceiling, single point of failure, expensive at the top", "Needs load balancing, state handling, more operational complexity"],
              ["Use when", "Early stage, databases that are hard to shard", "Stateless web and API tiers, large scale"],
            ],
          },
        },
        {
          h: "Stateless services",
          p: [
            "A stateless server keeps nothing between requests that another server would need. Any server can handle any request, so you can add, remove or replace servers freely.",
            "Move state out: sessions to a shared store (Redis or a signed token), files to object storage, data to the database. The servers become cattle, not pets.",
          ],
          note: { kind: "warn", text: "Local in-memory state (sessions, uploaded files on disk, in-process caches that must be consistent) is what usually blocks horizontal scaling." },
        },
        {
          h: "Read-heavy vs write-heavy",
          ul: [
            "**Read-heavy** (social feeds, product pages): add caches, read replicas and CDNs. Reads are easy to copy.",
            "**Write-heavy** (logging, metrics, chat): add queues, batching, partitioning/sharding. Writes are harder to scale because they need a single owner for correctness.",
          ],
        },
      ],
      videos: [
        { t: "System design basics: scalability", q: "system design basics scalability horizontal vertical" },
        { t: "What happens when you type a URL", q: "what happens when you type a URL in the browser system design" },
      ],
      quiz: [
        {
          q: "Why do we prefer stateless application servers?",
          o: ["They use less CPU", "Any server can serve any request, so scaling and failover are easy", "They never need a database", "They are required by HTTP"],
          a: 1,
          why: "With no per-server state, a load balancer can route anywhere and instances can be added or killed freely.",
        },
        {
          q: "Which scaling approach has a hard ceiling and a single point of failure?",
          o: ["Horizontal scaling", "Vertical scaling", "Sharding", "Caching"],
          a: 1,
          why: "A single machine can only get so big, and if it dies everything dies.",
        },
        {
          q: "A product page gets 100x more reads than writes. The first levers to pull are:",
          o: ["Sharding the primary database", "Caches, CDN and read replicas", "A bigger message queue", "Rewriting in another language"],
          a: 1,
          why: "Reads can be copied cheaply: cache them, push them to the edge, and fan them out to replicas.",
        },
      ],
    },
    {
      id: "h2",
      track: "hld",
      title: "Load balancing",
      min: 12,
      sim: "loadbalancer",
      summary: "Spread traffic, hide failures, and see why round robin alone can hurt.",
      key: "A load balancer is only as good as its health checks and the algorithm's match to your workload.",
      sections: [
        {
          h: "What it does",
          ul: [
            "Distributes requests across servers so none is overloaded.",
            "Removes unhealthy servers automatically using health checks.",
            "Terminates TLS, and at layer 7 can route by path, header or cookie.",
          ],
        },
        {
          h: "Try it: break it on purpose",
          p: ["Start the traffic, compare algorithms, and kill a server. Server 3 is slower than the others. Watch what round robin does to it, then switch to least connections."],
          simSlot: true,
        },
        {
          h: "Algorithms",
          table: {
            head: ["Algorithm", "How it picks", "Good for", "Watch out"],
            rows: [
              ["Round robin", "Next server in turn", "Equal servers, similar requests", "Ignores load, slow node piles up"],
              ["Least connections", "Server with fewest active requests", "Variable request durations", "Needs connection tracking"],
              ["IP / key hash", "Hash of client IP or key", "Sticky routing, cache locality", "Uneven if keys are skewed, reshuffles when servers change (see consistent hashing)"],
              ["Weighted", "Proportional to capacity", "Mixed hardware", "Weights must be maintained"],
            ],
          },
        },
        {
          h: "Layer 4 vs layer 7",
          p: [
            "**L4** balances on IP and port (TCP/UDP). It is fast and simple, and has no idea what is inside the request.",
            "**L7** understands HTTP, so it can route `/api` and `/static` differently, do retries, and rewrite headers. It costs more CPU.",
          ],
        },
        {
          h: "Pitfalls",
          ul: [
            "The load balancer itself is a single point of failure. Run a redundant pair (active-passive or active-active) or use a managed service.",
            "Sticky sessions pin a user to one server. This hurts balance and failover. Prefer stateless servers with shared session storage.",
            "Health checks must test something meaningful, not just 'process is up'.",
          ],
        },
      ],
      videos: [
        { t: "Load balancing explained", q: "load balancing explained system design L4 L7" },
        { t: "Load balancing algorithms", q: "load balancing algorithms round robin least connections" },
      ],
      quiz: [
        {
          q: "One server is slower than the others and requests vary in duration. Which algorithm adapts best?",
          o: ["Round robin", "Least connections", "Random with no health check", "Hash on a constant"],
          a: 1,
          why: "Least connections sends new work to servers that finish faster, so slow servers naturally receive less.",
        },
        {
          q: "What is the main problem with sticky sessions?",
          o: ["They disable TLS", "They tie users to a server, hurting balance and failover", "They only work on layer 4", "They require a CDN"],
          a: 1,
          why: "If the pinned server dies, session state is lost, and popular users can overload one node.",
        },
        {
          q: "How do you avoid the load balancer being a single point of failure?",
          o: ["Make it larger", "Run redundant load balancers with failover", "Turn off health checks", "Use only one data centre"],
          a: 1,
          why: "Redundancy (active-passive or active-active) removes the single point, typically with a floating IP or DNS.",
        },
      ],
    },
    {
      id: "h3",
      track: "hld",
      title: "Caching",
      min: 15,
      sim: "lru",
      summary: "The cheapest speed-up in computing, and the source of the most subtle bugs.",
      key: "A cache trades freshness for speed. Decide how stale is acceptable first, then pick the strategy.",
      sections: [
        {
          h: "Where caches live",
          ul: [
            "**Browser / client:** free, but you cannot reach in to invalidate it.",
            "**CDN:** static files and cacheable responses near users.",
            "**Application cache (Redis, Memcached):** shared, in-memory, the workhorse.",
            "**Database buffer / query cache:** automatic, but do not rely on it.",
          ],
        },
        {
          h: "Strategies",
          table: {
            head: ["Strategy", "How it works", "Trade-off"],
            rows: [
              ["Cache-aside", "App checks cache, on miss reads DB and fills cache", "Most common. First request is slow, stale data possible"],
              ["Read-through", "Cache itself loads from DB on miss", "Simpler app code, cache must know the DB"],
              ["Write-through", "Write to cache and DB together", "Cache stays fresh, writes are slower"],
              ["Write-back", "Write to cache, flush to DB later", "Fast writes, data loss risk if the cache dies"],
            ],
          },
          code: {
            title: "Cache-aside in Java",
            text: `public User getUser(String userId) {
    String key = "user:" + userId;
    String cached = redis.get(key);
    if (cached != null) {
        return decode(cached);                 // hit
    }

    User user = db.findUser(userId);           // miss: go to the source of truth
    if (user != null) {
        redis.set(key, encode(user), 300);     // TTL in seconds bounds staleness
    }
    return user;
}

public void updateUser(String userId, UserChanges changes) {
    db.updateUser(userId, changes);
    redis.delete("user:" + userId);            // invalidate, next read refills
}`,
          },
        },
        {
          h: "Try it: eviction in action",
          p: ["A cache is small, so something must leave when it is full. LRU (least recently used) evicts what you have not touched for the longest. Request keys and watch the order change. Then run the workload to see how capacity affects hit ratio."],
          simSlot: true,
        },
        {
          h: "Classic failure modes",
          ul: [
            "**Stampede (thundering herd):** a hot key expires and thousands of requests hit the DB at once. Fix with request coalescing/locking, jittered TTLs, or refreshing early.",
            "**Cache penetration:** lookups for keys that do not exist always miss. Cache the 'not found' result briefly or use a Bloom filter.",
            "**Stale data:** you invalidated the cache but a concurrent read re-filled it with old data. Keep TTLs as a safety net.",
            "**Hot key:** one key gets all the traffic. Replicate it, or add a small local cache in front.",
          ],
          note: { kind: "info", text: "Eviction policies: LRU suits most workloads, LFU keeps frequently used items even if not recent, TTL bounds staleness. They are often combined." },
        },
      ],
      videos: [
        { t: "Caching strategies explained", q: "caching strategies cache aside write through write back explained" },
        { t: "Cache stampede / thundering herd", q: "cache stampede thundering herd problem explained" },
      ],
      quiz: [
        {
          q: "In cache-aside, what happens on a cache miss?",
          o: ["The request fails", "The app reads the database and then populates the cache", "The cache deletes the database row", "A CDN is purged"],
          a: 1,
          why: "The application owns the logic: check cache, fall back to the source of truth, then fill the cache.",
        },
        {
          q: "A popular key expires and the database is flooded. This is called:",
          o: ["Cache penetration", "Cache stampede (thundering herd)", "Write-back", "Eviction"],
          a: 1,
          why: "Many concurrent misses on the same key all fall through to the database at once.",
        },
        {
          q: "Which strategy risks losing acknowledged writes if the cache node crashes?",
          o: ["Write-through", "Cache-aside", "Write-back", "Read-through"],
          a: 2,
          why: "Write-back acknowledges after writing to the cache and flushes to the database later, so unflushed writes can be lost.",
        },
      ],
    },
    {
      id: "h4",
      track: "hld",
      title: "Databases: SQL, NoSQL, indexing, replication, sharding",
      min: 18,
      summary: "Choose a data store for your access pattern, then learn the three tools that scale it: indexes, replicas, shards.",
      key: "Start from your queries, not from the database brand. The access pattern picks the store.",
      sections: [
        {
          h: "Choosing a store",
          table: {
            head: ["Need", "Good fit", "Why"],
            rows: [
              ["Relationships, transactions, ad-hoc queries", "Relational (PostgreSQL, MySQL)", "ACID transactions, joins, mature tooling"],
              ["Simple lookups by key at huge scale", "Key-value (DynamoDB, Redis)", "Predictable latency, easy partitioning"],
              ["Flexible documents", "Document (MongoDB)", "Schema flexibility, data read together is stored together"],
              ["Massive writes, time-ordered", "Wide-column (Cassandra), time-series", "Append-optimised, partitioned by design"],
              ["Large files", "Object storage (S3-style)", "Cheap, durable, not a database"],
              ["Text search", "Search engine (Elasticsearch)", "Inverted indexes, ranking"],
            ],
          },
          note: { kind: "tip", text: "Default to a relational database until you can name the specific limit you are hitting. It is the right answer more often than people admit." },
        },
        {
          h: "Indexes",
          p: [
            "An index (usually a B-tree) lets the database find rows without scanning the table. It speeds up reads and slows down writes, and it uses space.",
            "A composite index on `(user_id, created_at)` serves queries that filter on `user_id`, or `user_id` and `created_at`, but not `created_at` alone. Column order matters.",
          ],
          code: {
            title: "SQL",
            text: `-- Slow: full table scan on millions of rows
SELECT * FROM orders WHERE user_id = 42 ORDER BY created_at DESC LIMIT 20;

-- Fast: index matches both the filter and the sort
CREATE INDEX idx_orders_user_created ON orders (user_id, created_at DESC);`,
          },
        },
        {
          h: "Replication",
          p: ["Copy data to other machines for availability and read scale. In leader-follower replication, writes go to the leader and replicate to followers that serve reads."],
          ul: [
            "**Replication lag:** followers are slightly behind. A user may update their profile and not see the change. A common fix is read-your-writes: read from the leader shortly after a write.",
            "**Failover:** if the leader dies, promote a follower. Be careful of losing the latest writes and of two nodes both believing they are leader (split brain).",
          ],
        },
        {
          h: "Sharding (partitioning)",
          p: ["When one machine cannot hold the data or the write load, split rows across machines by a **shard key**."],
          table: {
            head: ["Scheme", "How", "Pro", "Con"],
            rows: [
              ["Range", "Key ranges per shard", "Efficient range scans", "Hot spots (e.g. latest timestamps)"],
              ["Hash", "hash(key) mod N or consistent hashing", "Even spread", "Range queries become scatter-gather"],
              ["Directory", "Lookup table of key to shard", "Flexible", "Lookup is a dependency and a bottleneck"],
            ],
          },
          ul: [
            "Choose a key with high cardinality that matches your main access pattern, so most queries hit one shard.",
            "Cross-shard joins and transactions are expensive. Design to avoid them.",
            "Adding shards means moving data. That is why consistent hashing exists (next lessons).",
          ],
          note: { kind: "warn", text: "Shard last. It adds permanent complexity. Try indexes, caching, read replicas and a bigger machine first." },
        },
      ],
      videos: [
        { t: "SQL vs NoSQL", q: "SQL vs NoSQL system design when to use which" },
        { t: "Database sharding and replication", q: "database sharding replication explained system design" },
        { t: "How database indexes work", q: "how database indexes work B-tree explained" },
      ],
      quiz: [
        {
          q: "A composite index on (user_id, created_at). Which query benefits fully?",
          o: ["WHERE created_at > X only", "WHERE user_id = 5 AND created_at > X", "WHERE LOWER(user_id) = 5", "No query can use it"],
          a: 1,
          why: "The leading column must be constrained. A filter on the second column alone cannot use the index efficiently.",
        },
        {
          q: "A user updates their name but still sees the old one. A likely cause is:",
          o: ["Index corruption", "Replication lag on a follower read", "Too many shards", "TLS misconfiguration"],
          a: 1,
          why: "The read hit a follower that had not yet received the write. Read-your-writes routing is the typical fix.",
        },
        {
          q: "What is the main downside of range-based sharding on a timestamp?",
          o: ["No range queries", "Recent writes all land on one hot shard", "It needs a CDN", "It prevents replication"],
          a: 1,
          why: "New data always has the highest timestamps, so the newest shard receives all the write traffic.",
        },
      ],
    },
    {
      id: "h5",
      track: "hld",
      title: "Consistent hashing",
      min: 12,
      sim: "ring",
      summary: "Add or remove a server and move only a small slice of the data instead of nearly all of it.",
      key: "With hash(key) mod N, changing N remaps almost every key. Consistent hashing remaps only about 1/N of them.",
      sections: [
        {
          h: "The problem with mod N",
          p: [
            "Say you spread cache keys over 4 servers using `hash(key) % 4`. Add a fifth server and the formula becomes `% 5`: roughly 80 percent of keys now map to a different server. Your cache is suddenly cold and the database takes the hit.",
          ],
        },
        {
          h: "The ring",
          steps: [
            "Hash both servers and keys onto the same circular space (for example 0 to 2^32).",
            "A key belongs to the first server found going clockwise from the key's position.",
            "Adding a server only takes keys from the arc just before it. Removing one hands its keys to the next server clockwise.",
            "Each server is placed at many points (**virtual nodes**) so the load evens out and a leaving server's keys spread across many neighbours.",
          ],
        },
        {
          h: "Try it",
          p: ["Add and remove servers and compare how many keys each approach moves. Then change virtual nodes from 1 to 50 and see how the balance improves."],
          simSlot: true,
        },
        {
          h: "Where it is used",
          ul: [
            "Distributed caches and key-value stores (the Dynamo paper popularised the idea).",
            "Partitioning data across database or storage nodes.",
            "Load balancing with affinity, so the same key reaches the same backend.",
          ],
          note: { kind: "info", text: "Some systems choose fixed partitions instead (for example many more partitions than nodes, assigned to nodes). The goal is the same: moving a few partitions instead of rehashing everything." },
        },
      ],
      videos: [
        { t: "Consistent hashing explained", q: "consistent hashing explained system design virtual nodes" },
        { t: "Dynamo paper walkthrough", q: "Amazon Dynamo paper explained consistent hashing" },
      ],
      quiz: [
        {
          q: "You go from 4 to 5 servers using hash mod N. Roughly what fraction of keys move?",
          o: ["About 20%", "About 50%", "About 80%", "0%"],
          a: 2,
          why: "A key stays only if hash mod 4 equals hash mod 5, which happens for about 1 in 5 keys, so about 80% move.",
        },
        {
          q: "Why use virtual nodes?",
          o: ["To encrypt keys", "To balance load and spread a failed node's keys across many neighbours", "To avoid hashing", "To enable SQL joins"],
          a: 1,
          why: "With few points, arcs are uneven. Many virtual points per server smooth the distribution.",
        },
        {
          q: "In consistent hashing a key is stored on:",
          o: ["The server with the lowest ID", "The first server clockwise from the key's hash", "Every server", "A random server"],
          a: 1,
          why: "Clockwise successor is the standard rule. Replicas are usually the next few distinct servers after it.",
        },
      ],
    },
    {
      id: "h6",
      track: "hld",
      title: "CAP, consistency and quorums",
      min: 15,
      sim: "quorum",
      summary: "What you must give up when the network breaks, and how replicas vote to stay correct.",
      key: "CAP is not 'pick two of three'. Partitions happen, so the real choice is what to give up during one: consistency or availability.",
      sections: [
        {
          h: "CAP stated precisely",
          p: [
            "In a distributed system a network partition can always happen. When it does, you must choose:",
          ],
          ul: [
            "**Consistency (C):** every read sees the latest write, or an error (linearizability).",
            "**Availability (A):** every request to a working node gets a non-error response, possibly stale.",
          ],
          note: { kind: "info", text: "When there is no partition you can usually have both. PACELC extends CAP: if Partition then A or C, Else trade Latency vs Consistency. That second trade-off is the one you face every day." },
        },
        {
          h: "Consistency models, strongest to weakest",
          table: {
            head: ["Model", "Meaning", "Example"],
            rows: [
              ["Strong / linearizable", "Behaves like one copy, reads see the latest write", "Bank balance, inventory counters, locks"],
              ["Read-your-writes", "You see your own updates", "Profile edits"],
              ["Eventual", "Replicas converge if writes stop", "Like counts, feeds, DNS"],
            ],
          },
        },
        {
          h: "Quorums",
          p: [
            "With N replicas, a write waits for W acknowledgements and a read queries R replicas. If **R + W > N**, every read set overlaps every write set, so a read sees at least one replica with the latest acknowledged write.",
          ],
          ul: [
            "N=3, W=2, R=2: tolerates one failure on both paths. Balanced.",
            "W=N, R=1: fast reads, but one down node blocks writes.",
            "W=1, R=1: fastest, but stale reads are likely (eventual consistency).",
          ],
          note: { kind: "warn", text: "Quorum overlap is the core idea, but real systems add details (sloppy quorums, concurrent writes, clock skew) that can still produce anomalies. Treat R+W>N as necessary for strong-ish reads, not a full proof of linearizability." },
        },
        {
          h: "Try it",
          p: ["Choose N, W and R. Write a new version to W random replicas, then read from R random replicas. See how often a read is stale when R+W is not greater than N."],
          simSlot: true,
        },
        {
          h: "Choosing in practice",
          ul: [
            "Money, inventory, unique usernames: prefer consistency, accept errors or latency during failure.",
            "Feeds, likes, view counts, recommendations: prefer availability, accept staleness.",
            "You can mix: strong consistency for a small critical path, eventual for the rest.",
          ],
        },
      ],
      videos: [
        { t: "CAP theorem explained", q: "CAP theorem explained simply" },
        { t: "Consistency models and quorums", q: "quorum reads writes R + W > N explained" },
        { t: "Raft consensus visualised", q: "Raft consensus algorithm explained visual" },
      ],
      quiz: [
        {
          q: "During a network partition, a CP system will typically:",
          o: ["Return possibly stale data from every node", "Refuse or error some requests to stay consistent", "Ignore the partition", "Delete the minority side"],
          a: 1,
          why: "To avoid returning stale or conflicting data, nodes that cannot confirm they have the latest state reject the request.",
        },
        {
          q: "N=5. Which setting guarantees read and write sets overlap?",
          o: ["W=2, R=2", "W=1, R=4", "W=3, R=3", "W=2, R=3"],
          a: 2,
          why: "R + W must exceed N. 3+3 = 6 > 5. W=1,R=4 gives 5 which is not greater than 5; 2+3 = 5 is not greater either.",
        },
        {
          q: "Which data most clearly justifies strong consistency?",
          o: ["Video view count", "Bank account balance", "Recommendation scores", "Typing indicators"],
          a: 1,
          why: "Incorrect balances cause real harm; slightly stale view counts do not.",
        },
      ],
    },
    {
      id: "h7",
      track: "hld",
      title: "Message queues and async processing",
      min: 13,
      summary: "Decouple producers from consumers, absorb spikes, and learn what 'exactly once' really means.",
      key: "Queues turn a spike into a backlog. You trade immediacy for resilience and must make consumers idempotent.",
      sections: [
        {
          h: "Why queues",
          ul: [
            "**Decoupling:** the order service does not need the email service to be up.",
            "**Buffering:** absorb bursts, process at a steady rate.",
            "**Async work:** return to the user fast, do the heavy part (video encoding, emails) in the background.",
            "**Fan-out:** one event, many consumers (publish/subscribe).",
          ],
        },
        {
          h: "Queue vs log",
          table: {
            head: ["", "Traditional queue (e.g. RabbitMQ, SQS)", "Distributed log (e.g. Kafka)"],
            rows: [
              ["Message after consumption", "Removed", "Kept for a retention period, consumers track an offset"],
              ["Replay", "Not possible", "Yes, rewind the offset"],
              ["Ordering", "Per queue, limited with many consumers", "Per partition"],
              ["Typical use", "Task distribution, work queues", "Event streams, analytics, event sourcing"],
            ],
          },
        },
        {
          h: "Delivery guarantees",
          ul: [
            "**At-most-once:** may lose messages, never duplicates.",
            "**At-least-once:** never loses, may duplicate. The common default.",
            "**Exactly-once:** in practice achieved as at-least-once delivery plus **idempotent processing** (or transactional writes within one system).",
          ],
          code: {
            title: "Idempotent consumer",
            text: `void handlePaymentEvent(PaymentEvent event) {
    // event.id() is unique per business event
    if (processedStore.exists(event.id())) {
        return;                                // duplicate delivery: do nothing
    }

    db.inTransaction(() -> {
        applyPayment(event);
        processedStore.add(event.id());        // same transaction as the effect
    });
}`,
          },
        },
        {
          h: "Operational must-haves",
          ul: [
            "**Dead-letter queue (DLQ):** messages that keep failing go aside for inspection instead of blocking everyone.",
            "**Retries with backoff**, and a maximum.",
            "**Backpressure and monitoring:** watch queue depth and consumer lag. A growing backlog is your early warning.",
            "**Ordering:** if order matters per entity, use the entity ID as the partition key so its events go to one partition.",
          ],
        },
      ],
      videos: [
        { t: "Message queues explained", q: "message queues explained system design Kafka vs RabbitMQ" },
        { t: "Exactly once delivery", q: "exactly once delivery idempotency explained" },
      ],
      quiz: [
        {
          q: "A consumer may receive the same message twice. The right defence is:",
          o: ["Hope it never happens", "Make processing idempotent", "Disable retries entirely", "Use a bigger queue"],
          a: 1,
          why: "At-least-once delivery implies duplicates. Idempotent handlers make duplicates harmless.",
        },
        {
          q: "How do you keep all events for one order in sequence in a partitioned log?",
          o: ["Random partition key", "Use order ID as the partition key", "Use one consumer per message", "Sort in the browser"],
          a: 1,
          why: "Events with the same key go to the same partition, and order is preserved within a partition.",
        },
        {
          q: "A message fails processing 5 times. Best practice is to:",
          o: ["Retry forever", "Drop it silently", "Send it to a dead-letter queue", "Restart the database"],
          a: 2,
          why: "A DLQ isolates poison messages so they do not block the rest, and lets you inspect and replay them.",
        },
      ],
    },
    {
      id: "h8",
      track: "hld",
      title: "Rate limiting",
      min: 12,
      sim: "bucket",
      summary: "Protect your service from abuse and overload, and see why token bucket is the popular choice.",
      key: "Token bucket allows controlled bursts while enforcing a long-run average rate.",
      sections: [
        {
          h: "Why and where",
          p: [
            "Rate limits protect against abuse, runaway clients and cascading overload, and they enforce fair use and pricing tiers. Common places: API gateway, edge/CDN, or inside the service. Respond with HTTP `429 Too Many Requests` and a `Retry-After` header.",
          ],
        },
        {
          h: "Algorithms",
          table: {
            head: ["Algorithm", "Idea", "Note"],
            rows: [
              ["Token bucket", "Bucket holds up to B tokens, refills at R per second, each request takes one", "Allows bursts up to B. Very common"],
              ["Leaky bucket", "Requests queue and leave at a fixed rate", "Smooths output, no bursts"],
              ["Fixed window counter", "Count per minute window", "Simple. Can allow 2x the limit across a window boundary"],
              ["Sliding window log", "Store timestamps of requests", "Accurate, memory heavy"],
              ["Sliding window counter", "Weighted blend of current and previous window", "Good accuracy, low memory"],
            ],
          },
        },
        {
          h: "Try it",
          p: ["Send requests by hand or fire a burst. Raise capacity to allow bigger bursts, raise the refill rate to allow a higher sustained rate."],
          simSlot: true,
        },
        {
          h: "Code: token bucket",
          code: {
            title: "Java",
            text: `public class TokenBucket {
    private final double capacity;
    private final double refillPerSec;
    private double tokens;
    private long lastNanos;

    public TokenBucket(double capacity, double refillPerSec) {
        this.capacity = capacity;
        this.refillPerSec = refillPerSec;
        this.tokens = capacity;
        this.lastNanos = System.nanoTime();
    }

    public synchronized boolean allow() {       // check-and-update must be atomic
        long now = System.nanoTime();
        double elapsed = (now - lastNanos) / 1_000_000_000.0;
        tokens = Math.min(capacity, tokens + elapsed * refillPerSec);
        lastNanos = now;
        if (tokens >= 1) {
            tokens -= 1;
            return true;
        }
        return false;
    }
}`,
          },
        },
        {
          h: "Distributed limiting",
          ul: [
            "Keep counters in a shared fast store such as Redis, keyed by user, API key or IP.",
            "The read-modify-write must be atomic (a Lua script or atomic increment) or concurrent requests will race past the limit.",
            "Decide the failure mode: if the limiter store is down, fail open (allow) or fail closed (block)? Usually fail open for availability, closed for security-sensitive endpoints.",
          ],
        },
      ],
      videos: [
        { t: "Design a rate limiter", q: "design a rate limiter system design interview token bucket" },
        { t: "Rate limiting algorithms", q: "rate limiting algorithms sliding window token bucket leaky bucket" },
      ],
      quiz: [
        {
          q: "Which algorithm permits short bursts while enforcing an average rate?",
          o: ["Token bucket", "Leaky bucket", "Constant delay", "Round robin"],
          a: 0,
          why: "A full bucket allows a burst up to its capacity, after which requests are limited by the refill rate.",
        },
        {
          q: "What is the weakness of fixed window counters?",
          o: ["They use too much memory", "A burst at a window boundary can allow up to 2x the limit", "They cannot use Redis", "They are not deterministic"],
          a: 1,
          why: "A client can use the full quota at the end of one window and again at the start of the next.",
        },
        {
          q: "Why must a distributed rate limiter update counters atomically?",
          o: ["To save disk", "Concurrent requests could otherwise all read the same count and exceed the limit", "To avoid HTTP", "To compress keys"],
          a: 1,
          why: "Read-then-write races let parallel requests pass the check together.",
        },
      ],
    },
    {
      id: "h9",
      track: "hld",
      title: "API design",
      min: 12,
      summary: "Design interfaces that survive growth: resources, pagination, idempotency, errors and versioning.",
      key: "An API is a contract you cannot easily take back. Design for the client's next year, not their first day.",
      sections: [
        {
          h: "REST essentials",
          ul: [
            "Model **resources** as nouns: `GET /users/42/orders`, not `GET /getOrdersForUser`.",
            "Use methods meaningfully: GET reads (safe), POST creates, PUT replaces, PATCH partially updates, DELETE removes. PUT and DELETE should be idempotent.",
            "Use proper status codes: 200/201 success, 400 bad input, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict, 429 rate limited, 5xx server error.",
            "Return consistent error bodies with a machine-readable code and a human message.",
          ],
        },
        {
          h: "Pagination",
          table: {
            head: ["Style", "Example", "Notes"],
            rows: [
              ["Offset", "?limit=20&offset=40", "Simple. Slow on deep pages, items shift when data changes"],
              ["Cursor", "?limit=20&cursor=abc123", "Stable and fast. Preferred for feeds and large tables"],
            ],
          },
        },
        {
          h: "Idempotency keys for safe retries",
          p: ["Networks fail after the server did the work. If the client retries a payment, you must not charge twice. The client sends a unique `Idempotency-Key` header; the server stores the result under that key and returns it again on repeats."],
          code: {
            title: "Server sketch",
            text: `Response createPayment(Request request) {
    String key = request.header("Idempotency-Key");
    Response saved = store.get(key);
    if (saved != null) {
        return saved;                          // replay the original response
    }

    Response result = charge(request.body());
    store.put(key, result, Duration.ofHours(24));
    return result;
}`,
          },
        },
        {
          h: "Choosing a style",
          table: {
            head: ["Style", "Strength", "Cost"],
            rows: [
              ["REST/JSON", "Universal, cacheable, easy to debug", "Over/under-fetching, many round trips"],
              ["GraphQL", "Clients choose fields, one round trip", "Caching and rate-limiting are harder, query cost control needed"],
              ["gRPC", "Fast binary, typed contracts, streaming", "Less browser friendly, harder to inspect"],
            ],
          },
        },
        {
          h: "Evolving safely",
          ul: [
            "Adding optional fields is backward compatible. Removing or renaming is breaking.",
            "Version when you must (`/v2/...` or header), and keep old versions alive with a deprecation policy.",
            "Authenticate with standard mechanisms (OAuth 2.0 / OpenID Connect, API keys for server-to-server) instead of inventing your own.",
          ],
        },
      ],
      videos: [
        { t: "REST API design best practices", q: "REST API design best practices" },
        { t: "REST vs GraphQL vs gRPC", q: "REST vs GraphQL vs gRPC when to use" },
      ],
      quiz: [
        {
          q: "Why prefer cursor pagination for a large, changing feed?",
          o: ["It is easier to write", "It stays stable and fast as data changes", "It needs no database", "It is required by REST"],
          a: 1,
          why: "Offsets skip or repeat items when rows are inserted and get slower deep in the list. Cursors continue from a known position.",
        },
        {
          q: "A client times out calling POST /payments and retries. What prevents a double charge?",
          o: ["A bigger timeout", "An idempotency key", "Using GET instead", "HTTP/3"],
          a: 1,
          why: "The server recognises the repeated key and returns the stored outcome instead of charging again.",
        },
        {
          q: "Which change is backward compatible for existing clients?",
          o: ["Renaming a field", "Removing a field", "Adding a new optional field", "Changing a field type"],
          a: 2,
          why: "Well-behaved clients ignore unknown fields, so additions are safe. The others break existing consumers.",
        },
      ],
    },
    {
      id: "h10",
      track: "hld",
      title: "Reliability: retries, circuit breakers, microservices",
      min: 15,
      summary: "Everything fails. Build systems that bend: timeouts, backoff with jitter, circuit breakers and sane service boundaries.",
      key: "Failure is normal. Every remote call needs a timeout, a retry policy, and a plan for when the other side stays down.",
      sections: [
        {
          h: "The reliability toolkit",
          ul: [
            "**Timeouts:** never wait forever. Pick them from the dependency's real latency, with a total deadline for the whole request.",
            "**Retries with exponential backoff and jitter:** wait 100 ms, 200 ms, 400 ms... with randomness so clients do not retry in sync. Only retry idempotent operations.",
            "**Circuit breaker:** after repeated failures, stop calling the dependency for a while (open), then let a few trial calls through (half-open). This protects both sides.",
            "**Bulkheads:** isolate resource pools so one slow dependency cannot consume all threads.",
            "**Graceful degradation:** serve cached or partial content instead of an error page.",
          ],
          code: {
            title: "Retry with backoff and full jitter",
            text: `import java.util.concurrent.Callable;
import java.util.concurrent.ThreadLocalRandom;

static <T> T callWithRetry(Callable<T> fn, int attempts, double baseSec, double capSec) throws Exception {
    for (int i = 0; ; i++) {
        try {
            return fn.call();
        } catch (TransientException e) {
            if (i == attempts - 1) {
                throw e;                       // give up, surface the error
            }
            double delay = Math.min(capSec, baseSec * Math.pow(2, i));
            double sleep = ThreadLocalRandom.current().nextDouble(0, delay);   // jitter avoids retry storms
            Thread.sleep((long) (sleep * 1000));
        }
    }
}`,
          },
          note: { kind: "warn", text: "Retries multiply load. If every layer retries three times across three layers, one failing call becomes 27. Retry at one layer, and use budgets." },
        },
        {
          h: "Monolith vs microservices",
          table: {
            head: ["", "Modular monolith", "Microservices"],
            rows: [
              ["Deploy", "One unit", "Many independent units"],
              ["Team scaling", "Good for small teams", "Good when many teams need autonomy"],
              ["Data consistency", "Local transactions", "Eventual consistency, sagas"],
              ["Operations", "Simple", "Needs tracing, service discovery, deployment automation"],
              ["Failure modes", "Whole process", "Partial failures and network issues everywhere"],
            ],
          },
          p: [
            "A frequent piece of advice from experienced engineers: start with a well-structured modular monolith and split out a service only when there is a clear reason (independent scaling, team ownership, different release cadence).",
          ],
        },
        {
          h: "Observability",
          p: ["You cannot fix what you cannot see. Plan for the three pillars: logs, metrics, and distributed traces. Alert on user-facing symptoms such as error rate and latency percentiles (p95, p99), not just CPU."],
        },
      ],
      videos: [
        { t: "Circuit breaker pattern", q: "circuit breaker pattern explained microservices" },
        { t: "Monolith vs microservices", q: "monolith vs microservices when to choose which" },
        { t: "Exponential backoff and jitter", q: "exponential backoff and jitter explained" },
      ],
      quiz: [
        {
          q: "Why add jitter to exponential backoff?",
          o: ["To make retries slower", "To prevent many clients retrying at exactly the same moments", "To save memory", "To skip timeouts"],
          a: 1,
          why: "Without randomness, clients that failed together retry together and re-overload the recovering service.",
        },
        {
          q: "A circuit breaker in the 'open' state:",
          o: ["Sends all calls through", "Fails fast without calling the dependency", "Restarts the dependency", "Doubles the timeout"],
          a: 1,
          why: "Open means calls are rejected immediately, giving the dependency time to recover and saving your resources.",
        },
        {
          q: "What is a sensible default for a small new product team?",
          o: ["Twenty microservices on day one", "A modular monolith, extracted into services only when needed", "A single giant function", "A different language per team"],
          a: 1,
          why: "Microservices add network and operational costs. Earn them with a concrete need.",
        },
      ],
    },
    {
      id: "h11",
      track: "hld",
      title: "Case study: design a URL shortener",
      min: 20,
      summary: "Apply everything so far to one classic problem, end to end, with numbers.",
      key: "Reads vastly outnumber writes, the data is a simple key-value mapping, and the interesting part is generating unique short keys.",
      sections: [
        {
          h: "1. Requirements",
          ul: [
            "Functional: create a short URL from a long URL, redirect from short to long, optional custom alias and expiry.",
            "Non-functional: very low redirect latency, high availability, short links should not be guessable in order, links live for years.",
          ],
        },
        {
          h: "2. Estimation",
          ul: [
            "100 million new URLs per month is about 100M / 2.6M seconds, roughly 40 writes per second.",
            "Read-to-write ratio 100:1 gives about 4,000 redirects per second on average, peak maybe 10,000+.",
            "Storage: 5 years x 12 months x 100M = 6 billion records. At about 500 bytes each, around 3 TB. Easy for one sharded database; the data fits no problem, so the challenge is availability and latency, not size.",
            "Key length: base62 (a-z, A-Z, 0-9) with 7 characters gives 62^7, about 3.5 trillion combinations. More than enough for 6 billion.",
          ],
        },
        {
          h: "3. API and data model",
          code: {
            title: "API",
            text: `POST /v1/urls        { "long_url": "https://...", "alias": "optional", "expires_at": "optional" }
                     -> 201 { "short_url": "https://sho.rt/Ab3dE9x" }

GET  /{code}         -> 301 or 302 redirect to long_url (404 if unknown or expired)

-- Table (key-value access pattern)
urls(code PRIMARY KEY, long_url, created_at, expires_at, owner_id)`,
          },
        },
        {
          h: "4. Generating the short code",
          table: {
            head: ["Approach", "How", "Trade-off"],
            rows: [
              ["Hash and truncate", "Take first 7 chars of base62(hash(long_url))", "Collisions need checking and retry. Same URL gets same code"],
              ["Counter + base62", "Global incrementing ID encoded in base62", "No collisions, but sequential codes are guessable and the counter is a bottleneck"],
              ["Range allocation", "Each app server leases a block of IDs (e.g. 1M) from a coordinator", "Fast, no per-request coordination, still need to scramble or shuffle bits if guessability matters"],
              ["Random + uniqueness check", "Generate random 7 chars and insert if absent", "Simple and unguessable, retry on rare collision"],
            ],
          },
        },
        {
          h: "5. The redirect path",
          steps: [
            "Browser requests `GET /Ab3dE9x`.",
            "Edge/CDN or load balancer routes to a stateless redirect service.",
            "Look up the code in Redis. On a hit, return the redirect immediately.",
            "On a miss, read the database (replica), fill the cache with a TTL, redirect.",
          ],
          note: { kind: "tip", text: "301 (permanent) lets browsers cache the redirect, which cuts load but hides repeat clicks from your analytics. 302 (temporary) keeps every click visible. Pick based on whether analytics matter." },
        },
        {
          h: "6. Scaling and failure",
          ul: [
            "Cache the hot head of links; traffic follows a heavy-tailed distribution so a small cache absorbs most reads.",
            "Shard the table by code (hash). Replicate each shard for availability.",
            "Click analytics: publish click events to a queue and aggregate asynchronously so redirects never wait on analytics.",
            "Abuse: rate limit creation, scan targets for malware or phishing, allow link takedown.",
            "Expiry: lazy deletion on read plus a background cleaner.",
          ],
        },
      ],
      videos: [
        { t: "Design a URL shortener (walkthrough)", q: "design a URL shortener system design interview" },
        { t: "Design TinyURL", q: "design tinyurl bit.ly system design" },
      ],
      quiz: [
        {
          q: "How many 7-character base62 codes exist?",
          o: ["About 3.5 million", "About 3.5 billion", "About 3.5 trillion", "About 3.5 quadrillion"],
          a: 2,
          why: "62^7 = 3,521,614,606,208, about 3.5 trillion.",
        },
        {
          q: "Why might you choose 302 over 301 redirects?",
          o: ["302 is faster for browsers", "301 is deprecated", "302 is not cached, so every click reaches you for analytics", "302 is more secure"],
          a: 2,
          why: "Browsers cache permanent redirects, so later clicks skip your servers and never get counted.",
        },
        {
          q: "Which best describes this system's access pattern?",
          o: ["Write-heavy graph traversal", "Read-heavy key-value lookups", "Large file storage", "Complex multi-table joins"],
          a: 1,
          why: "The core operation is code to long URL lookup, repeated far more than creation. That favours caches and a key-value store.",
        },
      ],
    }
  );
})();
