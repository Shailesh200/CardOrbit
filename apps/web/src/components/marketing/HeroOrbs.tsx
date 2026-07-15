/** Ambient floating orbs for hero atmosphere. */
export function HeroOrbs() {
  return (
    <div className="hero-orbs pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <span className="hero-orb hero-orb--teal" />
      <span className="hero-orb hero-orb--gold" />
      <span className="hero-orb hero-orb--ink" />
    </div>
  );
}
