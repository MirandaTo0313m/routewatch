# routewatch

Lightweight middleware that logs and visualizes API route usage patterns in Express/Fastify apps.

## Installation

```bash
npm install routewatch
```

## Usage

### Express

```typescript
import express from "express";
import { routewatch } from "routewatch";

const app = express();

app.use(routewatch({
  logLevel: "info",
  visualize: true,
  outputPath: "./routewatch-report.html"
}));

app.get("/users", (req, res) => res.json({ users: [] }));
app.post("/users", (req, res) => res.status(201).json({ created: true }));

app.listen(3000, () => console.log("Server running on port 3000"));
```

### Fastify

```typescript
import Fastify from "fastify";
import { routewatchPlugin } from "routewatch";

const app = Fastify();

await app.register(routewatchPlugin, { logLevel: "warn" });
```

After running your server, routewatch tracks hit counts, response times, and status codes per route. A visual HTML report is generated at the configured `outputPath`.

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `logLevel` | `string` | `"info"` | Log verbosity level |
| `visualize` | `boolean` | `false` | Generate HTML usage report |
| `outputPath` | `string` | `"./report.html"` | Report output location |

## License

[MIT](./LICENSE)