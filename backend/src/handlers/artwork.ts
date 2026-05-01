import type { APIGatewayProxyEvent, APIGatewayProxyResult, S3Event } from 'aws-lambda'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { s3, PHOTO_BUCKET, photoKey, getUploadPresignedUrl } from '../services/s3'
import { db, TABLE, userPK, QueryCommand, UpdateCommand } from '../services/dynamodb'
import { analyseLattArt } from '../services/claude'
import { ok, badRequest, serverError } from '../utils/response'

const USER_ID = 'default'

// Called by API Gateway — returns a pre-signed upload URL
export async function uploadUrlHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const shotId = event.pathParameters?.shotId
    if (!shotId) return badRequest('shotId is required')

    const key = photoKey(USER_ID, shotId)
    const uploadUrl = await getUploadPresignedUrl(key)
    return ok({ uploadUrl, photoKey: key })
  } catch (err) {
    return serverError(err)
  }
}

// Called by S3 event trigger — analyses the uploaded photo and saves feedback to DynamoDB
export async function s3TriggerHandler(event: S3Event): Promise<void> {
  for (const record of event.Records) {
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '))
    const shotId = key.split('/')[1]?.replace('.jpg', '')
    if (!shotId) continue

    try {
      const obj = await s3.send(new GetObjectCommand({ Bucket: PHOTO_BUCKET, Key: key }))
      const buffer = await obj.Body?.transformToByteArray()
      if (!buffer) continue

      const base64 = Buffer.from(buffer).toString('base64')
      const feedback = await analyseLattArt(base64)

      const queryResult = await db.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        FilterExpression: 'shotId = :sid',
        ExpressionAttributeValues: {
          ':pk': `USER#${USER_ID}`,
          ':prefix': 'SHOT#',
          ':sid': shotId,
        },
      }))
      const item = queryResult.Items?.[0]
      if (!item) continue

      await db.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: item.PK, SK: item.SK },
        UpdateExpression: 'SET artworkFeedback = :feedback',
        ExpressionAttributeValues: { ':feedback': feedback },
      }))
    } catch (err) {
      console.error(`Failed to process photo ${key}:`, err)
    }
  }
}
