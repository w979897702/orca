# Fork 开发与上游同步

- 每次开始开发前，先看 `git status --short --branch`，确认当前是长期开发分支 `feat/guihuajiu` 或其隔离工作树。官方源码从 `upstream`（`stablyai/orca`）读取，开发成果推到 `origin/feat/guihuajiu`（`w979897702/orca`）。
- 显式运行 `git fetch --no-tags upstream refs/heads/main:refs/remotes/upstream/main`。本仓库曾只跟踪上游的一个标签，普通 `git fetch upstream` 可能漏掉主线更新。先用 `git merge-base HEAD upstream/main` 确认共同祖先；浅克隆缺少历史时先补齐。然后用 `git log --oneline HEAD..upstream/main` 查看待同步提交。获取失败时说明原因，不能把旧引用当作上游最新状态。
- 有上游更新时，先在从当前 fork 提交创建的干净工作树中用 `git merge upstream/main` 整合，保留现有未提交改动。对照共同祖先分别检查双方修改，并检查合并结果相对合并前 fork 的差异。按功能解决冲突，禁止整批选用一方、rebase 或强推。上游改写同一功能时，复用能保留原有行为的实现；确实无法兼容时，列出具体冲突和取舍，由用户决定。
- 同步验收覆盖受影响的 fork 功能，包括任务中心看板与入口、本地网页 WebRTC 直连、侧栏状态点、Gemini 优先通过 Orca 派发，以及禁用官方应用更新且保留本机技能更新。以后按 fork 的实际提交补充。即使 Git 自动合并成功，也要从受影响功能的正常入口验证，并以合并前的 fork 提交为基线运行 `pnpm check:changed --base=<合并前提交>`。通过后再将已验证的合并提交整合回 `feat/guihuajiu`；报告同步到的上游提交及验证结果。

# Checks

- **Gate**: `pnpm check:changed` runs format, lint, typecheck, the tests that import your changes, and the ratchets your paths select, and prints only failures. Run it once when you are done editing (and again after a rebase or fix), then push. A pass is cached, so don't rerun it "to be sure", and don't also run `pnpm tc`, `pnpm lint`, or the full suite. Never `--no-verify`.
- **While iterating**: run only what you touched: `pnpm test <file.test.ts> --maxWorkers=2`, `pnpm tc:node|tc:web|tc:cli`, `pnpm exec oxlint <files>`, `pnpm exec oxfmt --write <files>`. Transitive tests and the full suite are CI's job ([details](.github/CONTRIBUTING.md#targeting-local-tests)).
- Run checks in the foreground with `timeout 900`. Don't background them and poll with `sleep`.
- Stacked PRs: `ORCA_CODE_QUALITY_BASE=<ref>` or `--base=<ref>`; `--base=HEAD` covers only uncommitted edits.
- CI: `gh pr checks --watch` or `gh run watch <id> --compact --exit-status` (no polling). Read failures with `gh run view <id> --log-failed`; for long logs, filter with `grep -nE "error|FAIL|✗"` instead of tailing.

# Repo Rules

- Ensure main is always releasable
- Never break the CI. If it's broken, merge fixes.
- **Tests are the exception.** Prove a change by running it (app via CDP screenshot, CLI, script), not by committing a test. Commit one only for logic where a silent regression is costly: parsers/codecs/round-trips, security boundaries (escaping, path traversal, auth, crypto), persistence/migrations/data loss, concurrency or state-machine invariants, cross-platform paths. It must call real code with minimal mocks, hardcode its expectations, and fail if the fix is reverted; prefer one invariant over many examples. Never test UI behavior ("button does X"), wiring/IPC glue, mock calls, copy, constants, or timing. Critical user flows belong in the golden E2E journeys (`tests/e2e/golden-journeys`), not unit tests. Delete low-value tests you touch instead of updating them. Perf contracts: `*.performance.test.*` only ([rules](./docs/agents-md-refs/test-antipatterns.md#perf-contracts)); more in [anti-patterns](./docs/agents-md-refs/test-antipatterns.md).

# Design System

All UI work — layout, color, typography, spacing, component selection, UX behavior — must follow [`docs/STYLEGUIDE.md`](./docs/STYLEGUIDE.md). Use the tokens defined in `src/renderer/src/assets/main.css` (the canonical source) and the shadcn primitives in `src/renderer/src/components/ui/`. Don't invent new color values, font sizes, or shadow tiers when a documented one already covers the role.

# Electron UI Validation

- Always run tests and agent-launched apps in the background with `ORCA_BACKGROUND_LAUNCH=1`.
- Never steal monitor focus or reveal test windows: no `show()`, `showInactive()`, `bringToFront()`, `app.focus()`, or OS activation. Use CDP screenshots of hidden renderers.
- Keep native-focus and visible-window tests paused on the user's desktop; run them on an isolated display or CI.
- Rebuild modified launch-policy code before running an app (stale build wrappers are not safe).
- Use the `$electron` skill and Playwright CDP for rendered Orca UI checks. Do not use computer-use for Orca UI validation.
- Rendered UI E2E checks need an explicit, reproducible viewport and state.
- Screenshot presentational components without Electron: `pnpm fixtures:shot <id>` ([fixtures](docs/agents-md-refs/component-fixtures.md)).

# Code Style

## Reuse Before Reimplementing

Before writing new logic at any scale extend or generalize it instead of building a parallel version.

## Avoid Comments

- Only use when code does not describe
- BE CONCISE. 1 LINE if possible (why not how)

## File and Module Naming

Never use vague names like `helpers`, `utils`, `common`, `misc`, or `shared-stuff` for files, folders, or modules. They carry zero info and tend to become dumping grounds. Name files after what they _actually_ contain — prefer the concrete domain concept (e.g. `tab-group-state.ts`, `terminal-orphan-cleanup.ts`) over the generic role (`tabs-helpers.ts`, `terminal-utils.ts`). If you find yourself reaching for `helpers`, the file probably has more than one responsibility and should be split, or there's a better name hiding in the code that describes what the functions operate on.

# First Class Citizens

Every change must consider these areas:

1. Cross-Platform Support (mac/linux/windows)
   - Guard platform-specific behavior at runtime; use platform-aware shortcuts, paths, and existing process wrappers. Before changing platform-specific code, processes, shells, shortcuts, paths, or native modules, read [`docs/agents-md-refs/cross-platform-support.md`](./docs/agents-md-refs/cross-platform-support.md).
2. Remote hosts
   - Features should work locally and on remote hosts
3. Mobile
4. Folder Workspaces
   - Don't assume every workspace is a git worktree.

# Footguns

## Git / GitHub

If changing code around `git`, `gh`, source-control, or review behavior read [`docs/agents-md-refs/git-workflow.md`](./docs/agents-md-refs/git-workflow.md).
