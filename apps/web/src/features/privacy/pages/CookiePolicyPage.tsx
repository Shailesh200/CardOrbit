export function CookiePolicyPage() {
  return (
    <article className="consumer-page consumer-surface consumer-surface-accent consumer-surface--glass mx-auto flex max-w-3xl flex-col gap-6 p-6 py-10 sm:p-8">
      <h1 className="consumer-page-heading">Cookie Policy</h1>
      <p className="text-muted-foreground">
        CardOrbit uses cookies and similar storage to keep the product secure and optionally measure
        product analytics when you consent.
      </p>
      <section className="space-y-2">
        <h2 className="text-xl font-medium">Necessary</h2>
        <p className="text-muted-foreground">
          Required for authentication sessions (M-012+), security, and remembering your cookie
          preferences. These cannot be disabled.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-medium">Analytics</h2>
        <p className="text-muted-foreground">
          Optional product analytics (PostHog via <code>@cardwise/analytics</code>) help us improve
          recommendations. You can choose &quot;Necessary only&quot; in the consent banner.
        </p>
      </section>
    </article>
  );
}
