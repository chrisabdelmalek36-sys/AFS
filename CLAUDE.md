# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Basha is a static editorial website for an Egyptian luxury fashion identity — pure HTML/CSS/JS, **no build tooling**, **no package.json**, **no test suite**. Edits are made directly to source files and committed.

## Commands

```bash
# Local preview — any static server works, e.g.:
python3 -m http.server 8080

# Deploy to GitHub Pages (force-push current branch to gh-pages):
git push origin <current-branch>:gh-pages --force
```

Live URL: `https://chrisabdelmalek36-sys.github.io/Basha/`. Deploys take ~30–60s after the push to gh-pages.

The current development branch is `claude/add-remotion-skills-Rsgyi` (per session instructions). Push commits there first, then mirror to `gh-pages` for the live deploy.

## Architecture

**Pages** are independent top-level `*.html` files (no templating, no includes). The nav, footer, and `<head>` block are duplicated across each page — when editing global UI (nav links, footer links, OG tags, font loading), change every page or the site falls out of sync.

Existing pages: `index.html` (heritage hero homepage), `about.html`, `collections.html`, `series.html`, `community.html`, `contact.html`, `campaign-day1.html`, `campaign-day2.html`.

**`assets/css/main.css`** is the single stylesheet (~2400 lines). It is organized in labelled sections — search for `/* ----------- SECTION ----------- */` headers to navigate. Key conventions:

- **Design tokens** live in `:root` at the top: `--black`, `--cream`, `--sand`, `--gold`, `--serif`, `--sans`, `--gutter`, `--section-y`, `--ease`. The Maison hero adds a parallel `--heritage-*` palette.
- **`.frame--*` classes** (e.g. `frame--muizz-dawn`, `frame--zamalek`, `frame--cairo-gold`) are pure-CSS gradient "photographs" — there are no real images in the repo. New visual scenes should be added as new `.frame--*` variants in the VISUAL FRAMES section, not as `<img>` tags.
- **`.maison-hero*`** is the cream-background heritage homepage hero; its CSS uses `body:has(.maison-hero) .nav` to flip nav text colors against the cream backdrop. Other hero variants (`.hero`, `.page-hero`, `.campaign-hero`) keep the dark default.
- **Button variants:** `.btn` (cream-on-dark), `.btn--gold`, `.btn--heritage` and `.btn--heritage-gold` (for cream backgrounds).

**`assets/js/main.js`** is a single IIFE. It wires:
- `IntersectionObserver` on `.reveal` / `.reveal--delay-N` elements (toggles `.is-visible`)
- Nav scroll-state (`.is-scrolled`) and mobile toggle (`.is-open`)
- Hero parallax targeting `.hero__bg`, `.page-hero__bg`, `.campaign-hero__bg`, plus `.maison-hero__skyline` and `.maison-hero__title`
- A custom gold cursor on pointer-fine devices

When adding a new section that should animate in, give the wrapper `class="reveal"` (and optionally `reveal--delay-1` through `reveal--delay-3`) — no JS changes needed.

## Brand voice (matters for content edits)

Copy is deliberate and quiet — "presence without noise, elegance without performance." Roman numerals for chapters, em-dashes, no exclamation marks, no emoji, no marketing superlatives. Cairo locations are named specifically (Al-Muizz, Zamalek, Garden City, Heliopolis). The 25-day campaign convention is stored in `campaign-day1.html` / `campaign-day2.html`.

## Remotion skills

`.agents/skills/remotion-best-practices/` (managed by `skills-lock.json`) is installed for future video composition work. There is no Remotion project in the repo yet — to scaffold one use `npx create-video@latest --yes --blank --no-tailwind <name>`. Consult the skill's rules under `.agents/skills/remotion-best-practices/rules/` before writing any Remotion code.

## GitHub access

The MCP GitHub tools are restricted to `chrisabdelmalek36-sys/basha`. Do not attempt to read or write any other repository. Do not open pull requests unless the user explicitly asks for one.
