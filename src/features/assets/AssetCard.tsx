import { memo } from 'react';
import { thumbnailUrl } from '@/api/client';
import { formatBytes, formatDate, formatKind, statusLabel } from '@/lib/format';
import type { Asset } from '@/lib/types';

interface Props {
  asset: Asset;
  isSelected: boolean;
  isActive: boolean;
  onToggleSelect: (id: string) => void;
  onOpen: (id: string) => void;
}

export const AssetCard = memo(function AssetCard({
  asset,
  isSelected,
  isActive,
  onToggleSelect,
  onOpen,
}: Props) {
  return (
    <div
      className={[
        'card',
        isSelected && 'card--selected',
        isActive && 'card--active',
      ].filter(Boolean).join(' ')}
      onClick={() => onOpen(asset.id)}
    >
      
      {asset.hasThumbnail ? (
        <img className="card__thumb" src={thumbnailUrl(asset.id)} alt={asset.name} loading="lazy" />
      ) : (
        <div className="card__thumb card__thumb--missing">No thumbnail</div>
      )}
      <div className="card__body">
        <p className="card__name">{asset.name}</p>
        <p className="muted">
          {formatKind(asset.kind)} · {formatBytes(asset.sizeBytes)} · {formatDate(asset.updatedAt)}
        </p>
        <span className={`pill pill--${asset.status}`}>{statusLabel(asset.status)}</span>
      </div>
      <input
        type="checkbox"
        className="card__check"
        checked={isSelected}
        onClick={(e) => e.stopPropagation()}
        onChange={() => onToggleSelect(asset.id)}
      />
    </div>
  );
});