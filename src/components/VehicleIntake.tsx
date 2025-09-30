import { useState } from 'react';
import { decodeVIN, validateVIN } from '../vinDecoder';
import { api } from '../api';
import { VehicleHistory } from './VehicleHistory';

interface VehicleIntakeProps {
  onWorkOrderCreated: (workOrder: {
    id: string;
    work_order_number: string;
    customer_id: string;
    vehicle_id: string;
    assigned_technician_id: string | null;
    status: string;
    workflow_stage: string;
    priority_level: string;
    customer_complaint: string;
    estimated_total: number;
    customer_authorization_status: string;
    created_at: string;
  }) => void;
}

export function VehicleIntake({ onWorkOrderCreated }: VehicleIntakeProps) {
  const [vinInput, setVinInput] = useState('');
  const [decodedVehicle, setDecodedVehicle] = useState<any>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [mileage, setMileage] = useState('');
  const [fuelLevel, setFuelLevel] = useState('HALF');
  const [complaint, setComplaint] = useState('');
  const [priority, setPriority] = useState('DROPOFF');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [existingVehicle, setExistingVehicle] = useState<any>(null);

  const handleVinDecode = async () => {
    if (!vinInput.trim()) {
      setMessage('Please enter a VIN');
      return;
    }

    setBusy(true);
    setMessage('');

    try {
      const result = await decodeVIN(vinInput.trim());

      if (result.success) {
        setDecodedVehicle(result);

        // Check if vehicle exists in system
        const vehiclesResult = await api.getVehicles();
        const existing = vehiclesResult.vehicles.find((v: any) =>
          v.vin && v.vin.toUpperCase() === vinInput.trim().toUpperCase()
        );

        if (existing) {
          setExistingVehicle(existing);

          // Pre-populate customer info from existing vehicle record
          const customerResult = await api.getCustomers();
          const customer = customerResult.customers.find((c: any) => c.id === existing.customer_id);

          if (customer) {
            setCustomerName(`${customer.first_name} ${customer.last_name}`);
            setCustomerPhone(customer.phone || '');
            setCustomerEmail(customer.email || '');
          }

          setMessage(`✓ Vehicle found in system! ${result.year} ${result.make} ${result.model} - Customer info loaded. Click "View History" to see past services`);
        } else {
          setExistingVehicle(null);
          setMessage(`Vehicle decoded: ${result.year} ${result.make} ${result.model}`);
        }
      } else {
        setDecodedVehicle(null);
        setExistingVehicle(null);
        setMessage(`VIN decode failed: ${result.error}`);
      }
    } catch (error) {
      setDecodedVehicle(null);
      setExistingVehicle(null);
      setMessage(`Error decoding VIN: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setBusy(false);
    }
  };

  const handleVinInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^0-9A-HJ-NPR-Z]/g, '');
    if (value.length <= 17) {
      setVinInput(value);
    }
  };

  const handleCreateWorkOrder = async () => {
    if (!decodedVehicle) {
      setMessage('Please decode a VIN first');
      return;
    }

    if (!customerName.trim()) {
      setMessage('Please enter customer name');
      return;
    }

    if (!customerPhone.trim()) {
      setMessage('Please enter customer phone');
      return;
    }

    if (!complaint.trim()) {
      setMessage('Please enter customer complaint');
      return;
    }

    setBusy(true);
    setMessage('');

    try {
      const response = await api.createWorkOrderWithIntake({
        vin: vinInput,
        year: decodedVehicle.year,
        make: decodedVehicle.make,
        model: decodedVehicle.model,
        engine: decodedVehicle.engine || '',
        customerName,
        customerPhone,
        customerEmail,
        mileage: parseInt(mileage) || 0,
        fuelLevel,
        complaint,
        priority,
        createdBy: 'Service Advisor'
      });

      setMessage('Work order created successfully!');
      onWorkOrderCreated(response.workOrder);

      setVinInput('');
      setDecodedVehicle(null);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setMileage('');
      setFuelLevel('HALF');
      setComplaint('');
      setPriority('DROPOFF');
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
        <h2 style={{ marginTop: 0, color: '#2c3e50' }}>Vehicle Intake</h2>
        <p style={{ color: '#7f8c8d', marginBottom: '24px' }}>
          Capture vehicle and customer information to create a new work order
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

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '12px', color: '#34495e' }}>Vehicle Information</h3>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
              VIN Number
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Enter 17-digit VIN"
                value={vinInput}
                onChange={handleVinInputChange}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: '2px solid',
                  borderColor: vinInput.length === 17 && validateVIN(vinInput) ? '#2ecc71' : '#ddd',
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontFamily: 'monospace',
                  letterSpacing: '1px'
                }}
                maxLength={17}
              />
              <button
                onClick={handleVinDecode}
                disabled={busy || vinInput.length !== 17 || !validateVIN(vinInput)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  opacity: (busy || vinInput.length !== 17 || !validateVIN(vinInput)) ? 0.5 : 1,
                  fontWeight: '500'
                }}
              >
                {busy ? 'Decoding...' : 'Decode'}
              </button>
              {existingVehicle && (
                <button
                  onClick={() => setShowHistory(true)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#27ae60',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  View History
                </button>
              )}
            </div>
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginTop: '4px' }}>
              {vinInput.length}/17 characters
              {vinInput.length === 17 && (
                <span style={{
                  marginLeft: '8px',
                  color: validateVIN(vinInput) ? '#2ecc71' : '#e74c3c',
                  fontWeight: '500'
                }}>
                  {validateVIN(vinInput) ? '✓ Valid' : '✗ Invalid'}
                </span>
              )}
            </div>
          </div>

          {decodedVehicle && (
            <div style={{
              border: '2px solid #2ecc71',
              padding: '16px',
              borderRadius: '6px',
              backgroundColor: '#f8fff8',
              marginTop: '12px'
            }}>
              <div style={{ fontWeight: 'bold', color: '#2ecc71', marginBottom: '12px' }}>
                Vehicle Decoded Successfully
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '14px' }}>
                <div><strong>Year:</strong> {decodedVehicle.year}</div>
                <div><strong>Make:</strong> {decodedVehicle.make}</div>
                <div><strong>Model:</strong> {decodedVehicle.model}</div>
                <div><strong>Engine:</strong> {decodedVehicle.engine}</div>
                <div><strong>Transmission:</strong> {decodedVehicle.transmission || 'Unknown'}</div>
                <div><strong>Fuel Type:</strong> {decodedVehicle.fuelType || 'Unknown'}</div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                Mileage
              </label>
              <input
                type="number"
                placeholder="Current odometer reading"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                Fuel Level
              </label>
              <select
                value={fuelLevel}
                onChange={(e) => setFuelLevel(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="EMPTY">Empty</option>
                <option value="QUARTER">1/4</option>
                <option value="HALF">1/2</option>
                <option value="THREE_QUARTER">3/4</option>
                <option value="FULL">Full</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '12px', color: '#34495e' }}>Customer Information</h3>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
              Customer Name *
            </label>
            <input
              type="text"
              placeholder="Full name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                Phone Number *
              </label>
              <input
                type="tel"
                placeholder="(555) 123-4567"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                Email
              </label>
              <input
                type="email"
                placeholder="customer@email.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '12px', color: '#34495e' }}>Service Request</h3>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
              Customer Complaint *
            </label>
            <textarea
              placeholder="Describe the customer's concerns or requested services..."
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              rows={4}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
              Priority Level
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="EMERGENCY">Emergency (breakdown)</option>
              <option value="WAITING">Customer Waiting</option>
              <option value="APPOINTMENT">Scheduled Appointment</option>
              <option value="DROPOFF">Drop-off (no rush)</option>
              <option value="WARRANTY">Warranty/Recall Work</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleCreateWorkOrder}
          disabled={busy || !decodedVehicle}
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
            opacity: (busy || !decodedVehicle) ? 0.5 : 1
          }}
        >
          {busy ? 'Creating Work Order...' : 'Create Work Order'}
        </button>
      </div>

      {showHistory && existingVehicle && (
        <VehicleHistory
          vehicle={existingVehicle}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}