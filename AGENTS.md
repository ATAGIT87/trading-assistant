# Repository maintenance

After every change, keep the project structure clean:

- Remove unused files, methods, imports, and exports after checking their callers and runtime registration.
- Remove temporary artifacts and empty source directories created during the work.
- Keep meaningful regression tests; remove obsolete tests and disposable debugging scripts.
- Keep production code in `src/production`, tests and research in `test`, and maintenance tools in `operations`. Production must not import tests or research.
- Preserve useful historical evidence, datasets, user changes, and secrets. Source cleanup does not authorize deleting database records.
- Keep generated build output ignored. Use `build:test`, which clears its previous generated output before compiling.
- Run checks appropriate to the change, including `pnpm check:structure` for source changes and `git diff --check`. Update structure and API documentation when responsibilities or routes change.

Do this cleanup as part of completing each task, without a separate confirmation for routine, authorized source cleanup.
