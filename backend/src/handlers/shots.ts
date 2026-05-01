import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { v4 as uuid } from 'uuid'
import { db, TABLE, userPK, shotSK, PutCommand, QueryCommand, UpdateCommand } from '../services/dynamodb'
import { ok, created, badRequest, serverError } from '../utils/response'
import type { Shot } from '../types'

const USER_ID = 'default'

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const method = event.httpMethod
    const shotId = event.pathParameters?.shotId

    if (method === 'GET') {
      const { beanId, machineId } = event.queryStringParameters ?? {}
      const result = await db.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: { ':pk': userPK(USER_ID), ':prefix': 'SHOT#' },
        ScanIndexForward: false,
      }))
      let items = (result.Items ?? []).map(stripKeys) as unknown as Shot[]
      if (beanId) items = items.filter(s => s.beanId === beanId)
      if (machineId) items = items.filter(s => s.machineId === machineId)
      return ok(items)
    }

    if (method === 'POST') {
      const body = JSON.parse(event.body ?? '{}')
      if (!body.beanId || !body.machineId) return badRequest('beanId and machineId are required')
      const now = new Date().toISOString()
      const shot: Shot = {
        shotId: uuid(),
        userId: USER_ID,
        beanId: body.beanId,
        machineId: body.machineId,
        grindSetting: body.grindSetting,
        doseIn: body.doseIn,
        createdAt: now,
      }
      await db.send(new PutCommand({
        TableName: TABLE,
        Item: { PK: userPK(USER_ID), SK: shotSK(now, shot.shotId), ...shot },
      }))
      return created(shot)
    }

    if (method === 'PATCH' && shotId) {
      const body = JSON.parse(event.body ?? '{}')
      const updates = Object.entries(body).filter(([k]) => k !== 'shotId' && k !== 'userId')
      if (updates.length === 0) return badRequest('No fields to update')

      const expressions = updates.map(([k], i) => `#f${i} = :v${i}`)
      const names = Object.fromEntries(updates.map(([k], i) => [`#f${i}`, k]))
      const values = Object.fromEntries(updates.map(([k, v], i) => [`:v${i}`, v]))

      // Reconstruct SK — we need the createdAt; fetch it first
      const queryResult = await db.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        FilterExpression: 'shotId = :sid',
        ExpressionAttributeValues: {
          ':pk': userPK(USER_ID),
          ':prefix': 'SHOT#',
          ':sid': shotId,
        },
      }))
      const item = queryResult.Items?.[0]
      if (!item) return badRequest('Shot not found')

      await db.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: item.PK, SK: item.SK },
        UpdateExpression: `SET ${expressions.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      }))
      return ok({ shotId, ...body })
    }

    return badRequest('Method not supported')
  } catch (err) {
    return serverError(err)
  }
}

function stripKeys(item: Record<string, unknown>) {
  const { PK, SK, ...rest } = item
  void PK; void SK
  return rest
}
