import { useState, type DragEvent, type FormEvent } from 'react';
import { Card } from '@/shared/components/Card/Card';
import { Spinner } from '@/shared/components/Spinner/Spinner';
import {
  useAssignOpportunity,
  useCreateOpportunity,
  useDeleteOpportunity,
  useOpportunities,
  usePipelineStages,
  useUpdateOpportunity,
} from '../../hooks/useOpportunities';
import { usePipelineObserver } from '../../hooks/usePipelineObserver';
import { SALES_REPS } from '../../hooks/salesReps';
import type { Opportunity, PipelineStageId } from '../../types';
import styles from './Pipeline.module.css';

function inThirtyDays(): string {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
}

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
  const { mutate: createOpportunity, isPending: isCreating } = useCreateOpportunity();
  const { mutate: deleteOpportunity } = useDeleteOpportunity();
  const { mutate: assignOpportunity } = useAssignOpportunity();

  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('1000');
  const [newClientId, setNewClientId] = useState('1');
  const [newOwnerId, setNewOwnerId] = useState(String(SALES_REPS[0].id));

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

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newTitle.trim();
    const amount = Number(newAmount);
    const clientId = Number(newClientId);
    const owner = SALES_REPS.find((rep) => rep.id === Number(newOwnerId));
    if (!title || !amount || !clientId || !owner || sortedStages.length === 0) return;

    createOpportunity({
      title,
      clientId,
      amount,
      owner,
      stageId: sortedStages[0].id,
      expectedCloseDate: inThirtyDays(),
    });
    setNewTitle('');
  }

  function handleDelete(opportunityId: number) {
    if (!window.confirm('Supprimer cette opportunité ?')) return;
    deleteOpportunity(opportunityId);
  }

  function handleAssign(opportunityId: number, ownerId: number) {
    const owner = SALES_REPS.find((rep) => rep.id === ownerId);
    if (!owner) return;
    assignOpportunity({ id: opportunityId, owner });
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
                  <div className={styles.oppHeader}>
                    <p className={styles.oppTitle}>{opportunity.title}</p>
                    <button
                      type="button"
                      className={styles.deleteOpp}
                      onClick={() => handleDelete(opportunity.id)}
                      aria-label={`Supprimer ${opportunity.title}`}
                    >
                      ×
                    </button>
                  </div>
                  <span className={styles.oppAmount}>
                    {opportunity.amount.toLocaleString('fr-FR')} €
                  </span>
                  <select
                    className={styles.ownerSelect}
                    value={opportunity.owner?.id}
                    onChange={(event) => handleAssign(opportunity.id, Number(event.target.value))}
                    aria-label={`Commercial responsable de ${opportunity.title}`}
                  >
                    {SALES_REPS.map((rep) => (
                      <option key={rep.id} value={rep.id}>
                        {rep.name}
                      </option>
                    ))}
                  </select>
                </Card>
              ))}

              {stage.id === sortedStages[0]?.id && (
                <form className={styles.createForm} onSubmit={handleCreate}>
                  <input
                    type="text"
                    className={styles.createInput}
                    placeholder="Nouvelle opportunité..."
                    value={newTitle}
                    onChange={(event) => setNewTitle(event.target.value)}
                    disabled={isCreating}
                    aria-label="Titre de la nouvelle opportunité"
                  />
                  <input
                    type="number"
                    className={styles.createInput}
                    placeholder="Montant €"
                    value={newAmount}
                    onChange={(event) => setNewAmount(event.target.value)}
                    aria-label="Montant"
                  />
                  <input
                    type="number"
                    className={styles.createInput}
                    placeholder="Client #"
                    value={newClientId}
                    onChange={(event) => setNewClientId(event.target.value)}
                    aria-label="Identifiant du client"
                  />
                  <select
                    className={styles.createInput}
                    value={newOwnerId}
                    onChange={(event) => setNewOwnerId(event.target.value)}
                    aria-label="Commercial responsable"
                  >
                    {SALES_REPS.map((rep) => (
                      <option key={rep.id} value={rep.id}>
                        {rep.name}
                      </option>
                    ))}
                  </select>
                </form>
              )}
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