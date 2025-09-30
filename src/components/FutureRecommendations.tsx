import React from 'react';

interface Recommendation {
  type: string;
  serviceName: string;
  whenDue: string;
  estimatedCost: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
}

interface FutureRecommendationsProps {
  recommendations: Recommendation[];
  vehicleInfo?: {
    year: number;
    make: string;
    model: string;
    mileage: number;
  };
}

export function FutureRecommendations({ recommendations, vehicleInfo }: FutureRecommendationsProps) {
  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return { bg: '#fee', border: '#fcc', text: '#c33', badge: '#e63946' };
      case 'MEDIUM':
        return { bg: '#fff3cd', border: '#ffc107', text: '#856404', badge: '#ffc107' };
      case 'LOW':
        return { bg: '#e8f4f8', border: '#bee5eb', text: '#0c5460', badge: '#17a2b8' };
      default:
        return { bg: '#f8f9fa', border: '#dee2e6', text: '#6c757d', badge: '#6c757d' };
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'High Priority';
      case 'MEDIUM':
        return 'Recommended';
      case 'LOW':
        return 'Future Service';
      default:
        return 'Maintenance';
    }
  };

  const highPriority = recommendations.filter(r => r.priority === 'HIGH');
  const mediumPriority = recommendations.filter(r => r.priority === 'MEDIUM');
  const lowPriority = recommendations.filter(r => r.priority === 'LOW');

  return (
    <div style={{
      marginTop: 30,
      padding: 25,
      background: 'white',
      borderRadius: 12,
      border: '2px solid #2a9d8f'
    }}>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 20, color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>🔮</span>
          Future Maintenance Recommendations
        </h3>
        <p style={{ margin: 0, fontSize: 14, color: '#666', lineHeight: 1.6 }}>
          Based on your vehicle's service history, mileage, and typical wear patterns
          {vehicleInfo && ` for ${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}`}
        </p>
      </div>

      {highPriority.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 16, color: '#e63946', fontWeight: 600 }}>
            ⚠️ High Priority - Address Soon
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {highPriority.map((rec, idx) => {
              const colors = getPriorityColor(rec.priority);
              return (
                <div
                  key={idx}
                  style={{
                    padding: 15,
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 8
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>
                        {rec.serviceName}
                      </div>
                      <div style={{ fontSize: 13, color: colors.text, marginBottom: 4 }}>
                        Due: {rec.whenDue}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#1a1a1a',
                      whiteSpace: 'nowrap',
                      marginLeft: 15
                    }}>
                      {rec.estimatedCost}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>
                    {rec.reason}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mediumPriority.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 16, color: '#856404', fontWeight: 600 }}>
            📋 Recommended - Plan Ahead
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {mediumPriority.map((rec, idx) => {
              const colors = getPriorityColor(rec.priority);
              return (
                <div
                  key={idx}
                  style={{
                    padding: 15,
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 8
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>
                        {rec.serviceName}
                      </div>
                      <div style={{ fontSize: 13, color: colors.text, marginBottom: 4 }}>
                        Due: {rec.whenDue}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#1a1a1a',
                      whiteSpace: 'nowrap',
                      marginLeft: 15
                    }}>
                      {rec.estimatedCost}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>
                    {rec.reason}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {lowPriority.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 12px', fontSize: 16, color: '#0c5460', fontWeight: 600 }}>
            💡 Future Service - Good to Know
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {lowPriority.map((rec, idx) => {
              const colors = getPriorityColor(rec.priority);
              return (
                <div
                  key={idx}
                  style={{
                    padding: 15,
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 8
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>
                        {rec.serviceName}
                      </div>
                      <div style={{ fontSize: 13, color: colors.text, marginBottom: 4 }}>
                        Due: {rec.whenDue}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#1a1a1a',
                      whiteSpace: 'nowrap',
                      marginLeft: 15
                    }}>
                      {rec.estimatedCost}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>
                    {rec.reason}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{
        marginTop: 20,
        paddingTop: 20,
        borderTop: '1px solid #e0e0e0'
      }}>
        <p style={{
          margin: 0,
          fontSize: 12,
          color: '#999',
          lineHeight: 1.6,
          fontStyle: 'italic'
        }}>
          * These recommendations are based on your vehicle's service history, manufacturer guidelines, and typical wear patterns.
          Nothing listed here is urgent for today's service. We provide these estimates so you can budget for upcoming maintenance
          and avoid unexpected costs. Call us anytime to schedule or discuss these services.
        </p>
      </div>

      <div style={{
        marginTop: 15,
        padding: 15,
        background: '#f8f9fa',
        borderRadius: 8,
        textAlign: 'center'
      }}>
        <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: '#333' }}>
          Want reminders when these services are due?
        </p>
        <p style={{ margin: 0, fontSize: 13, color: '#666' }}>
          Ask your service advisor about our maintenance reminder program
        </p>
      </div>
    </div>
  );
}