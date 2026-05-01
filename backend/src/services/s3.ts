import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { PutObjectCommand } from '@aws-sdk/client-s3'

export const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'eu-west-1' })

export const PHOTO_BUCKET = process.env.PHOTO_BUCKET ?? 'coffee-tracker-photos'

export function photoKey(userId: string, shotId: string) {
  return `${userId}/${shotId}.jpg`
}

export async function getUploadPresignedUrl(key: string, contentType = 'image/jpeg'): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: PHOTO_BUCKET,
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(s3, command, { expiresIn: 300 })
}

export async function getDownloadPresignedUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: PHOTO_BUCKET, Key: key })
  return getSignedUrl(s3, command, { expiresIn: 3600 })
}
