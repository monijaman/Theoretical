# Design Patterns for Beginners — 22 Patterns You Can Actually Remember

> A design pattern is just a **named, reusable answer to a problem that keeps showing up** in code.
> You already use some of them without knowing their names. This tutorial gives you the names.

**How this tutorial works:** every pattern gets the same 5 things, so your brain can file them the same way.

| Part | What it is |
|---|---|
| 🧠 **One line** | The whole idea in one sentence |
| 🌍 **Real life** | Something you already know from daily life |
| 💻 **Code** | The smallest JavaScript example that still makes the point |
| 📌 **Remember it as** | A hook so the name sticks |
| ✅ **Use it when** | The situation that should make you think of it |

Examples use plain JavaScript (ES6 classes) — no framework, no TypeScript, nothing to install. Paste any snippet into a browser console or `node` and it runs.

---

## The Big Picture: 3 Families

All 22 patterns fall into just **three families**. Learn the families first — then every pattern has a home.

| Family | The question it answers | Count | Mnemonic |
|---|---|---|---|
| 🏭 **Creational** | *"How do I **make** objects?"* | 5 | **F**resh **A**pples **B**ring **P**erfect **S**miles |
| 🧱 **Structural** | *"How do I **connect** objects?"* | 7 | **A** **B**ig **C**at **D**anced **F**or **F**ree **P**izza |
| 🗣️ **Behavioral** | *"How do objects **talk** to each other?"* | 10 | **C**ats **C**an **I**nstantly **M**ake **M**any **O**wners **S**mile, **S**o **T**ry **V**isiting |

```
🏭 Creational  → Factory Method · Abstract Factory · Builder · Prototype · Singleton
🧱 Structural  → Adapter · Bridge · Composite · Decorator · Facade · Flyweight · Proxy
🗣️ Behavioral  → Chain of Responsibility · Command · Iterator · Mediator · Memento
                 Observer · State · Strategy · Template Method · Visitor
```

**5 + 7 + 10 = 22.**

---

## Table of Contents

**🏭 Creational — making objects**
1. [Factory Method](#1-factory-method)
2. [Abstract Factory](#2-abstract-factory)
3. [Builder](#3-builder)
4. [Prototype](#4-prototype)
5. [Singleton](#5-singleton)

**🧱 Structural — connecting objects**
6. [Adapter](#6-adapter)
7. [Bridge](#7-bridge)
8. [Composite](#8-composite)
9. [Decorator](#9-decorator)
10. [Facade](#10-facade)
11. [Flyweight](#11-flyweight)
12. [Proxy](#12-proxy)

**🗣️ Behavioral — objects talking**
13. [Chain of Responsibility](#13-chain-of-responsibility)
14. [Command](#14-command)
15. [Iterator](#15-iterator)
16. [Mediator](#16-mediator)
17. [Memento](#17-memento)
18. [Observer](#18-observer)
19. [State](#19-state)
20. [Strategy](#20-strategy)
21. [Template Method](#21-template-method)
22. [Visitor](#22-visitor)

**Wrap-up**
- [Patterns that look alike (and how to tell them apart)](#patterns-that-look-alike)
- [The one-page cheat sheet](#the-one-page-cheat-sheet)
- [Which pattern do I need?](#which-pattern-do-i-need)

---

# 🏭 Creational Patterns — *"How do I make objects?"*

Normally you write `new Something()`. These 5 patterns are for when plain `new` isn't good enough — because the creation is complicated, or you don't know the exact class yet, or you need exactly one instance.

> 🎵 **F**resh **A**pples **B**ring **P**erfect **S**miles → **F**actory Method · **A**bstract Factory · **B**uilder · **P**rototype · **S**ingleton

---

## 1. Factory Method

🧠 **One line:** Instead of calling `new` yourself, ask a function to make the object for you — and let it decide *which* kind.

🌍 **Real life:** You order "a coffee" at a café. You don't walk behind the counter and build it. The barista (the factory) decides whether that's an espresso machine job or a pour-over job.

💻 **Code:**

```javascript
class Email { send(msg) { console.log(`📧 Email: ${msg}`); } }
class SMS   { send(msg) { console.log(`📱 SMS: ${msg}`); } }

// The factory — the ONLY place that knows about the concrete classes
function createNotifier(type) {
  if (type === "email") return new Email();
  if (type === "sms")   return new SMS();
  throw new Error("Unknown type");
}

// The rest of the app never says "new Email()" — it just asks the factory
const notifier = createNotifier("sms");
notifier.send("Your order shipped!");   // 📱 SMS: Your order shipped!
```

Adding a `Push` notifier later = one new class + one new line in the factory. Nothing else changes.

📌 **Remember it as:** *"Don't `new` it — ask the factory."*

✅ **Use it when:** you have several similar classes and the code that uses them shouldn't care which one it gets.

---

## 2. Abstract Factory

🧠 **One line:** A factory that makes a whole **family** of matching objects, so you never mix pieces from different sets.

🌍 **Real life:** An IKEA furniture *series*. Buy from the "HEMNES" series and the bed, nightstand and dresser all match. You don't pick each piece separately and hope they go together.

💻 **Code:**

```javascript
// Two families of UI: Light and Dark. Each family has a Button and a Checkbox.
const LightTheme = {
  createButton:   () => ({ render: () => "⬜ light button" }),
  createCheckbox: () => ({ render: () => "☐ light checkbox" }),
};

const DarkTheme = {
  createButton:   () => ({ render: () => "⬛ dark button" }),
  createCheckbox: () => ({ render: () => "☑ dark checkbox" }),
};

// Pick ONE factory, and everything it makes matches
function buildForm(theme) {
  console.log(theme.createButton().render());
  console.log(theme.createCheckbox().render());
}

buildForm(DarkTheme);
// ⬛ dark button
// ☑ dark checkbox
```

📌 **Remember it as:** *"A factory of factories — one pick, everything matches."*

✅ **Use it when:** you have product **families** (themes, OS-specific widgets, database drivers) and mixing them would be a bug.

> 🤔 **Factory Method vs Abstract Factory:** Factory Method makes **one** thing. Abstract Factory makes a **matching set** of things.

---

## 3. Builder

🧠 **One line:** Build a complex object **step by step**, instead of one giant constructor with 12 arguments.

🌍 **Real life:** Ordering at Subway. "Wheat bread… turkey… add lettuce… add tomato… no onions… done." You build the sandwich one choice at a time, and skip what you don't want.

💻 **Code:**

```javascript
class BurgerBuilder {
  constructor() { this.parts = []; }

  bun(type)     { this.parts.push(`${type} bun`); return this; }   // return this
  patty(kind)   { this.parts.push(`${kind} patty`); return this; } // makes chaining
  cheese()      { this.parts.push("cheese");       return this; } // possible
  lettuce()     { this.parts.push("lettuce");      return this; }

  build() { return `🍔 Burger with: ${this.parts.join(", ")}`; }
}

const burger = new BurgerBuilder()
  .bun("sesame")
  .patty("beef")
  .cheese()
  .build();        // no lettuce — just skip the step

console.log(burger); // 🍔 Burger with: sesame bun, beef patty, cheese
```

Compare with the alternative: `new Burger("sesame", "beef", true, false, false, null, ...)` — what does that 4th `false` mean? Nobody knows.

📌 **Remember it as:** *"Chain the steps, then `.build()`."*

✅ **Use it when:** an object has many optional parts, or constructors are getting long and confusing.

---

## 4. Prototype

🧠 **One line:** Make a new object by **copying an existing one**, instead of building from scratch.

🌍 **Real life:** Photocopying a filled-out form and just changing the name, instead of re-writing the whole form every time.

💻 **Code:**

```javascript
const defaultCharacter = {
  hp: 100,
  speed: 5,
  inventory: ["sword", "potion"],
  clone() {
    // deep copy so the clone's inventory is its own array
    return structuredClone({ ...this, clone: undefined }) && { ...this, inventory: [...this.inventory] };
  },
};

const hero = defaultCharacter.clone();
hero.hp = 150;                     // customise the copy
hero.inventory.push("shield");

console.log(defaultCharacter.hp);         // 100  ← original untouched
console.log(defaultCharacter.inventory);  // ["sword", "potion"]
console.log(hero.inventory);              // ["sword", "potion", "shield"]
```

JavaScript is built on prototypes — `Object.create(obj)` is literally this pattern in one line.

📌 **Remember it as:** *"Copy-paste an object, then tweak it."*

✅ **Use it when:** creating an object is expensive (heavy setup, database calls) or you need many objects that are almost the same.

---

## 5. Singleton

🧠 **One line:** Make sure a class has **only one instance**, and give everyone a way to reach it.

🌍 **Real life:** A country has one president. Anyone who asks "who's the president?" gets the same person — you can't create a second one.

💻 **Code:**

```javascript
class AppConfig {
  constructor() {
    if (AppConfig.instance) return AppConfig.instance; // already exists? hand it back
    this.theme = "dark";
    AppConfig.instance = this;                          // remember the first one
  }
}

const a = new AppConfig();
const b = new AppConfig();

a.theme = "light";
console.log(b.theme);   // "light" — b IS a
console.log(a === b);   // true
```

⚠️ **Warning label:** Singleton is the most *overused* pattern. It's global state in disguise, which makes testing painful. Use it for genuinely shared things (config, logger, connection pool) — not as a shortcut to avoid passing arguments.

📌 **Remember it as:** *"Single = only one, ever."*

✅ **Use it when:** having two instances would actually be a bug (two database pools, two loggers writing to the same file).

---

# 🧱 Structural Patterns — *"How do I connect objects?"*

These 7 patterns are about **plugging objects together** — making incompatible things fit, wrapping things to add features, or hiding messy internals behind a clean front.

> 🎵 **A** **B**ig **C**at **D**anced **F**or **F**ree **P**izza → **A**dapter · **B**ridge · **C**omposite · **D**ecorator · **F**acade · **F**lyweight · **P**roxy

---

## 6. Adapter

🧠 **One line:** A wrapper that makes an object with the **wrong interface** look like it has the **right one**.

🌍 **Real life:** A travel power adapter. Your laptop plug is US-shaped, the wall is EU-shaped. The adapter sits in between — neither the plug nor the wall had to change.

💻 **Code:**

```javascript
// Your app expects this shape:
//   payment.pay(amount)

// But the third-party library you're stuck with has this shape:
class StripeSDK {
  makeCharge(cents) { console.log(`Stripe charged ${cents} cents`); }
}

// The adapter translates one to the other
class StripeAdapter {
  constructor() { this.stripe = new StripeSDK(); }
  pay(amount) { this.stripe.makeCharge(amount * 100); } // dollars → cents
}

const payment = new StripeAdapter();
payment.pay(20);   // Stripe charged 2000 cents
```

📌 **Remember it as:** *"The travel plug — converts the interface."*

✅ **Use it when:** you need to use a class (often third-party or legacy) whose method names or arguments don't match what your code expects.

---

## 7. Bridge

🧠 **One line:** Split one big class into **two independent parts** that can each vary on their own.

🌍 **Real life:** A TV remote and a TV. Any remote works with any TV brand, because there's an agreed "bridge" between them (the IR signals). You can buy a new remote *or* a new TV without replacing both.

💻 **Code:**

```javascript
// Part 1: the "device" side — can change independently
class TV    { on() { console.log("📺 TV on"); } }
class Radio { on() { console.log("📻 Radio on"); } }

// Part 2: the "remote" side — holds a reference to ANY device (the bridge)
class Remote {
  constructor(device) { this.device = device; }
  pressPower() { this.device.on(); }
}

class FancyRemote extends Remote {
  pressPower() { console.log("✨ fancy click"); this.device.on(); }
}

new Remote(new TV()).pressPower();          // 📺 TV on
new FancyRemote(new Radio()).pressPower();  // ✨ fancy click / 📻 Radio on
```

Without Bridge you'd need `TVRemote`, `FancyTVRemote`, `RadioRemote`, `FancyRadioRemote`… — the class count multiplies. With Bridge: 2 remotes + 2 devices = 4 combos, only 4 classes.

📌 **Remember it as:** *"Two dimensions, one bridge — avoids the class explosion."*

✅ **Use it when:** a class could change in two directions (shape × colour, remote × device, UI × platform) and you don't want a class for every combination.

---

## 8. Composite

🧠 **One line:** Treat a **single item** and a **group of items** exactly the same way.

🌍 **Real life:** A folder on your computer. A folder can hold files *and* other folders. When you ask "how big is this?", you don't care whether it's one file or a folder 10 levels deep — the answer is just a number.

💻 **Code:**

```javascript
class File {
  constructor(name, size) { this.name = name; this.size = size; }
  getSize() { return this.size; }
}

class Folder {
  constructor(name) { this.name = name; this.children = []; }
  add(item) { this.children.push(item); return this; }
  getSize() {
    // ask each child — a child could be a File OR another Folder. Same call!
    return this.children.reduce((sum, child) => sum + child.getSize(), 0);
  }
}

const photos = new Folder("photos").add(new File("a.jpg", 300)).add(new File("b.jpg", 200));
const root   = new Folder("root").add(new File("readme.txt", 5)).add(photos);

console.log(root.getSize()); // 505 — tree of any depth, one call
```

📌 **Remember it as:** *"A tree where leaf and branch answer the same question."*

✅ **Use it when:** you have a tree structure (menus with submenus, UI components with children, org charts) and want to work with it without checking "is this a single thing or a group?" everywhere.

---

## 9. Decorator

🧠 **One line:** **Wrap** an object to add new behaviour — without touching the original class.

🌍 **Real life:** Dressing for the cold. You (the object) put on a T-shirt, then a sweater, then a jacket. Each layer adds warmth. You're still *you*; nothing about you changed — you're just wrapped.

💻 **Code:**

```javascript
// The plain thing
const coffee = { cost: () => 3, describe: () => "coffee" };

// Each decorator takes a drink and returns a wrapped drink with the same shape
const withMilk = (drink) => ({
  cost:     () => drink.cost() + 1,
  describe: () => drink.describe() + " + milk",
});

const withSugar = (drink) => ({
  cost:     () => drink.cost() + 0.5,
  describe: () => drink.describe() + " + sugar",
});

const myOrder = withSugar(withMilk(coffee));   // wrap, then wrap again
console.log(myOrder.describe()); // coffee + milk + sugar
console.log(myOrder.cost());     // 4.5
```

Decorators stack in any order and any number. Compare that with subclasses: `CoffeeWithMilk`, `CoffeeWithSugar`, `CoffeeWithMilkAndSugar`… no thanks.

📌 **Remember it as:** *"Layers of clothing — wrap to add, never modify."*

✅ **Use it when:** you want to add features to individual objects at runtime (logging, caching, validation, extra toppings) without a subclass for every combination.

> 🤔 **Decorator vs Adapter:** both wrap. **Adapter changes the interface** (different method names). **Decorator keeps the interface** and adds behaviour.

---

## 10. Facade

🧠 **One line:** One **simple front door** that hides a complicated system behind it.

🌍 **Real life:** Pressing "Start" on a washing machine. Behind that single button: fill water, heat, rotate, drain, spin. You don't operate each valve — the button is the facade.

💻 **Code:**

```javascript
// Messy subsystem — lots of parts, must be called in the right order
class Lights   { dim()  { console.log("💡 lights dimmed"); } }
class Speakers { on()   { console.log("🔊 speakers on"); } }
class Screen   { drop() { console.log("🖥️  screen down"); } }
class Player   { play(m){ console.log(`▶️  playing ${m}`); } }

// The facade — one friendly method
class HomeTheater {
  watch(movie) {
    new Lights().dim();
    new Speakers().on();
    new Screen().drop();
    new Player().play(movie);
  }
}

new HomeTheater().watch("Inception");
// 💡 lights dimmed / 🔊 speakers on / 🖥️ screen down / ▶️ playing Inception
```

📌 **Remember it as:** *"The 'Start' button over a messy system."*

✅ **Use it when:** you have a complex library or subsystem and most callers only need a few common operations done the right way.

---

## 11. Flyweight

🧠 **One line:** **Share** the parts that are the same across thousands of objects, so you only store the differences.

🌍 **Real life:** A library doesn't print a new copy of the dictionary for every reader. There's one dictionary (shared); each reader just holds their own bookmark (unique).

💻 **Code:**

```javascript
// Imagine a forest with 1,000,000 trees. Each has a type (shared) and a position (unique).

// Shared part — created once per type, then reused
const treeTypes = new Map();
function getTreeType(name, color) {
  const key = name + color;
  if (!treeTypes.has(key)) treeTypes.set(key, { name, color, texture: "🌳 big texture blob" });
  return treeTypes.get(key);   // same object every time → the flyweight
}

// Unique part — tiny, one per tree
class Tree {
  constructor(x, y, type) { this.x = x; this.y = y; this.type = type; }
}

const forest = [];
for (let i = 0; i < 1_000_000; i++) {
  forest.push(new Tree(i, i * 2, getTreeType("oak", "green")));
}

console.log(treeTypes.size);                          // 1 — one texture, not a million
console.log(forest[0].type === forest[999_999].type); // true — shared
```

📌 **Remember it as:** *"One dictionary, many bookmarks — share the heavy part."*

✅ **Use it when:** you have a huge number of similar objects and memory is the problem (game sprites, text characters in an editor, map markers).

---

## 12. Proxy

🧠 **One line:** A **stand-in** object that controls access to the real one — it can delay, cache, log or block.

🌍 **Real life:** A celebrity's assistant. You call the assistant, not the celebrity. The assistant decides: pass the call through, take a message, or say no.

💻 **Code:**

```javascript
// The real thing — slow and expensive
class RealImage {
  constructor(file) { this.file = file; console.log(`⏳ loading ${file} from disk…`); }
  show() { console.log(`🖼️  showing ${this.file}`); }
}

// The proxy — same interface, but lazy: only loads when actually needed
class ImageProxy {
  constructor(file) { this.file = file; this.real = null; }
  show() {
    if (!this.real) this.real = new RealImage(this.file);  // load on first use only
    this.real.show();
  }
}

const img = new ImageProxy("photo.jpg");   // nothing loaded yet — cheap!
console.log("page rendered");
img.show();   // ⏳ loading photo.jpg from disk… / 🖼️ showing photo.jpg
img.show();   // 🖼️ showing photo.jpg   ← no reload
```

Other proxy flavours: **protection** (check permissions first), **caching** (remember results), **logging** (record every call). JavaScript even has a built-in `Proxy` object for this.

📌 **Remember it as:** *"The assistant who screens the calls."*

✅ **Use it when:** you want to add control *around* an object (lazy loading, access checks, caching) while keeping the same interface.

> 🤔 **Proxy vs Decorator:** same shape, different intent. **Proxy controls access** (should this call happen? when?). **Decorator adds features** (do this extra thing too).

---

# 🗣️ Behavioral Patterns — *"How do objects talk to each other?"*

These 10 patterns are about **communication and responsibility** — who does what, who tells whom, and how to swap behaviour without rewriting code.

> 🎵 **C**ats **C**an **I**nstantly **M**ake **M**any **O**wners **S**mile, **S**o **T**ry **V**isiting
> → **C**hain of Responsibility · **C**ommand · **I**terator · **M**ediator · **M**emento · **O**bserver · **S**tate · **S**trategy · **T**emplate Method · **V**isitor

---

## 13. Chain of Responsibility

🧠 **One line:** Pass a request down a **line of handlers**; each one either deals with it or hands it to the next.

🌍 **Real life:** Customer support. The chatbot tries first → can't help → passes to a level-1 agent → can't help → passes to a manager. You made one request; it travelled the chain until someone handled it.

💻 **Code:**

```javascript
// Each handler: returns a result, or passes to the next
const handlers = [
  (req) => req.amount <= 100   ? "✅ approved by team lead"  : null,
  (req) => req.amount <= 1000  ? "✅ approved by manager"    : null,
  (req) => req.amount <= 10000 ? "✅ approved by director"   : null,
];

function approve(request) {
  for (const handler of handlers) {
    const result = handler(request);
    if (result) return result;        // someone handled it — stop here
  }
  return "❌ nobody can approve this";
}

console.log(approve({ amount: 50 }));      // ✅ approved by team lead
console.log(approve({ amount: 5000 }));    // ✅ approved by director
console.log(approve({ amount: 999999 }));  // ❌ nobody can approve this
```

Express/Koa middleware (`app.use(...)` + `next()`) is exactly this pattern.

📌 **Remember it as:** *"Pass it along until someone handles it."*

✅ **Use it when:** more than one object might handle a request and you want to decide the order/list at runtime (middleware, validation pipelines, event bubbling).

---

## 14. Command

🧠 **One line:** Turn an action into an **object**, so you can store it, queue it, undo it, or run it later.

🌍 **Real life:** A restaurant order ticket. The waiter writes your order on a slip and hangs it in the kitchen. The slip *is* the command — it can be queued, re-ordered, or cancelled, and the cook doesn't need to talk to you.

💻 **Code:**

```javascript
class TextEditor {
  constructor() { this.text = ""; }
}

// Each command knows how to DO and how to UNDO itself
class TypeCommand {
  constructor(editor, chars) { this.editor = editor; this.chars = chars; }
  execute() { this.editor.text += this.chars; }
  undo()    { this.editor.text = this.editor.text.slice(0, -this.chars.length); }
}

const editor  = new TextEditor();
const history = [];

function run(cmd) { cmd.execute(); history.push(cmd); }

run(new TypeCommand(editor, "Hello"));
run(new TypeCommand(editor, " World"));
console.log(editor.text);   // Hello World

history.pop().undo();       // Ctrl+Z
console.log(editor.text);   // Hello
```

📌 **Remember it as:** *"An action you can hold in your hand."*

✅ **Use it when:** you need undo/redo, job queues, macro recording, or want to decouple "the button" from "what the button does".

---

## 15. Iterator

🧠 **One line:** A standard way to **walk through a collection** one item at a time, without knowing how it's stored inside.

🌍 **Real life:** A TV remote's "next channel" button. You don't need to know how the channels are stored — you just press *next*, *next*, *next*.

💻 **Code:**

```javascript
// A custom collection: stores items in reverse, but iterates in normal order
class Playlist {
  constructor() { this.songs = []; }
  add(song) { this.songs.unshift(song); return this; }   // weird internal storage

  // Implementing this ONE method makes for...of, spread, destructuring all work
  *[Symbol.iterator]() {
    for (let i = this.songs.length - 1; i >= 0; i--) yield this.songs[i];
  }
}

const playlist = new Playlist().add("Song A").add("Song B").add("Song C");

for (const song of playlist) console.log(song);  // Song A, Song B, Song C
console.log([...playlist]);                      // ["Song A", "Song B", "Song C"]
```

You use Iterator every time you write `for...of`. Arrays, Maps, Sets, strings — all iterators.

📌 **Remember it as:** *"Next, next, next — without knowing what's inside."*

✅ **Use it when:** you build a custom collection and want it to work with `for...of`, or you want to hide a complex traversal (tree walk, paginated API) behind a simple loop.

---

## 16. Mediator

🧠 **One line:** Objects don't talk to each other directly — they all talk to **one central coordinator**.

🌍 **Real life:** Air traffic control. Planes don't radio each other to negotiate who lands first — that would be chaos. Everyone talks to the tower; the tower talks to everyone.

💻 **Code:**

```javascript
// The mediator — the only one who knows about everybody
class ChatRoom {
  constructor() { this.users = []; }
  join(user) { this.users.push(user); user.room = this; }
  send(message, from) {
    this.users.filter(u => u !== from).forEach(u => u.receive(message, from.name));
  }
}

// Users only know the room, not each other
class User {
  constructor(name) { this.name = name; }
  say(msg)               { this.room.send(msg, this); }
  receive(msg, fromName) { console.log(`[${this.name}] ${fromName}: ${msg}`); }
}

const room = new ChatRoom();
const alice = new User("Alice"), bob = new User("Bob"), cara = new User("Cara");
[alice, bob, cara].forEach(u => room.join(u));

alice.say("hi all");
// [Bob] Alice: hi all
// [Cara] Alice: hi all
```

Without a mediator, 10 objects that all talk to each other = 45 connections. With one: 10.

📌 **Remember it as:** *"The air traffic controller — everyone talks to the tower."*

✅ **Use it when:** many components need to coordinate (form fields that enable/disable each other, chat rooms, game entities) and direct references are turning into spaghetti.

---

## 17. Memento

🧠 **One line:** **Save a snapshot** of an object's state so you can restore it later — without exposing its internals.

🌍 **Real life:** A save point in a video game. You save, try something risky, die, and reload — right back where you were.

💻 **Code:**

```javascript
class Game {
  constructor() { this.level = 1; this.hp = 100; }

  save()        { return { level: this.level, hp: this.hp }; }  // the memento
  restore(snap) { this.level = snap.level; this.hp = snap.hp; }
}

const game = new Game();
game.level = 5; game.hp = 80;

const checkpoint = game.save();      // 💾 save point

game.level = 6; game.hp = 0;         // 💀 oops, died on level 6
game.restore(checkpoint);            // ⏪ reload

console.log(game.level, game.hp);    // 5 80
```

📌 **Remember it as:** *"Save game / load game."*

✅ **Use it when:** you need undo, checkpoints, or transactions-with-rollback. (Command is *undo by reversing actions*; Memento is *undo by restoring a snapshot*.)

---

## 18. Observer

🧠 **One line:** One object **announces** a change; everyone who **subscribed** gets notified automatically.

🌍 **Real life:** A YouTube channel. Subscribe once, and every new video pings you. The channel doesn't know who you are — it just says "new video!" and the platform tells all subscribers.

💻 **Code:**

```javascript
class Channel {
  constructor() { this.subscribers = []; }
  subscribe(fn)  { this.subscribers.push(fn); }
  upload(video)  { this.subscribers.forEach(fn => fn(video)); }  // notify everyone
}

const channel = new Channel();
channel.subscribe(v => console.log(`📧 Email: new video "${v}"`));
channel.subscribe(v => console.log(`🔔 Push:  new video "${v}"`));

channel.upload("Design Patterns in 10 min");
// 📧 Email: new video "Design Patterns in 10 min"
// 🔔 Push:  new video "Design Patterns in 10 min"
```

`addEventListener`, React's `useEffect` dependencies, RxJS, Vue reactivity — all Observer.

📌 **Remember it as:** *"Subscribe & get notified."*

✅ **Use it when:** one change needs to trigger reactions in many places, and the source shouldn't have to know who's listening.

> 🤔 **Observer vs Mediator:** Observer is **one-to-many broadcast** (one source, many listeners). Mediator is **many-to-many via a hub** (everyone talks to everyone, through one coordinator).

---

## 19. State

🧠 **One line:** An object **changes its behaviour when its internal state changes** — by swapping out a state object instead of writing giant `if/else` blocks.

🌍 **Real life:** A traffic light. The same light does different things depending on whether it's red, yellow or green — and each state knows which state comes next.

💻 **Code:**

```javascript
// Each state is an object that knows what to do and what comes next
const states = {
  red:    { show: () => "🔴 STOP",  next: () => states.green  },
  green:  { show: () => "🟢 GO",    next: () => states.yellow },
  yellow: { show: () => "🟡 SLOW",  next: () => states.red    },
};

class TrafficLight {
  constructor() { this.state = states.red; }
  show()   { return this.state.show(); }
  change() { this.state = this.state.next(); }   // behaviour swaps with the state
}

const light = new TrafficLight();
for (let i = 0; i < 4; i++) { console.log(light.show()); light.change(); }
// 🔴 STOP / 🟢 GO / 🟡 SLOW / 🔴 STOP
```

The alternative is `if (state === "red") … else if (state === "green") …` inside *every* method. Adding a new state means touching all of them.

📌 **Remember it as:** *"Traffic light — the object becomes a different thing in each state."*

✅ **Use it when:** an object has clear modes (draft/published/archived, connecting/connected/disconnected) and you keep writing the same `switch(status)` everywhere.

---

## 20. Strategy

🧠 **One line:** Define a **family of interchangeable algorithms** and let the caller pick one at runtime.

🌍 **Real life:** Google Maps directions. Same start, same destination — but you choose the strategy: 🚗 drive, 🚌 transit, 🚶 walk. The map doesn't change; only the route calculation does.

💻 **Code:**

```javascript
// The strategies — same input, different algorithm
const shipping = {
  standard: (weight) => weight * 1,
  express:  (weight) => weight * 3 + 5,
  pickup:   ()       => 0,
};

class Order {
  constructor(weight, strategy) { this.weight = weight; this.strategy = strategy; }
  shippingCost() { return this.strategy(this.weight); }   // plug in whichever
}

console.log(new Order(10, shipping.standard).shippingCost()); // 10
console.log(new Order(10, shipping.express).shippingCost());  // 35
console.log(new Order(10, shipping.pickup).shippingCost());   // 0
```

`array.sort(compareFn)` — that `compareFn` is a strategy.

📌 **Remember it as:** *"Same goal, pick your route."*

✅ **Use it when:** you have several ways to do the same thing (payment methods, sort orders, compression formats) and want to swap them without `if/else` chains.

> 🤔 **Strategy vs State:** identical code shape! The difference is *who chooses*. **Strategy: the caller picks** the algorithm. **State: the object switches itself** as things happen.

---

## 21. Template Method

🧠 **One line:** A parent class defines the **skeleton of an algorithm**; subclasses fill in the specific steps.

🌍 **Real life:** A recipe template: *1. prep ingredients → 2. cook → 3. plate.* Every dish follows those steps, but "cook" means grill for a steak and boil for pasta.

💻 **Code:**

```javascript
class DataExporter {
  // The template — fixed order, never overridden
  export() {
    const data = this.fetch();
    const formatted = this.format(data);   // ← subclasses customise this
    this.save(formatted);
  }

  fetch()      { return [{ id: 1, name: "Ada" }]; }       // shared step
  save(output) { console.log(`💾 saved: ${output}`); }    // shared step
  format(data) { throw new Error("subclass must implement format()"); }
}

class CsvExporter  extends DataExporter { format(d) { return d.map(r => `${r.id},${r.name}`).join("\n"); } }
class JsonExporter extends DataExporter { format(d) { return JSON.stringify(d); } }

new CsvExporter().export();   // 💾 saved: 1,Ada
new JsonExporter().export();  // 💾 saved: [{"id":1,"name":"Ada"}]
```

📌 **Remember it as:** *"Fill-in-the-blanks algorithm."*

✅ **Use it when:** several classes do almost the same steps in the same order, and only one or two steps differ.

> 🤔 **Template Method vs Strategy:** Template uses **inheritance** (override a step). Strategy uses **composition** (pass in a function). Strategy is usually more flexible; Template is simpler when the skeleton is truly fixed.

---

## 22. Visitor

🧠 **One line:** Add a **new operation** to a bunch of different object types without modifying any of them.

🌍 **Real life:** A tax inspector visiting different businesses. The inspector (visitor) knows how to audit a restaurant, a shop, and a factory. The businesses don't need to learn accounting — they just let the inspector in.

💻 **Code:**

```javascript
// The shapes — they never change, no matter how many operations we add
class Circle { constructor(r) { this.r = r; }          accept(v) { return v.circle(this); } }
class Square { constructor(s) { this.s = s; }          accept(v) { return v.square(this); } }

// Operation 1: a visitor that computes area
const areaVisitor = {
  circle: (c) => Math.PI * c.r ** 2,
  square: (s) => s.s ** 2,
};

// Operation 2: a visitor that draws — added WITHOUT touching Circle or Square
const drawVisitor = {
  circle: (c) => `⚪ circle r=${c.r}`,
  square: (s) => `⬜ square s=${s.s}`,
};

const shapes = [new Circle(1), new Square(2)];
console.log(shapes.map(s => s.accept(areaVisitor)));  // [3.14…, 4]
console.log(shapes.map(s => s.accept(drawVisitor)));  // ["⚪ circle r=1", "⬜ square s=2"]
```

📌 **Remember it as:** *"New operation, zero changes to the objects."*

✅ **Use it when:** you have a stable set of types (AST nodes, shapes, document elements) and keep needing new operations on all of them (export, validate, render, count). Compilers and linters live on this pattern.

---

# Patterns That Look Alike

These pairs trip up everyone. The code often looks the same — the difference is **intent**.

| Pair | The difference in one line |
|---|---|
| **Factory Method** vs **Abstract Factory** | One product vs a matching *family* of products |
| **Adapter** vs **Decorator** | Adapter *changes* the interface; Decorator *keeps* it and adds behaviour |
| **Decorator** vs **Proxy** | Decorator *adds features*; Proxy *controls access* (lazy, cache, permissions) |
| **Strategy** vs **State** | Strategy: *caller* picks the behaviour; State: *object* switches itself |
| **Strategy** vs **Template Method** | Strategy = pass a function in (composition); Template = override a step (inheritance) |
| **Observer** vs **Mediator** | Observer = one-to-many broadcast; Mediator = many-to-many through a hub |
| **Command** vs **Memento** | Command undoes by *reversing the action*; Memento undoes by *restoring a snapshot* |
| **Facade** vs **Adapter** | Facade *simplifies* a whole system; Adapter *converts* one interface to another |
| **Composite** vs **Decorator** | Both are trees of wrapped objects. Composite = *many children*, same operation; Decorator = *one child*, added behaviour |

---

# The One-Page Cheat Sheet

Cover the right column and quiz yourself.

| # | Pattern | Remember it as | Real-life hook |
|---|---|---|---|
| | **🏭 CREATIONAL** | *Fresh Apples Bring Perfect Smiles* | |
| 1 | Factory Method | Don't `new` it — ask the factory | Ordering coffee at a café |
| 2 | Abstract Factory | Factory of factories — everything matches | IKEA furniture series |
| 3 | Builder | Chain the steps, then `.build()` | Subway sandwich |
| 4 | Prototype | Copy-paste an object, then tweak | Photocopying a filled form |
| 5 | Singleton | Only one, ever | One president |
| | **🧱 STRUCTURAL** | *A Big Cat Danced For Free Pizza* | |
| 6 | Adapter | Converts the interface | Travel power plug |
| 7 | Bridge | Two dimensions, one bridge | Remote × TV |
| 8 | Composite | Leaf and branch answer the same question | Folders in folders |
| 9 | Decorator | Wrap to add, never modify | Layers of clothing |
| 10 | Facade | The "Start" button | Washing machine |
| 11 | Flyweight | Share the heavy part | One dictionary, many bookmarks |
| 12 | Proxy | The assistant who screens calls | Celebrity's assistant |
| | **🗣️ BEHAVIORAL** | *Cats Can Instantly Make Many Owners Smile, So Try Visiting* | |
| 13 | Chain of Responsibility | Pass it along until someone handles it | Customer support escalation |
| 14 | Command | An action you can hold | Restaurant order ticket |
| 15 | Iterator | Next, next, next | TV remote "next channel" |
| 16 | Mediator | Everyone talks to the tower | Air traffic control |
| 17 | Memento | Save game / load game | Video game checkpoint |
| 18 | Observer | Subscribe & get notified | YouTube subscription |
| 19 | State | Object becomes a different thing per state | Traffic light |
| 20 | Strategy | Same goal, pick your route | Google Maps: drive/walk/transit |
| 21 | Template Method | Fill-in-the-blanks algorithm | Recipe template |
| 22 | Visitor | New operation, zero changes to objects | Tax inspector |

---

# Which Pattern Do I Need?

Start with the **problem you have**, not the pattern name.

```
"I keep writing new X() all over and it's getting messy"
    → one kind of product ............... Factory Method
    → families of matching products ..... Abstract Factory

"My constructor has 8 arguments" ........ Builder
"Creating this object is slow/expensive"  Prototype
"There must only ever be one of these" .. Singleton

"This library's API doesn't match mine" . Adapter
"I have classes for every combination" .. Bridge
"It's a tree — items inside items" ...... Composite
"I want to add features without subclassing" Decorator
"This subsystem is too complex to call" . Facade
"Millions of similar objects, memory hurts" Flyweight
"I need to control/delay/cache access" .. Proxy

"Several things might handle this request" Chain of Responsibility
"I need undo, queues, or 'do this later'" Command
"I want for...of on my custom collection" Iterator
"Everything talks to everything — spaghetti" Mediator
"I need save/restore snapshots" ......... Memento
"When this changes, notify everyone" .... Observer
"Giant switch(status) in every method" .. State
"Several algorithms for the same job" ... Strategy
"Same steps, one step differs per subclass" Template Method
"New operation across many types, don't touch them" Visitor
```

---

## Final Advice for Beginners

1. **Don't force patterns.** A pattern is a solution to a problem. No problem → no pattern. Simple code beats clever code.
2. **You'll recognise them before you use them.** `addEventListener` is Observer. Express middleware is Chain of Responsibility. `array.sort(fn)` is Strategy. Spotting them in code you already know is the fastest way to learn.
3. **Learn the 6 you'll meet most first:** Singleton, Factory Method, Observer, Strategy, Decorator, Facade. The rest can wait until you hit the problem they solve.
4. **Same shape, different intent.** Many patterns look identical in code (Strategy/State, Decorator/Proxy). The *name* you give it tells the next reader *why* it's there — that's the real value.

> For the full detailed version of each pattern with TypeScript and trade-offs, see the [GoF Complete Guide](./GOF%20Design%20pattern/readme.md).
