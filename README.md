# mcp-recreation-gov

Recreation.gov MCP — wraps the Recreation Information Database (RIDB) API v1 (ridb.recreation.gov), the official catalog of US federal outdoor recreation: campgrounds, national park & national forest recreation areas, facilities, and individual campsites bookable on Recreation.gov.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1866+ live data sources. This is an independent, unofficial integration — not affiliated with, endorsed by, or published by the upstream provider.

## Tools

| Tool | Description |
|------|-------------|
| `search_facilities` | Search US federal recreation facilities — campgrounds, day-use areas, visitor centers, trailheads — on Recreation.gov. Filter by name/keyword, state, activity (e.g. "camping", "hiking"), or geographic radius. Returns facility IDs, names, types, phone/email, and coordinates. Example: search_facilities({ query: "Yosemite", state: "CA", activity: "camping" }) |
| `get_facility` | Get full details for a single Recreation.gov facility (e.g. a campground) by its FacilityID. Returns description, directions, ADA access, phone/email, keywords, and coordinates. Example: get_facility({ facility_id: "232447" }) |
| `search_recareas` | Search US federal recreation areas — the parent regions (national parks, national forests, BLM/USACE lands) that contain campgrounds and facilities — on Recreation.gov. Filter by name/keyword or state. Returns RecArea IDs, names, descriptions, phone, and coordinates. Example: search_recareas({ query: "Grand Canyon", state: "AZ" }) |
| `list_campsites` | List the individual campsites within a Recreation.gov facility (campground) by FacilityID. Returns campsite IDs, names, type (e.g. "TENT ONLY", "RV"), loop, reservability, and type of use. Example: list_campsites({ facility_id: "232447" }) |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "recreation-gov": {
      "url": "https://gateway.pipeworx.io/recreation-gov/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/recreation-gov/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1866+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/search_facilities \
  -H 'Content-Type: application/json' \
  -d '{}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/search_facilities`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.

## Run it from npm

`@pipeworx/mcp-recreation-gov` is a local stdio bridge to the Pipeworx gateway: your MCP client
starts it with `npx`, and it forwards every call to the same
`https://gateway.pipeworx.io/recreation-gov/mcp` endpoint shown above. It needs network access;
there is no offline mode.

```json
{
  "mcpServers": {
    "recreation-gov": {
      "command": "npx",
      "args": ["-y", "@pipeworx/mcp-recreation-gov"]
    }
  }
}
```

Without a key it calls anonymously, capped at 50 calls a day. A free account
raises that to 200 a day: get a key at https://pipeworx.io/signup and add
`"env": { "PIPEWORX_API_KEY": "<your key>" }` to the server entry.
The key is sent as a Bearer token, the same way a hosted connection sends it,
so calls are metered and billed exactly as they are there.

It lists **only** this pack's tools by default. Set `PIPEWORX_META_TOOLS=1` to
also list `ask_pipeworx` and the other gateway-wide tools.

Behind an HTTPS proxy: Node's built-in `fetch` does not read `HTTPS_PROXY` by
default. Newer Node releases honour it when `NODE_USE_ENV_PROXY=1` is set; check
your Node version's documentation.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Recreation Gov data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
