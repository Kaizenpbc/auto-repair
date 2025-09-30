import { useState, useEffect } from 'react';
import { api } from '../api';

interface LaborRatesManagerProps {
  onClose: () => void;
}

export function LaborRatesManager({ onClose }: LaborRatesManagerProps) {
  const [laborRates, setLaborRates] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadLaborRates();
  }, []);

  const loadLaborRates = async () => {
    try {
      const { laborRates: rates } = await api.getLaborRates();
      setLaborRates(rates);
    } catch (error: any) {
      setMessage(`Error loading rates: ${error.message}`);
    }
  };

  const handleEdit = (rate: any) => {
    setEditingId(rate.id);
    setEditValues({
      rateName: rate.rate_name,
      hourlyRate: rate.hourly_rate,
      isDefault: rate.is_default,
      isActive: rate.is_active
    });
  };

  const handleSave = async (id: string) => {
    setBusy(true);
    setMessage('');

    try {
      await api.updateLaborRate(id, editValues);
      setMessage('Labor rate updated successfully');
      setEditingId(null);
      await loadLaborRates();
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues({});
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        maxWidth: '800px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#2c3e50' }}>Labor Rates Management</h2>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#95a5a6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Close
          </button>
        </div>

        {message && (
          <div style={{
            padding: '12px',
            marginBottom: '16px',
            borderRadius: '4px',
            backgroundColor: message.includes('Error') ? '#fee' : '#efe',
            border: message.includes('Error') ? '1px solid #fcc' : '1px solid #cec',
            color: message.includes('Error') ? '#c33' : '#363'
          }}>
            {message}
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 150px 100px 100px 120px',
            gap: '12px',
            padding: '12px',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px',
            fontWeight: 'bold',
            fontSize: '14px',
            color: '#495057'
          }}>
            <div>Rate Name</div>
            <div>Hourly Rate</div>
            <div>Default</div>
            <div>Active</div>
            <div>Actions</div>
          </div>

          {laborRates.map((rate) => (
            <div
              key={rate.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 150px 100px 100px 120px',
                gap: '12px',
                padding: '12px',
                borderBottom: '1px solid #dee2e6',
                alignItems: 'center'
              }}
            >
              {editingId === rate.id ? (
                <>
                  <input
                    type="text"
                    value={editValues.rateName}
                    onChange={(e) => setEditValues({ ...editValues, rateName: e.target.value })}
                    style={{
                      padding: '6px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>$</span>
                    <input
                      type="number"
                      step="5"
                      value={editValues.hourlyRate}
                      onChange={(e) => setEditValues({ ...editValues, hourlyRate: parseFloat(e.target.value) })}
                      style={{
                        padding: '6px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                        width: '100px'
                      }}
                    />
                  </div>
                  <input
                    type="checkbox"
                    checked={editValues.isDefault}
                    onChange={(e) => setEditValues({ ...editValues, isDefault: e.target.checked })}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <input
                    type="checkbox"
                    checked={editValues.isActive}
                    onChange={(e) => setEditValues({ ...editValues, isActive: e.target.checked })}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleSave(rate.id)}
                      disabled={busy}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#2ecc71',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        opacity: busy ? 0.5 : 1
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancel}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#95a5a6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '14px' }}>{rate.rate_name}</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold' }}>${rate.hourly_rate.toFixed(2)}/hr</div>
                  <div style={{ fontSize: '14px' }}>
                    {rate.is_default ? (
                      <span style={{
                        padding: '2px 8px',
                        backgroundColor: '#3498db',
                        color: 'white',
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}>
                        Default
                      </span>
                    ) : '-'}
                  </div>
                  <div style={{ fontSize: '14px' }}>
                    {rate.is_active ? (
                      <span style={{ color: '#2ecc71' }}>✓</span>
                    ) : (
                      <span style={{ color: '#e74c3c' }}>✗</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleEdit(rate)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#3498db',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    Edit
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: '#fff3cd',
          borderRadius: '6px',
          border: '1px solid #ffc107',
          fontSize: '14px',
          color: '#856404'
        }}>
          <strong>Note:</strong> The default labor rate is automatically used when adding services to estimates.
          You can adjust individual service rates in the cost calculator.
        </div>
      </div>
    </div>
  );
}