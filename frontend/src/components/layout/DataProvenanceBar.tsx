import React from 'react';
import type { DataProvenance } from '../../services/api';

interface DataProvenanceBarProps {
  provenance?: DataProvenance;
}

/**
 * Shows which real upstream sources actually produced the currently
 * displayed route — the trained SIC model that ran (LSTM vs the GBR
 * fallback) and whether a real Sentinel-1 SAR scene was found and used for
 * the satellite hazard layer, instead of leaving that silently invisible.
 */
export const DataProvenanceBar: React.FC<DataProvenanceBarProps> = ({ provenance }) => {
  if (!provenance) return null;

  const { sic_model_used, satellite_status, satellite_scene_id, satellite_scene_datetime, satellite_n_detections } = provenance;

  const sicLabel =
    sic_model_used === 'lstm' ? 'LSTM (Primary)' : sic_model_used === 'gbr' ? 'GBR (Fallback)' : null;

  const satBadge = (() => {
    if (satellite_status === 'REAL_SCENE_USED') {
      const dt = satellite_scene_datetime ? new Date(satellite_scene_datetime) : null;
      const dtLabel = dt && !isNaN(dt.getTime()) ? dt.toISOString().slice(0, 16).replace('T', ' ') + 'Z' : '';
      return {
        color: 'text-[#39ff14] border-[#39ff14]/30 bg-[#39ff14]/10',
        text: `Sentinel-1 SAR · ${satellite_n_detections ?? 0} detection${satellite_n_detections === 1 ? '' : 's'}`,
        title: `Scene ${satellite_scene_id || 'unknown'} · acquired ${dtLabel || 'unknown time'}`,
      };
    }
    if (satellite_status === 'NO_SCENE_FOUND') {
      return {
        color: 'text-[#f59e0b] border-[#f59e0b]/30 bg-[#f59e0b]/10',
        text: 'No real SAR scene in range',
        title: 'No real Sentinel-1 scene intersected this route in the last 10 days.',
      };
    }
    if (satellite_status === 'FETCH_ERROR') {
      return {
        color: 'text-[#ff6b6b] border-[#ff6b6b]/30 bg-[#ff6b6b]/10',
        text: 'SAR fetch failed',
        title: 'Real Sentinel-1 scene lookup errored for this route.',
      };
    }
    return null;
  })();

  if (!sicLabel && !satBadge) return null;

  return (
    <div className="glass-panel rounded-xl px-3.5 py-2 border border-[#3c494e]/40 bg-[#071420]/90 backdrop-blur-md shadow-xl flex items-center gap-3">
      <span className="font-bold text-[10px] text-[#bbc9cf] uppercase tracking-wider border-r border-[#3c494e]/40 pr-3">
        Data Provenance
      </span>
      {sicLabel && (
        <span
          className="font-mono text-[10px] font-bold px-2 py-0.5 rounded border text-[#00daf3] border-[#00daf3]/30 bg-[#00daf3]/10"
          title="Real trained model that produced this route's sea-ice concentration forecast"
        >
          SIC: {sicLabel}
        </span>
      )}
      {satBadge && (
        <span
          className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${satBadge.color}`}
          title={satBadge.title}
        >
          {satBadge.text}
        </span>
      )}
    </div>
  );
};
