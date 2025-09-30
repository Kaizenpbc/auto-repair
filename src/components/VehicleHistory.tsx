import { useState, useEffect } from 'react';
import { api } from '../api';

interface VehicleHistoryProps {
  vehicle: any;
  currentWorkOrderId?: string;
  onClose: () => void;
}

export function VehicleHistory({ vehicle, currentWorkOrderId, onClose }: VehicleHistoryProps) {
  const [serviceHistory, setServiceHistory] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'history' | 'recommendations'>('history');

  useEffect(() => {
    loadData();
  }, [vehicle.id]);

  const loadData = async () => {
    try {
      const [historyRes, recommendationsRes] = await Promise.all([
        api.getVehicleServiceHistory(vehicle.id),
        api.getVehicleRecommendations(vehicle.id)
      ]);

      setServiceHistory(historyRes.history);
      setRecommendations(recommendationsRes.recommendations);
    } catch (error) {
      console.error('Failed to load vehicle history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return '#e74c3c';
      case 'MEDIUM': return '#f39c12';
      case 'LOW': return '#2ecc71';
      default: return '#95a5a6';
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: { [key: string]: { bg: string; color: string; text: string } } = {
      PENDING: { bg: '#fff3cd', color: '#856404', text: 'Pending' },
      COMPLETED: { bg: '#d4edda', color: '#155724', text: 'Completed' },
      DECLINED: { bg: '#f8d7da', color: '#721c24', text: 'Declined' },
      SUPERSEDED: { bg: '#d1ecf1', color: '#0c5460', text: 'Superseded' }
    };

    const style = styles[status] || styles.PENDING;
    return (
      <span style={{
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 'bold',
        backgroundColor: style.bg,
        color: style.color
      }}>
        {style.text}
      </span>
    );
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
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        maxWidth: '1200px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        <div style={{
          padding: '20px',
          borderBottom: '2px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: '0 0 8px 0', color: '#2c3e50' }}>Vehicle Service History</h2>
            <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
              {vehicle.year} {vehicle.make} {vehicle.model} • {vehicle.vin || 'No VIN'}
            </div>
            <div style={{ fontSize: '13px', color: '#95a5a6', marginTop: '4px' }}>
              Current Mileage: {vehicle.mileage?.toLocaleString() || 'Unknown'} miles
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Close
          </button>
        </div>

        <div style={{
          display: 'flex',
          borderBottom: '2px solid #e0e0e0',
          backgroundColor: '#f8f9fa'
        }}>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              flex: 1,
              padding: '16px',
              border: 'none',
              backgroundColor: activeTab === 'history' ? 'white' : 'transparent',
              borderBottom: activeTab === 'history' ? '3px solid #3498db' : '3px solid transparent',
              color: activeTab === 'history' ? '#3498db' : '#7f8c8d',
              fontWeight: activeTab === 'history' ? '600' : '500',
              fontSize: '15px',
              cursor: 'pointer'
            }}
          >
            Service History ({serviceHistory.length})
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            style={{
              flex: 1,
              padding: '16px',
              border: 'none',
              backgroundColor: activeTab === 'recommendations' ? 'white' : 'transparent',
              borderBottom: activeTab === 'recommendations' ? '3px solid #3498db' : '3px solid transparent',
              color: activeTab === 'recommendations' ? '#3498db' : '#7f8c8d',
              fontWeight: activeTab === 'recommendations' ? '600' : '500',
              fontSize: '15px',
              cursor: 'pointer'
            }}
          >
            Future Recommendations ({recommendations.filter(r => r.status === 'PENDING').length})
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
              Loading vehicle history...
            </div>
          ) : (
            <>
              {activeTab === 'history' && (
                <div>
                  {serviceHistory.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
                      No service history available for this vehicle
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {serviceHistory.map((record) => (
                        <div
                          key={record.id}
                          style={{
                            padding: '20px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '8px',
                            border: '2px solid #e0e0e0'
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'start',
                            marginBottom: '16px',
                            paddingBottom: '12px',
                            borderBottom: '2px solid #dee2e6'
                          }}>
                            <div>
                              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '4px' }}>
                                {new Date(record.service_date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </div>
                              <div style={{ fontSize: '13px', color: '#7f8c8d' }}>
                                Mileage: {record.mileage_at_service?.toLocaleString()} miles
                              </div>
                              <div style={{ fontSize: '13px', color: '#7f8c8d' }}>
                                Technician: {record.technician_name} | Advisor: {record.service_advisor}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#27ae60' }}>
                                ${(record.total_cost / 100).toFixed(2)}
                              </div>
                              <div style={{ fontSize: '11px', color: '#7f8c8d', marginTop: '4px' }}>
                                Labor: ${(record.labor_total / 100).toFixed(2)} | Parts: ${(record.parts_total / 100).toFixed(2)}
                              </div>
                            </div>
                          </div>

                          {record.services_performed && record.services_performed.length > 0 && (
                            <div style={{ marginBottom: '12px' }}>
                              <div style={{ fontSize: '14px', fontWeight: '600', color: '#2c3e50', marginBottom: '8px' }}>
                                Services Performed:
                              </div>
                              {record.services_performed.map((service: any, idx: number) => (
                                <div
                                  key={idx}
                                  style={{
                                    padding: '8px 12px',
                                    backgroundColor: 'white',
                                    borderRadius: '4px',
                                    marginBottom: '6px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }}
                                >
                                  <div>
                                    <div style={{ fontSize: '14px', color: '#2c3e50' }}>{service.description}</div>
                                    <div style={{ fontSize: '12px', color: '#7f8c8d' }}>{service.hours} hours</div>
                                  </div>
                                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#27ae60' }}>
                                    ${(service.cost / 100).toFixed(2)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {record.parts_replaced && record.parts_replaced.length > 0 && (
                            <div style={{ marginBottom: '12px' }}>
                              <div style={{ fontSize: '14px', fontWeight: '600', color: '#2c3e50', marginBottom: '8px' }}>
                                Parts Replaced:
                              </div>
                              {record.parts_replaced.map((part: any, idx: number) => (
                                <div
                                  key={idx}
                                  style={{
                                    padding: '8px 12px',
                                    backgroundColor: 'white',
                                    borderRadius: '4px',
                                    marginBottom: '6px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }}
                                >
                                  <div>
                                    <div style={{ fontSize: '14px', color: '#2c3e50' }}>{part.description}</div>
                                    <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Quantity: {part.quantity}</div>
                                  </div>
                                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#27ae60' }}>
                                    ${(part.cost / 100).toFixed(2)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {record.customer_notes && (
                            <div style={{
                              padding: '12px',
                              backgroundColor: '#e8f4f8',
                              borderRadius: '4px',
                              borderLeft: '4px solid #3498db',
                              marginTop: '12px'
                            }}>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: '#2c3e50', marginBottom: '4px' }}>
                                Notes:
                              </div>
                              <div style={{ fontSize: '13px', color: '#555', whiteSpace: 'pre-wrap' }}>
                                {record.customer_notes}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'recommendations' && (
                <div>
                  {recommendations.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
                      No recommendations for this vehicle
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {recommendations.map((rec) => (
                        <div
                          key={rec.id}
                          style={{
                            padding: '16px',
                            backgroundColor: rec.status === 'PENDING' ? '#fff9f0' : '#f8f9fa',
                            borderRadius: '8px',
                            border: `2px solid ${rec.status === 'PENDING' ? '#f39c12' : '#dee2e6'}`,
                            borderLeft: `6px solid ${getPriorityColor(rec.priority)}`
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'start',
                            marginBottom: '12px'
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '8px'
                              }}>
                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  padding: '4px 8px',
                                  borderRadius: '12px',
                                  backgroundColor: getPriorityColor(rec.priority),
                                  color: 'white'
                                }}>
                                  {rec.priority}
                                </span>
                                {getStatusBadge(rec.status)}
                              </div>
                              <div style={{ fontSize: '16px', fontWeight: '600', color: '#2c3e50', marginBottom: '4px' }}>
                                {rec.recommendation}
                              </div>
                              <div style={{ fontSize: '13px', color: '#555', marginBottom: '8px' }}>
                                {rec.reason}
                              </div>
                              <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                                Recommended by {rec.recommended_by} on {new Date(rec.created_at).toLocaleDateString()}
                              </div>
                              {rec.recommended_mileage && (
                                <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                                  Due at: {rec.recommended_mileage.toLocaleString()} miles
                                </div>
                              )}
                              {rec.recommended_date && (
                                <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                                  Due by: {new Date(rec.recommended_date).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#e67e22', marginLeft: '16px' }}>
                              ${(rec.estimated_cost / 100).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}