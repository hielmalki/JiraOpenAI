# Codex Execution Restrictions

This file defines mandatory rules that Codex must follow when modifying this repository.

---

## 0. Git Branch Safety (MANDATORY)

Before modifying ANY file, Codex must:

1. Create a new feature branch.
2. Branch name format:
   feature/<short-description>
   bugfix/<short-description>
   refactor/<short-description>
   "codex" as feature name not allowed

3. The branch must be created from:
   - main (default)
   - OR the currently active base branch if specified

4. Codex must NEVER:
   - Commit directly to any feature branch
   - Commit directly to main
   - Commit directly to master
   - Push changes without a feature branch

5. After creating the branch:
   - All edits must occur inside this branch
   - Changes must be committed with clear messages
   - Provide a summary of commits made

Example:

git checkout -b feature/add-user-validation

## 1. Build Integrity

Before finishing any task:

- The project must compile successfully.
- No build errors are allowed.
- No new warnings may be introduced.

If the build fails, Codex must fix the issue before completing the task.

---

## 2. Test Safety

- All existing tests must pass.
- No existing tests may be removed unless explicitly requested.
- If new functionality is added, appropriate tests must be added.
- If a test fails, Codex must:
  1. Identify the root cause
  2. Fix the issue
  3. Re-run the test suite

Codex must not finish while any test is failing.

---

## 3. No Behavioral Changes (Unless Requested)

- Refactoring must not change behavior.
- Public APIs must remain backward compatible unless explicitly instructed.
- Breaking changes must be clearly documented.

---

## 4. Code Quality Rules

Codex must ensure:

- No TODO comments remain.
- No unused imports.
- No dead code.
- No duplicated logic.
- Clear and meaningful variable names.
- Functions/classes follow single responsibility principle.

---

## 5. Minimal & Clean Changes

- Only modify what is necessary.
- Avoid large, unrelated refactors.
- Keep diffs small and focused.
- Preserve existing project structure.

---

## 6. Documentation

If behavior changes or new features are introduced:

- Update README if necessary.
- Add inline documentation for complex logic.
- Provide a summary of changes.

---

## 7. Final Verification Checklist (MANDATORY)

Before completing the task, Codex must verify:

- [ ] Project builds successfully
- [ ] All tests pass
- [ ] No new warnings introduced
- [ ] No TODOs remain
- [ ] No unused imports
- [ ] Summary of changes provided

Codex must not terminate execution until all checklist items are satisfied.
