# Release

- **Versioning:** semver tags `vX.Y.Z`
- **Tool:** plain entry files under `.changes/unreleased/<issue>-<slug>.md`, compiled by the `changelog` skill into `CHANGELOG.md`
- **Deploy surfaces:** single deployable — the `terminal-code` Bun/OpenTUI CLI app; one version covers the whole product
- **Decision:** see `docs/adr/0001-changelog-via-changes-files.md`
