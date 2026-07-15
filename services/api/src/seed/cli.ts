import { runSeed } from './run-seed';

runSeed()
  .then((counts) => {
    console.log('Seed complete', counts);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
