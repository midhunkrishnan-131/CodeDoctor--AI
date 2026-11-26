# CodeDoctor AI static client

This folder is a standalone HTML, CSS, and JavaScript client for CodeDoctor AI. It does not use the React app or an npm install. `vanilla/` is a copy of these same files.

The React app, environment variables, and both servers are documented in the [root README](../README.md).

## Run the page

Monaco is loaded from a CDN, so the browser needs network access for the editor.

- Open `index.html` directly in a browser, or
- From this directory, serve it with Python:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Connect a backend

From the repository root, with the virtualenv in the root README active:

```bash
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

That server redirects `/` to this client at `/vanilla` and serves the API on the same origin.

If you open the files another way, the page calls `http://localhost:8000` unless it is already hosted on port 8000 or 3000. Settings can set a different base URL. When the API is unreachable, Run and Diagnose fall back to an in-browser simulation.

The dev React server (`npm run dev` in the repository root) also exposes the same API on port 3000. Point Settings at `http://localhost:3000` if that is the server you started.
