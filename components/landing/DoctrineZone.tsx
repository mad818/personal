type DoctrinePlate = {
  index: string;
  eyebrow: string;
  title: string;
  body: string;
  tone: "amber" | "blue" | "steel";
};

const DOCTRINE_PLATES: readonly DoctrinePlate[] = [
  {
    index: "01",
    eyebrow: "Deployment",
    title: "Runs on your machine",
    body: "No subscription. No cloud dependency. Bring your own keys. Storage stays local.",
    tone: "amber",
  },
  {
    index: "02",
    eyebrow: "Entrypoint",
    title: "HQ is where work begins",
    body: "The assistant orchestrates every surface from one work-first command interface.",
    tone: "blue",
  },
  {
    index: "03",
    eyebrow: "Continuity",
    title: "Work compounds across sessions",
    body: "Vault and the memory spine keep decisions live across restarts. Nothing is lost to a closed tab.",
    tone: "steel",
  },
];

export default function DoctrineZone() {
  return (
    <section
      id="nexus-landing-doctrine"
      className="nexus-landing-doctrine nexus-landing-enter"
      aria-labelledby="nexus-landing-doctrine-title"
      data-testid="landing-doctrine"
    >
      <div className="nexus-landing-doctrine__inner">
        <div className="nexus-landing-doctrine__lead">
          <p className="nexus-landing-doctrine__kicker">Operating doctrine</p>
          <h2
            id="nexus-landing-doctrine-title"
            className="nexus-landing-doctrine__title"
          >
            Free-first command software with hard operational guarantees.
          </h2>
          <p className="nexus-landing-doctrine__copy">
            One airlock in. Three guarantees. No dashboard wall, no hosted
            dependency theater, no soft consumer framing.
          </p>
        </div>

        <div className="nexus-landing-doctrine__grid">
          {DOCTRINE_PLATES.map((plate) => (
            <article
              key={plate.title}
              className={`nexus-landing-doctrine__plate nexus-landing-doctrine__plate--${plate.tone}`}
            >
              <div className="nexus-landing-doctrine__plateHeader">
                <p className="nexus-landing-doctrine__plateEyebrow">
                  {plate.eyebrow}
                </p>
                <span className="nexus-landing-doctrine__plateIndex">
                  {plate.index}
                </span>
              </div>
              <h3 className="nexus-landing-doctrine__plateTitle">
                {plate.title}
              </h3>
              <p className="nexus-landing-doctrine__plateBody">{plate.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
