import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'

const dynamoEndpoint = process.env.DYNAMODB_ENDPOINT

const client = new DynamoDBClient({
  region: process.env.AWS_REGION ?? 'eu-west-1',
  ...(dynamoEndpoint
    ? {
        endpoint: dynamoEndpoint,
        // DynamoDB Local accepts any static credentials.
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'local',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'local',
        },
      }
    : {}),
})
export const db = DynamoDBDocumentClient.from(client)

export const TABLE = process.env.DYNAMODB_TABLE ?? 'coffee-tracker'

export function userPK(userId: string) {
  return `USER#${userId}`
}

export function machineSK(machineId: string) {
  return `MACHINE#${machineId}`
}

export function beanSK(beanId: string) {
  return `BEAN#${beanId}`
}

export function shotSK(createdAt: string, shotId: string) {
  return `SHOT#${createdAt}#${shotId}`
}

export { PutCommand, GetCommand, QueryCommand, DeleteCommand, UpdateCommand }
