import { useState, useEffect } from 'react';
import { api, EstimateLine, Part, PartUsed } from './api';
import { decodeVIN, validateVIN, formatVIN, DecodedVehicle } from './vinDecoder';

export default function App() {
  const [orgId] = useState('org-1'); // demo org
  const [locationId] = useState('loc-1');
  const [vehicleId] = useState('veh-1');

  const [woId, setWoId] = useState<string|undefined>();
  const [opName, setOpName] = useState('Brake Pad Replacement');

  const [estimate, setEstimate] = useState<{lines: EstimateLine[]} | null>(null);
  const [invoice, setInvoice] = useState<any>(null);

  const [billing, setBilling] = useState<'flat'|'actual'>('flat');
  const [taxPct, setTaxPct] = useState(13);

  // Parts management state
  const [availableParts, setAvailableParts] = useState<Part[]>([]);
  const [partsUsed, setPartsUsed] = useState<PartUsed[]>([]);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQuantity, setPartQuantity] = useState(1);

  // Work order management state
  const [workOrderDetails, setWorkOrderDetails] = useState<any>(null);

  // VIN scanning state
  const [vinInput, setVinInput] = useState('');
  const [decodedVehicle, setDecodedVehicle] = useState<any>(null);
  const [vinBusy, setVinBusy] = useState(false);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>('');

  const createDemoWO = async () => {
    setBusy(true);
    setEstimate(null); setInvoice(null); setMessage('');
    try {
      const r = await api.createWO({
        orgId, locationId, vehicleId,
        ops: [
          { name: 'Brake Pad Replacement', estHours: 2.0, rate: 120 },
          { name: 'Oil Change', estHours: 0.5, rate: 120 }
        ]
      });
      setWoId(r.id);
      // Load comprehensive work order details
      const details = await api.getWorkOrderDetails(r.id);
      setWorkOrderDetails(details.workOrder);
      setMessage('Work order created successfully!');
    } catch (e:any) {
      setMessage(`Error: ${e.message}`);
    } finally { setBusy(false); }
  };

  const handleVinDecode = async () => {
    if (!vinInput.trim()) {
      setMessage('Please enter a VIN');
      return;
    }

    setVinBusy(true);
    setMessage('');

    try {
      const result = await decodeVIN(vinInput.trim());

      if (result.success) {
        setDecodedVehicle(result);
        setMessage(`Vehicle decoded: ${result.year} ${result.make} ${result.model}`);
      } else {
        setDecodedVehicle(null);
        setMessage(`VIN decode failed: ${result.error}`);
      }
    } catch (error) {
      setDecodedVehicle(null);
      setMessage(`Error decoding VIN: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setVinBusy(false);
    }
  };

  const handleVinInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^0-9A-HJ-NPR-Z]/g, '');
    if (value.length <= 17) {
      setVinInput(value);
    }
  };

  const createWOFromVin = async () => {
    if (!decodedVehicle) {
      setMessage('Please decode a VIN first');
      return;
    }

    setBusy(true);
    setEstimate(null); setInvoice(null); setMessage('');

    try {
      const r = await api.createWO({
        orgId, locationId, vehicleId,
        ops: [
          { name: 'Brake Pad Replacement', estHours: 2.0, rate: 120 },
          { name: 'Oil Change', estHours: 0.5, rate: 120 }
        ]
      });
      setWoId(r.id);

      // Load comprehensive work order details
      const details = await api.getWorkOrderDetails(r.id);
      setWorkOrderDetails(details.workOrder);
      setMessage(`Work order created for ${decodedVehicle.year} ${decodedVehicle.make} ${decodedVehicle.model}!`);
    } catch (e:any) {
      setMessage(`Error: ${e.message}`);
    } finally { setBusy(false); }
  };

  const start = async () => {
    if (!woId) return setMessage('Create a Work Order first');
    setBusy(true);
    try {
      await api.startTime(orgId, woId, opName);
      setMessage(`Started timer for "${opName}"`);
    }
    catch (e:any) { setMessage(`Error: ${e.message}`); }
    finally { setBusy(false); }
  };

  const stop = async () => {
    if (!woId) return setMessage('Create a Work Order first');
    setBusy(true);
    try {
      const r = await api.stopTime(orgId, woId, opName);
      setMessage(`Stopped timer. Actual hours for "${opName}": ${r.actualHours.toFixed(2)}`);
    } catch (e:any) { setMessage(`Error: ${e.message}`); }
    finally { setBusy(false); }
  };

  const draft = async () => {
    if (!woId) return setMessage('Create a Work Order first');
    setBusy(true);
    try {
      const result = await api.draftEstimate(orgId, woId);
      setEstimate(result);
      setMessage('Estimate draft generated successfully');
    }
    catch (e:any) { setMessage(`Error: ${e.message}`); }
    finally { setBusy(false); }
  };

  const convert = async () => {
    if (!woId) return setMessage('Create a Work Order first');
    setBusy(true);
    try {
      const r = await api.convertInvoice({
        orgId, woId,
        billing,
        taxRate: taxPct/100,
        shopSuppliesRate: 0.05
      });
      const inv = await api.getInvoice(r.invoiceId);
      setInvoice(inv);
      setMessage(`Invoice created successfully. Total: $${r.total.toFixed(2)}`);
    } catch (e:any) { setMessage(`Error: ${e.message}`); }
    finally { setBusy(false); }
  };

  // Load available parts when component mounts
  useEffect(() => {
    const loadParts = async () => {
      try {
        const { parts } = await api.getAvailableParts();
        setAvailableParts(parts);
        if (parts.length > 0) {
          setSelectedPartId(parts[0].id);
        }
      } catch (e: any) {
        console.error('Failed to load parts:', e.message);
      }
    };
    loadParts();
  }, []);

  // Load parts used when work order changes
  useEffect(() => {
    if (woId) {
      const loadPartsUsed = async () => {
        try {
          const { partsUsed: used } = await api.getPartsUsedByWorkOrder(woId);
          setPartsUsed(used);
        } catch (e: any) {
          console.error('Failed to load parts used:', e.message);
        }
      };
      loadPartsUsed();
    }
  }, [woId]);

  const addPart = async () => {
    if (!woId || !selectedPartId) return;

    setBusy(true);
    try {
      const { partUsed } = await api.addPartToWorkOrder(woId, selectedPartId, partQuantity);
      setPartsUsed(prev => [...prev, partUsed]);
      setPartQuantity(1);
      setMessage(`Added ${partUsed.partName} (Qty: ${partUsed.quantityUsed}) to work order`);

      // Reload available parts to update stock levels
      const { parts } = await api.getAvailableParts();
      setAvailableParts(parts);
    } catch (e: any) {
      setMessage(`Error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main>
      <h1>AutoShop AI – Frontend</h1>
      <div className="muted">Database: Supabase (RLS policies fixed for demo)</div>
      {message && <div className={message.includes('Error') ? 'err' : 'ok'}>{message}</div>}

      <section>
        <h3>🚗 VIN Scanner (Canadian Auto Shop)</h3>
        <div style={{marginBottom: 16}}>
          <div style={{display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8}}>
            <input
              type="text"
              placeholder="Enter VIN (Try: 1HGCM82633A004352)"
              value={vinInput}
              onChange={handleVinInputChange}
              style={{
                padding: '8px 12px',
                border: '2px solid #ddd',
                borderRadius: 4,
                fontSize: '16px',
                fontFamily: 'monospace',
                letterSpacing: '1px',
                width: '300px',
                borderColor: vinInput.length === 17 && validateVIN(vinInput) ? '#28a745' : '#ddd'
              }}
              maxLength={17}
            />
            <button
              onClick={handleVinDecode}
              disabled={vinBusy || vinInput.length !== 17 || !validateVIN(vinInput)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                opacity: (vinBusy || vinInput.length !== 17 || !validateVIN(vinInput)) ? 0.6 : 1
              }}
            >
              {vinBusy ? 'Decoding...' : 'Decode VIN'}
            </button>
          </div>

          <div style={{fontSize: '0.85em', color: '#666', marginBottom: 8}}>
            {vinInput.length > 0 ? (
              <>
                Format: {formatVIN(vinInput)} ({vinInput.length}/17 chars)
                {vinInput.length === 17 && (
                  <span style={{marginLeft: 8, color: validateVIN(vinInput) ? '#28a745' : '#dc3545'}}>
                    {validateVIN(vinInput) ? '✓ Valid VIN' : '✗ Invalid VIN'}
                  </span>
                )}
              </>
            ) : (
              <div>
                <strong>Test VINs for Canadian vehicles:</strong><br/>
                <span style={{fontFamily: 'monospace', fontSize: '0.9em'}}>
                  1HGCM82633A004352 (2003 Honda Accord) • 5TDDZ3DC4HS123456 (2017 Toyota Sienna) • 2C3CDXHG9EH123456 (2014 Dodge Charger)
                </span>
              </div>
            )}
          </div>

          {decodedVehicle && (
            <div style={{
              border: '2px solid #28a745',
              padding: 12,
              borderRadius: 6,
              backgroundColor: '#f8fff8',
              marginBottom: 12
            }}>
              <div style={{fontWeight: 'bold', color: '#28a745', marginBottom: 8}}>
                🇨🇦 VEHICLE DECODED (via {decodedVehicle.source.toUpperCase()})
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.9em'}}>
                <div><strong>Year:</strong> {decodedVehicle.year}</div>
                <div><strong>Make:</strong> {decodedVehicle.make}</div>
                <div><strong>Model:</strong> {decodedVehicle.model}</div>
                <div><strong>Engine:</strong> {decodedVehicle.engine}</div>
                <div><strong>Transmission:</strong> {decodedVehicle.transmission || 'Unknown'}</div>
                <div><strong>Drive Type:</strong> {decodedVehicle.driveType || 'Unknown'}</div>
                <div><strong>Fuel Type:</strong> {decodedVehicle.fuelType || 'Unknown'}</div>
                <div><strong>Body Style:</strong> {decodedVehicle.bodyStyle || 'Unknown'}</div>
              </div>
              <div style={{marginTop: 8, fontSize: '0.8em', color: '#666'}}>
                VIN: {decodedVehicle.vin}
              </div>
              <button
                onClick={createWOFromVin}
                disabled={busy}
                style={{
                  marginTop: 12,
                  padding: '8px 16px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  opacity: busy ? 0.6 : 1
                }}
              >
                {busy ? 'Creating...' : 'Create Work Order for this Vehicle'}
              </button>
            </div>
          )}
        </div>

        <div style={{borderTop: '1px solid #ddd', paddingTop: 16, marginTop: 16}}>
          <h4 style={{margin: '0 0 8px 0', color: '#666'}}>Or use demo data:</h4>
          <button onClick={createDemoWO} disabled={busy}>Create Demo WO</button>
        </div>
        {woId && workOrderDetails ? (
          <div style={{marginTop:8, border:'1px solid #007bff', padding:16, borderRadius:6, backgroundColor:'#f8f9fa'}}>
            {/* Header */}
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
              <h4 style={{margin:0, color:'#007bff'}}>WORK ORDER #{woId.slice(-8).toUpperCase()}</h4>
              <div style={{display:'flex', gap:8}}>
                <span style={{backgroundColor:'#28a745', color:'white', padding:'2px 8px', borderRadius:12, fontSize:'0.8em'}}>
                  {workOrderDetails.status || 'OPEN'}
                </span>
                <span style={{backgroundColor:'#ffc107', color:'black', padding:'2px 8px', borderRadius:12, fontSize:'0.8em'}}>
                  {workOrderDetails.priority_level || 'Normal'}
                </span>
              </div>
            </div>

            {/* Customer & Vehicle Info */}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12}}>
              <div style={{border:'1px solid #dee2e6', padding:8, borderRadius:4}}>
                <div style={{fontWeight:'bold', color:'#495057', marginBottom:4}}>CUSTOMER</div>
                <div><strong>{workOrderDetails.customer.name}</strong></div>
                <div style={{fontSize:'0.85em', color:'#666'}}>#{workOrderDetails.customer.customerNumber}</div>
                <div style={{fontSize:'0.85em'}}>{workOrderDetails.customer.phone}</div>
                <div style={{fontSize:'0.85em'}}>{workOrderDetails.customer.email}</div>
              </div>
              <div style={{border:'1px solid #dee2e6', padding:8, borderRadius:4}}>
                <div style={{fontWeight:'bold', color:'#495057', marginBottom:4}}>VEHICLE</div>
                <div><strong>{workOrderDetails.vehicle.year} {workOrderDetails.vehicle.make} {workOrderDetails.vehicle.model}</strong></div>
                <div style={{fontSize:'0.85em', color:'#666'}}>VIN: {workOrderDetails.vehicle.vin.slice(-6)}</div>
                <div style={{fontSize:'0.85em'}}>Mileage: {workOrderDetails.vehicle.mileage.toLocaleString()}</div>
                <div style={{fontSize:'0.85em'}}>Engine: {workOrderDetails.vehicle.engine}</div>
              </div>
            </div>

            {/* Staff Assignments */}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12}}>
              <div style={{border:'1px solid #dee2e6', padding:8, borderRadius:4}}>
                <div style={{fontWeight:'bold', color:'#495057', marginBottom:4}}>SERVICE ADVISOR</div>
                <div><strong>{workOrderDetails.serviceAdvisor.name}</strong></div>
                <div style={{fontSize:'0.85em'}}>{workOrderDetails.serviceAdvisor.phone}</div>
                <div style={{fontSize:'0.85em'}}>{workOrderDetails.serviceAdvisor.email}</div>
              </div>
              <div style={{border:'1px solid #dee2e6', padding:8, borderRadius:4}}>
                <div style={{fontWeight:'bold', color:'#495057', marginBottom:4}}>TECHNICIAN</div>
                <div><strong>{workOrderDetails.technician.name}</strong></div>
                <div style={{fontSize:'0.85em', color:'#666'}}>{workOrderDetails.technician.certification}</div>
                <div style={{fontSize:'0.85em'}}>{workOrderDetails.technician.specializations}</div>
              </div>
            </div>

            {/* Service Details */}
            <div style={{border:'1px solid #dee2e6', padding:8, borderRadius:4, marginBottom:12}}>
              <div style={{fontWeight:'bold', color:'#495057', marginBottom:4}}>SERVICE DETAILS</div>
              <div style={{marginBottom:8}}>
                <div style={{fontWeight:'bold', marginBottom:4}}>Customer Concern:</div>
                <div style={{fontSize:'0.9em', fontStyle:'italic'}}>
                  {workOrderDetails.customer_complaint || 'Customer reports squeaking brakes and requests oil change'}
                </div>
              </div>
              <div>
                <div style={{fontWeight:'bold', marginBottom:4}}>Scheduled Operations:</div>
                <div style={{fontSize:'0.9em'}}>
                  <div>• Brake Pad Replacement (Est. 2.0 hours)</div>
                  <div>• Oil Change (Est. 0.5 hours)</div>
                </div>
              </div>
            </div>

            {/* Operational Info */}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:'0.8em', color:'#666'}}>
              <div><strong>Work Order #:</strong> {workOrderDetails.work_order_number || woId.slice(-6)}</div>
              <div><strong>Est. Completion:</strong> {workOrderDetails.promised_completion ? new Date(workOrderDetails.promised_completion).toLocaleTimeString() : '2:00 PM'}</div>
            </div>

            <div style={{marginTop:8, fontSize:'0.8em', color:'#666', textAlign:'center'}}>
              Work Order ID: {woId} • Created: {new Date(workOrderDetails.created_at).toLocaleString()}
            </div>
          </div>
        ) : woId ? (
          <div style={{marginTop:8, padding:12, backgroundColor:'#fff3cd', border:'1px solid #ffeaa7', borderRadius:4}}>
            <div><strong>Work Order:</strong> {woId.slice(-8).toUpperCase()}</div>
            <div style={{fontSize:'0.9em', color:'#856404'}}>Loading comprehensive details...</div>
          </div>
        ) : (
          <div className="muted">No work order created yet</div>
        )}
      </section>

      <section>
        <h3>2) Technician Timer</h3>
        <div className="row">
          <label>Operation:&nbsp;
            <select value={opName} onChange={e=>setOpName(e.target.value)}>
              <option>Brake Pad Replacement</option>
              <option>Oil Change</option>
              <option>Diagnostics</option>
            </select>
          </label>
          <button onClick={start} disabled={!woId || busy}>Start</button>
          <button onClick={stop} disabled={!woId || busy}>Stop</button>
        </div>
      </section>

      <section>
        <h3>3) Parts & Materials</h3>
        <div className="row">
          <label>Part:&nbsp;
            <select value={selectedPartId} onChange={e=>setSelectedPartId(e.target.value)} disabled={!woId}>
              {availableParts.map(part => (
                <option key={part.id} value={part.id}>
                  {part.name} - ${part.unitPrice.toFixed(2)} (Stock: {part.currentStock})
                </option>
              ))}
            </select>
          </label>
          <label>Qty:&nbsp;
            <input type="number" min={1} value={partQuantity} onChange={e=>setPartQuantity(Number(e.target.value))} disabled={!woId} />
          </label>
          <button onClick={addPart} disabled={!woId || !selectedPartId || busy}>Add Part</button>
        </div>

        {partsUsed.length > 0 ? (
          <div style={{marginTop:8, border:'1px solid #17a2b8', padding:12, borderRadius:4, backgroundColor:'#f1f9ff'}}>
            <h4 style={{margin:'0 0 8px 0', color:'#17a2b8'}}>PARTS USED</h4>
            {partsUsed.map(part => (
              <div key={part.id} style={{display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid #bee5eb'}}>
                <div>
                  <strong>{part.partName}</strong> <span style={{color:'#666'}}>({part.partNumber})</span>
                  <br />
                  <small style={{color:'#666'}}>Qty: {part.quantityUsed} | Tech: {part.technician}</small>
                </div>
                <div style={{textAlign:'right'}}>
                  <div><strong>${part.totalPrice.toFixed(2)}</strong></div>
                  <small style={{color:'#666'}}>(${part.priceEach.toFixed(2)} each)</small>
                </div>
              </div>
            ))}
            <div style={{marginTop:8, textAlign:'right', fontWeight:'bold', borderTop:'1px solid #17a2b8', paddingTop:4}}>
              Total Parts: ${partsUsed.reduce((sum, p) => sum + p.totalPrice, 0).toFixed(2)}
            </div>
          </div>
        ) : (
          <div className="muted" style={{marginTop:8}}>No parts used yet</div>
        )}
      </section>

      <section>
        <h3>4) Draft Estimate (Preview)</h3>
        <button onClick={draft} disabled={!woId || busy}>Draft Estimate</button>
        {estimate ? (
          <div style={{marginTop:8, border:'1px solid #ccc', padding:12, borderRadius:4}}>
            <h4 style={{margin:'0 0 8px 0'}}>ESTIMATE</h4>
            {estimate.lines.map((line, i) => (
              <div key={line.id} style={{display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom: i < estimate.lines.length - 1 ? '1px solid #eee' : 'none'}}>
                <div>
                  <strong>{line.description}</strong>
                  {line.type === 'LABOR' && <span style={{color:'#666'}}> ({line.estHours}h @ ${line.rate}/hr)</span>}
                  {line.type === 'PART' && <span style={{color:'#666'}}> (Qty: {line.qty})</span>}
                </div>
                <div><strong>${(line.unitPrice * line.qty).toFixed(2)}</strong></div>
              </div>
            ))}
            <div style={{marginTop:8, fontSize:'0.9em', color:'#666'}}>
              Total Labor: ${estimate.lines.filter(l => l.type === 'LABOR').reduce((sum, l) => sum + (l.unitPrice * l.qty), 0).toFixed(2)} |
              Total Parts: ${estimate.lines.filter(l => l.type === 'PART').reduce((sum, l) => sum + (l.unitPrice * l.qty), 0).toFixed(2)}
            </div>
          </div>
        ) : <div className="muted">—</div>}
      </section>

      <section>
        <h3>5) Convert to Invoice</h3>
        <div className="row">
          <label>Billing:&nbsp;
            <select value={billing} onChange={e=>setBilling(e.target.value as any)}>
              <option value="flat">Flat (use est. hours)</option>
              <option value="actual">Actual (use clocked hours)</option>
            </select>
          </label>
          <label>Tax %:&nbsp;
            <input type="number" min={0} max={30} value={taxPct} onChange={e=>setTaxPct(Number(e.target.value))}/>
          </label>
          <button onClick={convert} disabled={!woId || busy}>Convert</button>
        </div>
        {invoice ? (
          <div style={{marginTop:8, border:'2px solid #28a745', padding:16, borderRadius:6, backgroundColor:'#f8f9fa'}}>
            <div style={{textAlign:'center', marginBottom:12}}>
              <h4 style={{margin:'0 0 4px 0', color:'#28a745'}}>INVOICE GENERATED</h4>
              <div style={{fontSize:'0.9em', color:'#666'}}>Invoice ID: {invoice.id}</div>
            </div>

            <div style={{marginBottom:12}}>
              {invoice.lines.map((line: any, i: number) => (
                <div key={line.id} style={{display:'flex', justifyContent:'space-between', padding:'2px 0'}}>
                  <div>
                    {line.description}
                    {line.hours && <span style={{color:'#666'}}> ({line.hours.toFixed(1)}h)</span>}
                  </div>
                  <div>${line.lineTotal.toFixed(2)}</div>
                </div>
              ))}
            </div>

            <div style={{borderTop:'1px solid #dee2e6', paddingTop:8}}>
              <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.9em'}}>
                <div>Subtotal:</div>
                <div>${invoice.totals.subtotal.toFixed(2)}</div>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.9em'}}>
                <div>Shop Supplies ({(invoice.rates.shopSuppliesRate * 100).toFixed(1)}%):</div>
                <div>${invoice.totals.shopSuppliesAmt.toFixed(2)}</div>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.9em'}}>
                <div>Tax ({(invoice.rates.taxRate * 100).toFixed(1)}%):</div>
                <div>${invoice.totals.taxAmt.toFixed(2)}</div>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', fontWeight:'bold', fontSize:'1.1em', borderTop:'1px solid #28a745', paddingTop:4, marginTop:4}}>
                <div>TOTAL:</div>
                <div>${invoice.totals.total.toFixed(2)}</div>
              </div>
            </div>

            <div style={{textAlign:'center', marginTop:12, fontSize:'0.8em', color:'#666'}}>
              Billing Method: {invoice.billing === 'flat' ? 'Flat Rate (Estimated Hours)' : 'Actual Hours Worked'}
            </div>
          </div>
        ) : <div className="muted">—</div>}
      </section>
    </main>
  );
}