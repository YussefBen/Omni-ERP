import { useState } from 'react';
import { Button } from '@/shared/components/Button/Button';
import { Card } from '@/shared/components/Card/Card';
import { Spinner } from '@/shared/components/Spinner/Spinner';
import { Tabs } from '@/shared/components/Tabs/Tabs';
import { useClient, useUpdateClientStatus } from '../../hooks/useClients';
import type { ClientStatus } from '../../types';
import styles from './ClientProfile.module.css';

const STATUS_LABELS: Record<ClientStatus, string> = {
  Lead: 'Lead',
  Active: 'Actif',
  Inactive: 'Inactif',
  Churned: 'Perdu',
};

interface ClientProfileProps {
  clientId: number;
}

export function ClientProfile({ clientId }: ClientProfileProps) {
  const { data: client, isLoading, isError, error } = useClient(clientId);
  const { mutate: updateStatus, isPending: isUpdatingStatus } = useUpdateClientStatus();

  const [notesDraft, setNotesDraft] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);

  if (isLoading) return <Spinner label="Chargement du client..." />;

  if (isError || !client) {
    return (
      <p role="alert" className={styles.error}>
        {error?.message ?? 'Client introuvable.'}
      </p>
    );
  }

  function handleStatusChange(nextStatus: ClientStatus) {
    updateStatus({ clientId, status: nextStatus });
  }

  function handleSaveNotes() {
    if (!client) return;
    // ClientDetail n'expose pas les notes déjà enregistrées : ce formulaire ajoute une nouvelle
    // note (avec le statut courant, inchangé) plutôt que d'éditer un historique existant.
    updateStatus(
      { clientId, status: client.status, notes: notesDraft },
      {
        onSuccess: () => {
          setNotesDraft('');
          setNotesSaved(true);
          setTimeout(() => setNotesSaved(false), 2000);
        },
      },
    );
  }

  return (
    <Card className={styles.card}>
      <header className={styles.header}>
        <img src={client.avatarUrl} alt="" className={styles.avatar} />
        <div className={styles.headerInfo}>
          <h2 className={styles.name}>{client.fullName}</h2>
          <p className={styles.jobTitle}>
            {client.jobTitle} — {client.companyName}
          </p>
        </div>
        <span className={`${styles.badge} ${styles[client.status]}`}>
          {STATUS_LABELS[client.status]}
        </span>
      </header>

      <Tabs defaultValue="infos">
        <Tabs.List>
          <Tabs.Tab value="infos">Infos</Tabs.Tab>
          <Tabs.Tab value="purchases">Achats</Tabs.Tab>
          <Tabs.Tab value="status">Statut &amp; notes</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panels>
          <Tabs.Panel value="infos">
            <dl className={styles.infoList}>
              <dt>Email</dt>
              <dd>{client.email}</dd>
              <dt>Téléphone</dt>
              <dd>{client.phone}</dd>
              <dt>Localisation</dt>
              <dd>{client.city}, {client.country}</dd>
              <dt>Département</dt>
              <dd>{client.department}</dd>
              <dt>Segment</dt>
              <dd>{client.segment}</dd>
              <dt>Total dépensé</dt>
              <dd>{client.totalSpent.toFixed(2)} €</dd>
              <dt>Commandes</dt>
              <dd>{client.orderCount}</dd>
            </dl>
          </Tabs.Panel>

          <Tabs.Panel value="purchases">
            {client.purchases.length === 0 ? (
              <p className={styles.empty}>Aucun achat enregistré.</p>
            ) : (
              <ul className={styles.purchaseList}>
                {client.purchases.map((purchase) => (
                  <li key={purchase.id} className={styles.purchaseItem}>
                    <div className={styles.purchaseHeader}>
                      <span>Commande #{purchase.id}</span>
                      <span>{purchase.totalAmount.toFixed(2)} €</span>
                    </div>
                    <ul className={styles.productList}>
                      {purchase.products.map((product) => (
                        <li key={product.productId} className={styles.productItem}>
                          <img src={product.thumbnail} alt="" className={styles.productThumb} />
                          <span className={styles.productName}>
                            {product.title} × {product.quantity}
                          </span>
                          <span>{product.total.toFixed(2)} €</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="status">
            <div className={styles.statusForm}>
              <label className={styles.label} htmlFor="clientStatus">
                Statut
              </label>
              <select
                id="clientStatus"
                className={styles.select}
                value={client.status}
                onChange={(event) => handleStatusChange(event.target.value as ClientStatus)}
                disabled={isUpdatingStatus}
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <label className={styles.label} htmlFor="clientNotes">
                Ajouter une note
              </label>
              <textarea
                id="clientNotes"
                className={styles.textarea}
                rows={4}
                value={notesDraft}
                onChange={(event) => setNotesDraft(event.target.value)}
                placeholder="Nouvelle note pour ce client..."
              />
              <Button onClick={handleSaveNotes} disabled={isUpdatingStatus || !notesDraft.trim()}>
                {isUpdatingStatus ? 'Enregistrement...' : 'Enregistrer la note'}
              </Button>
              {notesSaved && <p className={styles.savedHint}>Note enregistrée ✓</p>}
            </div>
          </Tabs.Panel>
        </Tabs.Panels>
      </Tabs>
    </Card>
  );
}
