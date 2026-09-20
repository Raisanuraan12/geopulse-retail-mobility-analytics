# Contribution Guide

## Branching Strategy

All work is done on personal development branches. Never commit directly to `main`.

```
main              # stable integrated code
└── dev/shubhamgawari64   # contributor branch (this contributor)
```

Create your branch:
```bash
git checkout -b dev/shubhamgawari64
```

## Commit Discipline

- **At least one meaningful commit per working day** on your active branch.
- Use [Conventional Commits](https://www.conventionalcommits.org/) format:

| Prefix     | When to use                              |
|------------|------------------------------------------|
| `feat`     | New feature or capability                |
| `fix`      | Bug fix                                  |
| `test`     | Adding or improving tests                |
| `docs`     | Documentation changes                    |
| `refactor` | Code restructure without behaviour change|
| `chore`    | Build, deps, config changes              |

Example:
```
feat(ingestion): add GPS ping CSV loader with validation logic
```

## Pull Request Process

1. Open a PR from your branch into `main`.
2. Ensure `pytest` passes locally before requesting review.
3. PR description must include: **What changed**, **Why**, **How to test**.
4. At least one team member must approve before merge.

## Running Tests

```bash
# Install dependencies
pip install -r requirements.txt

# Run all tests
pytest tests/ -v

# Run a specific test file
pytest tests/test_gps_ingestion.py -v
```

## dbt Workflow

```bash
cd dbt

# Validate models compile
dbt compile --target dev

# Run staging models
dbt run --select staging --target dev

# Run marts
dbt run --select marts --target dev

# Run tests
dbt test --target dev
```

## API Development

```bash
# Start the FastAPI dev server
uvicorn src.api.main:app --reload --port 8000

# API docs available at:
# http://localhost:8000/docs
```

## Code Style

- Python: follow PEP 8; use `black` for formatting, `ruff` for linting.
- SQL (dbt): use lowercase keywords, 4-space indentation, align `as` clauses.
- JS/JSX: use Prettier with 2-space indent, single quotes.

## Questions?

Open a GitHub Issue or reach out in the team Slack channel.
