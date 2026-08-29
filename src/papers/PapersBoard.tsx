import { RING_COPY } from "./authors";
import { furtherLinks, groupHits, lookupPapers } from "./lookup";
import type { StudyModule } from "../catalog/types";

export function PapersBoard({
  query,
  module,
}: {
  query: string;
  module?: StudyModule;
}) {
  const hits = lookupPapers(query, module);
  const groups = groupHits(hits);
  const links = furtherLinks(query, module);

  return (
    <div className="papers-board">
      {groups.length === 0 ? (
        <p className="lede">Nothing in the local shelf matched. Use the look-further links — Ioerger first, then his circle, then the field.</p>
      ) : null}
      {groups.map((group) => (
        <section key={group.ring} className="ring-block">
          <p className="kicker">{RING_COPY[group.ring].kicker}</p>
          <p className="section-dek">{RING_COPY[group.ring].dek}</p>
          <ul className="paper-list">
            {group.hits.map((hit) => (
              <li key={hit.paper.id} className="paper-card">
                <a href={hit.paper.url} target="_blank" rel="noreferrer">
                  {hit.paper.title}
                </a>
                <p className="paper-meta">
                  {hit.paper.authors.slice(0, 6).join(", ")}
                  {hit.paper.authors.length > 6 ? " et al." : ""} · {hit.paper.year} · {hit.paper.venue}
                </p>
                <p className="hit-dek">{hit.paper.summary}</p>
                {hit.paper.genes?.length ? (
                  <p className="also">Genes: {hit.paper.genes.join(" · ")}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section>
        <p className="kicker">Look further</p>
        <p className="section-dek">
          The shelf is curated. These searches keep the same preference order: Ioerger, then the people he writes with, then TB, then the open web.
        </p>
        <ul className="look-links">
          {links.map((link) => (
            <li key={link.href}>
              <a href={link.href} target="_blank" rel="noreferrer">
                {link.label}
              </a>
              <span className="muted"> — {link.hint}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
