import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { db, TABLE, userPK, QueryCommand } from '../services/dynamodb'
import { generateRecommendationExplanation } from '../services/claude'
import { ok, badRequest, serverError } from '../utils/response'
import type { Shot, Recommendation, RoastLevel } from '../types'

const USER_ID = 'default'

const DEFAULTS_BY_ROAST: Record<RoastLevel, { grindSetting: number; doseIn: number; yieldOut: number; extractionTime: number }> = {
  light:  { grindSetting: 7,  doseIn: 18, yieldOut: 36, extractionTime: 30 },
  medium: { grindSetting: 8,  doseIn: 18, yieldOut: 36, extractionTime: 27 },
  dark:   { grindSetting: 10, doseIn: 18, yieldOut: 36, extractionTime: 25 },
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const { beanId, machineId } = event.pathParameters ?? {}
    if (!beanId || !machineId) return badRequest('beanId and machineId are required')

    const [shotsResult, beanResult] = await Promise.all([
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
    ])

    const bean = beanResult.Items?.[0]
    const beanName = bean ? `${bean.roaster} ${bean.name}` : 'this bean'
    const roastLevel: RoastLevel = (bean?.roastLevel as RoastLevel) ?? 'medium'

    const shots = (shotsResult.Items ?? []) as Shot[]
    const balanced = shots.filter(s => s.rating === 'balanced' && s.yieldOut && s.extractionTime)

    let settings: { grindSetting: number; doseIn: number; yieldOut: number; extractionTime: number }
    let basedOnShots: number

    if (balanced.length >= 3) {
      const grindCounts = balanced.reduce<Record<number, number>>((acc, s) => {
        acc[s.grindSetting] = (acc[s.grindSetting] ?? 0) + 1
        return acc
      }, {})
      const modalGrind = Number(Object.entries(grindCounts).sort((a, b) => b[1] - a[1])[0][0])
      const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
      settings = {
        grindSetting: modalGrind,
        doseIn: Math.round(mean(balanced.map(s => s.doseIn)) * 10) / 10,
        yieldOut: Math.round(mean(balanced.map(s => s.yieldOut!)) * 10) / 10,
        extractionTime: Math.round(mean(balanced.map(s => s.extractionTime!))),
      }
      basedOnShots = balanced.length
    } else if (shots.length > 0) {
      const last = shots[shots.length - 1]
      settings = {
        grindSetting: last.grindSetting,
        doseIn: last.doseIn,
        yieldOut: last.yieldOut ?? DEFAULTS_BY_ROAST[roastLevel].yieldOut,
        extractionTime: last.extractionTime ?? DEFAULTS_BY_ROAST[roastLevel].extractionTime,
      }
      basedOnShots = shots.length
    } else {
      settings = DEFAULTS_BY_ROAST[roastLevel]
      basedOnShots = 0
    }

    const explanation = await generateRecommendationExplanation(
      settings.grindSetting,
      settings.doseIn,
      settings.yieldOut,
      settings.extractionTime,
      basedOnShots,
      beanName,
    )

    const recommendation: Recommendation = { ...settings, explanation, basedOnShots }
    return ok(recommendation)
  } catch (err) {
    return serverError(err)
  }
}
