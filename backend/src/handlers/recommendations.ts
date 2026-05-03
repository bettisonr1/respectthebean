import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { resolveGrindLimits } from '../constants/grind'
import { db, TABLE, userPK, machineSK, QueryCommand, GetCommand } from '../services/dynamodb'
import { generateRecommendationExplanation } from '../services/claude'
import { computeRecommendation } from '../services/recommendationEngine'
import { ok, badRequest, serverError } from '../utils/response'
import type { Machine, Shot, Recommendation, RoastLevel } from '../types'

const USER_ID = 'default'

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const { beanId, machineId } = event.pathParameters ?? {}
    if (!beanId || !machineId) return badRequest('beanId and machineId are required')

    const [shotsResult, beanResult, machineResult] = await Promise.all([
      db.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        FilterExpression: 'beanId = :bid AND machineId = :mid',
        ExpressionAttributeValues: {
          ':pk': userPK(USER_ID),
          ':prefix': 'SHOT#',
          ':bid': beanId,
          ':mid': machineId,
        },
      })),
      db.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND SK = :sk',
        ExpressionAttributeValues: { ':pk': userPK(USER_ID), ':sk': `BEAN#${beanId}` },
      })),
      db.send(new GetCommand({
        TableName: TABLE,
        Key: { PK: userPK(USER_ID), SK: machineSK(machineId) },
      })),
    ])

    const bean = beanResult.Items?.[0]
    const beanName = bean ? `${bean.roaster} ${bean.name}` : 'this bean'
    const roastLevel: RoastLevel = (bean?.roastLevel as RoastLevel) ?? 'medium'

    const machine = machineResult.Item ? (stripKeys(machineResult.Item) as unknown as Machine) : undefined
    const grindLimits = resolveGrindLimits(machine)

    const shots = (shotsResult.Items ?? []) as Shot[]
    const { settings, basedOnShots, source, tweaks, lastRating } = computeRecommendation(shots, roastLevel, grindLimits)
    const correctionTaste =
      lastRating === 'sour' || lastRating === 'bitter' ? lastRating : undefined

    const explanation = await generateRecommendationExplanation({
      beanName,
      settings,
      basedOnShots,
      source,
      tweaks,
      lastRating: correctionTaste,
    })

    const recommendation: Recommendation = { ...settings, explanation, basedOnShots, source, tweaks }
    return ok(recommendation)
  } catch (err) {
    return serverError(err)
  }
}

function stripKeys(item: Record<string, unknown>) {
  const { PK, SK, ...rest } = item
  void PK; void SK
  return rest
}
