/** Static CSS ambient hero background — no canvas rAF (better LCP/TBT). */
export function HeroAmbientBackground() {
  return (
    <div className="home-ambient" aria-hidden>
      <div className="home-ambient__fallback" />
      <div className="home-ambient__grain" />
      <div className="home-ambient__fade" />
    </div>
  );
}
