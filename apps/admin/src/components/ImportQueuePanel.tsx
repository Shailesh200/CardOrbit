import { useEffect, useState } from 'react';

import { ImportCenterPage } from '../pages/ImportCenterPage';

/** SDUI custom block — import review queue (reuses existing workflow). */
export function ImportQueuePanel() {
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    function onComplete() {
      setRefreshKey((value) => value + 1);
    }
    window.addEventListener('cardwise:admin-job-complete', onComplete);
    return () => window.removeEventListener('cardwise:admin-job-complete', onComplete);
  }, []);

  return <ImportCenterPage embedded key={refreshKey} />;
}
