# Auth Utilities (`@cardwise/auth`)

Shared consumer auth types and browser helpers for CardWise (M-012).

```ts
import { setAuthTokens, authFetch, PasswordSchema } from '@cardwise/auth';

setAuthTokens(accessToken, refreshToken);
await authFetch('/api/v1/auth/me', {}, import.meta.env.VITE_API_URL);
```

Tokens are stored in `localStorage` and sent as `Authorization: Bearer` (decision 1A).
