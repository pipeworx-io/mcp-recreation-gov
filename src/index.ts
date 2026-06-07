interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Recreation.gov MCP — wraps the Recreation Information Database (RIDB) API v1
 * (ridb.recreation.gov), the official catalog of US federal outdoor recreation:
 * campgrounds, national park & national forest recreation areas, facilities,
 * and individual campsites bookable on Recreation.gov.
 *
 * Tools:
 * - search_facilities: find campgrounds / facilities by name, state, activity, or geo radius
 * - get_facility: full detail for one facility (campground) incl. directions & ADA access
 * - search_recareas: find recreation areas (national parks/forests regions)
 * - list_campsites: list the individual campsites within a facility (campground)
 *
 * Auth: RIDB API key in the `apikey` request HEADER (not a query param).
 * Dual-key model: _apiKey is OPTIONAL — pass your own RIDB key for higher
 * limits, or omit it to use the shared Pipeworx key (injected by the gateway).
 */


const BASE_URL = 'https://ridb.recreation.gov/api/v1';

// RIDB description fields routinely contain raw HTML — strip tags before
// returning so agents get clean prose, not markup.
function stripHtml(s: string | undefined | null): string {
  return (s || '').replace(/<[^>]+>/g, '');
}

const tools: McpToolExport['tools'] = [
  {
    name: 'search_facilities',
    description:
      'Search US federal recreation facilities — campgrounds, day-use areas, visitor centers, trailheads — on Recreation.gov. Filter by name/keyword, state, activity (e.g. "camping", "hiking"), or geographic radius. Returns facility IDs, names, types, phone/email, and coordinates. Example: search_facilities({ query: "Yosemite", state: "CA", activity: "camping" })',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Keyword or name to search, e.g. "Yosemite", "Pinnacles"' },
        state: { type: 'string', description: 'Two-letter US state code, e.g. "CA", "CO"' },
        activity: { type: 'string', description: 'Activity name to filter by, e.g. "camping", "hiking", "fishing"' },
        limit: { type: 'number', description: 'Max results to return (default 20, max 50)' },
        offset: { type: 'number', description: 'Pagination offset (default 0)' },
        latitude: { type: 'number', description: 'Latitude for geographic search (use with longitude + radius)' },
        longitude: { type: 'number', description: 'Longitude for geographic search (use with latitude + radius)' },
        radius: { type: 'number', description: 'Search radius in miles around latitude/longitude' },
        _apiKey: {
          type: 'string',
          description:
            'Optional — your own Recreation.gov RIDB API key for higher limits; omit to use the shared Pipeworx key.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_facility',
    description:
      'Get full details for a single Recreation.gov facility (e.g. a campground) by its FacilityID. Returns description, directions, ADA access, phone/email, keywords, and coordinates. Example: get_facility({ facility_id: "232447" })',
    inputSchema: {
      type: 'object' as const,
      properties: {
        facility_id: { type: 'string', description: 'RIDB FacilityID, e.g. "232447"' },
        _apiKey: {
          type: 'string',
          description:
            'Optional — your own Recreation.gov RIDB API key for higher limits; omit to use the shared Pipeworx key.',
        },
      },
      required: ['facility_id'],
    },
  },
  {
    name: 'search_recareas',
    description:
      'Search US federal recreation areas — the parent regions (national parks, national forests, BLM/USACE lands) that contain campgrounds and facilities — on Recreation.gov. Filter by name/keyword or state. Returns RecArea IDs, names, descriptions, phone, and coordinates. Example: search_recareas({ query: "Grand Canyon", state: "AZ" })',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Keyword or name to search, e.g. "Grand Canyon"' },
        state: { type: 'string', description: 'Two-letter US state code, e.g. "AZ"' },
        limit: { type: 'number', description: 'Max results to return (default 20, max 50)' },
        offset: { type: 'number', description: 'Pagination offset (default 0)' },
        _apiKey: {
          type: 'string',
          description:
            'Optional — your own Recreation.gov RIDB API key for higher limits; omit to use the shared Pipeworx key.',
        },
      },
      required: [],
    },
  },
  {
    name: 'list_campsites',
    description:
      'List the individual campsites within a Recreation.gov facility (campground) by FacilityID. Returns campsite IDs, names, type (e.g. "TENT ONLY", "RV"), loop, reservability, and type of use. Example: list_campsites({ facility_id: "232447" })',
    inputSchema: {
      type: 'object' as const,
      properties: {
        facility_id: { type: 'string', description: 'RIDB FacilityID of the campground, e.g. "232447"' },
        limit: { type: 'number', description: 'Max campsites to return (default 20, max 50)' },
        _apiKey: {
          type: 'string',
          description:
            'Optional — your own Recreation.gov RIDB API key for higher limits; omit to use the shared Pipeworx key.',
        },
      },
      required: ['facility_id'],
    },
  },
];

interface RidbMetadata {
  RESULTS?: { CURRENT_COUNT?: number; TOTAL_COUNT?: number };
}

interface FacilityRecord {
  FacilityID?: string | number;
  FacilityName?: string;
  FacilityTypeDescription?: string;
  FacilityDescription?: string;
  FacilityPhone?: string;
  FacilityEmail?: string;
  Reservable?: boolean;
  FacilityLatitude?: number;
  FacilityLongitude?: number;
  FacilityDirections?: string;
  Keywords?: string;
  FacilityAdaAccess?: string;
}

async function ridbGet(
  path: string,
  params: URLSearchParams | undefined,
  apiKey: string,
): Promise<unknown> {
  const qs = params?.toString();
  const url = `${BASE_URL}${path}${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: { apikey: apiKey, Accept: 'application/json' } });
  if (!res.ok) {
    const text = await res.text();
    return { error: res.status, message: text };
  }
  return res.json();
}

function clamp(n: unknown, def: number, max: number): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v) || v <= 0) return def;
  return Math.min(max, Math.floor(v));
}

function mapFacility(f: FacilityRecord) {
  return {
    id: f.FacilityID,
    name: f.FacilityName,
    type: f.FacilityTypeDescription,
    description: stripHtml(f.FacilityDescription).slice(0, 300),
    phone: f.FacilityPhone,
    email: f.FacilityEmail,
    reservable: f.Reservable,
    lat: f.FacilityLatitude,
    lon: f.FacilityLongitude,
  };
}

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const apiKey = args._apiKey as string;
  delete args._apiKey;

  if (!apiKey) {
    return { error: 'api_key_required', message: 'No Recreation.gov key available.' };
  }

  switch (name) {
    case 'search_facilities': {
      const limit = clamp(args.limit, 20, 50);
      const offset = Number.isFinite(Number(args.offset)) ? Math.max(0, Math.floor(Number(args.offset))) : 0;
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (args.query) params.set('query', args.query as string);
      if (args.state) params.set('state', args.state as string);
      if (args.activity) params.set('activity', args.activity as string);
      if (args.latitude !== undefined) params.set('latitude', String(args.latitude));
      if (args.longitude !== undefined) params.set('longitude', String(args.longitude));
      if (args.radius !== undefined) params.set('radius', String(args.radius));

      const data = (await ridbGet('/facilities', params, apiKey)) as
        | { RECDATA?: FacilityRecord[]; METADATA?: RidbMetadata }
        | { error: unknown; message: unknown };
      if ('error' in data) return data;

      return {
        total: data.METADATA?.RESULTS?.TOTAL_COUNT,
        facilities: (data.RECDATA || []).map(mapFacility),
      };
    }

    case 'get_facility': {
      const id = args.facility_id as string;
      const data = (await ridbGet(`/facilities/${encodeURIComponent(id)}`, undefined, apiKey)) as
        | FacilityRecord
        | { error: unknown; message: unknown };
      if ('error' in data) return data;

      const f = data as FacilityRecord;
      return {
        ...mapFacility(f),
        directions: stripHtml(f.FacilityDirections).slice(0, 500),
        keywords: f.Keywords,
        ada_access: f.FacilityAdaAccess,
      };
    }

    case 'search_recareas': {
      const limit = clamp(args.limit, 20, 50);
      const offset = Number.isFinite(Number(args.offset)) ? Math.max(0, Math.floor(Number(args.offset))) : 0;
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (args.query) params.set('query', args.query as string);
      if (args.state) params.set('state', args.state as string);

      const data = (await ridbGet('/recareas', params, apiKey)) as
        | {
            RECDATA?: Array<{
              RecAreaID?: string | number;
              RecAreaName?: string;
              RecAreaDescription?: string;
              RecAreaPhone?: string;
              RecAreaLatitude?: number;
              RecAreaLongitude?: number;
            }>;
            METADATA?: RidbMetadata;
          }
        | { error: unknown; message: unknown };
      if ('error' in data) return data;

      return {
        total: data.METADATA?.RESULTS?.TOTAL_COUNT,
        recareas: (data.RECDATA || []).map((r) => ({
          id: r.RecAreaID,
          name: r.RecAreaName,
          description: stripHtml(r.RecAreaDescription).slice(0, 300),
          phone: r.RecAreaPhone,
          lat: r.RecAreaLatitude,
          lon: r.RecAreaLongitude,
        })),
      };
    }

    case 'list_campsites': {
      const id = args.facility_id as string;
      const limit = clamp(args.limit, 20, 50);
      const params = new URLSearchParams({ limit: String(limit) });

      const data = (await ridbGet(`/facilities/${encodeURIComponent(id)}/campsites`, params, apiKey)) as
        | {
            RECDATA?: Array<{
              CampsiteID?: string | number;
              CampsiteName?: string;
              CampsiteType?: string;
              Loop?: string;
              CampsiteReservable?: boolean;
              TypeOfUse?: string;
            }>;
            METADATA?: RidbMetadata;
          }
        | { error: unknown; message: unknown };
      if ('error' in data) return data;

      return {
        total: data.METADATA?.RESULTS?.TOTAL_COUNT,
        campsites: (data.RECDATA || []).map((c) => ({
          id: c.CampsiteID,
          name: c.CampsiteName,
          type: c.CampsiteType,
          loop: c.Loop,
          reservable: c.CampsiteReservable,
          type_of_use: c.TypeOfUse,
        })),
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
