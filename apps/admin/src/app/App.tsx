import { BrowserRouter, Navigate, Route, Routes } from 'react-router';

import { AiPlatformPage } from '../pages/AiPlatformPage';
import { AnalyticsEventsPage } from '../pages/AnalyticsEventsPage';
import { ExperimentsPage } from '../pages/ExperimentsPage';
import { FeatureFlagsPage } from '../pages/FeatureFlagsPage';
import { LoginPage } from '../pages/LoginPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { OffersPage } from '../pages/OffersPage';
import { SduiRoutePage } from '../pages/SduiRoutePage';
import { AdminShell } from './AdminShell';
import { RequireAuth } from './RequireAuth';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AdminShell />}>
            <Route index element={<Navigate to="/insights" replace />} />
            <Route path="insights" element={<SduiRoutePage pageId="insights" />} />
            <Route path="sync" element={<SduiRoutePage pageId="sync" />} />
            <Route path="import" element={<SduiRoutePage pageId="import" />} />
            <Route path="catalog" element={<SduiRoutePage pageId="catalog" />} />
            <Route path="cards" element={<SduiRoutePage pageId="cards" />} />
            <Route path="rules" element={<SduiRoutePage pageId="rules" />} />
            <Route path="users" element={<SduiRoutePage pageId="users" />} />
            <Route path="offers" element={<OffersPage />} />
            <Route path="ai" element={<AiPlatformPage />} />
            <Route path="feature-flags" element={<FeatureFlagsPage />} />
            <Route path="experiments" element={<ExperimentsPage />} />
            <Route path="analytics-events" element={<AnalyticsEventsPage />} />
            {/* Legacy redirects */}
            <Route path="assets" element={<Navigate to="/catalog" replace />} />
            <Route path="merchants" element={<Navigate to="/catalog" replace />} />
            <Route path="merchants/intelligence" element={<Navigate to="/insights" replace />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
