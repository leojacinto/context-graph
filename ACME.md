# ACME - Agent Canonical Model Execution

## Trigger

When the user says **"ACME"**, reference this file. It contains the canonical rules, anti-patterns, and delivery pipeline distilled from 74 real Claude Code / Cascade / JARVIS ServiceNow delivery sessions.

## Source

Full local corpus:
`/Users/leo.francia/Agent Canonical Model Execution/local-version/`

Key files:
- `servicenow-delivery-pipeline.md` — 7-phase pipeline
- `pitfalls-and-rules.md` — 12 hard rules with evidence
- `anti-pattern-taxonomy.md` — 11 named anti-patterns (frequency + severity)
- `pipeline-rules-insert.md` — paste-ready agent context insert
- `session-narratives.md` — uncensored case studies
- `session-analysis-report.md` — raw extraction output
- `extract_session_patterns.py` — JSONL session parser

## The 7-Phase Pipeline

1. **Ideation & Discovery** — human-led input collection
2. **Spec Creation** — deliverable, spec.md, Agent.md, diagrams
3. **Architecture & Flow Mapping** — customer process → ServiceNow capabilities
4. **Build / Execution** — Fluent SDK or MCP/JARVIS
5. **Validation** — SDK install, Playwright, regression
6. **Documentation** — deliverable, HTML, archive
7. **Presentation / Social** — cards, GIFs, post copy

## The 12 Hard Rules

1. **Verify before acting** — paths, URLs, files, configs exist before referencing.
2. **Own your mistakes** — say "I made an error in [X], fixing it." Never frame a fix as a discovery.
3. **Update, don't overwrite** — edit existing files; never create v2/v3/v5 unless explicitly asked.
4. **Formatting & visual quality** — preview HTML/PPT in browser; check fonts, contrast, aspect ratios.
5. **Tables and diagrams must match** — 1:1 correspondence; arrows match data flow.
6. **Don't research until ready** — no SDK docs or API browsing until instance is connected.
7. **Scope discipline** — confirm working directory before every write; no cross-condition contamination.
8. **Social content is iterative** — budget 5–8 revision rounds; remove LLMisms and em dashes.
9. **Diagram quality** — show real process steps; use swimlanes; arrows match data flow.
10. **Playwright & browser testing** — handle SN shadow DOM, SSO, timeouts, stale browser instances.
11. **Specify the capture** — dimensions, FPS, duration, crop, loop point, tool chain for GIFs/screenshots.
12. **PPTX / document brand compliance** — audit fonts, icons, colors as a separate step.

Bonus rule:
- **NEVER query syslog** on any ServiceNow instance for debugging. Use `gs.getProperty()` on custom sys_properties only.

## Top Anti-Patterns

| ID | Name | Severity | Notes |
|----|------|----------|-------|
| AP-01 | Confident Fabricator | Critical | Fabricated paths/URLs/APIs with full confidence. Verify every output. |
| AP-02 | Discovery Reframer | High | Presents own errors as newly discovered issues. |
| AP-03 | Wheel Reinventor | High | Creates new file versions that lose prior work. |
| AP-04 | Stale Data Polluter | High | Leaves remnants of abandoned approaches after pivots. |
| AP-05 | Rube Goldberg Architect | Medium | Unnecessary complexity, scripts, subdirectories. |
| AP-06 | Visual Illiterate | Med-High | Structurally correct but visually poor output. |
| AP-07 | Inconsistency Generator | High | Table and diagram data don't match. |
| AP-08 | Premature Researcher | Medium | Starts research before prerequisites are met. |
| AP-09 | Scope Leaker | Critical | Reads/writes to the wrong experiment directory. |
| AP-10 | LLMism Leaker | Low | Hedging, em dashes, formal AI prose where conversational tone needed. |
| AP-11 | Tool Wanderer | Medium | Wrong tool choices repeated; consult preferences. |

## The Meta-Rule

> The agent is a tool, not a colleague. It does not have judgment, taste, or context awareness. Every output must be verified by the human before it leaves the pipeline.

## Wiring into Sessions

- **Claude Code memory:** `~/.claude/projects/[project]/memory/pipeline-rules.md`
- **CLAUDE.md:** paste under a `## Pipeline Rules` section
- **Cascade:** `.windsurf/workflows/pipeline-checklist.md` invoked via slash command
- **First message:** paste `pipeline-rules-insert.md` content

## Quick Reference Commands

```bash
# Extract session patterns
python3 extract_session_patterns.py --verbose

# Per project
python3 extract_session_patterns.py --project DoF --verbose
```
