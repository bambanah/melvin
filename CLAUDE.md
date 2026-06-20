## Dev Docs

When you've just finished creating a plan, create dev docs so that we can have a record of the plan and next steps:

1. **Create Task Directory**

- `mkdir -p ./docs/plans/[task-name]/`

2. **Create Documents**

- `[task-name]-plan.md` - The accepted plan
- `[task-name]-context.md` - Key files, decisions
- `[task-name]-tasks.md` - Checklist of work

3. **Update Regularly**

- Mark tasks complete immediately

### Continuing a Task

- Check `/docs/plans/` for existing tasks
- Read all three files before proceeding
- Update "Last Updated" timestamps

## Agent skills

### Issue tracker

GitHub Issues for bambanah/melvin. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
