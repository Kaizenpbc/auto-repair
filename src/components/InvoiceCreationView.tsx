import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../api';
import { FutureRecommendations } from './FutureRecommendations';

interface InvoiceCreationViewProps {
  workOrder: any;
  onComplete: () => void;
  onBack: () => void;
}

export function InvoiceCreationView({ workOrder, onComplete, onBack }: InvoiceCreationViewProps) {
  const [loading, setLoading] = useState(false);
  const [estimateLines, setEstimateLines] = useState<any[]>([]);
  const [partsUsed, setPartsUsed] = useState<any[]>([]);
  const [timeLogs, setTimeLogs] = useState<any[]>([]);
  const [billingType, setBillingType] = useState<'flat' | 'actual'>('actual');
  const [taxRate, setTaxRate] = useState(0.13);
  const [shopSuppliesRate, setShopSuppliesRate] = useState(0.05);
  const [managerName, setManagerName] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [futureRecommendations, setFutureRecommendations] = useState<any[]>([]);
  const [vehicleInfo, setVehicleInfo] = useState<any>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setDataLoaded(false);
        const [estimateResult, partsResult, timeLogsResult, woDetails] = await Promise.all([
          api.draftEstimate('org-1', workOrder.id),
          api.getPartsUsedByWorkOrder(workOrder.id),
          api.getTimeLogs(workOrder.id),
          api.getWorkOrderDetails(workOrder.id)
        ]);

        if (!isMounted) return;

        setEstimateLines(estimateResult.lines || []);
        setPartsUsed(partsResult.partsUsed || []);
        setTimeLogs(timeLogsResult.timeLogs || []);

        if (woDetails.workOrder.vehicle) {
          const vInfo = {
            year: woDetails.workOrder.vehicle.year,
            make: woDetails.workOrder.vehicle.make,
            model: woDetails.workOrder.vehicle.model,
            mileage: woDetails.workOrder.vehicle.mileage
          };
          setVehicleInfo(vInfo);

          if (workOrder.vehicle_id) {
            const result = await api.generateFutureMaintenanceRecommendations(
              workOrder.vehicle_id,
              vInfo.mileage || 0
            );
            if (isMounted) {
              setFutureRecommendations(result.recommendations || []);
            }
          }
        }

        if (isMounted) {
          setDataLoaded(true);
        }
      } catch (error: any) {
        console.error('Failed to load data:', error);
        if (isMounted) {
          setDataLoaded(true);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [workOrder.id, workOrder.vehicle_id]);

  const calculateTotals = useMemo(() => {
    let subtotal = 0;

    estimateLines.filter(line => line.type === 'LABOR').forEach(line => {
      if (billingType === 'actual') {
        const actualHours = timeLogs
          .filter(log => log.op_name === line.description && log.end_at)
          .reduce((sum, log) => sum + (log.actual_hours || 0), 0);
        subtotal += actualHours * (line.rate || 0);
      } else {
        subtotal += (line.estHours || 0) * (line.rate || 0);
      }
    });

    partsUsed.forEach(part => {
      subtotal += part.totalPrice;
    });

    const shopSupplies = subtotal * shopSuppliesRate;
    const tax = (subtotal + shopSupplies) * taxRate;
    const total = subtotal + shopSupplies + tax;

    return { subtotal, shopSupplies, tax, total };
  }, [estimateLines, partsUsed, timeLogs, billingType, taxRate, shopSuppliesRate]);

  const handleCreateInvoice = async () => {
    if (!managerName.trim()) {
      alert('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      await fetch(`${supabaseUrl}/rest/v1/work_orders?id=eq.${workOrder.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          invoice_created_at: new Date().toISOString(),
          invoice_created_by: managerName,
          workflow_stage: 'Ready for Contact'
        })
      });

      await api.convertInvoice({
        orgId: 'org-1',
        woId: workOrder.id,
        billing: billingType,
        taxRate,
        shopSuppliesRate
      });

      onComplete();
    } catch (error: any) {
      alert('Failed to create invoice: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals;

  const getActualHours = useCallback((opName: string) => {
    return timeLogs
      .filter(log => log.op_name === opName && log.end_at)
      .reduce((sum, log) => sum + (log.actual_hours || 0), 0);
  }, [timeLogs]);

  if (!dataLoaded) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20, textAlign: 'center' }}>
        <h2>Loading invoice data...</h2>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 28, color: '#1a1a1a' }}>Create Invoice</h2>
          <p style={{ margin: '8px 0 0', color: '#666', fontSize: 14 }}>
            Work Order #{workOrder.work_order_number}
          </p>
        </div>
        <button
          onClick={onBack}
          style={{
            padding: '10px 20px',
            background: 'white',
            border: '2px solid #e0e0e0',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500
          }}
        >
          Back to Queue
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: 12, padding: 30, marginBottom: 20, border: '1px solid #e0e0e0' }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18, color: '#1a1a1a' }}>Billing Method</h3>

        <div style={{ display: 'flex', gap: 15, marginBottom: 30 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="radio"
              checked={billingType === 'flat'}
              onChange={() => setBillingType('flat')}
              style={{ width: 18, height: 18, cursor: 'pointer' }}
            />
            <span style={{ fontSize: 14, color: '#333' }}>Flat Rate (Estimated Hours)</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="radio"
              checked={billingType === 'actual'}
              onChange={() => setBillingType('actual')}
              style={{ width: 18, height: 18, cursor: 'pointer' }}
            />
            <span style={{ fontSize: 14, color: '#333' }}>Actual Hours</span>
          </label>
        </div>

        <h3 style={{ margin: '30px 0 15px', fontSize: 18, color: '#1a1a1a' }}>Labor</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: 12, textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#666' }}>Service</th>
                <th style={{ padding: 12, textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#666' }}>Est. Hours</th>
                <th style={{ padding: 12, textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#666' }}>Actual Hours</th>
                <th style={{ padding: 12, textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#666' }}>Rate</th>
                <th style={{ padding: 12, textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#666' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {estimateLines.filter(line => line.type === 'LABOR').map(line => {
                const actualHours = getActualHours(line.description);
                const hoursToUse = billingType === 'actual' ? actualHours : (line.estHours || 0);
                const lineTotal = hoursToUse * (line.rate || 0);

                return (
                  <tr key={line.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                    <td style={{ padding: 12, fontSize: 14, color: '#333' }}>{line.description}</td>
                    <td style={{ padding: 12, textAlign: 'right', fontSize: 14, color: '#666' }}>
                      {(line.estHours || 0).toFixed(2)}
                    </td>
                    <td style={{
                      padding: 12,
                      textAlign: 'right',
                      fontSize: 14,
                      color: actualHours > (line.estHours || 0) ? '#e63946' : '#2a9d8f',
                      fontWeight: 500
                    }}>
                      {actualHours.toFixed(2)}
                    </td>
                    <td style={{ padding: 12, textAlign: 'right', fontSize: 14, color: '#333' }}>
                      ${(line.rate || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: 12, textAlign: 'right', fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>
                      ${lineTotal.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <h3 style={{ margin: '30px 0 15px', fontSize: 18, color: '#1a1a1a' }}>Parts</h3>
        {partsUsed.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: 12, textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#666' }}>Part</th>
                  <th style={{ padding: 12, textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#666' }}>Quantity</th>
                  <th style={{ padding: 12, textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#666' }}>Price Each</th>
                  <th style={{ padding: 12, textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#666' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {partsUsed.map(part => (
                  <tr key={part.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                    <td style={{ padding: 12, fontSize: 14, color: '#333' }}>
                      {part.partName}
                      <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>#{part.partNumber}</div>
                    </td>
                    <td style={{ padding: 12, textAlign: 'right', fontSize: 14, color: '#666' }}>
                      {part.quantityUsed}
                    </td>
                    <td style={{ padding: 12, textAlign: 'right', fontSize: 14, color: '#333' }}>
                      ${part.priceEach.toFixed(2)}
                    </td>
                    <td style={{ padding: 12, textAlign: 'right', fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>
                      ${part.totalPrice.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: '#999', fontSize: 14, margin: 0 }}>No parts used</p>
        )}

        <div style={{ marginTop: 40, paddingTop: 30, borderTop: '2px solid #e0e0e0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 16, color: '#666' }}>Subtotal:</span>
            <span style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a' }}>${totals.subtotal.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 16, color: '#666' }}>Shop Supplies ({(shopSuppliesRate * 100).toFixed(0)}%):</span>
            <span style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a' }}>${totals.shopSupplies.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 16, color: '#666' }}>Tax ({(taxRate * 100).toFixed(0)}%):</span>
            <span style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a' }}>${totals.tax.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 15, borderTop: '2px solid #1a1a1a' }}>
            <span style={{ fontSize: 20, fontWeight: 600, color: '#1a1a1a' }}>Total:</span>
            <span style={{ fontSize: 24, fontWeight: 700, color: '#2a9d8f' }}>${totals.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {workOrder.estimated_total && (
        <div style={{
          background: totals.total > (workOrder.estimated_total / 100) ? '#fff3cd' : '#d1f2eb',
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
          border: totals.total > (workOrder.estimated_total / 100) ? '1px solid #ffc107' : '1px solid #2a9d8f'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: '0 0 5px', fontSize: 16, color: '#1a1a1a' }}>
                {totals.total > (workOrder.estimated_total / 100) ? 'Over Estimate' : 'Under Estimate'}
              </h4>
              <p style={{ margin: 0, fontSize: 14, color: '#666' }}>
                Original estimate: ${(workOrder.estimated_total / 100).toFixed(2)}
              </p>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: totals.total > (workOrder.estimated_total / 100) ? '#d39e00' : '#2a9d8f' }}>
              {totals.total > (workOrder.estimated_total / 100) ? '+' : '-'}
              ${Math.abs(totals.total - (workOrder.estimated_total / 100)).toFixed(2)}
            </div>
          </div>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: 12, padding: 30, border: '1px solid #e0e0e0' }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18, color: '#1a1a1a' }}>Finalize Invoice</h3>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#333' }}>
            Manager Name
          </label>
          <input
            type="text"
            value={managerName}
            onChange={(e) => setManagerName(e.target.value)}
            placeholder="Enter your name"
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: 14,
              border: '2px solid #e0e0e0',
              borderRadius: 8,
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#2a9d8f'}
            onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
          />
        </div>

        <button
          onClick={() => setShowConfirm(true)}
          disabled={loading || !managerName.trim()}
          style={{
            width: '100%',
            padding: '14px 24px',
            background: !managerName.trim() ? '#ccc' : '#2a9d8f',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            cursor: !managerName.trim() ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (managerName.trim()) e.currentTarget.style.background = '#238276';
          }}
          onMouseLeave={(e) => {
            if (managerName.trim()) e.currentTarget.style.background = '#2a9d8f';
          }}
        >
          {loading ? 'Creating Invoice...' : 'Create Invoice & Continue'}
        </button>
      </div>

      <FutureRecommendations
        recommendations={futureRecommendations}
        vehicleInfo={vehicleInfo}
      />

      {showConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 30,
            maxWidth: 400,
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 15px', fontSize: 20, color: '#1a1a1a' }}>Confirm Invoice Creation</h3>
            <p style={{ margin: '0 0 25px', fontSize: 14, color: '#666', lineHeight: 1.6 }}>
              This will finalize the invoice for <strong>${totals.total.toFixed(2)}</strong> and move the work order to "Ready for Contact" stage.
              You will then call the customer to arrange pickup or delivery.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: 'white',
                  color: '#333',
                  border: '2px solid #e0e0e0',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  handleCreateInvoice();
                }}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: '#2a9d8f',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}