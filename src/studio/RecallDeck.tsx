import type { StudioApi } from "./useStudio";

export function RecallDeck({ api }: { api: StudioApi }) {
  if (api.recall.length === 0) {
    return (
      <div className="dock-empty">
        <p className="kicker">Recall</p>
        <p>Misses from the check land here. Nothing yet — which is either virtue or under-testing.</p>
      </div>
    );
  }

  return (
    <div className="recall">
      <p className="kicker">Recall deck</p>
      <h2>{api.recall.length} card{api.recall.length === 1 ? "" : "s"}</h2>
      <ul className="recall-list">
        {api.recall.map((card) => {
          const module = api.byId.get(card.moduleId);
          return (
            <li key={card.id} className="recall-card">
              <p className="kicker">
                {card.kind} · missed {card.misses}×
              </p>
              <p className="prompt">{card.prompt}</p>
              <div className="step-nav">
                {module ? (
                  <button type="button" className="ghost" onClick={() => api.openModule(module)}>
                    Open plate
                  </button>
                ) : null}
                <button type="button" className="solid quiet" onClick={() => void api.clearRecall(card.id)}>
                  I can explain this
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
