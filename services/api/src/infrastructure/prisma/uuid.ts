import { v7 as uuidv7 } from 'uuid';

/** Generate a UUID v7 primary key for catalog tables (sortable, distributed-friendly). */
export function newUuidV7(): string {
  return uuidv7();
}
