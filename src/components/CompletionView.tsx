import { useState } from 'react';
import { api } from '../api';

interface CompletionViewProps {
  workOrder: any;
  onStageChange: (stage: any, workOrder?: any) => void;
}

export function CompletionView({ workOrder, onStageChange }: CompletionViewProps) {
  const [paymentMethod, setPaymentMethod] = useState('CARD');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [completed, setCompleted] = useState(false);

  const handleComplete = async () => {
    setBusy(true);
    setMessage('');

    try {
      await api.completeWorkOrder(workOrder.id, {
        paymentMethod
      });

      setCompleted(true);
      setMessage('Work order completed successfully!');
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
        <h2 style={{ marginTop: 0, color: '#2c3e50' }}>Vehicle Pickup & Completion</h2>
        <p style={{ color: '#7f8c8d', marginBottom: '24px' }}>
          Process payment and close work order
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
          backgroundColor: '#d4edda',
          padding: '20px',
          borderRadius: '6px',
          marginBottom: '24px',
          border: '2px solid #c3e6cb'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: '#2ecc71',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '32px',
              fontWeight: 'bold'
            }}>
              ✓
            </div>
          </div>

          <h3 style={{ marginTop: 0, textAlign: 'center', color: '#155724', fontSize: '20px' }}>
            Quality Check Passed
          </h3>
          <div style={{ textAlign: 'center', fontSize: '14px', color: '#155724' }}>
            Work Order #{workOrder.work_order_number || workOrder.id.slice(-6).toUpperCase()}
          </div>
        </div>

        <div style={{
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          marginBottom: '24px',
          border: '1px solid #dee2e6'
        }}>
          <h3 style={{ marginTop: 0, fontSize: '18px', color: '#495057' }}>
            Invoice Summary
          </h3>

          <div style={{ marginBottom: '16px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: '1px solid #dee2e6'
            }}>
              <span>Labor & Parts</span>
              <span style={{ fontWeight: 'bold' }}>
                ${(workOrder.estimated_total || 0).toFixed(2)}
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: '1px solid #dee2e6'
            }}>
              <span>Shop Supplies (5%)</span>
              <span style={{ fontWeight: 'bold' }}>
                ${((workOrder.estimated_total || 0) * 0.05).toFixed(2)}
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: '2px solid #495057'
            }}>
              <span>Tax (13%)</span>
              <span style={{ fontWeight: 'bold' }}>
                ${((workOrder.estimated_total || 0) * 1.05 * 0.13).toFixed(2)}
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 0',
              fontSize: '20px',
              fontWeight: 'bold'
            }}>
              <span>TOTAL DUE:</span>
              <span style={{ color: '#2c3e50' }}>
                ${((workOrder.estimated_total || 0) * 1.05 * 1.13).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {!completed ? (
          <>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="CARD">Credit/Debit Card</option>
                <option value="CASH">Cash</option>
                <option value="CHECK">Check</option>
                <option value="FINANCING">Financing</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleComplete}
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
                {busy ? 'Processing...' : 'Process Payment & Complete'}
              </button>

              <button
                onClick={() => onStageChange('QC')}
                style={{
                  padding: '16px 24px',
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
          </>
        ) : (
          <>
            <div style={{
              padding: '32px',
              backgroundColor: '#d4edda',
              border: '2px solid #c3e6cb',
              borderRadius: '8px',
              textAlign: 'center',
              marginBottom: '24px'
            }}>
              <div style={{
                fontSize: '64px',
                marginBottom: '16px'
              }}>
                🎉
              </div>
              <h3 style={{ marginTop: 0, color: '#155724', fontSize: '24px' }}>
                Work Order Complete!
              </h3>
              <div style={{ fontSize: '16px', color: '#155724', marginBottom: '16px' }}>
                Thank you for your business
              </div>
              <div style={{
                fontSize: '14px',
                color: '#155724',
                backgroundColor: 'white',
                padding: '12px',
                borderRadius: '4px',
                display: 'inline-block'
              }}>
                Paid: ${((workOrder.estimated_total || 0) * 1.05 * 1.13).toFixed(2)} via {paymentMethod}
              </div>
            </div>

            <button
              onClick={() => onStageChange('INTAKE')}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Start New Work Order
            </button>
          </>
        )}
      </div>
    </div>
  );
}