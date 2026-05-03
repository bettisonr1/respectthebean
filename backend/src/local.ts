import { createServer } from 'node:http'
import type { IncomingMessage } from 'node:http'
import { parse as parseUrl } from 'node:url'
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { handler as machinesHandler } from './handlers/machines'
import { handler as beansHandler } from './handlers/beans'
import { handler as shotsHandler } from './handlers/shots'
import { handler as recommendationsHandler } from './handlers/recommendations'
import { uploadUrlHandler } from './handlers/artwork'

type Route = {
  method: string
  pattern: RegExp
  handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>
  pathParameters: (match: RegExpMatchArray) => Record<string, string>
}

const PORT = Number(process.env.PORT ?? 3001)

const routes: Route[] = [
  {
    method: 'GET',
    pattern: /^\/machines$/,
    handler: machinesHandler,
    pathParameters: () => ({}),
  },
  {
    method: 'POST',
    pattern: /^\/machines$/,
    handler: machinesHandler,
    pathParameters: () => ({}),
  },
  {
    method: 'DELETE',
    pattern: /^\/machines\/([^/]+)$/,
    handler: machinesHandler,
    pathParameters: (match) => ({ machineId: decodeURIComponent(match[1]) }),
  },
  {
    method: 'PATCH',
    pattern: /^\/machines\/([^/]+)$/,
    handler: machinesHandler,
    pathParameters: (match) => ({ machineId: decodeURIComponent(match[1]) }),
  },
  {
    method: 'GET',
    pattern: /^\/beans$/,
    handler: beansHandler,
    pathParameters: () => ({}),
  },
  {
    method: 'POST',
    pattern: /^\/beans$/,
    handler: beansHandler,
    pathParameters: () => ({}),
  },
  {
    method: 'DELETE',
    pattern: /^\/beans\/([^/]+)$/,
    handler: beansHandler,
    pathParameters: (match) => ({ beanId: decodeURIComponent(match[1]) }),
  },
  {
    method: 'GET',
    pattern: /^\/beans\/barcode\/([^/]+)$/,
    handler: beansHandler,
    pathParameters: (match) => ({ barcode: decodeURIComponent(match[1]) }),
  },
  {
    method: 'GET',
    pattern: /^\/shots$/,
    handler: shotsHandler,
    pathParameters: () => ({}),
  },
  {
    method: 'POST',
    pattern: /^\/shots$/,
    handler: shotsHandler,
    pathParameters: () => ({}),
  },
  {
    method: 'PATCH',
    pattern: /^\/shots\/([^/]+)$/,
    handler: shotsHandler,
    pathParameters: (match) => ({ shotId: decodeURIComponent(match[1]) }),
  },
  {
    method: 'GET',
    pattern: /^\/recommendations\/([^/]+)\/([^/]+)$/,
    handler: recommendationsHandler,
    pathParameters: (match) => ({
      beanId: decodeURIComponent(match[1]),
      machineId: decodeURIComponent(match[2]),
    }),
  },
  {
    method: 'GET',
    pattern: /^\/artwork\/upload-url\/([^/]+)$/,
    handler: uploadUrlHandler,
    pathParameters: (match) => ({ shotId: decodeURIComponent(match[1]) }),
  },
]

createServer(async (req, res) => {
  try {
    const parsed = parseUrl(req.url ?? '', true)
    const path = parsed.pathname ?? '/'
    const method = (req.method ?? 'GET').toUpperCase()

    if (method === 'OPTIONS') {
      res.writeHead(204, corsHeaders())
      res.end()
      return
    }

    const route = routes.find((candidate) => {
      if (candidate.method !== method) return false
      return candidate.pattern.test(path)
    })

    if (!route) {
      res.writeHead(404, { 'Content-Type': 'application/json', ...corsHeaders() })
      res.end(JSON.stringify({ error: 'Not found' }))
      return
    }

    const match = path.match(route.pattern)
    if (!match) {
      res.writeHead(404, { 'Content-Type': 'application/json', ...corsHeaders() })
      res.end(JSON.stringify({ error: 'Not found' }))
      return
    }

    const body = await readBody(req)
    const queryStringParameters = mapQueryParams(parsed.query)

    const event = {
      body: body.length > 0 ? body : null,
      headers: {},
      httpMethod: method,
      isBase64Encoded: false,
      multiValueHeaders: {},
      multiValueQueryStringParameters: null,
      path,
      pathParameters: route.pathParameters(match),
      queryStringParameters,
      requestContext: {} as APIGatewayProxyEvent['requestContext'],
      resource: path,
      stageVariables: null,
    } as APIGatewayProxyEvent

    const lambdaResponse = await route.handler(event)

    res.writeHead(lambdaResponse.statusCode, {
      ...(lambdaResponse.headers ?? {}),
      ...corsHeaders(),
    })
    res.end(lambdaResponse.body)
  } catch (error) {
    console.error(error)
    res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders() })
    res.end(JSON.stringify({ error: 'Internal server error' }))
  }
}).listen(PORT, () => {
  console.log(`Local API listening on http://localhost:${PORT}`)
})

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function mapQueryParams(query: Record<string, string | string[] | undefined>) {
  const entries = Object.entries(query).flatMap(([key, value]) => {
    if (typeof value === 'undefined') return []
    if (Array.isArray(value)) return [[key, value[0]]]
    return [[key, value]]
  })

  if (entries.length === 0) return null
  return Object.fromEntries(entries)
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.FRONTEND_URL ?? '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  }
}
