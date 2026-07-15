export function TermsPage() {
  return (
    <article className="consumer-page consumer-surface consumer-surface-accent consumer-surface--glass mx-auto flex max-w-3xl flex-col gap-6 p-6 py-10 sm:p-8">
      <h1 className="consumer-page-heading">Terms of Service</h1>
      <p className="text-muted-foreground">
        CardOrbit provides informational recommendations about credit card rewards. We do not issue
        cards, execute payments, or guarantee reward outcomes. Use of the service is subject to
        accurate portfolio data you provide and third-party issuer rules.
      </p>
      <section className="space-y-2">
        <h2 className="text-xl font-medium">Acceptable use</h2>
        <p className="text-muted-foreground">
          Do not misuse the platform for fraud, scraping issuer systems, or sharing another
          person&apos;s financial account data without authorization.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-medium">Disclaimer</h2>
        <p className="text-muted-foreground">
          Recommendations are deterministic estimates based on published card rules in our catalog.
          Always confirm final benefits with your issuer before spending.
        </p>
      </section>
    </article>
  );
}
