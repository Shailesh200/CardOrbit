import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes, StaticRouter } from 'react-router';
import { FeatureFlag } from '@cardwise/feature-flags/browser';

import { AccountLayout } from '../components/layout/AccountLayout';
import { ErrorBoundary } from '../components/feedback/ErrorBoundary';
import { AuthShell } from '../components/layout/AuthShell';
import { DocumentSeo } from '../components/seo/DocumentSeo';
import { RequireAuth } from '../features/auth/RequireAuth';
import { CookiePolicyPage } from '../features/privacy/pages/CookiePolicyPage';
import { PrivacyPolicyPage } from '../features/privacy/pages/PrivacyPolicyPage';
import { TermsPage } from '../features/privacy/pages/TermsPage';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { AppShell } from './AppShell';
import { AuthSessionRedirect } from '../components/auth/AuthSessionRedirect';
import { FeatureGatedRoute } from './FeatureGatedRoute';
import { RouteFallback } from './RouteFallback';
import { RouteErrorPage } from './RouteErrorPage';
import { ScrollToTop } from './ScrollToTop';
import { AnalyticsIdentify } from './AnalyticsIdentify';
import { PageViewTracker } from './PageViewTracker';
import { FeatureFlagsBootstrap } from './FeatureFlagsBootstrap';
import { ExperimentsBootstrap } from './ExperimentsBootstrap';
import { HostGate } from './HostGate';

type AppProps = {
  /** When set, renders with StaticRouter for build-time public-route prerender. */
  ssrLocation?: string;
};

const LoginPage = lazy(() =>
  import('../features/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const SignupPage = lazy(() =>
  import('../features/auth/pages/SignupPage').then((m) => ({ default: m.SignupPage })),
);
const VerifyEmailPage = lazy(() =>
  import('../features/auth/pages/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('../features/auth/pages/ForgotPasswordPage').then((m) => ({
    default: m.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import('../features/auth/pages/ResetPasswordPage').then((m) => ({
    default: m.ResetPasswordPage,
  })),
);
const OAuthCallbackPage = lazy(() =>
  import('../features/auth/pages/OAuthCallbackPage').then((m) => ({
    default: m.OAuthCallbackPage,
  })),
);
const OnboardingPage = lazy(() =>
  import('../features/onboarding/OnboardingPage').then((m) => ({ default: m.OnboardingPage })),
);
const DashboardPage = lazy(() =>
  import('../features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const PortfolioPage = lazy(() =>
  import('../features/portfolio/PortfolioPage').then((m) => ({ default: m.PortfolioPage })),
);
const AddCardPage = lazy(() =>
  import('../features/portfolio/AddCardPage').then((m) => ({ default: m.AddCardPage })),
);
const CatalogBrowsePage = lazy(() =>
  import('../features/catalog/CatalogBrowsePage').then((m) => ({ default: m.CatalogBrowsePage })),
);
const CardComparisonPage = lazy(() =>
  import('../features/portfolio/CardComparisonPage').then((m) => ({
    default: m.CardComparisonPage,
  })),
);
const SpendingInsightsPage = lazy(() =>
  import('../features/spending-insights/SpendingInsightsPage').then((m) => ({
    default: m.SpendingInsightsPage,
  })),
);
const TransactionsPage = lazy(() =>
  import('../features/transactions/TransactionsPage').then((m) => ({
    default: m.TransactionsPage,
  })),
);
const BillingPage = lazy(() =>
  import('../features/billing/BillingPage').then((m) => ({
    default: m.BillingPage,
  })),
);
const FinancialCalendarPage = lazy(() =>
  import('../features/financial-calendar/FinancialCalendarPage').then((m) => ({
    default: m.FinancialCalendarPage,
  })),
);
const ReportsPage = lazy(() =>
  import('../features/reports/ReportsPage').then((m) => ({
    default: m.ReportsPage,
  })),
);
const MilestoneTrackerPage = lazy(() =>
  import('../features/milestones/MilestoneTrackerPage').then((m) => ({
    default: m.MilestoneTrackerPage,
  })),
);
const CashbackPage = lazy(() =>
  import('../features/cashback/CashbackPage').then((m) => ({
    default: m.CashbackPage,
  })),
);
const RedemptionsPage = lazy(() =>
  import('../features/redemptions/RedemptionsPage').then((m) => ({
    default: m.RedemptionsPage,
  })),
);
const TravelHubPage = lazy(() =>
  import('../features/travel-hub/TravelHubPage').then((m) => ({
    default: m.TravelHubPage,
  })),
);
const TripPlannerPage = lazy(() =>
  import('../features/trip-planner/TripPlannerPage').then((m) => ({
    default: m.TripPlannerPage,
  })),
);
const BookingHubPage = lazy(() =>
  import('../features/booking/BookingHubPage').then((m) => ({
    default: m.BookingHubPage,
  })),
);
const LifestyleBenefitsPage = lazy(() =>
  import('../features/lifestyle-benefits/LifestyleBenefitsPage').then((m) => ({
    default: m.LifestyleBenefitsPage,
  })),
);
const PremiumDashboardPage = lazy(() =>
  import('../features/premium-dashboard/PremiumDashboardPage').then((m) => ({
    default: m.PremiumDashboardPage,
  })),
);
const CardDetailPage = lazy(() =>
  import('../features/portfolio/CardDetailPage').then((m) => ({ default: m.CardDetailPage })),
);
const MerchantSearchPage = lazy(() =>
  import('../features/merchants/MerchantSearchPage').then((m) => ({
    default: m.MerchantSearchPage,
  })),
);
const MerchantDetailPage = lazy(() =>
  import('../features/merchants/MerchantDetailPage').then((m) => ({
    default: m.MerchantDetailPage,
  })),
);
const OffersPage = lazy(() =>
  import('../features/offers/OffersPage').then((m) => ({ default: m.OffersPage })),
);
const OfferDetailPage = lazy(() =>
  import('../features/offers/OfferDetailPage').then((m) => ({ default: m.OfferDetailPage })),
);
const RecommendationHistoryPage = lazy(() =>
  import('../features/recommendations/RecommendationHistoryPage').then((m) => ({
    default: m.RecommendationHistoryPage,
  })),
);
const RewardWalletPage = lazy(() =>
  import('../features/reward-wallet/RewardWalletPage').then((m) => ({
    default: m.RewardWalletPage,
  })),
);
const ProfilePage = lazy(() =>
  import('../features/account/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const SettingsPage = lazy(() =>
  import('../features/account/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const NotificationsPage = lazy(() =>
  import('../features/notifications/NotificationsPage').then((m) => ({
    default: m.NotificationsPage,
  })),
);
export function App({ ssrLocation }: AppProps = {}) {
  const routes = (
    <>
      <FeatureFlagsBootstrap />
      <ExperimentsBootstrap />
      <DocumentSeo />
      <HostGate />
      <AuthSessionRedirect />
      <ScrollToTop />
      <PageViewTracker />
      <AnalyticsIdentify />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route element={<AuthShell />}>
              <Route path="login" element={<LoginPage />} />
              <Route path="signup" element={<SignupPage />} />
              <Route path="verify-email" element={<VerifyEmailPage />} />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />
            </Route>
            <Route path="oauth/callback" element={<OAuthCallbackPage />} />
            <Route element={<RequireAuth skipOnboardingGate />}>
              <Route path="onboarding" element={<OnboardingPage />} />
            </Route>
            <Route element={<RequireAuth />}>
              <Route
                path="account"
                element={
                  <ErrorBoundary fallbackTitle="Account section unavailable">
                    <AccountLayout />
                  </ErrorBoundary>
                }
                errorElement={<RouteErrorPage />}
              >
                <Route index element={<DashboardPage />} />
                <Route path="insights/spending" element={<SpendingInsightsPage />} />
                <Route path="transactions" element={<TransactionsPage />} />
                <Route path="billing" element={<BillingPage />} />
                <Route
                  path="calendar"
                  element={
                    <FeatureGatedRoute
                      flag={FeatureFlag.FINANCIAL_CALENDAR}
                      title="Financial calendar is unavailable"
                      description="This feature isn't enabled for your account yet. Check back soon."
                    >
                      <FinancialCalendarPage />
                    </FeatureGatedRoute>
                  }
                />
                <Route
                  path="reports"
                  element={
                    <FeatureGatedRoute
                      flag={FeatureFlag.USER_REPORTS}
                      title="Reports are unavailable"
                      description="This feature isn't enabled for your account yet. Check back soon."
                    >
                      <ReportsPage />
                    </FeatureGatedRoute>
                  }
                />
                <Route path="milestones" element={<MilestoneTrackerPage />} />
                <Route path="cashback" element={<CashbackPage />} />
                <Route path="redemptions" element={<RedemptionsPage />} />
                <Route
                  path="travel"
                  element={
                    <FeatureGatedRoute
                      flag={FeatureFlag.TRAVEL_BOOKING_ENABLED}
                      title="Travel is unavailable"
                      description="This feature isn't enabled for your account yet. Check back soon."
                    >
                      <TravelHubPage />
                    </FeatureGatedRoute>
                  }
                />
                <Route
                  path="travel/planner"
                  element={
                    <FeatureGatedRoute
                      flag={FeatureFlag.TRAVEL_BOOKING_ENABLED}
                      title="Trip planner is unavailable"
                      description="This feature isn't enabled for your account yet. Check back soon."
                    >
                      <TripPlannerPage />
                    </FeatureGatedRoute>
                  }
                />
                <Route
                  path="travel/booking"
                  element={
                    <FeatureGatedRoute
                      flag={FeatureFlag.TRAVEL_BOOKING_ENABLED}
                      title="Booking is unavailable"
                      description="This feature isn't enabled for your account yet. Check back soon."
                    >
                      <BookingHubPage />
                    </FeatureGatedRoute>
                  }
                />
                <Route path="benefits" element={<LifestyleBenefitsPage />} />
                <Route
                  path="premium"
                  element={
                    <FeatureGatedRoute
                      flag={FeatureFlag.PREMIUM_FEATURES_ENABLED}
                      title="Premium is unavailable"
                      description="This feature isn't enabled for your account yet. Check back soon."
                    >
                      <PremiumDashboardPage />
                    </FeatureGatedRoute>
                  }
                />
                <Route path="cards" element={<PortfolioPage />} />
                <Route path="cards/explore" element={<CatalogBrowsePage />} />
                <Route path="cards/compare" element={<CardComparisonPage />} />
                <Route path="cards/add" element={<AddCardPage />} />
                <Route path="cards/:userCardId" element={<CardDetailPage />} />
                <Route path="merchants" element={<MerchantSearchPage />} />
                <Route path="merchants/:merchantSlug" element={<MerchantDetailPage />} />
                <Route path="offers/:offerSlug" element={<OfferDetailPage />} />
                <Route path="offers" element={<OffersPage />} />
                <Route path="rewards" element={<RewardWalletPage />} />
                <Route path="recommendations/history" element={<RecommendationHistoryPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>
            <Route path="privacy" element={<PrivacyPolicyPage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="cookies" element={<CookiePolicyPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );

  if (ssrLocation != null) {
    return <StaticRouter location={ssrLocation}>{routes}</StaticRouter>;
  }

  return <BrowserRouter>{routes}</BrowserRouter>;
}
