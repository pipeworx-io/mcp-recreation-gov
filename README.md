# mcp-recreation-gov

Recreation.gov MCP — wraps the Recreation Information Database (RIDB) API v1

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1481+ live data sources.

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
    "recreation_gov": {
      "url": "https://gateway.pipeworx.io/recreation_gov/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/recreation_gov/mcp` returns the tools in the table
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

Both URLs reach the same gateway and the same 1481+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

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
