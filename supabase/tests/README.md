These tests execute the analytics migration in a disposable PostgreSQL engine.
They do not connect to the linked Supabase project.

From the repository root in PowerShell:

```powershell
npm.cmd install --prefix .tmp/analytics-tests --no-save --package-lock=false --ignore-scripts @electric-sql/pglite@0.5.8
$env:PGLITE_MODULE = ([System.Uri]::new((Join-Path (Get-Location) '.tmp/analytics-tests/node_modules/@electric-sql/pglite/dist/index.js'))).AbsoluteUri
node --test --test-isolation=none app/lib/*.test.mjs supabase/tests/analytics-action-occurrences.test.mjs
```

The `.tmp/analytics-tests` directory is disposable and should not be committed.
