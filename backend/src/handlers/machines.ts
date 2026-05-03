import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { v4 as uuid } from 'uuid'
import { resolveGrindLimits } from '../constants/grind'
import { db, TABLE, userPK, machineSK, PutCommand, QueryCommand, DeleteCommand, GetCommand } from '../services/dynamodb'
import { ok, created, noContent, badRequest, serverError } from '../utils/response'
import type { Machine } from '../types'

const USER_ID = 'default' // replaced with JWT sub when auth is added

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const method = event.httpMethod
    const machineId = event.pathParameters?.machineId

    if (method === 'GET') {
      const result = await db.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: { ':pk': userPK(USER_ID), ':prefix': 'MACHINE#' },
      }))
      return ok((result.Items ?? []).map(stripKeys))
    }

    if (method === 'POST') {
      const body = JSON.parse(event.body ?? '{}')
      if (!body.name || !body.model) return badRequest('name and model are required')
      const limits = resolveGrindLimits({
        grindSettingMin: body.grindSettingMin,
        grindSettingMax: body.grindSettingMax,
      })
      const machine: Machine = {
        machineId: uuid(),
        userId: USER_ID,
        name: body.name,
        model: body.model,
        grindSettingMin: limits.min,
        grindSettingMax: limits.max,
        createdAt: new Date().toISOString(),
      }
      await db.send(new PutCommand({
        TableName: TABLE,
        Item: { PK: userPK(USER_ID), SK: machineSK(machine.machineId), ...machine },
      }))
      return created(machine)
    }

    if (method === 'PATCH' && machineId) {
      const body = JSON.parse(event.body ?? '{}')
      const existing = await db.send(new GetCommand({
        TableName: TABLE,
        Key: { PK: userPK(USER_ID), SK: machineSK(machineId) },
      }))
      const item = existing.Item
      if (!item) return badRequest('Machine not found')
      const prev = stripKeys(item) as unknown as Machine
      const limits = resolveGrindLimits({
        grindSettingMin: body.grindSettingMin ?? prev.grindSettingMin,
        grindSettingMax: body.grindSettingMax ?? prev.grindSettingMax,
      })
      const next: Machine = {
        ...prev,
        ...(body.name != null && body.name !== '' ? { name: String(body.name) } : {}),
        ...(body.model != null && body.model !== '' ? { model: String(body.model) } : {}),
        grindSettingMin: limits.min,
        grindSettingMax: limits.max,
      }
      await db.send(new PutCommand({
        TableName: TABLE,
        Item: { PK: userPK(USER_ID), SK: machineSK(machineId), ...next },
      }))
      return ok(next)
    }

    if (method === 'DELETE' && machineId) {
      await db.send(new DeleteCommand({
        TableName: TABLE,
        Key: { PK: userPK(USER_ID), SK: machineSK(machineId) },
      }))
      return noContent()
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
