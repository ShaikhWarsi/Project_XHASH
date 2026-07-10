# Contributing

Thanks for your interest in contributing to the Trading Engine!

## Code of Conduct

This project adheres to the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating you agree to its terms.

## How to Contribute

1. **Fork** the repository
2. **Create a branch** (`git checkout -b feature/my-feature`)
3. **Make changes** following the existing code style
4. **Run tests** — `pytest` for backend, `cd frontend && npm test` for frontend
5. **Run lint** — `ruff check .` for Python, `cd frontend && npm run lint` for TypeScript
6. **Submit a pull request** against the `main` branch

## Development Setup

```bash
# Backend
pip install -e ".[dev,llm,live,ml]"
cp .env.example .env  # edit as needed
pytest

# Frontend
cd frontend
npm install
npm run dev
```

## Code Style

- Python: follow ruff defaults (line length 120)
- TypeScript/React: follow eslint + prettier config
- Tests required for new features
- Keep PRs focused on a single concern
