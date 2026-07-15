import { runPurge } from './run-purge';

runPurge()
  .then((counts) => {
    console.log('Purge complete — catalog seed data removed', counts);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
