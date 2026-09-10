import type { DragEvent } from 'react';
import { Card } from '@/shared/components/Card/Card';
import { Spinner } from '@/shared/components/Spinner/Spinner';
import { useOpportunities, usePipelineStages, useUpdateOpportunity } from '../../hooks/useOpportunities';
import { usePipelineObserver } from '../../hooks/usePipelineObserver';
import type { Opportunity, PipelineStageId } from '../../types';
import styles from './Pipeline.module.css';

interface PipelineEventLike {
  type: 'stage-changed' | 'created' | 'deleted';
  opportunityId: number;
  fromStage?: PipelineStageId;
  toStage?: PipelineStageId;
}

function describeEvent(event: PipelineEventLike, stageLabelById: Map<PipelineStageId, string>): string {
  const label = (stageId?: PipelineStageId) =>
    stageId ? (stageLabelById.get(stageId) ?? stageId) : undefined;

  switch (event.type) {
    case 'created':
      return `Nouvelle opportunité #${event.opportunityId} créée${
        label(event.toStage) ? ` dans "${label(event.toStage)}"` : ''
      }`;
    case 'deleted':
      return `Opportunité #${event.opportunityId} supprimée`;
    case 'stage-changed':
    default:
      return `Opportunité #${event.opportunityId} déplacée${
        label(event.fromStage) ? ` de "${label(event.fromStage)}"` : ''
      }${label(event.toStage) ? ` vers "${label(event.toStage)}"` : ''}`;
  }
}

export function Pipeline() {
  const {
    data: stages,
    isLoading: isStagesLoading,
    isError: isStagesError,
    error: stagesError,
  } = usePipelineStages();

  const {
    data: opportunities,
    isLoading: isOppsLoading,
    isError: isOppsError,
    error: oppsError,
  } = useOpportunities();

  const { mutate: updateOpportunity } = useUpdateOpportunity();

  // Historique local des changements d'étape : alimenté par les mutations de CETTE session
  // (bus RxJS en mémoire), pas par un vrai push serveur multi-utilisateurs.
  const { history } = usePipelineObserver({ stageChangesOnly: true, historySize: 10 });

  const isLoading = isStagesLoading || isOppsLoading;
  const isError = isStagesError || isOppsError;
  const error = stagesError ?? oppsError;

  if (isLoading) return <Spinner label="Chargement du pipeline..." />;

  if (isError) {
    return (
      <p role="alert" className={styles.error}>
        {error?.message ?? 'Impossible de charger le pipeline.'}
      </p>
    );
  }

  const sortedStages = [...(stages ?? [])].sort((a, b) => a.order - b.order);
  const stageLabelById = new Map(sortedStages.map((stage) => [stage.id, stage.label]));

  function opportunitiesForStage(stageId: PipelineStageId): Opportunity[] {
    return opportunities?.filter((opportunity) => opportunity.stageId === stageId) ?? [];
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, toStage: PipelineStageId) {
    event.preventDefault();
    const opportunityId = Number(event.dataTransfer.getData('text/plain'));
    if (Number.isNaN(opportunityId)) return;

    const opportunity = opportunities?.find((o) => o.id === opportunityId);
    if (!opportunity || opportunity.stageId === toStage) return;

    updateOpportunity({ id: opportunityId, stageId: toStage });
  }

  return (
    <div className={styles.layout}>
      <div className={styles.board}>
        {sortedStages.map((stage) => (
          <div
            key={stage.id}
            className={styles.column}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(event, stage.id)}
          >
            <h3 className={styles.columnTitle}>
              {stage.label}{' '}
              <span className={styles.columnCount}>{opportunitiesForStage(stage.id).length}</span>
            </h3>
            <span className={styles.probability}>{stage.probability}% de chances</span>

            <div className={styles.columnBody}>
              {opportunitiesForStage(stage.id).length === 0 && (
                <p className={styles.emptyColumn}>Aucune opportunité</p>
              )}
              {opportunitiesForStage(stage.id).map((opportunity) => (
                <Card
                  key={opportunity.id}
                  className={styles.oppCard}
                  draggable
                  onDragStart={(event) =>
                    event.dataTransfer.setData('text/plain', String(opportunity.id))
                  }
                >
                  <p className={styles.oppTitle}>{opportunity.title}</p>
                  <span className={styles.oppAmount}>
                    {opportunity.amount.toLocaleString('fr-FR')} €
                  </span>
                  <span className={styles.oppOwner}>
                    {/* UserRef suppose au moins { id, name } ; à ajuster si la forme diffère */}
                    {opportunity.owner?.name ?? `Commercial #${opportunity.owner?.id}`}
                  </span>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Card className={styles.activityCard}>
        <h3 className={styles.activityTitle}>Activité récente</h3>
        {history.length === 0 ? (
          <p className={styles.empty}>Aucun changement pour l&apos;instant.</p>
        ) : (
          <ul className={styles.activityList}>
            {history.map((event, index) => (
              <li key={`${event.opportunityId}-${index}`} className={styles.activityItem}>
                {describeEvent(event as PipelineEventLike, stageLabelById)}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
