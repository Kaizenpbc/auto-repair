import { useState, useEffect } from 'react';
import { api } from '../api';

interface ApprovalViewProps {
  workOrder: any;
  onStageChange: (stage: any, workOrder?: any) => void;
}

export function ApprovalView({ workOrder, onStageChange }: ApprovalViewProps) {
  const [approvalStatus, setApprovalStatus] = useState<'APPROVED' | 'DECLINED' | null>(null);
  const [customerNotes, setCustomerNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [estimateLines, setEstimateLines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEstimateLines();
  }, []);

  const loadEstimateLines = async () => {
    try {
      const result = await api.draftEstimate('org-1', workOrder.id);
      setEstimateLines(result.lines);
    } catch (error) {
      console.error('Failed to load estimate lines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (status: 'APPROVED' | 'DECLINED') => {
    setBusy(true);
    setMessage('');

    try {
      await api.updateApprovalStatus(workOrder.id, {
        approvalStatus: status,
        customerNotes
      });

      setApprovalStatus(status);
      setMessage(`Customer has ${status === 'APPROVED' ? 'approved' : 'declined'} the estimate`);

      if (status === 'APPROVED') {
        setTimeout(() => {
          onStageChange('IN_PROGRESS', workOrder);
        }, 1500);
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleSendBackToDiagnosis = async () => {
    setBusy(true);
    setMessage('');

    try {
      await api.sendBackToDiagnosis(workOrder.id, customerNotes);
      setMessage('Sent back to diagnosis for revision...');
      setTimeout(() => {
        onStageChange('DIAGNOSIS', workOrder);
      }, 1500);
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginTop: 0, color: '#2c3e50' }}>Customer Approval</h2>
        <p style={{ color: '#7f8c8d', marginBottom: '24px' }}>
          Waiting for customer to approve or decline the estimate
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
          backgroundColor: '#fff3cd',
          padding: '20px',
          borderRadius: '6px',
          marginBottom: '24px',
          border: '2px solid #ffc107'
        }}>
          <h3 style={{ marginTop: 0, fontSize: '18px', color: '#856404' }}>
            Estimate Details
          </h3>
          <div style={{ fontSize: '14px', color: '#856404', marginBottom: '12px' }}>
            Work Order #{workOrder.work_order_number || workOrder.id.slice(-6).toUpperCase()}
          </div>

          {workOrder.additional_findings && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Findings:</div>
              <div style={{ fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                {workOrder.additional_findings}
              </div>
            </div>
          )}

          {workOrder.recommended_services && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Recommended Services:</div>
              <div style={{ fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                {workOrder.recommended_services}
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#7f8c8d' }}>
              Loading estimate details...
            </div>
          ) : estimateLines.length > 0 ? (
            <div style={{ marginTop: '20px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '16px' }}>
                Estimate Breakdown:
              </div>

              <div style={{ backgroundColor: 'white', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
                {estimateLines.map((line, index) => (
                  <div
                    key={line.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 100px 100px 120px',
                      gap: '12px',
                      padding: '12px',
                      borderBottom: index < estimateLines.length - 1 ? '1px solid #e0e0e0' : 'none',
                      alignItems: 'center',
                      fontSize: '14px'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '500', color: '#2c3e50' }}>{line.description}</div>
                      {line.type === 'LABOR' && line.estHours && (
                        <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '2px' }}>
                          {line.estHours} hrs @ ${line.rate?.toFixed(2)}/hr
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'center', color: '#7f8c8d' }}>
                      {line.type}
                    </div>
                    <div style={{ textAlign: 'center', color: '#7f8c8d' }}>
                      Qty: {line.qty}
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 'bold', color: '#2c3e50' }}>
                      ${(line.unitPrice * line.qty).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px',
            backgroundColor: 'white',
            borderRadius: '4px',
            marginTop: '16px'
          }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2c3e50' }}>
              Estimated Total:
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2c3e50' }}>
              ${(workOrder.estimated_total || 0).toFixed(2)}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Customer Notes (Optional)
          </label>
          <textarea
            placeholder="Any notes or special requests from the customer..."
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
            rows={3}
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

        {!approvalStatus ? (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => handleApproval('APPROVED')}
              disabled={busy}
              style={{
                flex: 1,
                padding: '16px',
                backgroundColor: '#2ecc71',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                opacity: busy ? 0.5 : 1
              }}
            >
              ✓ Customer Approves
            </button>

            <button
              onClick={() => handleApproval('DECLINED')}
              disabled={busy}
              style={{
                flex: 1,
                padding: '16px',
                backgroundColor: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                opacity: busy ? 0.5 : 1
              }}
            >
              ✗ Customer Declines
            </button>
          </div>
        ) : (
          <div style={{
            padding: '20px',
            backgroundColor: approvalStatus === 'APPROVED' ? '#d4edda' : '#f8d7da',
            border: `2px solid ${approvalStatus === 'APPROVED' ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: '6px',
            textAlign: 'center',
            fontSize: '18px',
            fontWeight: 'bold',
            color: approvalStatus === 'APPROVED' ? '#155724' : '#721c24'
          }}>
            {approvalStatus === 'APPROVED'
              ? '✓ Estimate Approved - Proceeding to work...'
              : '✗ Estimate Declined'}
          </div>
        )}

        {!approvalStatus && (
          <button
            onClick={handleSendBackToDiagnosis}
            disabled={busy}
            style={{
              width: '100%',
              marginTop: '16px',
              padding: '12px 24px',
              backgroundColor: '#f39c12',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              opacity: busy ? 0.5 : 1
            }}
          >
            ↩ Send Back for Revision
          </button>
        )}
      </div>
    </div>
  );
}