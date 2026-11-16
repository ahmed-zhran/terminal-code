# Changelog via plain `.changes/` files

terminal-code is a single Bun package without conventional-commit tooling or a Changesets monorepo. Release notes are authored as one markdown file per issue under `.changes/unreleased/<issue>-<slug>.md` and compiled by the `changelog` skill into `CHANGELOG.md` with semver tags `vX.Y.Z`.

**Considered options:** Changesets (overkill for one package), release-please (needs conventional commits we do not enforce), plain `.changes/` (chosen).
