import { useState } from 'react';
import { api } from '../api';

interface QualityCheckViewProps {
  workOrder: any;
  onStageChange: (stage: any, workOrder?: any) => void;
}

export function QualityCheckView({ workOrder, onStageChange }: QualityCheckViewProps) {
  const [inspector, setInspector] = useState('');
  const [testDrive, setTestDrive] = useState(false);
  const [testDriveNotes, setTestDriveNotes] = useState('');
  const [checklist, setChecklist] = useState({
    workCompleted: false,
    noLeaks: false,
    properTorque: false,
    functionalTest: false,
    cleanWorkArea: false
  });
  const [failureReasons, setFailureReasons] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const allChecked = Object.values(checklist).every(v => v);

  const handleQCResult = async (passed: boolean) => {
    if (!inspector.trim()) {
      setMessage('Please enter inspector name');
      return;
    }

    if (!passed && !failureReasons.trim()) {
      setMessage('Please specify failure reasons');
      return;
    }

    setBusy(true);
    setMessage('');

    try {
      await api.submitQualityCheck(workOrder.id, {
        inspector,
        checklistItems: JSON.stringify(checklist),
        testDrivePerformed: testDrive,
        testDriveNotes,
        overallStatus: passed ? 'PASSED' : 'FAILED',
        failureReasons: passed ? '' : failureReasons
      });

      setMessage(`QC ${passed ? 'Passed' : 'Failed'}!`);

      if (passed) {
        setTimeout(() => {
          onStageChange('COMPLETION', workOrder);
        }, 1500);
      } else {
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

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginTop: 0, color: '#2c3e50' }}>Quality Control Inspection</h2>
        <p style={{ color: '#7f8c8d', marginBottom: '24px' }}>
          Verify work quality before releasing vehicle to customer
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
          backgroundColor: '#e8f4f8',
          padding: '16px',
          borderRadius: '6px',
          marginBottom: '24px',
          border: '1px solid #bee5eb'
        }}>
          <h3 style={{ marginTop: 0, fontSize: '16px', color: '#0c5460' }}>
            Work Order #{workOrder.work_order_number || workOrder.id.slice(-6).toUpperCase()}
          </h3>
          <div style={{ fontSize: '14px', color: '#0c5460' }}>
            Original Complaint: {workOrder.customer_complaint}
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Inspector Name *
          </label>
          <input
            type="text"
            placeholder="Your name"
            value={inspector}
            onChange={(e) => setInspector(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '2px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          border: '1px solid #dee2e6'
        }}>
          <h3 style={{ marginTop: 0, fontSize: '16px', color: '#495057' }}>
            Quality Checklist
          </h3>

          {Object.entries({
            workCompleted: 'All work completed as specified',
            noLeaks: 'No fluid leaks detected',
            properTorque: 'All fasteners properly torqued',
            functionalTest: 'Functional test passed',
            cleanWorkArea: 'Work area cleaned and organized'
          }).map(([key, label]) => (
            <label
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px',
                marginBottom: '8px',
                backgroundColor: 'white',
                borderRadius: '4px',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: checklist[key as keyof typeof checklist] ? '#2ecc71' : '#dee2e6'
              }}
            >
              <input
                type="checkbox"
                checked={checklist[key as keyof typeof checklist]}
                onChange={(e) => setChecklist({ ...checklist, [key]: e.target.checked })}
                style={{ marginRight: '12px', width: '20px', height: '20px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', flex: 1 }}>{label}</span>
              {checklist[key as keyof typeof checklist] && (
                <span style={{ color: '#2ecc71', fontSize: '18px' }}>✓</span>
              )}
            </label>
          ))}
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
            cursor: 'pointer',
            border: '2px solid',
            borderColor: testDrive ? '#3498db' : '#dee2e6'
          }}>
            <input
              type="checkbox"
              checked={testDrive}
              onChange={(e) => setTestDrive(e.target.checked)}
              style={{ marginRight: '12px', width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '14px', fontWeight: '500' }}>Test drive performed</span>
          </label>

          {testDrive && (
            <textarea
              placeholder="Test drive observations..."
              value={testDriveNotes}
              onChange={(e) => setTestDriveNotes(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'inherit',
                marginTop: '8px',
                resize: 'vertical'
              }}
            />
          )}
        </div>

        {!allChecked && (
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Failure Reasons (if failing QC)
            </label>
            <textarea
              placeholder="Describe issues found that need to be corrected..."
              value={failureReasons}
              onChange={(e) => setFailureReasons(e.target.value)}
              rows={4}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #e74c3c',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => handleQCResult(true)}
            disabled={busy || !allChecked}
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
              opacity: (busy || !allChecked) ? 0.5 : 1
            }}
          >
            ✓ Pass QC - Ready for Pickup
          </button>

          <button
            onClick={() => handleQCResult(false)}
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
            ✗ Fail QC - Return to Work
          </button>
        </div>

        <button
          onClick={() => onStageChange('IN_PROGRESS')}
          style={{
            marginTop: '16px',
            padding: '12px 24px',
            backgroundColor: '#95a5a6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Back to Work Progress
        </button>
      </div>
    </div>
  );
}