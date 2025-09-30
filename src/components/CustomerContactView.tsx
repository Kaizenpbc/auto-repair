import React, { useState, useEffect } from 'react';
import { api } from '../api';

interface CustomerContactViewProps {
  workOrder: any;
  onComplete: () => void;
  onBack: () => void;
}

export function CustomerContactView({ workOrder, onComplete, onBack }: CustomerContactViewProps) {
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'PICKUP' | 'DELIVERY' | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [contactedBy, setContactedBy] = useState('');
  const [customerSpokeTo, setCustomerSpokeTo] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadInvoice();
  }, []);

  const loadInvoice = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/rest/v1/invoices?work_order_id=eq.${workOrder.id}&select=*`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          }
        }
      );

      const invoices = await response.json();
      if (invoices && invoices.length > 0) {
        setInvoice(invoices[0]);
      }
    } catch (error) {
      console.error('Failed to load invoice:', error);
    }
  };

  const handleContactCustomer = async () => {
    if (!contactedBy.trim()) {
      alert('Please enter who is contacting the customer');
      return;
    }

    if (!customerSpokeTo.trim()) {
      alert('Please enter who you spoke with');
      return;
    }

    if (!fulfillmentMethod) {
      alert('Please select pickup or delivery');
      return;
    }

    if (fulfillmentMethod === 'DELIVERY') {
      if (!deliveryAddress.trim()) {
        alert('Please enter delivery address');
        return;
      }
      if (!deliveryDate) {
        alert('Please select delivery date');
        return;
      }
      if (!deliveryTime) {
        alert('Please select delivery time');
        return;
      }
    }

    setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const deliveryScheduledTime = fulfillmentMethod === 'DELIVERY'
        ? `${deliveryDate}T${deliveryTime}:00`
        : null;

      await fetch(`${supabaseUrl}/rest/v1/work_orders?id=eq.${workOrder.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          customer_contacted_at: new Date().toISOString(),
          customer_contacted_by: contactedBy,
          fulfillment_method: fulfillmentMethod,
          delivery_address: fulfillmentMethod === 'DELIVERY' ? deliveryAddress : null,
          delivery_scheduled_time: deliveryScheduledTime,
          workflow_stage: fulfillmentMethod === 'PICKUP' ? 'Awaiting Pickup' : 'Awaiting Delivery',
          vehicle_location: 'LOT_AWAITING_PICKUP'
        })
      });

      await fetch(`${supabaseUrl}/rest/v1/work_order_communications`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          work_order_id: workOrder.id,
          communication_type: 'PHONE',
          direction: 'OUTBOUND',
          subject: `Customer Contacted - ${fulfillmentMethod}`,
          message: `Spoke with ${customerSpokeTo}. Vehicle ready for ${fulfillmentMethod.toLowerCase()}. Total: $${((invoice?.total || 0) / 100).toFixed(2)}${notes ? '. Notes: ' + notes : ''}`,
          sent_by: contactedBy
        })
      });

      onComplete();
    } catch (error: any) {
      alert('Failed to log customer contact: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = invoice ? (invoice.total / 100).toFixed(2) : '0.00';
  const estimatedAmount = workOrder.estimated_total ? (workOrder.estimated_total / 100).toFixed(2) : null;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 28, color: '#1a1a1a' }}>Contact Customer</h2>
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
        <h3 style={{ margin: '0 0 20px', fontSize: 18, color: '#1a1a1a' }}>Customer Information</h3>

        {workOrder.customer && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontWeight: 600, color: '#333', fontSize: 14 }}>Name:</span>
              <span style={{ marginLeft: 10, color: '#666', fontSize: 14 }}>{workOrder.customer.name}</span>
            </div>
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontWeight: 600, color: '#333', fontSize: 14 }}>Phone:</span>
              <span style={{ marginLeft: 10, color: '#666', fontSize: 14 }}>{workOrder.customer.phone}</span>
            </div>
            {workOrder.customer.email && (
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontWeight: 600, color: '#333', fontSize: 14 }}>Email:</span>
                <span style={{ marginLeft: 10, color: '#666', fontSize: 14 }}>{workOrder.customer.email}</span>
              </div>
            )}
            {workOrder.customer.address && (
              <div>
                <span style={{ fontWeight: 600, color: '#333', fontSize: 14 }}>Address:</span>
                <span style={{ marginLeft: 10, color: '#666', fontSize: 14 }}>{workOrder.customer.address}</span>
              </div>
            )}
          </div>
        )}

        <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 20, marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: '0 0 5px', fontSize: 16, color: '#1a1a1a' }}>Final Invoice Total</h4>
              {estimatedAmount && (
                <p style={{ margin: 0, fontSize: 14, color: '#666' }}>
                  Original estimate: ${estimatedAmount}
                </p>
              )}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#2a9d8f' }}>
              ${totalAmount}
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: 12, padding: 30, marginBottom: 20, border: '1px solid #e0e0e0' }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18, color: '#1a1a1a' }}>Contact Details</h3>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#333' }}>
            Your Name
          </label>
          <input
            type="text"
            value={contactedBy}
            onChange={(e) => setContactedBy(e.target.value)}
            placeholder="Who is making this call?"
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: 14,
              border: '2px solid #e0e0e0',
              borderRadius: 8,
              outline: 'none'
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#333' }}>
            Spoke With
          </label>
          <input
            type="text"
            value={customerSpokeTo}
            onChange={(e) => setCustomerSpokeTo(e.target.value)}
            placeholder="Customer name or contact person"
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: 14,
              border: '2px solid #e0e0e0',
              borderRadius: 8,
              outline: 'none'
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 12, fontSize: 14, fontWeight: 500, color: '#333' }}>
            Fulfillment Method
          </label>
          <div style={{ display: 'flex', gap: 15 }}>
            <button
              onClick={() => setFulfillmentMethod('PICKUP')}
              style={{
                flex: 1,
                padding: '16px 20px',
                background: fulfillmentMethod === 'PICKUP' ? '#2a9d8f' : 'white',
                color: fulfillmentMethod === 'PICKUP' ? 'white' : '#333',
                border: `2px solid ${fulfillmentMethod === 'PICKUP' ? '#2a9d8f' : '#e0e0e0'}`,
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Customer Pickup
            </button>
            <button
              onClick={() => setFulfillmentMethod('DELIVERY')}
              style={{
                flex: 1,
                padding: '16px 20px',
                background: fulfillmentMethod === 'DELIVERY' ? '#2a9d8f' : 'white',
                color: fulfillmentMethod === 'DELIVERY' ? 'white' : '#333',
                border: `2px solid ${fulfillmentMethod === 'DELIVERY' ? '#2a9d8f' : '#e0e0e0'}`,
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Delivery
            </button>
          </div>
        </div>

        {fulfillmentMethod === 'DELIVERY' && (
          <>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#333' }}>
                Delivery Address
              </label>
              <textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Enter full delivery address"
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: 14,
                  border: '2px solid #e0e0e0',
                  borderRadius: 8,
                  outline: 'none',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#333' }}>
                  Delivery Date
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: 14,
                    border: '2px solid #e0e0e0',
                    borderRadius: 8,
                    outline: 'none'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#333' }}>
                  Delivery Time
                </label>
                <select
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: 14,
                    border: '2px solid #e0e0e0',
                    borderRadius: 8,
                    outline: 'none',
                    background: 'white'
                  }}
                >
                  <option value="">Select time...</option>
                  <option value="08:00">8:00 AM</option>
                  <option value="09:00">9:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="13:00">1:00 PM</option>
                  <option value="14:00">2:00 PM</option>
                  <option value="15:00">3:00 PM</option>
                  <option value="16:00">4:00 PM</option>
                  <option value="17:00">5:00 PM</option>
                </select>
              </div>
            </div>
          </>
        )}

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#333' }}>
            Additional Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special instructions or notes from the conversation"
            rows={3}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: 14,
              border: '2px solid #e0e0e0',
              borderRadius: 8,
              outline: 'none',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>

        <button
          onClick={handleContactCustomer}
          disabled={loading || !contactedBy.trim() || !customerSpokeTo.trim() || !fulfillmentMethod}
          style={{
            width: '100%',
            padding: '14px 24px',
            background: (!contactedBy.trim() || !customerSpokeTo.trim() || !fulfillmentMethod) ? '#ccc' : '#2a9d8f',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            cursor: (!contactedBy.trim() || !customerSpokeTo.trim() || !fulfillmentMethod) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (contactedBy.trim() && customerSpokeTo.trim() && fulfillmentMethod) {
              e.currentTarget.style.background = '#238276';
            }
          }}
          onMouseLeave={(e) => {
            if (contactedBy.trim() && customerSpokeTo.trim() && fulfillmentMethod) {
              e.currentTarget.style.background = '#2a9d8f';
            }
          }}
        >
          {loading ? 'Logging Contact...' : 'Log Contact & Continue'}
        </button>
      </div>
    </div>
  );
}