import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ClipboardCheck, Edit3, LoaderCircle, MapPin, Plus, ShieldCheck, UserCheck } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useFilterStore } from '../../store/useFilterStore';
import { LoadingBlock } from '../ui/AsyncState';

export function FieldVerificationModal() {
  const queryClient = useQueryClient();
  const setMapCoordinate = useFilterStore((state) => state.setMapCoordinate);

  const [selectedZoneId, setSelectedZoneId] = useState('CZ-01');
  const [geologistName, setGeologistName] = useState('Dr. S. K. Mohanty');
  const [statusVal, setStatusVal] = useState('Verified');
  const [sampleId, setSampleId] = useState('OD-BB-2026-04');
  const [fieldNotes, setFieldNotes] = useState(
    'Outcrop exposure confirmed massive psilomelane-pyrolusite boulders in lateritic cap. Portable XRF assay indicated 44.2% Mn content.'
  );
  const [recommendation, setRecommendation] = useState(
    'Recommended for Phase-2 diamond core drilling (5 boreholes at 50m spacing).'
  );
  const [showForm, setShowForm] = useState(false);

  const verifications = useQuery({
    queryKey: ['field-verifications'],
    queryFn: apiClient.fieldVerifications,
  });

  const candidateZones = useQuery({
    queryKey: ['candidate-zones'],
    queryFn: apiClient.candidateZones,
  });

  const saveMutation = useMutation({
    mutationFn: apiClient.saveFieldVerification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-verifications'] });
      setShowForm(false);
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const zone = candidateZones.data?.candidates.find((c) => c.id === selectedZoneId);
    saveMutation.mutate({
      zone_id: selectedZoneId,
      zone_name: zone?.name ?? 'Candidate Zone',
      latitude: zone?.latitude ?? 21.684,
      longitude: zone?.longitude ?? 85.542,
      status: statusVal as any,
      geologist: geologistName,
      verification_date: new Date().toISOString().split('T')[0],
      field_notes: fieldNotes,
      sample_id: sampleId,
      recommendation,
    });
  };

  if (verifications.isLoading) return <LoadingBlock />;

  return (
    <div className="field-verification-panel panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">GROUND-TRUTHING & GEOLOGICAL AUDIT TRAIL</p>
          <h2>Field Verification & Borehole Planning Log</h2>
        </div>
        <button className="primary-button add-ver-btn" onClick={() => setShowForm((v) => !v)}>
          <Plus size={14} /> {showForm ? 'Cancel Entry' : 'Log Field Observation'}
        </button>
      </div>

      {showForm && (
        <form className="verification-form-box" onSubmit={handleSave}>
          <div className="form-subhead">
            <Edit3 size={15} /> Record Field Verification Assay
          </div>
          <div className="form-grid-3">
            <label>
              Target Candidate Zone
              <select value={selectedZoneId} onChange={(e) => setSelectedZoneId(e.target.value)}>
                {candidateZones.data?.candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} — {c.name} ({c.region})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Verifying Geologist / Institution
              <input
                value={geologistName}
                onChange={(e) => setGeologistName(e.target.value)}
                placeholder="e.g. Senior Geologist, GSI"
                required
              />
            </label>
            <label>
              Verification Outcome Status
              <select value={statusVal} onChange={(e) => setStatusVal(e.target.value)}>
                <option value="Verified">Verified (Mineralization Confirmed)</option>
                <option value="Requires Further Investigation">Requires Further Investigation</option>
                <option value="Pending Verification">Pending Verification</option>
                <option value="Rejected">Rejected (Non-Mineralized)</option>
              </select>
            </label>
          </div>

          <div className="form-grid-2">
            <label>
              Sample ID / Assay Reference
              <input
                value={sampleId}
                onChange={(e) => setSampleId(e.target.value)}
                placeholder="e.g. OD-BB-2026-04"
              />
            </label>
            <label>
              Drilling & Exploration Recommendation
              <input
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                placeholder="e.g. Phase-2 diamond core drilling"
              />
            </label>
          </div>

          <label>
            Geological Field Notes & Mineral Observation
            <textarea
              rows={3}
              value={fieldNotes}
              onChange={(e) => setFieldNotes(e.target.value)}
              placeholder="Describe lithological contacts, XRF percentage readings, float boulders, or structural shear zones..."
              required
            />
          </label>

          <button className="primary-button" type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <LoaderCircle className="spin" size={15} /> : <CheckCircle2 size={15} />}
            {saveMutation.isPending ? 'Saving to Verification Registry...' : 'Submit Verification Record'}
          </button>
        </form>
      )}

      <div className="verifications-list">
        {verifications.data?.verifications.map((rec) => (
          <div className="verification-card" key={rec.id}>
            <div className="ver-card-header">
              <div className="ver-title-block">
                <span className="ver-zone-tag">{rec.zone_id}</span>
                <strong>{rec.zone_name}</strong>
              </div>
              <span className={`ver-status-badge ${rec.status.toLowerCase().replace(/\s+/g, '-')}`}>
                {rec.status}
              </span>
            </div>

            <p className="ver-notes">{rec.field_notes}</p>

            <div className="ver-meta-footer">
              <div className="ver-meta-left">
                <span>
                  <UserCheck size={13} /> {rec.geologist}
                </span>
                {rec.sample_id && <span>Sample: <b>{rec.sample_id}</b></span>}
                {rec.verification_date && <span>Date: <b>{rec.verification_date}</b></span>}
              </div>
              <button
                className="ghost-button loc-ver-btn"
                onClick={() => setMapCoordinate({ lat: rec.latitude, lng: rec.longitude })}
              >
                <MapPin size={13} /> Focus Target
              </button>
            </div>

            {rec.recommendation && (
              <div className="ver-rec-box">
                <b>Drilling Action:</b> {rec.recommendation}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
