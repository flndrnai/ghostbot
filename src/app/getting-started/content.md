# Getting Started with GhostBot

Welcome. GhostBot is your own private AI assistant that lives on your server — a mix of a smart chat helper and a programming sidekick that can actually make changes to your projects. This guide is for **regular users** who just want to use it, not for people setting it up.

Try it live — without signing up — at **[demo.ghostbot.dev](https://demo.ghostbot.dev)**. Some things are turned off for safety (it resets every day), but you can click around freely.

---

## 1. What is GhostBot, really?

Think of it like this:

- **A very smart friend** who can read, write, explain, and fix things — lives in a chat window on your phone or laptop.
- **A helper that remembers** everything you've talked about. Next week, when you come back with a related question, it already knows the context.
- **A worker** you can hand a task and walk away from — "tidy up this project file", "add a button to the login page", "check if the tests still pass" — then get a ping when it's done.

Everything stays on your own server. Nothing you type goes anywhere you didn't set up yourself.

---

## 2. Your first time — 10 minutes

### Log in

Click **Sign In**, enter your email + password. If this is a brand-new GhostBot, the very first person who signs up becomes the owner.

### Walk through the setup guide

The first time you log in, GhostBot offers you a 5-step **Setup Wizard**. Don't skip it — it saves you from digging through menus later. You'll be asked about:

1. **Which AI to talk to** — your own (free, runs on your server) or a cloud one like ChatGPT or Claude (pay-as-you-go).
2. **Whether bots can edit files** — yes/no/later; no doesn't lock you out, it just switches off the "go fix this" superpower.
3. **Connecting to GitHub** — optional. Only needed if you want GhostBot to open pull requests for you.
4. **Notifications** — optional. Get a Telegram or Slack ping when a task finishes.
5. **Done** — click through, you're set.

You can re-run the wizard any time from the menu if something changes.

### Start chatting

After the wizard you land on a fresh chat screen. Just type.

- Ask anything: *"what's the difference between a .jpg and a .png?"*, *"write me a birthday text for my mum"*, *"explain cookies to a 5-year-old"*.
- Paste a screenshot — click in the chat, press paste. If the AI you chose can see images (most modern ones can), it'll describe what's wrong or answer about it.
- Click the **microphone** button and talk — it types for you. Works on most browsers, but not Firefox.

The AI replies live, word by word. Every message is saved. Old chats appear in the left sidebar.

---

## 3. What you can actually do with GhostBot

### Everyday chat

Just like ChatGPT or Claude, but **on your own server**, with **your own history**, and — if you set up a free one — **no monthly subscription**. Ask questions, brainstorm, write emails, plan a trip, rubber-duck a decision, summarise an article.

### "Remember this for next time"

Every conversation is auto-summarised in the background. A week later when you start a new chat on the same topic, GhostBot automatically reminds itself of the earlier context. You don't have to copy-paste anything.

### Paste a screenshot, ask about it

Clipboard → paste into the chat input. Great for:
- *"What's wrong with this error message?"*
- *"What does this menu do?"*
- *"Tidy up this poster copy"*
- *"Read me what this receipt says"*

### Hands-free dictation

Mic button (bottom-left in the chat). Speak, click again to stop. Good while you're walking, driving (passenger please), or just don't feel like typing.

### Attach a project so GhostBot knows your stuff

On the **Projects** page (left sidebar) you can:
- **Upload a folder** from your computer (drag-and-drop)
- **Paste a link** to a project online (GhostBot will copy it for you)
- **Point at something already on the server** if someone set that up

Once a project is attached to a chat, GhostBot can read the files and understand what the project is about. You can click filenames in the side panel to share them with the AI.

### "Go fix this"

If your setup includes the bot-worker feature, you'll see a **wrench icon** in the chat input. Click it, write what you want done in plain English:

> Add a button that says "Contact Us" to the homepage.

Pick which helper should do it (Aider is the default — works with all AIs), click **Launch**. A status card appears in the chat. You see the helper working live — it finds the right files, edits them, saves the changes. When it's done:
- You get a link to review the exact changes (side-by-side, like a before/after)
- If you're connected to GitHub, a pull request is created automatically
- If you've set up notifications, your phone pings

What kinds of tasks work well:
- **Yes**: *"Add a dark mode button"*, *"Fix the typo on the About page"*, *"Write a README explaining how to run this"*.
- **Not really**: *"Rebuild the whole app"*, *"Design me a logo"* (that's a different kind of AI), *"Hack this website"* (nope).

Keep tasks small and specific — same as asking any human for help.

### Build something from one sentence — the "Builder"

Open **Builder** in the sidebar. Type a goal like *"Build me a personal blog with a contact form"*. GhostBot plans it out as a list of steps, then runs each step automatically, retrying if something fails. You watch the progress bar and end up with a working project folder.

Best for: starting projects from scratch, trying out ideas, making demos.

### Multi-step automations — the "Clusters"

A **Cluster** is a team of AI helpers that work together. Examples you can create with one click from the templates page:

- **PR Reviewer** — looks at a code change, checks it for problems, writes a summary
- **Docs Writer** — reads a project, writes or updates the documentation
- **Test Coverage Bot** — finds parts of a project that aren't being tested, writes tests

You create one from a template, click Run, walk away, come back to a finished result.

### Daily summary of what you've been doing

GhostBot has a **Scanner** that runs once a day (usually around 6:30 AM). It looks at everything you did the previous day and writes a short reflection into your searchable memory. Useful for keeping a changelog without having to think about it.

### Invite other people

Admin → **Users** → **Invite**. You get a one-time link to share. Each person you invite has their own chats, their own memory, their own settings. Great for a small trusted team.

### Use it in VS Code

If you're a programmer who lives in VS Code, there's a **GhostBot extension** that puts the whole app inside your editor. Highlight some code, press a shortcut, it lands in the chat. You can install it from the Marketplace when we publish it there.

### Install it on your phone like an app

On your phone browser, open the menu → **Add to Home Screen**. You get a GhostBot icon on your phone with no browser bar around it, just like a real app.

---

## 4. What GhostBot is NOT good for

Being honest about the limits saves frustration later.

### ❌ Don't use it as a public app where strangers sign up

GhostBot is built for **one owner and maybe a small team of people you trust**. If you want to run something that the general public can sign up for — a SaaS, a public service — GhostBot isn't the right base. People with admin access have a lot of power.

### ❌ Don't expect magic from a tiny brain

The quality of the AI depends entirely on which one you chose in the setup wizard. A big model (like Claude, GPT-4, or a big free one running on your server) gives smart answers. A tiny free model gives simple answers. If it feels dumb, the model is probably too small — you can change it in Admin → LLM Providers any time.

### ❌ Don't expect it to write perfect code on its own

The "go fix this" feature is a helper, not a replacement for a programmer. It does best with small, clear tasks. Big vague tasks give messy results. Always review the changes it makes before merging them into real work.

### ❌ Don't trust everything it says

Like any AI, GhostBot can confidently make things up. If it's giving you legal, medical, or financial advice — double-check with a real human professional.

### ❌ Don't expect it to handle a thousand people at once

It's built to comfortably serve one person or a small team. If you need to scale to lots of users, that's a different setup (technical stuff is documented elsewhere).

### ❌ Don't leave secrets in chat

Treat chat like a diary — useful and private — but don't paste your banking passwords, credit card numbers, or other high-value secrets. Even though they stay on your server, mistakes happen.

---

## 5. Tips from using it every day

- **Fill in your project's "notes file"** (called `CLAUDE.md`) with stuff about the project — what it is, how it's organised, what's special. The AI reads this automatically. The more you put in it, the better the answers.
- **Make shortcuts for things you ask a lot.** Admin → **Skills** → create one like `/email-reply` with a prompt template. Then just type `/email-reply` in chat and fill in the blanks.
- **Turn off memory for private chats.** In chat settings there's a memory toggle. Use it when you don't want the conversation saved.
- **One project per chat.** Don't mix projects in one conversation — the AI gets confused.
- **Small specific requests work best.** *"Make the button blue"* is clearer than *"improve the styling"*.
- **If something goes wrong**, the **Docs** page (menu → Docs) has a Troubleshooting section with fixes for the most common issues.

---

## 6. Where to go from here

- **Try the live demo** — [demo.ghostbot.dev](https://demo.ghostbot.dev) — no sign-up, no risk, get a feel for it
- **Docs** (menu → Docs) — detailed explanation of every admin page
- **GitHub** — [github.com/flndrnai/ghostbot](https://github.com/flndrnai/ghostbot) — if you hit a bug, open an issue

Good luck, and have fun with it. GhostBot works best when you just start using it and see what it can do.
