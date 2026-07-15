import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { JobRunStatus } from '@prisma/client';
import { jobChannel, type JobProgressEvent } from '@cardwise/jobs';
import Redis from 'ioredis';
import { Observable, Subject } from 'rxjs';
import { filter, finalize } from 'rxjs/operators';

@Injectable()
export class JobEventsService implements OnModuleDestroy {
  private readonly logger = new Logger(JobEventsService.name);
  private readonly redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  private subscriber: Redis | null = null;
  private publisher: Redis | null = null;
  private readonly subjects = new Map<string, Subject<JobProgressEvent>>();

  private getPublisher(): Redis {
    if (!this.publisher) {
      this.publisher = new Redis(this.redisUrl, { maxRetriesPerRequest: null });
    }
    return this.publisher;
  }

  private async ensureSubscriber(): Promise<Redis> {
    if (this.subscriber) return this.subscriber;

    this.subscriber = new Redis(this.redisUrl, { maxRetriesPerRequest: null });
    this.subscriber.on('message', (channel, message) => {
      try {
        const event = JSON.parse(message) as JobProgressEvent;
        const subject = this.subjects.get(event.jobId);
        subject?.next(event);
        if (
          event.status === 'COMPLETED' ||
          event.status === 'FAILED' ||
          event.status === 'CANCELLED'
        ) {
          subject?.complete();
          this.subjects.delete(event.jobId);
        }
      } catch (error) {
        this.logger.warn(`Invalid job event on ${channel}: ${error}`);
      }
    });

    return this.subscriber;
  }

  async publish(event: JobProgressEvent): Promise<void> {
    await this.getPublisher().publish(jobChannel(event.jobId), JSON.stringify(event));
  }

  observeJob(jobId: string): Observable<JobProgressEvent> {
    let subject = this.subjects.get(jobId);
    if (!subject) {
      subject = new Subject<JobProgressEvent>();
      this.subjects.set(jobId, subject);
      void this.ensureSubscriber().then((sub) => {
        void sub.subscribe(jobChannel(jobId));
      });
    }

    return subject.asObservable().pipe(
      filter((event) => event.jobId === jobId),
      finalize(() => {
        void this.unsubscribeJob(jobId);
      }),
    );
  }

  private async unsubscribeJob(jobId: string): Promise<void> {
    if (!this.subscriber) return;
    await this.subscriber.unsubscribe(jobChannel(jobId));
    this.subjects.delete(jobId);
  }

  async onModuleDestroy(): Promise<void> {
    for (const subject of this.subjects.values()) {
      subject.complete();
    }
    this.subjects.clear();
    await this.subscriber?.quit();
    await this.publisher?.quit();
  }
}

export { JobRunStatus };
