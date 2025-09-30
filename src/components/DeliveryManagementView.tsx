import React, { useState, useEffect } from 'react';

interface DeliveryManagementViewProps {
  workOrders: any[];
  onComplete: (workOrderId: string) => void;
  onRefresh: () => void;
}

export function DeliveryManagementView({ workOrders, onComplete, onRefresh }: DeliveryManagementViewProps) {
  const [selectedWO, setSelectedWO] = useState<any>(null);
  const [driverName, setDriverName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'CHECK' | 'ACCOUNT' | null>(null);
  const [loading, setLoading] = useState(false);

  const pickupOrders = workOrders.filter(wo =>
    wo.fulfillment_method === 'PICKUP' &&
    (wo.workflow_stage === 'Awaiting Pickup' || wo.workflow_stage === 'At Cashier')
  );

  const deliveryOrders = workOrders.filter(wo =>
    wo.fulfillment_method === 'DELIVERY' &&
    (wo.workflow_stage === 'Awaiting Delivery' || wo.workflow_stage === 'Out for Delivery')
  );

  const handleAssignDriver = async (workOrderId: string) => {
    if (!driverName.trim()) {
      alert('Please enter driver name');
      return;
    }

    setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      await fetch(`${supabaseUrl}/rest/v1/work_orders?id=eq.${workOrderId}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          delivery_driver: driverName,
          delivery_status: 'IN_TRANSIT',
          workflow_stage: 'Out for Delivery',
          vehicle_location: 'OUT_FOR_DELIVERY'
        })
      });

      setDriverName('');
      setSelectedWO(null);
      onRefresh();
    } catch (error: any) {
      alert('Failed to assign driver: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkDelivered = async (workOrderId: string) => {
    if (!paymentMethod) {
      alert('Please select payment method');
      return;
    }

    setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      await fetch(`${supabaseUrl}/rest/v1/work_orders?id=eq.${workOrderId}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          delivery_status: 'DELIVERED',
          payment_status: 'PAID',
          payment_method: paymentMethod,
          workflow_stage: 'Completed',
          status: 'Completed',
          completed_at: new Date().toISOString()
        })
      });

      setPaymentMethod(null);
      setSelectedWO(null);
      onComplete(workOrderId);
    } catch (error: any) {
      alert('Failed to mark as delivered: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerArrived = async (workOrderId: string) => {
    setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      await fetch(`${supabaseUrl}/rest/v1/work_orders?id=eq.${workOrderId}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          workflow_stage: 'At Cashier',
          vehicle_location: 'CASHIER'
        })
      });

      onRefresh();
    } catch (error: any) {
      alert('Failed to update status: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayment = async (workOrderId: string) => {
    if (!paymentMethod) {
      alert('Please select payment method');
      return;
    }

    setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      await fetch(`${supabaseUrl}/rest/v1/work_orders?id=eq.${workOrderId}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          payment_status: 'PAID',
          payment_method: paymentMethod,
          workflow_stage: 'Completed',
          status: 'Completed',
          completed_at: new Date().toISOString()
        })
      });

      setPaymentMethod(null);
      setSelectedWO(null);
      onComplete(workOrderId);
    } catch (error: any) {
      alert('Failed to process payment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: 20 }}>
      <h2 style={{ margin: '0 0 30px', fontSize: 28, color: '#1a1a1a' }}>Pickup & Delivery Management</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <h3 style={{ margin: '0 0 20px', fontSize: 20, color: '#1a1a1a' }}>
            Customer Pickup ({pickupOrders.length})
          </h3>

          {pickupOrders.length === 0 ? (
            <div style={{
              background: 'white',
              borderRadius: 12,
              padding: 40,
              textAlign: 'center',
              border: '1px solid #e0e0e0'
            }}>
              <p style={{ margin: 0, color: '#999', fontSize: 14 }}>No vehicles awaiting pickup</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              {pickupOrders.map(wo => (
                <div key={wo.id} style={{
                  background: 'white',
                  borderRadius: 12,
                  padding: 20,
                  border: '2px solid #e0e0e0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 15 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 5 }}>
                        WO #{wo.work_order_number}
                      </div>
                      <div style={{ fontSize: 14, color: '#666' }}>
                        {wo.customer?.name || 'Customer'}
                      </div>
                      {wo.vehicle && (
                        <div style={{ fontSize: 13, color: '#999', marginTop: 3 }}>
                          {wo.vehicle.year} {wo.vehicle.make} {wo.vehicle.model}
                        </div>
                      )}
                    </div>
                    <div style={{
                      padding: '4px 12px',
                      background: wo.workflow_stage === 'At Cashier' ? '#2a9d8f' : '#ffc107',
                      color: 'white',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600
                    }}>
                      {wo.workflow_stage === 'At Cashier' ? 'At Cashier' : 'Awaiting Pickup'}
                    </div>
                  </div>

                  <div style={{ marginBottom: 15 }}>
                    <div style={{ fontSize: 13, color: '#666', marginBottom: 3 }}>
                      Contacted: {new Date(wo.customer_contacted_at).toLocaleDateString()} at {new Date(wo.customer_contacted_at).toLocaleTimeString()}
                    </div>
                    <div style={{ fontSize: 13, color: '#666' }}>
                      By: {wo.customer_contacted_by}
                    </div>
                  </div>

                  {wo.workflow_stage === 'Awaiting Pickup' ? (
                    <button
                      onClick={() => handleCustomerArrived(wo.id)}
                      disabled={loading}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        background: '#2a9d8f',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Customer Arrived
                    </button>
                  ) : (
                    <div>
                      <div style={{ marginBottom: 10, fontSize: 14, fontWeight: 500, color: '#333' }}>
                        Select Payment Method:
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                        {['CASH', 'CARD', 'CHECK', 'ACCOUNT'].map(method => (
                          <button
                            key={method}
                            onClick={() => {
                              setPaymentMethod(method as any);
                              setSelectedWO(wo.id);
                            }}
                            style={{
                              padding: '8px 12px',
                              background: selectedWO === wo.id && paymentMethod === method ? '#2a9d8f' : 'white',
                              color: selectedWO === wo.id && paymentMethod === method ? 'white' : '#333',
                              border: `2px solid ${selectedWO === wo.id && paymentMethod === method ? '#2a9d8f' : '#e0e0e0'}`,
                              borderRadius: 6,
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            {method}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => handleProcessPayment(wo.id)}
                        disabled={loading || selectedWO !== wo.id || !paymentMethod}
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          background: selectedWO === wo.id && paymentMethod ? '#2a9d8f' : '#ccc',
                          color: 'white',
                          border: 'none',
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: selectedWO === wo.id && paymentMethod ? 'pointer' : 'not-allowed'
                        }}
                      >
                        Complete Pickup
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 style={{ margin: '0 0 20px', fontSize: 20, color: '#1a1a1a' }}>
            Deliveries ({deliveryOrders.length})
          </h3>

          {deliveryOrders.length === 0 ? (
            <div style={{
              background: 'white',
              borderRadius: 12,
              padding: 40,
              textAlign: 'center',
              border: '1px solid #e0e0e0'
            }}>
              <p style={{ margin: 0, color: '#999', fontSize: 14 }}>No deliveries scheduled</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              {deliveryOrders.map(wo => {
                const isInTransit = wo.workflow_stage === 'Out for Delivery';

                return (
                  <div key={wo.id} style={{
                    background: 'white',
                    borderRadius: 12,
                    padding: 20,
                    border: '2px solid #e0e0e0'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 15 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 5 }}>
                          WO #{wo.work_order_number}
                        </div>
                        <div style={{ fontSize: 14, color: '#666' }}>
                          {wo.customer?.name || 'Customer'}
                        </div>
                        {wo.vehicle && (
                          <div style={{ fontSize: 13, color: '#999', marginTop: 3 }}>
                            {wo.vehicle.year} {wo.vehicle.make} {wo.vehicle.model}
                          </div>
                        )}
                      </div>
                      <div style={{
                        padding: '4px 12px',
                        background: isInTransit ? '#2a9d8f' : '#ffc107',
                        color: 'white',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600
                      }}>
                        {isInTransit ? 'In Transit' : 'Pending'}
                      </div>
                    </div>

                    <div style={{ marginBottom: 15, padding: 12, background: '#f8f9fa', borderRadius: 8 }}>
                      <div style={{ fontSize: 13, color: '#666', marginBottom: 5 }}>
                        <strong>Address:</strong> {wo.delivery_address}
                      </div>
                      <div style={{ fontSize: 13, color: '#666' }}>
                        <strong>Scheduled:</strong> {new Date(wo.delivery_scheduled_time).toLocaleString()}
                      </div>
                      {isInTransit && wo.delivery_driver && (
                        <div style={{ fontSize: 13, color: '#2a9d8f', marginTop: 5, fontWeight: 600 }}>
                          Driver: {wo.delivery_driver}
                        </div>
                      )}
                    </div>

                    {!isInTransit ? (
                      <div>
                        <input
                          type="text"
                          placeholder="Driver name"
                          value={selectedWO === wo.id ? driverName : ''}
                          onChange={(e) => {
                            setSelectedWO(wo.id);
                            setDriverName(e.target.value);
                          }}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            fontSize: 14,
                            border: '2px solid #e0e0e0',
                            borderRadius: 8,
                            outline: 'none',
                            marginBottom: 10
                          }}
                        />
                        <button
                          onClick={() => handleAssignDriver(wo.id)}
                          disabled={loading || selectedWO !== wo.id || !driverName.trim()}
                          style={{
                            width: '100%',
                            padding: '10px 16px',
                            background: selectedWO === wo.id && driverName.trim() ? '#2a9d8f' : '#ccc',
                            color: 'white',
                            border: 'none',
                            borderRadius: 8,
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: selectedWO === wo.id && driverName.trim() ? 'pointer' : 'not-allowed'
                          }}
                        >
                          Dispatch Delivery
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div style={{ marginBottom: 10, fontSize: 14, fontWeight: 500, color: '#333' }}>
                          Payment Method:
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                          {['CASH', 'CARD', 'CHECK', 'ACCOUNT'].map(method => (
                            <button
                              key={method}
                              onClick={() => {
                                setPaymentMethod(method as any);
                                setSelectedWO(wo.id);
                              }}
                              style={{
                                padding: '8px 12px',
                                background: selectedWO === wo.id && paymentMethod === method ? '#2a9d8f' : 'white',
                                color: selectedWO === wo.id && paymentMethod === method ? 'white' : '#333',
                                border: `2px solid ${selectedWO === wo.id && paymentMethod === method ? '#2a9d8f' : '#e0e0e0'}`,
                                borderRadius: 6,
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              {method}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => handleMarkDelivered(wo.id)}
                          disabled={loading || selectedWO !== wo.id || !paymentMethod}
                          style={{
                            width: '100%',
                            padding: '10px 16px',
                            background: selectedWO === wo.id && paymentMethod ? '#2a9d8f' : '#ccc',
                            color: 'white',
                            border: 'none',
                            borderRadius: 8,
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: selectedWO === wo.id && paymentMethod ? 'pointer' : 'not-allowed'
                          }}
                        >
                          Mark as Delivered
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}