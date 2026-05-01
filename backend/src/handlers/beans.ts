import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { v4 as uuid } from 'uuid'
import { db, TABLE, userPK, beanSK, PutCommand, QueryCommand, DeleteCommand } from '../services/dynamodb'
import { ok, created, noContent, badRequest, notFound, serverError } from '../utils/response'
import type { Bean } from '../types'

const USER_ID = 'default'

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const method = event.httpMethod
    const beanId = event.pathParameters?.beanId
    const barcode = event.pathParameters?.barcode

    if (method === 'GET' && barcode) {
      return await lookupBarcode(barcode)
    }

    if (method === 'GET') {
      const result = await db.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: { ':pk': userPK(USER_ID), ':prefix': 'BEAN#' },
      }))
      return ok((result.Items ?? []).map(stripKeys))
    }

    if (method === 'POST') {
      const body = JSON.parse(event.body ?? '{}')
      if (!body.roaster || !body.name) return badRequest('roaster and name are required')
      const bean: Bean = {
        beanId: uuid(),
        userId: USER_ID,
        roaster: body.roaster,
        name: body.name,
        origin: body.origin ?? '',
        roastLevel: body.roastLevel ?? 'medium',
        roastDate: body.roastDate ?? '',
        tastingNotes: body.tastingNotes,
        barcode: body.barcode,
        createdAt: new Date().toISOString(),
      }
      await db.send(new PutCommand({
        TableName: TABLE,
        Item: { PK: userPK(USER_ID), SK: beanSK(bean.beanId), ...bean },
      }))
      return created(bean)
    }

    if (method === 'DELETE' && beanId) {
      await db.send(new DeleteCommand({
        TableName: TABLE,
        Key: { PK: userPK(USER_ID), SK: beanSK(beanId) },
      }))
      return noContent()
    }

    return badRequest('Method not supported')
  } catch (err) {
    return serverError(err)
  }
}

async function lookupBarcode(barcode: string): Promise<APIGatewayProxyResult> {
  // Stub: in production, query an external specialty coffee / Open Food Facts API
  // For now, return not found so the client falls back to manual entry
  void barcode
  return notFound('Barcode not found in database')
}

function stripKeys(item: Record<string, unknown>) {
  const { PK, SK, ...rest } = item
  void PK; void SK
  return rest
}
