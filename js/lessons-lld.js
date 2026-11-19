(function () {
  window.LESSONS.push(
    {
      id: "l1",
      track: "lld",
      title: "Complexity is the enemy: deep modules and good boundaries",
      min: 14,
      summary: "The single most recommended idea for LLD from experienced engineers: hide complexity behind simple interfaces.",
      key: "A good module has a small, simple interface and a powerful implementation behind it. Complexity that leaks to callers multiplies.",
      sections: [
        {
          h: "What makes software hard",
          p: [
            "John Ousterhout's *A Philosophy of Software Design*, which experienced developers on Reddit and Hacker News recommend again and again as a first design book, frames the whole job as managing **complexity**. Complexity shows up as three symptoms:",
          ],
          ul: [
            "**Change amplification:** a simple change needs edits in many places.",
            "**Cognitive load:** you must know a lot to make a safe change.",
            "**Unknown unknowns:** it is not obvious what you must touch or know.",
          ],
        },
        {
          h: "Deep vs shallow modules",
          p: ["Picture a module as a rectangle: the width is its interface, the area is its functionality. **Deep** modules give a lot of functionality through a small interface. **Shallow** modules have an interface nearly as complicated as what they do."],
          code: {
            title: "Shallow: caller must manage details",
            text: `class Uploader {
    void openConnection(String host, int port) { ... }
    void setRetryCount(int n) { ... }
    void setChunkSize(int bytes) { ... }
    void sendChunk(byte[] data) { ... }
    void close() { ... }
}

// every caller repeats the same careful dance
Uploader u = new Uploader();
u.openConnection(host, port);
u.setRetryCount(3);
u.setChunkSize(1_000_000);
for (byte[] chunk : chunks(data)) u.sendChunk(chunk);
u.close();`,
          },
          code2: {
            title: "Deep: one call, details hidden",
            text: `interface Storage {
    /** Durably store data. Handles chunking, retries and connections. */
    void save(String key, byte[] data);
}

storage.save("reports/q3.pdf", data);`,
          },
        },
        {
          h: "Principles to apply",
          ul: [
            "**Information hiding:** each module encapsulates a design decision (a format, an algorithm, a vendor). If the decision changes, only one module changes.",
            "**Define errors out of existence:** design operations so the error case is not an error. Deleting a missing file can simply succeed (the goal 'file does not exist' is already true).",
            "**Pull complexity downward:** it is better for the module's implementer to suffer than for every caller to.",
            "**Different layer, different abstraction:** if a layer just passes calls through, merge or remove it.",
            "**Strategic, not tactical:** spend a small, continuous investment (about 10 to 20 percent) on keeping design clean, instead of shipping the quickest hack every time.",
            "**Comments describe what code cannot:** intent, units, invariants, the why. Not a restatement of the code.",
            "**Names are design:** if you cannot name something clearly, it probably does two things.",
          ],
        },
        {
          h: "A test for boundaries",
          p: ["Ask of any boundary: 'If this decision changes, how many places must I edit?' The answer should be one. If it is five, you found a leaking decision. Pull it into one module."],
          note: { kind: "tip", text: "Read this book alongside lessons L2 to L6. Ousterhout gives you judgement; SOLID and patterns give you vocabulary." },
        },
      ],
      videos: [
        { t: "A Philosophy of Software Design (talk by the author)", q: "John Ousterhout A Philosophy of Software Design talk" },
        { t: "Deep modules explained", q: "deep modules vs shallow modules Ousterhout explained" },
      ],
      quiz: [
        {
          q: "Which describes a deep module?",
          o: ["Many methods exposing every detail", "A small interface hiding substantial functionality", "A class with deep inheritance", "A module with many dependencies"],
          a: 1,
          why: "Depth is about functionality relative to interface complexity. Simple to use, rich inside.",
        },
        {
          q: "'Change amplification' means:",
          o: ["Code that runs faster after edits", "A small change forces edits in many places", "Compiler warnings increase", "Tests get louder"],
          a: 1,
          why: "It is a symptom of a decision that is not encapsulated in one place.",
        },
        {
          q: "Deleting a file that does not exist succeeds quietly. This is an example of:",
          o: ["Premature optimisation", "Defining errors out of existence", "Tactical programming", "Shallow modules"],
          a: 1,
          why: "The caller wanted the file gone; it already is. Removing the error case simplifies every caller.",
        },
      ],
    },
    {
      id: "l2",
      track: "lld",
      title: "SOLID principles, with the caveats",
      min: 16,
      summary: "Five heuristics that keep classes changeable. Learn them as tools, including when not to use them.",
      key: "SOLID is a set of heuristics for change, not laws. Each one answers: what happens when requirement X changes?",
      sections: [
        {
          h: "The five in plain words",
          table: {
            head: ["Principle", "Meaning", "Smell it fixes"],
            rows: [
              ["S: Single Responsibility", "A class should have one reason to change (one stakeholder/concern)", "God classes mixing logic, persistence, formatting"],
              ["O: Open/Closed", "Add behaviour by adding code, not editing tested code", "Giant if/else or switch that grows with each feature"],
              ["L: Liskov Substitution", "A subtype must work anywhere its base type is expected", "Subclass throws 'not supported', or changes the contract"],
              ["I: Interface Segregation", "Prefer small, client-specific interfaces", "Implementers forced to stub methods they do not need"],
              ["D: Dependency Inversion", "High-level policy depends on abstractions, not concrete details", "Business logic hard-wired to a database or HTTP library"],
            ],
          },
        },
        {
          h: "S + O + D in one example",
          p: ["Before: one class computes totals, applies discount rules with a growing if/else, and talks to a database."],
          code: {
            title: "Before",
            text: `class OrderService {
    double checkout(Order order, String customerType) {
        double total = order.subtotal();
        if (customerType.equals("vip")) {
            total *= 0.8;
        } else if (customerType.equals("student")) {
            total *= 0.9;
        }
        // new customer type? edit this method again...
        mysql.execute("INSERT INTO orders ...", total);   // hard-wired detail
        return total;
    }
}`,
          },
          code2: {
            title: "After",
            text: `interface Discount {
    double apply(double total);
}

class NoDiscount implements Discount {
    public double apply(double total) { return total; }
}

class Percent implements Discount {
    private final double pct;
    Percent(double pct) { this.pct = pct; }
    public double apply(double total) { return total * (1 - pct / 100); }
}

interface OrderRepository {                  // abstraction owned by the domain
    void save(Order order, double total);
}

class OrderService {
    private final OrderRepository repo;

    OrderService(OrderRepository repo) {     // injected dependency (D)
        this.repo = repo;
    }

    double checkout(Order order, Discount discount) {   // new rules = new classes (O)
        double total = discount.apply(order.subtotal());
        repo.save(order, total);                        // persistence is separate (S)
        return total;
    }
}`,
          },
        },
        {
          h: "Liskov in one picture",
          p: [
            "A classic trap: make `Square` a subclass of `Rectangle`. Code that sets width and height independently breaks, because setting one side of a square silently changes the other. The subtype changed the behaviour callers rely on.",
            "Rule of thumb: if a subclass must weaken what callers can assume or strengthen what they must supply, it is not a true subtype. Prefer composition or separate types.",
          ],
        },
        {
          h: "Use with judgement",
          ul: [
            "Do not create an interface for every class. Extract an abstraction when you have a second implementation or a real need to isolate a boundary (I/O, time, randomness, third parties).",
            "Heed the 'rule of three': tolerate duplication twice, abstract on the third occurrence, when you can see the real shape.",
            "Too many tiny classes can be as bad as one giant one. Ousterhout's deep modules (previous lesson) are the counterweight.",
          ],
          note: { kind: "warn", text: "A common criticism of SOLID is that it gets applied mechanically. Always connect a principle to a concrete change you expect." },
        },
      ],
      videos: [
        { t: "SOLID principles explained with code", q: "SOLID principles explained with examples java" },
        { t: "ArjanCodes SOLID", q: "ArjanCodes SOLID principles" },
      ],
      quiz: [
        {
          q: "A growing if/elif chain over customer types is the classic smell for which principle?",
          o: ["Liskov Substitution", "Open/Closed", "Interface Segregation", "None, it is fine"],
          a: 1,
          why: "Each new type forces editing tested code. Polymorphism (strategy objects) lets you add behaviour without modifying existing code.",
        },
        {
          q: "A subclass overrides a method to raise 'not supported'. Which principle is violated?",
          o: ["Single Responsibility", "Liskov Substitution", "Dependency Inversion", "Open/Closed"],
          a: 1,
          why: "Callers expecting the base type's contract are surprised. The subclass is not substitutable.",
        },
        {
          q: "OrderService receives a repository interface in its constructor. This mainly applies:",
          o: ["Singleton", "Dependency Inversion (with injection)", "Template Method", "Interface Segregation"],
          a: 1,
          why: "The high-level service depends on an abstraction and gets the detail supplied from outside, which also makes testing easy.",
        },
      ],
    },
    {
      id: "l3",
      track: "lld",
      title: "Composition over inheritance and the Strategy pattern",
      min: 13,
      summary: "Why 'has-a' beats 'is-a' in most designs, and the pattern that makes swappable rules easy.",
      key: "Inheritance fixes behaviour at compile time in a hierarchy. Composition lets you assemble and swap behaviour at runtime.",
      sections: [
        {
          h: "The inheritance trap",
          p: [
            "Suppose `Bird` has `fly()`. Add `Penguin` and the hierarchy breaks. Add `RobotDuck` and `RubberDuck` and you are forced into a tangle of overrides. Each new axis of variation multiplies subclasses.",
            "Prefer **composition**: give an object a collaborator that provides the varying behaviour. Use inheritance for true is-a relationships with a stable contract, and often only through an interface.",
          ],
        },
        {
          h: "Strategy pattern",
          p: ["Define a family of algorithms behind an interface, make them interchangeable, and let the client choose one."],
          code: {
            title: "Shipping cost strategies",
            text: `interface ShippingStrategy {
    double cost(double weightKg, double distanceKm);
}

class Standard implements ShippingStrategy {
    public double cost(double weightKg, double distanceKm) {
        return 2.0 + 0.5 * weightKg;
    }
}

class Express implements ShippingStrategy {
    public double cost(double weightKg, double distanceKm) {
        return 8.0 + 0.9 * weightKg + 0.01 * distanceKm;
    }
}

class Order {
    private final double weightKg;
    private final double distanceKm;
    private ShippingStrategy shipping;          // composed, swappable

    Order(double weightKg, double distanceKm, ShippingStrategy shipping) {
        this.weightKg = weightKg;
        this.distanceKm = distanceKm;
        this.shipping = shipping;
    }

    void setShipping(ShippingStrategy shipping) { this.shipping = shipping; }

    double shippingCost() {
        return shipping.cost(weightKg, distanceKm);
    }
}

Order order = new Order(3, 120, new Express());
order.setShipping(new Standard());              // change behaviour at runtime`,
          },
        },
        {
          h: "In Java a lambda often replaces a small class",
          p: ["A strategy interface with a single method is a functional interface, so a lambda or method reference can stand in for a whole class. Use classes when the strategy has state or several methods."],
          code: {
            title: "Lambda as strategy",
            text: `// ShippingStrategy has a single method, so a lambda can replace a whole class
ShippingStrategy standard = (weight, dist) -> 2.0 + 0.5 * weight;
ShippingStrategy express  = (weight, dist) -> 8.0 + 0.9 * weight + 0.01 * dist;

double quote(double weight, double dist, ShippingStrategy strategy) {
    return strategy.cost(weight, dist);
}`,
          },
        },
        {
          h: "Where Strategy shows up in interviews",
          ul: [
            "Parking lot: spot allocation and fee calculation.",
            "Ride sharing: driver matching, surge pricing.",
            "Payments: card, wallet, bank transfer behind one interface.",
            "Sorting, compression, retry policies, caching eviction (LRU vs LFU).",
          ],
        },
      ],
      videos: [
        { t: "Strategy pattern", q: "strategy design pattern explained Christopher Okhravi" },
        { t: "Composition over inheritance", q: "composition over inheritance explained" },
      ],
      quiz: [
        {
          q: "You need discount rules that vary independently of order type. Best fit:",
          o: ["Subclass Order for every combination", "Inject a Discount strategy into Order", "Copy-paste code per rule", "A global variable"],
          a: 1,
          why: "Strategy keeps the variation separate, so combinations do not multiply subclasses.",
        },
        {
          q: "Which is the strongest reason to prefer composition?",
          o: ["It is shorter to type", "Behaviour can be changed at runtime and avoids rigid hierarchies", "It is required by Java", "It is faster to execute"],
          a: 1,
          why: "Collaborators can be swapped or combined freely, unlike a fixed class hierarchy.",
        },
        {
          q: "In Java, a simple stateless strategy can be:",
          o: ["Only a named top-level class", "A lambda or method reference", "A database table", "A checked exception"],
          a: 1,
          why: "A lambda satisfies a single-method interface with less code. Use classes when you need state.",
        },
      ],
    },
    {
      id: "l4",
      track: "lld",
      title: "Observer pattern and event-driven design",
      min: 11,
      sim: "observer",
      summary: "Let objects react to changes without the source knowing who is listening.",
      key: "The subject knows only an interface (Observer). Who listens, and how many, can change without touching the subject.",
      sections: [
        {
          h: "The idea",
          p: ["A **subject** keeps a list of **observers** and notifies them when its state changes. The subject depends only on the observer interface, so you can add a new listener (log, email, dashboard) without modifying the subject."],
        },
        {
          h: "Try it",
          p: ["Subscribe and unsubscribe the listeners, then publish a new temperature. Only subscribed listeners are notified."],
          simSlot: true,
        },
        {
          h: "Code",
          code: {
            title: "Java",
            text: `import java.util.ArrayList;
import java.util.List;

interface Observer {
    void update(double temperature);
}

class WeatherStation {
    private final List<Observer> observers = new ArrayList<>();
    private double temperature;

    void subscribe(Observer o)   { observers.add(o); }
    void unsubscribe(Observer o) { observers.remove(o); }

    void setTemperature(double t) {
        this.temperature = t;
        for (Observer o : new ArrayList<>(observers)) {   // copy: observers may unsubscribe while notified
            o.update(t);
        }
    }
}

class PhoneAlert implements Observer {
    public void update(double temperature) {
        if (temperature > 35) {
            System.out.println("Heat warning!");
        }
    }
}`,
          },
        },
        {
          h: "Gotchas",
          ul: [
            "**Memory leaks:** a forgotten subscription keeps the observer alive. Always unsubscribe, or use weak references.",
            "**Order and re-entrancy:** observers triggering further updates can cause loops or surprising order. Keep handlers small.",
            "**Failure isolation:** one observer throwing should not stop the others. Catch and log per observer.",
            "**Scale up:** across processes, the same idea becomes pub/sub with a message broker (see the queues lesson).",
          ],
        },
      ],
      videos: [
        { t: "Observer pattern", q: "observer design pattern explained" },
        { t: "Head First Design Patterns style observer", q: "observer pattern weather station example" },
      ],
      quiz: [
        {
          q: "What does the subject depend on in the Observer pattern?",
          o: ["Each concrete observer class", "Only the Observer interface", "A database", "The UI framework"],
          a: 1,
          why: "That is what keeps the subject decoupled: new observers need no changes to it.",
        },
        {
          q: "Why iterate over a copy of the observer list when notifying?",
          o: ["Speed", "An observer might unsubscribe during notification, mutating the list", "Java requires it", "To sort them"],
          a: 1,
          why: "Mutating a list while iterating over it skips elements or errors.",
        },
        {
          q: "A common source of leaks with observers is:",
          o: ["Too few observers", "Never unsubscribing, so the subject holds references forever", "Using interfaces", "Using functions"],
          a: 1,
          why: "The subject's list keeps observers alive even if nothing else uses them.",
        },
      ],
    },
    {
      id: "l5",
      track: "lld",
      title: "Creational patterns and dependency injection",
      min: 13,
      summary: "Factory, Builder, and why Singleton is a trap. Plus the simplest tool for testable code: injection.",
      key: "Separate creating objects from using them. Pass dependencies in instead of reaching out and grabbing them.",
      sections: [
        {
          h: "Factory",
          p: ["Centralise the decision of which concrete class to create so callers depend only on the abstraction."],
          code: {
            title: "Simple factory",
            text: `import java.util.Map;
import java.util.function.Supplier;

interface Notifier {
    void send(String to, String msg);
}

class Email implements Notifier {
    public void send(String to, String msg) { System.out.println("email " + to + " " + msg); }
}

class Sms implements Notifier {
    public void send(String to, String msg) { System.out.println("sms " + to + " " + msg); }
}

class NotifierFactory {
    private static final Map<String, Supplier<Notifier>> REGISTRY =
        Map.of("email", Email::new, "sms", Sms::new);

    static Notifier make(String kind) {
        Supplier<Notifier> maker = REGISTRY.get(kind);
        if (maker == null) {
            throw new IllegalArgumentException("unknown notifier: " + kind);
        }
        return maker.get();
    }
}`,
          },
        },
        {
          h: "Builder",
          p: ["Use when an object has many optional parameters or must be assembled in steps. It keeps construction readable and can validate before producing an immutable result. In Java it is very common (hand-written or generated), though a record or a couple of constructors is enough for small objects."],
        },
        {
          h: "Singleton: know why people warn you",
          p: [
            "A singleton guarantees one instance with global access. The global access is the problem: hidden dependencies, hard-to-test code and shared mutable state.",
            "If you need exactly one instance (a config, a connection pool), create it once at startup and **pass it in**. You get the single instance without the global.",
          ],
        },
        {
          h: "Dependency injection",
          code: {
            title: "Hard to test vs easy to test",
            text: `// Hard: reaches out and creates its own collaborators
class HardReporter {
    private final PostgresClient db = new PostgresClient("prod-host");
    private final Instant now = Instant.now();
}

// Easy: collaborators arrive from outside
class Reporter {
    private final Db db;
    private final Clock clock;

    Reporter(Db db, Clock clock) {
        this.db = db;
        this.clock = clock;
    }
}

// production: new Reporter(new PostgresClient("prod-host"), Clock.systemUTC())
// test:       new Reporter(new FakeDb(), Clock.fixed(Instant.parse("2026-01-01T00:00:00Z"), ZoneOffset.UTC))`,
          },
          note: { kind: "tip", text: "Inject the things that are slow, random, external or time-dependent: databases, HTTP, clocks, random numbers, file systems. You do not need a framework for this. Constructor arguments are DI." },
        },
      ],
      videos: [
        { t: "Factory pattern", q: "factory design pattern explained java" },
        { t: "Dependency injection explained", q: "dependency injection explained simply" },
        { t: "Why singletons are bad", q: "singleton pattern anti-pattern global state testing" },
      ],
      quiz: [
        {
          q: "Main practical downside of a classic Singleton?",
          o: ["It is slow", "Hidden global state that makes code hard to test", "It needs reflection", "It cannot be thread-safe"],
          a: 1,
          why: "Code that quietly depends on a global is hard to isolate and substitute in tests.",
        },
        {
          q: "The best way to make a class using the current time testable is to:",
          o: ["Sleep in tests", "Inject a clock dependency", "Make time a Singleton", "Skip testing it"],
          a: 1,
          why: "A fake clock gives deterministic tests.",
        },
        {
          q: "A Factory is most useful when:",
          o: ["There is exactly one class", "Callers should not care which concrete class is created", "You want global access", "You need faster code"],
          a: 1,
          why: "The factory hides the concrete choice behind an abstraction.",
        },
      ],
    },
    {
      id: "l6",
      track: "lld",
      title: "More patterns you will actually use",
      min: 15,
      summary: "Decorator, Adapter, Facade, State, Command and friends, each in one sentence, with when to reach for it.",
      key: "Learn patterns as answers to recurring problems. Recognise the problem first, then the pattern name follows.",
      sections: [
        {
          h: "Quick reference",
          table: {
            head: ["Pattern", "Problem it solves", "Example"],
            rows: [
              ["Decorator", "Add behaviour to an object without subclassing", "Wrap a repository with caching or logging"],
              ["Adapter", "Make an incompatible interface fit the one you expect", "Wrap a third-party payment SDK behind your PaymentGateway"],
              ["Facade", "One simple entry point to a complex subsystem", "A VideoConverter.convert(file) hiding codecs and containers"],
              ["State", "Behaviour changes with internal state, avoiding giant switches", "Vending machine, order lifecycle, traffic light"],
              ["Command", "Turn a request into an object (undo, queue, log)", "Editor actions, job queue tasks"],
              ["Template Method", "Fixed algorithm skeleton, subclasses fill steps", "Data importers with parse and validate steps"],
              ["Chain of Responsibility", "Pass a request along handlers until one handles it", "Middleware, approval workflows"],
              ["Proxy", "Stand-in that controls access", "Lazy loading, access checks, remote calls"],
            ],
          },
        },
        {
          h: "Decorator",
          code: {
            title: "Wrap to add caching",
            text: `import java.util.HashMap;
import java.util.Map;

interface UserRepo {
    User get(String userId);
}

class DbUserRepo implements UserRepo {
    public User get(String userId) {
        return db.queryUser(userId);
    }
}

class CachedUserRepo implements UserRepo {   // same interface, adds behaviour
    private final UserRepo inner;
    private final Map<String, User> cache = new HashMap<>();

    CachedUserRepo(UserRepo inner) { this.inner = inner; }

    public User get(String userId) {
        return cache.computeIfAbsent(userId, inner::get);
    }
}

UserRepo repo = new CachedUserRepo(new DbUserRepo());   // stack as many wrappers as needed`,
          },
        },
        {
          h: "State",
          code: {
            title: "Vending machine states as objects",
            text: `interface State {
    void insertCoin(Machine m);
    void select(Machine m, String item);
}

class Idle implements State {
    public void insertCoin(Machine m) { m.setState(new HasCoin()); }
    public void select(Machine m, String item) { System.out.println("Insert a coin first"); }
}

class HasCoin implements State {
    public void insertCoin(Machine m) { System.out.println("Already paid"); }
    public void select(Machine m, String item) {
        m.dispense(item);
        m.setState(new Idle());
    }
}

class Machine {
    private State state = new Idle();

    void setState(State s) { this.state = s; }
    void insertCoin() { state.insertCoin(this); }
    void select(String item) { state.select(this, item); }
    void dispense(String item) { System.out.println("Dispensing " + item); }
}`,
          },
          note: { kind: "info", text: "For a handful of states, a simple enum and a dictionary of allowed transitions is often clearer than classes. Pick the lighter tool when it is enough." },
        },
        {
          h: "Pattern hygiene",
          ul: [
            "Name the problem, then the pattern. 'Behaviour depends on state' leads to State.",
            "A pattern with only one implementation and no expected variation is probably over-engineering.",
            "Patterns are communication. Saying 'it is a decorator' tells a teammate the shape instantly.",
          ],
        },
      ],
      videos: [
        { t: "Design patterns playlist (Christopher Okhravi)", q: "Christopher Okhravi design patterns playlist" },
        { t: "Refactoring Guru patterns", q: "decorator adapter facade patterns explained" },
        { t: "State pattern", q: "state design pattern vending machine explained" },
      ],
      quiz: [
        {
          q: "A third-party SDK has a different method signature than your interface. Use:",
          o: ["Decorator", "Adapter", "Observer", "State"],
          a: 1,
          why: "Adapter translates one interface to another so your code stays unchanged.",
        },
        {
          q: "You want to add logging to many repositories without changing them or subclassing each. Use:",
          o: ["Decorator", "Singleton", "Builder", "Template Method"],
          a: 0,
          why: "Wrapping with the same interface layers behaviour on without modification.",
        },
        {
          q: "An order behaves differently as New, Paid, Shipped, Cancelled. A natural fit is:",
          o: ["State", "Factory", "Facade", "Proxy"],
          a: 0,
          why: "Behaviour depends on the current state and transitions between states.",
        },
      ],
    },
    {
      id: "l7",
      track: "lld",
      title: "Worked LLD: design a parking lot",
      min: 25,
      summary: "A complete walk-through of the process, from requirements to code, and how the design flexes with a new requirement.",
      key: "Start with entities and responsibilities. Put the rules most likely to change (allocation, pricing) behind interfaces. Keep everything else simple.",
      sections: [
        {
          h: "1. Requirements (ask these out loud)",
          ul: [
            "Vehicle types? Motorcycle, car, truck. Spot sizes? Small, medium, large.",
            "Can a smaller vehicle use a bigger spot? Yes, never the reverse.",
            "Multiple floors and entrances? Assume multiple levels, treat the lot as one pool.",
            "Pricing? Hourly, rounded up. Might change later.",
            "Out of scope: payments processing, physical gate hardware.",
          ],
        },
        {
          h: "2. Nouns, verbs, responsibilities",
          table: {
            head: ["Class", "Responsibility"],
            rows: [
              ["Vehicle", "Knows its plate and the smallest spot size it needs"],
              ["Spot", "Knows its size and occupant, answers 'can this vehicle fit?'"],
              ["Ticket", "Record of entry: vehicle, spot, entry time"],
              ["SpotAllocator (interface)", "Chooses a spot. Strategies: first-fit, best-fit, nearest-to-entrance"],
              ["FeePolicy (interface)", "Computes the price from a ticket and exit time"],
              ["ParkingLot", "Coordinates: park(vehicle) and leave(ticketId). Owns the active tickets"],
            ],
          },
        },
        {
          h: "3. The code",
          code: {
            title: "Java",
            text: `import java.util.*;
import java.util.function.LongSupplier;

enum Size { SMALL, MEDIUM, LARGE }           // smallest spot a vehicle fits in

record Vehicle(String plate, Size size) {}

class Spot {
    final String id;
    final Size size;
    Vehicle vehicle;

    Spot(String id, Size size) { this.id = id; this.size = size; }

    boolean fits(Vehicle v) {
        return vehicle == null && size.ordinal() >= v.size().ordinal();
    }
}

record Ticket(String id, Vehicle vehicle, Spot spot, long entryMillis) {}

class LotFullException extends RuntimeException {
    LotFullException(String plate) { super("lot full for " + plate); }
}

class UnknownTicketException extends RuntimeException {
    UnknownTicketException(String id) { super("unknown ticket " + id); }
}

interface SpotAllocator {
    Optional<Spot> pick(List<Spot> spots, Vehicle vehicle);
}

class FirstFit implements SpotAllocator {
    public Optional<Spot> pick(List<Spot> spots, Vehicle vehicle) {
        return spots.stream().filter(s -> s.fits(vehicle)).findFirst();
    }
}

class BestFit implements SpotAllocator {      // smallest spot that fits, saves big spots
    public Optional<Spot> pick(List<Spot> spots, Vehicle vehicle) {
        return spots.stream()
                    .filter(s -> s.fits(vehicle))
                    .min(Comparator.comparingInt(s -> s.size.ordinal()));
    }
}

interface FeePolicy {
    long fee(Ticket ticket, long exitMillis);
}

class HourlyFee implements FeePolicy {
    private final long ratePerHour;

    HourlyFee(long ratePerHour) { this.ratePerHour = ratePerHour; }

    public long fee(Ticket ticket, long exitMillis) {
        long ms = exitMillis - ticket.entryMillis();
        long hours = Math.max(1, (ms + 3_599_999) / 3_600_000);   // round up to whole hours
        return hours * ratePerHour;
    }
}

class ParkingLot {
    private final List<Spot> spots;
    private final SpotAllocator allocator;
    private final FeePolicy feePolicy;
    private final LongSupplier clock;             // injected, so tests can control time
    private final Map<String, Ticket> active = new HashMap<>();

    ParkingLot(List<Spot> spots, SpotAllocator allocator, FeePolicy feePolicy, LongSupplier clock) {
        this.spots = spots;
        this.allocator = allocator;
        this.feePolicy = feePolicy;
        this.clock = clock;
    }

    ParkingLot(List<Spot> spots, SpotAllocator allocator, FeePolicy feePolicy) {
        this(spots, allocator, feePolicy, System::currentTimeMillis);
    }

    Ticket park(Vehicle vehicle) {
        Spot spot = allocator.pick(spots, vehicle)
                             .orElseThrow(() -> new LotFullException(vehicle.plate()));
        spot.vehicle = vehicle;
        Ticket ticket = new Ticket(UUID.randomUUID().toString(), vehicle, spot, clock.getAsLong());
        active.put(ticket.id(), ticket);
        return ticket;
    }

    long leave(String ticketId) {
        Ticket ticket = active.remove(ticketId);
        if (ticket == null) {
            throw new UnknownTicketException(ticketId);
        }
        ticket.spot().vehicle = null;
        return feePolicy.fee(ticket, clock.getAsLong());
    }
}`,
          },
        },
        {
          h: "4. Prove the design bends",
          p: ["Interviewers often add a requirement. Walk through how your design absorbs it:"],
          ul: [
            "**Weekend flat rate:** new `FeePolicy` class. No other code changes. (Open/Closed)",
            "**Reserve spots near the entrance for EVs:** add `kind` to `Spot`, new `EvAllocator`. `ParkingLot` unchanged.",
            "**Tests:** inject a fake `clock` and the fee logic is deterministic without sleeping.",
            "**Concurrency:** two cars arriving together could get the same spot. Protect `park` with a lock (see the concurrency lesson).",
          ],
          note: { kind: "tip", text: "Do not draw 15 classes in the first five minutes. Start with the smallest model that handles the main flow and grow it when asked." },
        },
      ],
      videos: [
        { t: "Parking lot LLD walkthrough", q: "parking lot low level design object oriented design interview" },
        { t: "LLD interview approach", q: "low level design interview approach classes relationships" },
      ],
      quiz: [
        {
          q: "Why is FeePolicy an interface?",
          o: ["Java requires it", "Pricing rules are likely to change independently", "It makes code slower", "It enables inheritance from Vehicle"],
          a: 1,
          why: "Pricing varies by business decisions. Isolating it lets you add rules without touching the lot.",
        },
        {
          q: "The ParkingLot takes `clock` as a parameter. Why?",
          o: ["Java needs it", "So tests can control time deterministically", "To support time zones only", "To make it thread-safe"],
          a: 1,
          why: "Injecting time removes a hidden dependency and lets tests simulate hours passing instantly.",
        },
        {
          q: "BestFit vs FirstFit: BestFit's advantage is:",
          o: ["It always runs faster", "It keeps larger spots free for larger vehicles", "It needs no loop", "It avoids tickets"],
          a: 1,
          why: "Choosing the smallest sufficient spot reduces fragmentation of large spots.",
        },
      ],
    },
    {
      id: "l8",
      track: "lld",
      title: "Concurrency in object design",
      min: 14,
      summary: "Race conditions, locks, deadlocks and the safest habit of all: immutability.",
      key: "Check-then-act on shared state is a bug unless it is atomic. The simplest fix is to share less.",
      sections: [
        {
          h: "The classic race",
          p: ["Two users book the last seat at the same moment. Both check 'is it free?', both see yes, both book. That is a **race condition**: the outcome depends on timing."],
          code: {
            title: "Broken, then fixed",
            text: `import java.util.HashSet;
import java.util.Set;

class SeatMap {
    private final Set<String> taken = new HashSet<>();

    boolean bookUnsafe(String seat) {
        if (!taken.contains(seat)) {       // check
            taken.add(seat);               // act  <- another thread can slip in between
            return true;
        }
        return false;
    }

    synchronized boolean book(String seat) {   // check and act are now one atomic step
        if (taken.contains(seat)) {
            return false;
        }
        taken.add(seat);
        return true;
    }
}`,
          },
        },
        {
          h: "Tools",
          ul: [
            "**Mutex / lock:** one thread at a time in a critical section. Keep it short.",
            "**Atomic operations:** counters and flags without a lock where the platform provides them.",
            "**Thread-safe queues:** producer-consumer without hand-written locking (`queue.Queue`).",
            "**Immutability:** objects that never change need no locks. Prefer them for values, messages and configuration.",
            "**Database-level concurrency:** transactions, unique constraints and optimistic locking (version numbers) for state shared across processes.",
          ],
        },
        {
          h: "Deadlock",
          p: ["Thread A holds lock 1 and waits for lock 2, while thread B holds lock 2 and waits for lock 1. Neither proceeds. The standard cure is a **global lock ordering**."],
          code: {
            title: "Transfer money without deadlock",
            text: `void transfer(Account src, Account dst, long amount) {
    Account first  = src.id < dst.id ? src : dst;     // always lock the lowest id first
    Account second = src.id < dst.id ? dst : src;
    synchronized (first) {
        synchronized (second) {
            if (src.balance < amount) {
                throw new IllegalStateException("insufficient funds");
            }
            src.balance -= amount;
            dst.balance += amount;
        }
    }
}`,
          },
        },
        {
          h: "Design habits",
          ul: [
            "Decide at design time which objects are shared across threads, and say so in comments.",
            "Never call unknown code (callbacks, observers) while holding a lock.",
            "Prefer message passing and single-owner data over shared mutable state.",
            "Test with stress loops, but remember tests cannot prove the absence of races. Reasoning and simple designs do.",
          ],
          note: { kind: "info", text: "A thread-safe collection does not make check-then-act safe: `if (!set.contains(x)) set.add(x)` is still a race even on a synchronized set. Make the whole step atomic with a lock, or use one atomic call such as `putIfAbsent`, `computeIfAbsent`, or the boolean returned by `add`." },
        },
      ],
      videos: [
        { t: "Race conditions and locks", q: "race condition mutex deadlock explained" },
        { t: "Concurrency for designers", q: "concurrency basics threads locks object oriented design interview" },
      ],
      quiz: [
        {
          q: "What makes `if (!taken.contains(seat)) taken.add(seat);` unsafe?",
          o: ["Sets are slow", "Another thread can run between the check and the add", "Java forbids it", "It uses too much memory"],
          a: 1,
          why: "It is check-then-act without atomicity. Both threads can pass the check.",
        },
        {
          q: "How does consistent lock ordering prevent deadlock?",
          o: ["It makes locks faster", "No circular wait can form when everyone acquires locks in the same order", "It removes the need for locks", "It uses fewer threads"],
          a: 1,
          why: "Deadlock needs a cycle of waiting. A global order makes cycles impossible.",
        },
        {
          q: "Which object needs no locking when shared between threads?",
          o: ["A mutable counter", "An immutable value object", "A list being appended to", "A file handle"],
          a: 1,
          why: "If it can never change, there is nothing to race on.",
        },
      ],
    },
    {
      id: "l9",
      track: "lld",
      title: "Clean code, refactoring and testing as design tools",
      min: 14,
      summary: "How good design actually happens in real codebases: small safe steps, tests as a safety net, and resisting speculation.",
      key: "You rarely design it right up front. You keep the design healthy by refactoring in small steps under test.",
      sections: [
        {
          h: "Recognise smells",
          table: {
            head: ["Smell", "Symptom", "Typical fix"],
            rows: [
              ["Long method", "Scrolls for pages, many levels of nesting", "Extract method, name the steps"],
              ["Feature envy", "Method uses another object's data more than its own", "Move it to that object"],
              ["Primitive obsession", "Strings and ints everywhere for money, emails, IDs", "Small value classes (Money, EmailAddress)"],
              ["Shotgun surgery", "One change touches many files", "Gather the scattered decision into one module"],
              ["Duplicate logic", "Same rule copy-pasted", "Extract, but wait for the third copy (rule of three)"],
              ["Speculative generality", "Abstractions for requirements nobody has", "Delete them (YAGNI)"],
            ],
          },
        },
        {
          h: "Refactor safely",
          steps: [
            "Make sure behaviour is covered by tests (add characterisation tests if not).",
            "Change structure in tiny steps, running tests after each.",
            "Commit often. Separate refactoring commits from behaviour changes.",
            "Stop when the next feature is easy. You are not building a monument.",
          ],
          code: {
            title: "Primitive obsession to a value object",
            text: `// Before: easy to mix up, validation scattered
void charge(double amount, String currency) { ... }
charge(19.99, "USD");

// After: the type carries the rules
record Money(long cents, String currency) {
    Money {                                   // compact constructor validates
        if (cents < 0) {
            throw new IllegalArgumentException("negative money");
        }
    }

    Money add(Money other) {
        if (!other.currency.equals(currency)) {
            throw new IllegalArgumentException("currency mismatch");
        }
        return new Money(cents + other.cents, currency);
    }
}`,
          },
        },
        {
          h: "Tests that support design",
          ul: [
            "Test behaviour through the public interface. If tests break on every refactor, they are coupled to internals.",
            "If something is hard to test, the design is telling you it has hidden dependencies. Inject them.",
            "Use fakes for slow or random boundaries, but keep a few end-to-end tests for confidence.",
            "A good unit test names the scenario and the expectation, and reads like a specification.",
          ],
        },
        {
          h: "Resist the urge to over-design",
          ul: [
            "**YAGNI:** do not build for imagined needs.",
            "**Rule of three:** abstract after seeing the pattern three times.",
            "**Make the change easy, then make the easy change** (a well-known maxim from Kent Beck).",
            "Duplication is cheaper than the wrong abstraction.",
          ],
        },
      ],
      videos: [
        { t: "Refactoring and code smells", q: "refactoring code smells examples Martin Fowler" },
        { t: "Writing testable code", q: "writing testable code dependency injection unit tests" },
        { t: "Clean code critique", q: "clean code pros and cons discussion" },
      ],
      quiz: [
        {
          q: "Strings used for email addresses and money all over the code illustrate:",
          o: ["Feature envy", "Primitive obsession", "Shotgun surgery", "Dead code"],
          a: 1,
          why: "A small value type centralises validation and prevents mix-ups.",
        },
        {
          q: "The first step before refactoring risky code is:",
          o: ["Rewrite from scratch", "Make sure tests cover current behaviour", "Rename the repo", "Add more abstractions"],
          a: 1,
          why: "Tests are the safety net that makes small structural changes low-risk.",
        },
        {
          q: "The 'rule of three' says to:",
          o: ["Write three classes per feature", "Tolerate duplication until the third occurrence reveals the right abstraction", "Use three layers always", "Have three reviewers"],
          a: 1,
          why: "Premature abstraction guesses the shape. Waiting gives evidence.",
        },
      ],
    }
  );
})();
