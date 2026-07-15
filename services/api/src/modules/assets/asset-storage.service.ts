import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { randomUUID } from 'node:crypto';

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
  'image/gif',
]);

const MIME_EXTENSION: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'image/gif': '.gif',
};

export type UploadEntityFolder = 'banks' | 'merchants' | 'credit-cards';

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

@Injectable()
export class AssetStorageService {
  private readonly logger = new Logger(AssetStorageService.name);
  private readonly uploadsRoot = join(process.cwd(), 'uploads');
  private readonly s3: S3Client | null;
  private readonly bucket: string | null;

  constructor() {
    const bucket = process.env.S3_BUCKET?.trim() || null;
    const endpoint = process.env.S3_ENDPOINT?.trim() || null;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim() || null;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim() || null;

    if (bucket && endpoint && accessKeyId && secretAccessKey) {
      this.bucket = bucket;
      this.s3 = new S3Client({
        region: process.env.S3_REGION?.trim() || 'auto',
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle: true,
      });
      this.logger.log(`Asset storage: S3-compatible (${endpoint} / ${bucket})`);
    } else {
      this.bucket = null;
      this.s3 = null;
      if (process.env.NODE_ENV === 'production') {
        this.logger.warn(
          'Asset storage: local filesystem (set S3_BUCKET, S3_ENDPOINT, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY for R2)',
        );
      }
    }
  }

  /** True when uploads go to R2/S3 instead of the API container disk. */
  usesObjectStorage(): boolean {
    return this.s3 !== null && this.bucket !== null;
  }

  getPublicBaseUrl(): string {
    const configured = process.env.ASSET_PUBLIC_BASE_URL?.replace(/\/$/, '');
    if (configured) return configured;

    const port = process.env.PORT ?? '3000';
    return `http://localhost:${port}/assets/files`;
  }

  resolveEntityFolder(entityType: string): UploadEntityFolder {
    if (entityType === 'bank' || entityType === 'banks') return 'banks';
    if (entityType === 'merchant' || entityType === 'merchants') return 'merchants';
    if (entityType === 'credit-card' || entityType === 'credit-cards') return 'credit-cards';
    throw new BadRequestException('entityType must be banks, merchants, or credit-cards');
  }

  async saveUpload(params: {
    entityType: UploadEntityFolder;
    slug?: string;
    filename: string;
    mimetype: string;
    stream: NodeJS.ReadableStream;
  }): Promise<{ url: string; path: string }> {
    if (!ALLOWED_MIME_TYPES.has(params.mimetype)) {
      throw new BadRequestException('Only PNG, JPG, WebP, SVG, or GIF uploads are allowed');
    }

    const extension =
      extname(params.filename).toLowerCase() || MIME_EXTENSION[params.mimetype] || '.bin';
    const safeSlug = (params.slug ?? 'asset')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    const filename = `${safeSlug || 'asset'}-${randomUUID().slice(0, 8)}${extension}`;
    const relativePath = `${params.entityType}/${filename}`;

    if (this.s3 && this.bucket) {
      const body = await streamToBuffer(params.stream);
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: relativePath,
          Body: body,
          ContentType: params.mimetype,
        }),
      );
      return {
        url: `${this.getPublicBaseUrl()}/${relativePath}`,
        path: relativePath,
      };
    }

    const directory = join(this.uploadsRoot, params.entityType);
    const fullPath = join(directory, filename);
    await mkdir(directory, { recursive: true });
    await pipeline(params.stream, createWriteStream(fullPath));

    return {
      url: `${this.getPublicBaseUrl()}/${relativePath}`,
      path: relativePath,
    };
  }
}
