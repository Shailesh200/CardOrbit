import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { AuthShell } from '@layout/AuthShell';
import { ProfilePage } from './features/account/ProfilePage';
import { LoginPage } from './features/auth/pages/LoginPage';
import { WelcomeStep } from './features/onboarding/steps/WelcomeStep';
import { ConsentBanner } from './features/privacy/ConsentBanner';
import { HomePage } from './pages/HomePage';

vi.mock('./features/account/account-api', () => ({
  getProfile: vi.fn().mockRejectedValue(new Error('unauthenticated')),
  updateProfile: vi.fn(),
}));

describe('web shell', () => {
  it('renders home hero and mockup content', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Privacy-first')).toBeInTheDocument();
    expect(screen.getByText('CardOrbit')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /Your AI-powered financial orbit/,
    );
    expect(await screen.findByText('Why CardOrbit')).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: /Enter your orbit|Enter CardOrbit/ }).length,
    ).toBeGreaterThan(0);
  });

  it('renders login page with labeled fields', () => {
    localStorage.clear();
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route element={<AuthShell />}>
            <Route path="login" element={<LoginPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByText('Optimize every')).toBeInTheDocument();
  });

  it('renders profile page heading', () => {
    localStorage.clear();
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('renders onboarding welcome step', () => {
    render(
      <MemoryRouter>
        <WelcomeStep busy={false} onContinue={() => undefined} onSkipAll={() => undefined} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Welcome to CardOrbit')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Get started' })).toBeInTheDocument();
  });

  it('shows consent banner when preference missing', () => {
    localStorage.clear();
    render(
      <MemoryRouter>
        <ConsentBanner />
      </MemoryRouter>,
    );
    expect(screen.getByRole('dialog', { name: 'Cookie consent' })).toBeInTheDocument();
  });
});
