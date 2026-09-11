import { ArrowDownRight, ArrowUpRight, HelpCircle, Sparkles } from 'lucide-react';
import { useFilterStore } from '../../store/useFilterStore';

export function ExplainabilityCard() {
  const predictionOpen = useFilterStore((state) => state.predictionOpen);
  const prediction = useFilterStore((state) => state.prediction);
  const factors = prediction?.explanation.top_contributing_factors ?? [];

  return (
    <div className="explain-card">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">MODEL EXPLAINABILITY</p>
          <h3>Why This Location?</h3>
        </div>
        <span className="live-tag">
          <Sparkles size={12} /> RANDOM FOREST ATTRIBUTION
        </span>
      </div>

      {!predictionOpen || !prediction ? (
        <div className="empty-explain">
          <HelpCircle size={24} className="muted-icon" />
          <strong>Click anywhere on the map or run an analysis to view feature attributions.</strong>
          <span>
            The engine calculates marginal output sensitivities against the reference baseline for
            climate, terrain, infrastructure, and geology.
          </span>
        </div>
      ) : (
        <>
          <div className="explain-meta">
            <p>
              Local feature contributions evaluated for{' '}
              <strong>{prediction.hydrated_from_district ?? 'selected coordinate'}</strong>:
            </p>
          </div>

          {factors.length === 0 ? (
            <p className="explain-hint">
              Inputs align closely with training reference baselines; no extreme marginal deviation
              detected.
            </p>
          ) : (
            <div className="factor-list">
              {factors.map((factor) => {
                const isPositive = factor.impact === 'increased';
                return (
                  <div className="factor-item" key={factor.feature}>
                    <div className="factor-header">
                      <div className="factor-title">
                        {isPositive ? (
                          <ArrowUpRight size={16} className="factor-icon positive" />
                        ) : (
                          <ArrowDownRight size={16} className="factor-icon negative" />
                        )}
                        <strong>{factor.feature.replace(/_/g, ' ')}</strong>
                      </div>
                      <span className={`factor-delta ${isPositive ? 'positive' : 'negative'}`}>
                        {isPositive ? '+' : '-'}
                        {Math.abs(factor.contribution_tonnes).toLocaleString('en-IN')} t
                      </span>
                    </div>
                    <div className="factor-body">
                      <span className="factor-val">Value: {factor.value}</span>
                      <small className="factor-reason">{factor.reason}</small>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
