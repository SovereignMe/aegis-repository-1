# Trust Governance Backend Standalone

This bundle is meant to run by itself.

## Structure
- `backend/` — API server
- `shared/` — shared compiled domain/permissions/policy modules required by the backend

## Clean install on Windows
From the `backend` folder:

```bash
rmdir /s /q node_modules
npm install
npm run dev
```

If PowerShell blocks `rmdir /s /q`, use:

```powershell
Remove-Item -Recurse -Force node_modules
npm install
npm run dev
```

## Why the prior bundle failed
The previous split bundle included `node_modules`, which can produce local binary/version conflicts like:
`Host version "0.27.4" does not match binary version "0.27.7"`

This standalone bundle omits `node_modules` so dependencies are rebuilt locally.

## Default health check
`http://localhost:4000/health`
