import { useState, useEffect } from 'react';
import { api } from '../api';

interface DiagnosisViewProps {
  workOrder: any;
  onStageChange: (stage: any, workOrder?: any) => void;
}

const COMMON_FINDINGS = [
  { category: 'Brakes', items: [
    'Brake pads worn to 3mm or less',
    'Brake rotors below minimum thickness',
    'Brake fluid contaminated/dark',
    'Brake lines showing signs of wear',
    'Parking brake not holding',
    'Brake pedal feels soft/spongy'
  ]},
  { category: 'Engine', items: [
    'Engine oil dirty/low',
    'Oil leak from valve cover gasket',
    'Oil leak from oil pan gasket',
    'Coolant leak detected',
    'Spark plugs worn/fouled',
    'Air filter dirty/clogged',
    'Check engine light - code retrieved',
    'Engine running rough at idle',
    'Timing belt due for replacement'
  ]},
  { category: 'Suspension', items: [
    'Front struts leaking',
    'Rear shocks worn',
    'Control arm bushings cracked',
    'Ball joints have excessive play',
    'Sway bar links worn',
    'Vehicle pulls to one side'
  ]},
  { category: 'Tires', items: [
    'Tire tread below 4/32"',
    'Uneven tire wear pattern',
    'Tire pressure low',
    'Tire showing sidewall damage'
  ]},
  { category: 'Electrical', items: [
    'Battery failing load test',
    'Alternator not charging properly',
    'Headlight/taillight bulb out',
    'Wiring harness damage found'
  ]},
  { category: 'Other', items: [
    'Windshield wipers streaking',
    'Cabin air filter dirty',
    'Transmission fluid dark/burnt smell',
    'Differential fluid due for service',
    'Exhaust system rust/holes detected'
  ]}
];

const COMMON_RECOMMENDATIONS = [
  'Tire rotation',
  'Wheel alignment',
  'Transmission fluid flush',
  'Coolant flush',
  'Differential service',
  'Fuel system cleaning',
  'Throttle body cleaning',
  'Battery terminal cleaning',
  'Cabin air filter replacement',
  'Engine air filter replacement'
];

interface ServiceLine {
  id: string;
  serviceName: string;
  hours: number;
  laborRate: number;
  laborCost: number;
}

interface PartLine {
  id: string;
  partId: string;
  partName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export function DiagnosisView({ workOrder, onStageChange }: DiagnosisViewProps) {
  const [findings, setFindings] = useState('');
  const [recommended, setRecommended] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [showFindingsPicker, setShowFindingsPicker] = useState(false);
  const [showRecommendedPicker, setShowRecommendedPicker] = useState(false);

  const [services, setServices] = useState<any[]>([]);
  const [availableParts, setAvailableParts] = useState<any[]>([]);
  const [laborRates, setLaborRates] = useState<any[]>([]);
  const [defaultLaborRate, setDefaultLaborRate] = useState<number>(95);

  const [serviceLines, setServiceLines] = useState<ServiceLine[]>([]);
  const [partLines, setPartLines] = useState<PartLine[]>([]);

  const [showServicePicker, setShowServicePicker] = useState(false);
  const [showPartPicker, setShowPartPicker] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [showAIRecommendations, setShowAIRecommendations] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [communications, setCommunications] = useState<any[]>([]);
  const [showRevisionHistory, setShowRevisionHistory] = useState(false);
  const [diagnosisHistory, setDiagnosisHistory] = useState<any[]>([]);
  const [showDiagnosisHistory, setShowDiagnosisHistory] = useState(false);

  useEffect(() => {
    loadData();
    loadCommunications();
    loadDiagnosisHistory();
  }, []);

  const loadCommunications = async () => {
    try {
      const result = await api.getWorkOrderCommunications(workOrder.id);
      const revisions = result.communications.filter(
        (c: any) => c.subject === 'Estimate Revision Requested'
      );
      setCommunications(revisions);
      if (revisions.length > 0) {
        setShowRevisionHistory(true);
      }
    } catch (error) {
      console.error('Failed to load communications:', error);
    }
  };

  const loadDiagnosisHistory = async () => {
    try {
      const result = await api.getDiagnosisHistory(workOrder.id);
      setDiagnosisHistory(result.history);
      if (result.history.length > 0) {
        setShowDiagnosisHistory(true);
      }
    } catch (error) {
      console.error('Failed to load diagnosis history:', error);
    }
  };

  const loadData = async () => {
    try {
      const [servicesRes, partsRes, ratesRes, defaultRateRes] = await Promise.all([
        api.getServiceCatalog(),
        api.getAvailableParts(),
        api.getLaborRates(),
        api.getDefaultLaborRate()
      ]);

      setServices(servicesRes.services);
      setAvailableParts(partsRes.parts);
      setLaborRates(ratesRes.laborRates);
      setDefaultLaborRate(defaultRateRes.laborRate.hourly_rate);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleAddFinding = (finding: string) => {
    setFindings(prev => {
      if (prev.trim()) {
        return prev + '\n• ' + finding;
      }
      return '• ' + finding;
    });
  };

  const handleAddRecommendation = (rec: string) => {
    setRecommended(prev => {
      if (prev.trim()) {
        return prev + '\n• ' + rec;
      }
      return '• ' + rec;
    });
  };

  const handleAddService = (service: any) => {
    const newLine: ServiceLine = {
      id: Math.random().toString(36).substr(2, 9),
      serviceName: service.service_name,
      hours: service.estimated_hours,
      laborRate: defaultLaborRate,
      laborCost: service.estimated_hours * defaultLaborRate
    };
    setServiceLines([...serviceLines, newLine]);
  };

  const handleAddPart = (part: any) => {
    const newLine: PartLine = {
      id: Math.random().toString(36).substr(2, 9),
      partId: part.id,
      partName: part.name,
      quantity: 1,
      unitPrice: part.unitPrice,
      totalPrice: part.unitPrice
    };
    setPartLines([...partLines, newLine]);
  };

  const handleUpdateServiceLine = (id: string, field: string, value: number) => {
    setServiceLines(serviceLines.map(line => {
      if (line.id === id) {
        const updated = { ...line, [field]: value };
        if (field === 'hours' || field === 'laborRate') {
          updated.laborCost = updated.hours * updated.laborRate;
        }
        return updated;
      }
      return line;
    }));
  };

  const handleUpdatePartLine = (id: string, field: string, value: number) => {
    setPartLines(partLines.map(line => {
      if (line.id === id) {
        const updated = { ...line, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.totalPrice = updated.quantity * updated.unitPrice;
        }
        return updated;
      }
      return line;
    }));
  };

  const handleRemoveServiceLine = (id: string) => {
    setServiceLines(serviceLines.filter(line => line.id !== id));
  };

  const handleRemovePartLine = (id: string) => {
    setPartLines(partLines.filter(line => line.id !== id));
  };

  const handleGetAIRecommendations = async () => {
    setAiLoading(true);
    setMessage('');

    try {
      const vehicleMake = workOrder.vehicle?.make;
      const vehicleMileage = workOrder.vehicle?.mileage || workOrder.vehicle?.current_mileage;
      const result = await api.getAIServiceRecommendations(
        workOrder.customer_complaint,
        findings,
        vehicleMake,
        vehicleMileage
      );
      setAiRecommendations(result.recommendations);
      setShowAIRecommendations(true);

      if (result.recommendations.length === 0) {
        setMessage('No specific recommendations. Consider comprehensive diagnostic.');
      } else {
        setMessage(`Found ${result.recommendations.length} AI-powered recommendations based on symptoms${vehicleMileage ? `, mileage (${vehicleMileage})` : ''}${vehicleMake ? `, and ${vehicleMake} vehicle data` : ''}.`);
      }
    } catch (error: any) {
      setMessage(`Error getting recommendations: ${error.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddRecommendedService = (service: any) => {
    handleAddService(service);
    setShowAIRecommendations(false);
  };

  const totalLaborCost = serviceLines.reduce((sum, line) => sum + line.laborCost, 0);
  const totalPartsCost = partLines.reduce((sum, line) => sum + line.totalPrice, 0);
  const estimatedTotal = totalLaborCost + totalPartsCost;

  const handleSubmitDiagnosis = async () => {
    if (!findings.trim()) {
      setMessage('Please enter diagnostic findings');
      return;
    }

    if (estimatedTotal <= 0) {
      setMessage('Please add at least one service or part');
      return;
    }

    setBusy(true);
    setMessage('');

    try {
      await api.submitDiagnosis(workOrder.id, {
        additionalFindings: findings,
        recommendedServices: recommended,
        estimatedTotal: estimatedTotal,
        serviceLines: serviceLines,
        partLines: partLines
      });

      const updatedWorkOrder = {
        ...workOrder,
        additional_findings: findings,
        recommended_services: recommended,
        estimated_total: estimatedTotal
      };

      setMessage('Diagnosis submitted! Moving to customer approval...');
      setTimeout(() => {
        onStageChange('APPROVAL', updatedWorkOrder);
      }, 1500);
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginTop: 0, color: '#2c3e50' }}>Diagnostic & Inspection</h2>
        <p style={{ color: '#7f8c8d', marginBottom: '24px' }}>
          Document findings and create estimate for customer approval
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
          backgroundColor: '#f8f9fa',
          padding: '16px',
          borderRadius: '6px',
          marginBottom: '24px',
          border: '1px solid #dee2e6'
        }}>
          <h3 style={{ marginTop: 0, fontSize: '16px', color: '#495057' }}>
            Work Order #{workOrder.work_order_number || workOrder.id.slice(-6).toUpperCase()}
          </h3>
          <div style={{ fontSize: '14px', color: '#6c757d' }}>
            <strong>Customer Complaint:</strong> {workOrder.customer_complaint}
          </div>
        </div>

        {communications.length > 0 && (
          <div style={{
            backgroundColor: '#fff3cd',
            padding: '16px',
            borderRadius: '6px',
            marginBottom: '24px',
            border: '2px solid #f39c12'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#856404', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⚠️ Revision History ({communications.length})
              </h3>
              <button
                onClick={() => setShowRevisionHistory(!showRevisionHistory)}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#f39c12',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                {showRevisionHistory ? 'Hide' : 'Show'}
              </button>
            </div>
            {showRevisionHistory && (
              <div style={{ marginTop: '12px' }}>
                {communications.map((comm: any) => (
                  <div
                    key={comm.id}
                    style={{
                      padding: '12px',
                      backgroundColor: 'white',
                      borderRadius: '4px',
                      marginBottom: '8px',
                      borderLeft: '4px solid #f39c12'
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>
                      {new Date(comm.created_at).toLocaleString()} - {comm.sent_by}
                    </div>
                    <div style={{ fontSize: '14px', color: '#2c3e50' }}>
                      {comm.message}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {diagnosisHistory.length > 0 && (
          <div style={{
            backgroundColor: '#e8f4f8',
            padding: '16px',
            borderRadius: '6px',
            marginBottom: '24px',
            border: '2px solid #3498db'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#2c3e50', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📋 Previous Diagnosis Versions ({diagnosisHistory.length})
              </h3>
              <button
                onClick={() => setShowDiagnosisHistory(!showDiagnosisHistory)}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                {showDiagnosisHistory ? 'Hide' : 'Show'}
              </button>
            </div>
            {showDiagnosisHistory && (
              <div style={{ marginTop: '12px' }}>
                {diagnosisHistory.map((history: any) => (
                  <div
                    key={history.id}
                    style={{
                      padding: '16px',
                      backgroundColor: 'white',
                      borderRadius: '6px',
                      marginBottom: '12px',
                      borderLeft: '4px solid #3498db'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid #e0e0e0'
                    }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '4px' }}>
                          Version {history.version}
                        </div>
                        <div style={{ fontSize: '11px', color: '#7f8c8d' }}>
                          {new Date(history.created_at).toLocaleString()} by {history.created_by}
                        </div>
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#3498db' }}>
                        ${(history.estimated_total / 100).toFixed(2)}
                      </div>
                    </div>

                    {history.revision_reason && (
                      <div style={{
                        padding: '8px 12px',
                        backgroundColor: '#fff3cd',
                        borderRadius: '4px',
                        marginBottom: '12px',
                        fontSize: '13px',
                        color: '#856404'
                      }}>
                        <strong>Revision Reason:</strong> {history.revision_reason}
                      </div>
                    )}

                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '4px' }}>
                        Findings:
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: '#666',
                        whiteSpace: 'pre-wrap',
                        backgroundColor: '#f8f9fa',
                        padding: '8px',
                        borderRadius: '4px'
                      }}>
                        {history.additional_findings || 'No findings recorded'}
                      </div>
                    </div>

                    {history.recommended_services && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '4px' }}>
                          Recommended Services:
                        </div>
                        <div style={{
                          fontSize: '13px',
                          color: '#666',
                          whiteSpace: 'pre-wrap',
                          backgroundColor: '#f8f9fa',
                          padding: '8px',
                          borderRadius: '4px'
                        }}>
                          {history.recommended_services}
                        </div>
                      </div>
                    )}

                    {history.service_lines && history.service_lines.length > 0 && (
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '6px' }}>
                          Services ({history.service_lines.length}):
                        </div>
                        <div style={{ fontSize: '12px' }}>
                          {history.service_lines.map((line: any, idx: number) => (
                            <div key={idx} style={{
                              padding: '6px 8px',
                              backgroundColor: '#f8f9fa',
                              marginBottom: '4px',
                              borderRadius: '3px',
                              display: 'flex',
                              justifyContent: 'space-between'
                            }}>
                              <span>{line.description}</span>
                              <span style={{ fontWeight: 'bold' }}>${(line.unit_price * line.est_hours / 100).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {history.part_lines && history.part_lines.length > 0 && (
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '6px' }}>
                          Parts ({history.part_lines.length}):
                        </div>
                        <div style={{ fontSize: '12px' }}>
                          {history.part_lines.map((line: any, idx: number) => (
                            <div key={idx} style={{
                              padding: '6px 8px',
                              backgroundColor: '#f8f9fa',
                              marginBottom: '4px',
                              borderRadius: '3px',
                              display: 'flex',
                              justifyContent: 'space-between'
                            }}>
                              <span>{line.description} (x{line.qty})</span>
                              <span style={{ fontWeight: 'bold' }}>${(line.unit_price * line.qty / 100).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontWeight: '500' }}>
              Diagnostic Findings *
            </label>
            <button
              onClick={() => setShowFindingsPicker(!showFindingsPicker)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              {showFindingsPicker ? 'Hide Quick Picks' : 'Quick Pick Common Findings'}
            </button>
          </div>

          {showFindingsPicker && (
            <div style={{
              marginBottom: '12px',
              padding: '16px',
              backgroundColor: '#ebf5fb',
              borderRadius: '6px',
              border: '1px solid #3498db',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              {COMMON_FINDINGS.map((group) => (
                <div key={group.category} style={{ marginBottom: '16px' }}>
                  <div style={{ fontWeight: 'bold', color: '#2c3e50', marginBottom: '8px', fontSize: '14px' }}>
                    {group.category}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {group.items.map((item) => (
                      <button
                        key={item}
                        onClick={() => handleAddFinding(item)}
                        style={{
                          padding: '6px 10px',
                          backgroundColor: 'white',
                          border: '1px solid #3498db',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#3498db';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'white';
                          e.currentTarget.style.color = 'black';
                        }}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <textarea
            placeholder="Document what you found during inspection..."
            value={findings}
            onChange={(e) => setFindings(e.target.value)}
            rows={4}
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

        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontWeight: '500' }}>
              Recommended Services
            </label>
            <button
              onClick={() => setShowRecommendedPicker(!showRecommendedPicker)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#9b59b6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              {showRecommendedPicker ? 'Hide Quick Picks' : 'Quick Pick Services'}
            </button>
          </div>

          {showRecommendedPicker && (
            <div style={{
              marginBottom: '12px',
              padding: '16px',
              backgroundColor: '#f4ecf7',
              borderRadius: '6px',
              border: '1px solid #9b59b6',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px'
            }}>
              {COMMON_RECOMMENDATIONS.map((rec) => (
                <button
                  key={rec}
                  onClick={() => handleAddRecommendation(rec)}
                  style={{
                    padding: '6px 10px',
                    backgroundColor: 'white',
                    border: '1px solid #9b59b6',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#9b59b6';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.color = 'black';
                  }}
                >
                  {rec}
                </button>
              ))}
            </div>
          )}

          <textarea
            placeholder="Additional services you recommend..."
            value={recommended}
            onChange={(e) => setRecommended(e.target.value)}
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

        <div style={{
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '2px solid #3498db',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#2c3e50' }}>Cost Estimate Calculator</h3>
            <button
              onClick={handleGetAIRecommendations}
              disabled={aiLoading || !workOrder.customer_complaint}
              style={{
                padding: '10px 20px',
                backgroundColor: '#9b59b6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '600',
                opacity: (aiLoading || !workOrder.customer_complaint) ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {aiLoading ? '⚙️ Analyzing...' : '✨ AI Recommend Services'}
            </button>
          </div>

          {showAIRecommendations && aiRecommendations.length > 0 && (
            <div style={{
              marginBottom: '20px',
              padding: '16px',
              backgroundColor: '#f4ecf7',
              borderRadius: '6px',
              border: '2px solid #9b59b6'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '16px', color: '#6c3483' }}>
                  ✨ AI Recommended Services
                </h4>
                <button
                  onClick={() => setShowAIRecommendations(false)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: 'transparent',
                    color: '#6c3483',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '18px'
                  }}
                >
                  ×
                </button>
              </div>

              {aiRecommendations.map((service) => {
                const urgencyColors = {
                  high: { bg: '#fee', border: '#fcc', text: '#c33', badge: '#e74c3c' },
                  medium: { bg: '#fff4e6', border: '#ffe0b2', text: '#e67e22', badge: '#f39c12' },
                  low: { bg: '#e8f8f5', border: '#d5f4e6', text: '#27ae60', badge: '#2ecc71' }
                };
                const colors = urgencyColors[service.urgency as keyof typeof urgencyColors] || urgencyColors.medium;

                return (
                  <div
                    key={service.id}
                    onClick={() => handleAddRecommendedService(service)}
                    style={{
                      padding: '12px',
                      marginBottom: '8px',
                      backgroundColor: 'white',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      border: `2px solid ${colors.border}`,
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = colors.badge;
                      e.currentTarget.style.backgroundColor = colors.bg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = colors.border;
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '4px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <div style={{ fontWeight: '600', fontSize: '14px', color: '#2c3e50' }}>
                            {service.service_name}
                          </div>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            backgroundColor: colors.badge,
                            color: 'white',
                            textTransform: 'uppercase'
                          }}>
                            {service.urgency}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '2px' }}>
                          {service.category} • {service.estimated_hours} hrs • {service.confidence}% confidence
                        </div>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: colors.badge, marginLeft: '12px' }}>
                        ${(service.estimated_hours * defaultLaborRate).toFixed(2)}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: colors.text,
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: `1px solid ${colors.border}`,
                      lineHeight: '1.4'
                    }}>
                      💡 {service.reason}
                    </div>
                  </div>
                );
              })}

              <div style={{
                fontSize: '11px',
                color: '#7f8c8d',
                textAlign: 'center',
                marginTop: '12px',
                padding: '8px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                border: '1px solid #dee2e6'
              }}>
                <div style={{ marginBottom: '4px', fontWeight: '600' }}>Click any recommendation to add to estimate</div>
                <div style={{ fontSize: '10px' }}>
                  <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>HIGH</span> = Safety/urgent •
                  <span style={{ color: '#f39c12', fontWeight: 'bold' }}> MEDIUM</span> = Performance/recommended •
                  <span style={{ color: '#2ecc71', fontWeight: 'bold' }}> LOW</span> = Preventive maintenance
                </div>
              </div>
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '16px', color: '#495057' }}>Labor Services</h4>
              <button
                onClick={() => setShowServicePicker(!showServicePicker)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#2ecc71',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                + Add Service
              </button>
            </div>

            {showServicePicker && (
              <div style={{
                marginBottom: '12px',
                padding: '12px',
                backgroundColor: 'white',
                borderRadius: '6px',
                border: '1px solid #2ecc71',
                maxHeight: '250px',
                overflowY: 'auto'
              }}>
                {services.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => {
                      handleAddService(service);
                      setShowServicePicker(false);
                    }}
                    style={{
                      padding: '10px',
                      marginBottom: '6px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      border: '1px solid #ddd',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e8f8f5';
                      e.currentTarget.style.borderColor = '#2ecc71';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                      e.currentTarget.style.borderColor = '#ddd';
                    }}
                  >
                    <div style={{ fontWeight: '500', fontSize: '14px' }}>{service.service_name}</div>
                    <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                      {service.category} • {service.estimated_hours} hrs @ ${defaultLaborRate}/hr = ${(service.estimated_hours * defaultLaborRate).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {serviceLines.map((line) => (
              <div key={line.id} style={{
                display: 'grid',
                gridTemplateColumns: '2fr 100px 100px 100px 40px',
                gap: '8px',
                alignItems: 'center',
                padding: '8px',
                backgroundColor: 'white',
                borderRadius: '4px',
                marginBottom: '8px'
              }}>
                <div style={{ fontSize: '14px', fontWeight: '500' }}>{line.serviceName}</div>
                <input
                  type="number"
                  step="0.25"
                  value={line.hours}
                  onChange={(e) => handleUpdateServiceLine(line.id, 'hours', parseFloat(e.target.value) || 0)}
                  style={{ padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
                  placeholder="Hours"
                />
                <input
                  type="number"
                  step="5"
                  value={line.laborRate}
                  onChange={(e) => handleUpdateServiceLine(line.id, 'laborRate', parseFloat(e.target.value) || 0)}
                  style={{ padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
                  placeholder="Rate"
                />
                <div style={{ fontSize: '14px', fontWeight: 'bold', textAlign: 'right' }}>
                  ${line.laborCost.toFixed(2)}
                </div>
                <button
                  onClick={() => handleRemoveServiceLine(line.id)}
                  style={{
                    padding: '4px',
                    backgroundColor: '#e74c3c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  ×
                </button>
              </div>
            ))}

            {serviceLines.length > 0 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px',
                backgroundColor: '#e8f8f5',
                borderRadius: '4px',
                marginTop: '8px'
              }}>
                <div style={{ fontWeight: 'bold' }}>Total Labor:</div>
                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>${totalLaborCost.toFixed(2)}</div>
              </div>
            )}
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '16px', color: '#495057' }}>Parts</h4>
              <button
                onClick={() => setShowPartPicker(!showPartPicker)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#e67e22',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                + Add Part
              </button>
            </div>

            {showPartPicker && (
              <div style={{
                marginBottom: '12px',
                padding: '12px',
                backgroundColor: 'white',
                borderRadius: '6px',
                border: '1px solid #e67e22',
                maxHeight: '250px',
                overflowY: 'auto'
              }}>
                {availableParts.map((part) => (
                  <div
                    key={part.id}
                    onClick={() => {
                      handleAddPart(part);
                      setShowPartPicker(false);
                    }}
                    style={{
                      padding: '10px',
                      marginBottom: '6px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      border: '1px solid #ddd',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#fef5e7';
                      e.currentTarget.style.borderColor = '#e67e22';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                      e.currentTarget.style.borderColor = '#ddd';
                    }}
                  >
                    <div style={{ fontWeight: '500', fontSize: '14px' }}>{part.name}</div>
                    <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                      {part.partNumber} • ${part.unitPrice.toFixed(2)} • Stock: {part.currentStock}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {partLines.map((line) => (
              <div key={line.id} style={{
                display: 'grid',
                gridTemplateColumns: '2fr 80px 100px 100px 40px',
                gap: '8px',
                alignItems: 'center',
                padding: '8px',
                backgroundColor: 'white',
                borderRadius: '4px',
                marginBottom: '8px'
              }}>
                <div style={{ fontSize: '14px', fontWeight: '500' }}>{line.partName}</div>
                <input
                  type="number"
                  min="1"
                  value={line.quantity}
                  onChange={(e) => handleUpdatePartLine(line.id, 'quantity', parseInt(e.target.value) || 1)}
                  style={{ padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
                  placeholder="Qty"
                />
                <input
                  type="number"
                  step="0.01"
                  value={line.unitPrice}
                  onChange={(e) => handleUpdatePartLine(line.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                  style={{ padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
                  placeholder="Price"
                />
                <div style={{ fontSize: '14px', fontWeight: 'bold', textAlign: 'right' }}>
                  ${line.totalPrice.toFixed(2)}
                </div>
                <button
                  onClick={() => handleRemovePartLine(line.id)}
                  style={{
                    padding: '4px',
                    backgroundColor: '#e74c3c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  ×
                </button>
              </div>
            ))}

            {partLines.length > 0 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px',
                backgroundColor: '#fef5e7',
                borderRadius: '4px',
                marginTop: '8px'
              }}>
                <div style={{ fontWeight: 'bold' }}>Total Parts:</div>
                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>${totalPartsCost.toFixed(2)}</div>
              </div>
            )}
          </div>

          <div style={{
            marginTop: '20px',
            padding: '16px',
            backgroundColor: '#3498db',
            color: 'white',
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>ESTIMATED TOTAL:</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>${estimatedTotal.toFixed(2)}</div>
          </div>
        </div>

        <button
          onClick={handleSubmitDiagnosis}
          disabled={busy}
          style={{
            width: '100%',
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
          {busy ? 'Submitting...' : 'Submit Diagnosis & Create Estimate →'}
        </button>
      </div>
    </div>
  );
}