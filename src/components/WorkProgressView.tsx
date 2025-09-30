import { useState, useEffect } from 'react';
import { api } from '../api';

interface WorkProgressViewProps {
  workOrder: any;
  technicians: any[];
  onStageChange: (stage: any, workOrder?: any) => void;
}

export function WorkProgressView({ workOrder, technicians, onStageChange }: WorkProgressViewProps) {
  const [notes, setNotes] = useState('');
  const [partsUsed, setPartsUsed] = useState<any[]>([]);
  const [timeTracking, setTimeTracking] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadWorkDetails();
  }, [workOrder.id]);

  const loadWorkDetails = async () => {
    try {
      const [partsResponse, timeResponse] = await Promise.all([
        api.getPartsUsedByWorkOrder(workOrder.id),
        api.getTimeLogs(workOrder.id)
      ]);
      setPartsUsed(partsResponse.partsUsed || []);
      setTimeTracking(timeResponse.timeLogs || []);
    } catch (error) {
      console.error('Failed to load work details:', error);
    }
  };

  const handleCompleteWork = async () => {
    setBusy(true);
    setMessage('');

    try {
      await api.updateWorkOrderStage(workOrder.id, {
        workflowStage: 'Quality Control',
        internalNotes: notes
      });

      setMessage('Work completed! Moving to quality check...');
      setTimeout(() => {
        onStageChange('QC', workOrder);
      }, 1500);
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const assignedTech = technicians.find(t => t.id === workOrder.assigned_technician_id);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginTop: 0, color: '#2c3e50' }}>Work in Progress</h2>
        <p style={{ color: '#7f8c8d', marginBottom: '24px' }}>
          Track active repair work and document progress
        </p>

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

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            padding: '16px',
            backgroundColor: '#e8f4f8',
            borderRadius: '6px',
            border: '1px solid #bee5eb'
          }}>
            <h3 style={{ marginTop: 0, fontSize: '16px', color: '#0c5460' }}>
              Work Order Info
            </h3>
            <div style={{ fontSize: '14px' }}>
              <strong>WO #:</strong> {workOrder.work_order_number || workOrder.id.slice(-6).toUpperCase()}
            </div>
            <div style={{ fontSize: '14px' }}>
              <strong>Status:</strong> {workOrder.workflow_stage}
            </div>
          </div>

          {assignedTech && (
            <div style={{
              padding: '16px',
              backgroundColor: '#d4edda',
              borderRadius: '6px',
              border: '1px solid #c3e6cb'
            }}>
              <h3 style={{ marginTop: 0, fontSize: '16px', color: '#155724' }}>
                Assigned Technician
              </h3>
              <div style={{ fontSize: '14px' }}>
                <strong>{assignedTech.first_name} {assignedTech.last_name}</strong>
              </div>
              <div style={{ fontSize: '13px', color: '#155724' }}>
                {assignedTech.skill_level} - {assignedTech.specializations}
              </div>
            </div>
          )}
        </div>

        {partsUsed.length > 0 && (
          <div style={{
            marginBottom: '24px',
            padding: '16px',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
            border: '1px solid #dee2e6'
          }}>
            <h3 style={{ marginTop: 0, fontSize: '16px', color: '#495057' }}>
              Parts Used
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {partsUsed.map((part, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px',
                    backgroundColor: 'white',
                    borderRadius: '4px'
                  }}
                >
                  <div>
                    <strong>{part.partName}</strong>
                    <div style={{ fontSize: '13px', color: '#6c757d' }}>
                      Qty: {part.quantityUsed} × ${part.priceEach.toFixed(2)}
                    </div>
                  </div>
                  <div style={{ fontWeight: 'bold' }}>
                    ${part.totalPrice.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {timeTracking.length > 0 && (
          <div style={{
            marginBottom: '24px',
            padding: '16px',
            backgroundColor: '#fff3cd',
            borderRadius: '6px',
            border: '1px solid #ffc107'
          }}>
            <h3 style={{ marginTop: 0, fontSize: '16px', color: '#856404' }}>
              Time Tracking
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {timeTracking.map((log, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px',
                    backgroundColor: 'white',
                    borderRadius: '4px'
                  }}
                >
                  <div>
                    <strong>{log.opName}</strong>
                    <div style={{ fontSize: '13px', color: '#856404' }}>
                      {new Date(log.startAt).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ fontWeight: 'bold' }}>
                    {log.actualHours ? `${log.actualHours.toFixed(2)} hrs` : 'In Progress'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Work Notes
          </label>
          <textarea
            placeholder="Document work performed, issues encountered, etc..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleCompleteWork}
            disabled={busy}
            style={{
              flex: 1,
              padding: '14px',
              backgroundColor: '#2ecc71',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              opacity: busy ? 0.5 : 1
            }}
          >
            {busy ? 'Completing...' : 'Complete Work - Send to QC'}
          </button>

          <button
            onClick={() => onStageChange('APPROVAL')}
            style={{
              padding: '14px 24px',
              backgroundColor: '#95a5a6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}