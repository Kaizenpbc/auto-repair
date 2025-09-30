// Direct REST API implementation without Supabase client imports
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://0ec90b57d6e95fcbda19832f.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MVNUVufQ.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw';

const headers = {
  'apikey': supabaseAnonKey,
  'Authorization': `Bearer ${supabaseAnonKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function supabaseRequest(method: string, table: string, data?: any, query?: string) {
  const url = `${supabaseUrl}/rest/v1/${table}${query ? `?${query}` : ''}`;

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: method !== 'GET' ? JSON.stringify(data) : undefined
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();
    return { data: result, error: null };
  } catch (error: any) {
    return { data: null, error: { message: error?.message || 'Unknown error' } };
  }
}

export type CreateWOBody = {
  orgId: string;
  locationId: string;
  vehicleId: string;
  ops: { name: string; estHours: number; rate: number }[];
};

export type EstimateLine = {
  id: string;
  type: 'LABOR' | 'PART';
  description: string;
  qty: number;
  unitPrice: number;
  estHours?: number;
  rate?: number;
};

export type ConvertBody = {
  orgId: string;
  woId: string;
  billing: 'flat' | 'actual';
  taxRate?: number;
  shopSuppliesRate?: number;
};

export type Part = {
  id: string;
  partNumber: string;
  name: string;
  description: string;
  category: string;
  unitCost: number;
  unitPrice: number;
  currentStock: number;
  minStockLevel: number;
  supplier: string;
};

export type PartUsed = {
  id: string;
  workOrderId: string;
  partId: string;
  partName: string;
  partNumber: string;
  quantityUsed: number;
  costEach: number;
  priceEach: number;
  totalCost: number;
  totalPrice: number;
  technician: string;
  usedAt: string;
};

function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

function centsToDollars(cents: number): number {
  return cents / 100;
}

export const api = {
  async createWO(body: CreateWOBody): Promise<{ id: string }> {
    // Get sample customer and vehicle data with real UUIDs
    const { data: customers } = await supabaseRequest('GET', 'customers', undefined, 'limit=1');
    const { data: vehicles } = await supabaseRequest('GET', 'vehicles', undefined, 'limit=1');
    const { data: technicians } = await supabaseRequest('GET', 'technicians', undefined, 'limit=1');

    const customer = customers && customers.length > 0 ? customers[0] : null;
    const vehicle = vehicles && vehicles.length > 0 ? vehicles[0] : null;
    const technician = technicians && technicians.length > 0 ? technicians[0] : null;

    // Generate unique work order number
    const woNumber = `WO-${Date.now().toString().slice(-6)}`;

    // Create comprehensive work order with management information using actual schema
    const workOrderData = {
      work_order_number: woNumber,
      org_id: body.orgId,
      location_id: body.locationId,
      // Use real UUIDs instead of strings
      customer_id: customer?.id || null,
      vehicle_id: vehicle?.id || null,
      assigned_technician_id: technician?.id || null,
      status: 'OPEN',
      // Service details using actual column names
      priority_level: 'Normal',
      customer_complaint: 'Customer reports squeaking brakes and requests oil change',
      service_advisor: 'Mike Johnson',
      promised_completion: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
      warranty_work: false,
      internal_notes: 'Standard brake and oil service - customer is regular'
    };

    const { data: workOrders, error: woError } = await supabaseRequest('POST', 'work_orders', workOrderData);

    if (woError || !workOrders || workOrders.length === 0) {
      throw new Error(`Failed to create work order: ${woError?.message || 'No data returned'}`);
    }

    const workOrder = workOrders[0];

    // Create estimate lines for each operation
    const estimateLines = body.ops.map(op => ({
      work_order_id: workOrder.id,
      type: 'LABOR',
      description: op.name,
      qty: 1,
      unit_price: dollarsToCents(op.rate),
      est_hours: op.estHours,
      rate: dollarsToCents(op.rate)
    }));

    const { error: linesError } = await supabaseRequest('POST', 'estimate_lines', estimateLines);

    if (linesError) throw new Error(`Failed to create estimate lines: ${linesError.message}`);

    return { id: workOrder.id };
  },

  async startTime(orgId: string, woId: string, opName: string): Promise<{ ok: true }> {
    // Check if there's already an open time log
    const { data: existing } = await supabaseRequest(
      'GET',
      'time_logs',
      undefined,
      `work_order_id=eq.${woId}&op_name=eq.${opName}&end_at=is.null`
    );

    if (existing && existing.length > 0) {
      throw new Error('Time log already started for this operation');
    }

    const { error } = await supabaseRequest('POST', 'time_logs', {
      work_order_id: woId,
      op_name: opName,
      start_at: new Date().toISOString()
    });

    if (error) throw new Error(`Failed to start time log: ${error.message}`);
    return { ok: true };
  },

  async stopTime(orgId: string, woId: string, opName: string): Promise<{ actualHours: number }> {
    // Find open time log
    const { data: timeLogs, error: findError } = await supabaseRequest(
      'GET',
      'time_logs',
      undefined,
      `work_order_id=eq.${woId}&op_name=eq.${opName}&end_at=is.null&order=start_at.desc&limit=1`
    );

    if (findError || !timeLogs || timeLogs.length === 0) {
      throw new Error('No active time log found for this operation');
    }

    const timeLog = timeLogs[0];
    const endAt = new Date();
    const startAt = new Date(timeLog.start_at);
    const actualHours = (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60);

    const { error: updateError } = await supabaseRequest(
      'PATCH',
      'time_logs',
      {
        end_at: endAt.toISOString(),
        actual_hours: actualHours
      },
      `id=eq.${timeLog.id}`
    );

    if (updateError) throw new Error(`Failed to stop time log: ${updateError.message}`);
    return { actualHours };
  },

  async draftEstimate(orgId: string, woId: string): Promise<{ lines: EstimateLine[] }> {
    // Get labor estimate lines
    const { data: laborLines, error } = await supabaseRequest(
      'GET',
      'estimate_lines',
      undefined,
      `work_order_id=eq.${woId}&type=eq.LABOR`
    );

    if (error) throw new Error(`Failed to fetch estimate lines: ${error.message}`);

    const formattedLines: EstimateLine[] = (laborLines || []).map((line: any) => ({
      id: line.id,
      type: line.type,
      description: line.description,
      qty: line.qty,
      unitPrice: centsToDollars(line.unit_price),
      estHours: line.est_hours,
      rate: line.rate ? centsToDollars(line.rate) : undefined
    }));

    // Get actual parts used for this work order
    const { data: partsUsed, error: partsError } = await supabaseRequest(
      'GET',
      'parts_used',
      undefined,
      `work_order_id=eq.${woId}`
    );

    let partsLines: EstimateLine[] = [];
    if (!partsError && partsUsed && partsUsed.length > 0) {
      // Get part details for each usage
      const partsWithDetails = await Promise.all(
        partsUsed.map(async (usage: any) => {
          const { data: parts } = await supabaseRequest(
            'GET',
            'parts_inventory',
            undefined,
            `id=eq.${usage.part_id}`
          );
          const part = parts && parts.length > 0 ? parts[0] : null;
          return {
            id: `part-used-${usage.id}`,
            type: 'PART' as const,
            description: part?.name || 'Unknown Part',
            qty: usage.quantity_used,
            unitPrice: centsToDollars(usage.price_each)
          };
        })
      );
      partsLines = partsWithDetails;
    } else {
      // Fallback to demo part if no parts used yet
      const demoPart: EstimateLine = {
        id: 'demo-part',
        type: 'PART',
        description: 'Brake Pads – Demo',
        qty: 1,
        unitPrice: 89.99
      };
      partsLines = [demoPart];
    }

    return { lines: [...formattedLines, ...partsLines] };
  },

  async convertInvoice(body: ConvertBody): Promise<{ invoiceId: string; total: number }> {
    const taxRate = body.taxRate || 0.13;
    const shopSuppliesRate = body.shopSuppliesRate || 0.05;

    // Get estimate lines
    const { data: estimateLines, error: estError } = await supabaseRequest(
      'GET',
      'estimate_lines',
      undefined,
      `work_order_id=eq.${body.woId}`
    );

    if (estError) throw new Error(`Failed to fetch estimate lines: ${estError.message}`);

    let subtotalCents = 0;
    const invoiceLines = [];

    // Process labor lines
    for (const line of (estimateLines || []).filter((l: any) => l.type === 'LABOR')) {
      let hoursToUse = line.est_hours;

      if (body.billing === 'actual') {
        // Get actual hours from time logs
        const { data: timeLogs } = await supabaseRequest(
          'GET',
          'time_logs',
          undefined,
          `work_order_id=eq.${body.woId}&op_name=eq.${line.description}&end_at=not.is.null`
        );

        if (timeLogs && timeLogs.length > 0) {
          hoursToUse = timeLogs.reduce((sum: number, log: any) => sum + (log.actual_hours || 0), 0);
        }
      }

      const lineTotal = Math.round(hoursToUse * line.rate);
      subtotalCents += lineTotal;

      invoiceLines.push({
        type: 'LABOR',
        description: line.description,
        qty: 1,
        unit_price: line.rate,
        hours: hoursToUse,
        line_total: lineTotal
      });
    }

    // Add demo part
    const partPrice = dollarsToCents(89.99);
    subtotalCents += partPrice;
    invoiceLines.push({
      type: 'PART',
      description: 'Brake Pads – Demo',
      qty: 1,
      unit_price: partPrice,
      hours: null,
      line_total: partPrice
    });

    // Calculate totals
    const shopSuppliesAmt = Math.round(subtotalCents * shopSuppliesRate);
    const taxableAmount = subtotalCents + shopSuppliesAmt;
    const taxAmt = Math.round(taxableAmount * taxRate);
    const totalCents = subtotalCents + shopSuppliesAmt + taxAmt;

    // Create invoice
    const { data: invoices, error: invError } = await supabaseRequest('POST', 'invoices', {
      work_order_id: body.woId,
      billing: body.billing,
      subtotal: subtotalCents,
      shop_supplies_amt: shopSuppliesAmt,
      tax_amt: taxAmt,
      total: totalCents,
      tax_rate: taxRate,
      shop_supplies_rate: shopSuppliesRate
    });

    if (invError || !invoices || invoices.length === 0) {
      throw new Error(`Failed to create invoice: ${invError?.message || 'No data returned'}`);
    }

    const invoice = invoices[0];

    // Create invoice lines
    const invoiceLinesData = invoiceLines.map(line => ({
      invoice_id: invoice.id,
      ...line
    }));

    const { error: linesError } = await supabaseRequest('POST', 'invoice_lines', invoiceLinesData);

    if (linesError) throw new Error(`Failed to create invoice lines: ${linesError.message}`);

    return { invoiceId: invoice.id, total: centsToDollars(totalCents) };
  },

  async getInvoice(id: string): Promise<any> {
    // Get invoice
    const { data: invoices, error: invError } = await supabaseRequest(
      'GET',
      'invoices',
      undefined,
      `id=eq.${id}`
    );

    if (invError || !invoices || invoices.length === 0) {
      throw new Error(`Failed to fetch invoice: ${invError?.message || 'Invoice not found'}`);
    }

    const invoice = invoices[0];

    // Get work order
    const { data: workOrders } = await supabaseRequest(
      'GET',
      'work_orders',
      undefined,
      `id=eq.${invoice.work_order_id}`
    );

    // Get invoice lines
    const { data: invoiceLines } = await supabaseRequest(
      'GET',
      'invoice_lines',
      undefined,
      `invoice_id=eq.${id}`
    );

    const workOrder = workOrders?.[0];

    return {
      id: invoice.id,
      workOrderId: invoice.work_order_id,
      workOrder: workOrder ? {
        id: workOrder.id,
        orgId: workOrder.org_id,
        locationId: workOrder.location_id,
        vehicleId: workOrder.vehicle_id,
        status: workOrder.status
      } : null,
      billing: invoice.billing,
      rates: {
        taxRate: invoice.tax_rate,
        shopSuppliesRate: invoice.shop_supplies_rate
      },
      lines: (invoiceLines || []).map((line: any) => ({
        id: line.id,
        type: line.type,
        description: line.description,
        qty: line.qty,
        unitPrice: centsToDollars(line.unit_price),
        hours: line.hours,
        lineTotal: centsToDollars(line.line_total)
      })),
      totals: {
        subtotal: centsToDollars(invoice.subtotal),
        shopSuppliesAmt: centsToDollars(invoice.shop_supplies_amt),
        taxAmt: centsToDollars(invoice.tax_amt),
        total: centsToDollars(invoice.total)
      },
      createdAt: invoice.created_at,
      updatedAt: invoice.updated_at
    };
  },

  // Parts Management
  async getAvailableParts(): Promise<{ parts: Part[] }> {
    const { data: parts, error } = await supabaseRequest(
      'GET',
      'parts_inventory',
      undefined,
      'select=*&order=category.asc,name.asc'
    );

    if (error) throw new Error(`Failed to fetch parts: ${error.message}`);

    return {
      parts: (parts || []).map((part: any) => ({
        id: part.id,
        partNumber: part.part_number,
        name: part.name,
        description: part.description,
        category: part.category,
        unitCost: centsToDollars(part.unit_cost),
        unitPrice: centsToDollars(part.unit_price),
        currentStock: part.current_stock,
        minStockLevel: part.min_stock_level,
        supplier: part.supplier
      }))
    };
  },

  async addPartToWorkOrder(woId: string, partId: string, quantity: number, technician: string = 'Technician'): Promise<{ partUsed: PartUsed }> {
    // Get part details first
    const { data: parts, error: partError } = await supabaseRequest(
      'GET',
      'parts_inventory',
      undefined,
      `id=eq.${partId}`
    );

    if (partError || !parts || parts.length === 0) {
      throw new Error(`Part not found: ${partError?.message || 'Invalid part ID'}`);
    }

    const part = parts[0];

    // Check if enough stock
    if (part.current_stock < quantity) {
      throw new Error(`Insufficient stock. Available: ${part.current_stock}, Requested: ${quantity}`);
    }

    // Record part usage
    const { data: partsUsed, error: useError } = await supabaseRequest('POST', 'parts_used', {
      work_order_id: woId,
      part_id: partId,
      quantity_used: quantity,
      cost_each: part.unit_cost,
      price_each: part.unit_price,
      technician: technician
    });

    if (useError || !partsUsed || partsUsed.length === 0) {
      throw new Error(`Failed to record part usage: ${useError?.message || 'No data returned'}`);
    }

    // Update inventory stock
    const newStock = part.current_stock - quantity;
    const { error: stockError } = await supabaseRequest('PATCH', 'parts_inventory',
      { current_stock: newStock },
      `id=eq.${partId}`
    );

    if (stockError) {
      console.warn('Failed to update stock levels:', stockError.message);
    }

    const partUsed = partsUsed[0];
    return {
      partUsed: {
        id: partUsed.id,
        workOrderId: partUsed.work_order_id,
        partId: partUsed.part_id,
        partName: part.name,
        partNumber: part.part_number,
        quantityUsed: partUsed.quantity_used,
        costEach: centsToDollars(partUsed.cost_each),
        priceEach: centsToDollars(partUsed.price_each),
        totalCost: centsToDollars(partUsed.cost_each * partUsed.quantity_used),
        totalPrice: centsToDollars(partUsed.price_each * partUsed.quantity_used),
        technician: partUsed.technician,
        usedAt: partUsed.used_at
      }
    };
  },

  async getPartsUsedByWorkOrder(woId: string): Promise<{ partsUsed: PartUsed[] }> {
    const { data: partsUsed, error } = await supabaseRequest(
      'GET',
      'parts_used',
      undefined,
      `work_order_id=eq.${woId}&select=*`
    );

    if (error) throw new Error(`Failed to fetch parts used: ${error.message}`);

    // Get part details for each usage
    const partsWithDetails = await Promise.all(
      (partsUsed || []).map(async (usage: any) => {
        const { data: parts } = await supabaseRequest(
          'GET',
          'parts_inventory',
          undefined,
          `id=eq.${usage.part_id}`
        );

        const part = parts && parts.length > 0 ? parts[0] : null;

        return {
          id: usage.id,
          workOrderId: usage.work_order_id,
          partId: usage.part_id,
          partName: part?.name || 'Unknown Part',
          partNumber: part?.part_number || 'N/A',
          quantityUsed: usage.quantity_used,
          costEach: centsToDollars(usage.cost_each),
          priceEach: centsToDollars(usage.price_each),
          totalCost: centsToDollars(usage.cost_each * usage.quantity_used),
          totalPrice: centsToDollars(usage.price_each * usage.quantity_used),
          technician: usage.technician,
          usedAt: usage.used_at
        };
      })
    );

    return { partsUsed: partsWithDetails };
  },

  async getWorkOrderDetails(woId: string): Promise<{ workOrder: any }> {
    // Get work order with all related data
    const { data: workOrders, error: woError } = await supabaseRequest(
      'GET',
      'work_orders',
      undefined,
      `id=eq.${woId}`
    );

    if (woError || !workOrders || workOrders.length === 0) {
      throw new Error(`Work order not found: ${woError?.message || 'Invalid work order ID'}`);
    }

    const workOrder = workOrders[0];

    // Get customer details
    let customer = null;
    if (workOrder.customer_id) {
      const { data: customers } = await supabaseRequest('GET', 'customers', undefined, `id=eq.${workOrder.customer_id}`);
      customer = customers && customers.length > 0 ? customers[0] : null;
    }

    // Get vehicle details
    let vehicle = null;
    if (workOrder.vehicle_id) {
      const { data: vehicles } = await supabaseRequest('GET', 'vehicles', undefined, `id=eq.${workOrder.vehicle_id}`);
      vehicle = vehicles && vehicles.length > 0 ? vehicles[0] : null;
    }

    // Service advisor is stored as text in this schema, not a foreign key
    const serviceAdvisorName = workOrder.service_advisor || 'Mike Johnson';

    // Get technician details
    let technician = null;
    if (workOrder.assigned_technician_id) {
      const { data: technicians } = await supabaseRequest('GET', 'technicians', undefined, `id=eq.${workOrder.assigned_technician_id}`);
      technician = technicians && technicians.length > 0 ? technicians[0] : null;
    }

    // Build comprehensive work order object
    const fullWorkOrder = {
      ...workOrder,
      customer: customer ? {
        customerNumber: customer.customer_number,
        name: `${customer.first_name} ${customer.last_name}`,
        phone: customer.phone,
        email: customer.email,
        address: `${customer.address_line1}, ${customer.city}, ${customer.state} ${customer.zip_code}`
      } : {
        customerNumber: 'DEMO-001',
        name: 'John Williams',
        phone: '555-0201',
        email: 'jwilliams@email.com',
        address: '123 Main St, Anytown, CA 90210'
      },
      vehicle: vehicle ? {
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        vin: vehicle.vin,
        mileage: vehicle.mileage || vehicle.current_mileage,
        engine: vehicle.engine,
        color: vehicle.color
      } : {
        year: 2019,
        make: 'Honda',
        model: 'Civic',
        vin: 'JH4TB2H26CC000123',
        mileage: 45230,
        engine: '1.5L Turbo',
        color: 'Silver'
      },
      serviceAdvisor: {
        name: serviceAdvisorName,
        phone: '555-0101',
        email: 'mjohnson@autoshop.com'
      },
      technician: technician ? {
        name: `${technician.first_name} ${technician.last_name}`,
        certification: technician.certification_level,
        specializations: technician.specializations
      } : {
        name: 'Carlos Rodriguez',
        certification: 'ASE Master',
        specializations: 'Brakes, Engine, Electrical'
      }
    };

    return { workOrder: fullWorkOrder };
  },

  // Workflow Management
  async createWorkOrderWithIntake(data: any): Promise<{ workOrder: any }> {
    // Check if customer exists by phone
    const { data: existingCustomers } = await supabaseRequest('GET', 'customers', undefined, `phone=eq.${data.customerPhone}`);

    let customerId = null;

    if (existingCustomers && existingCustomers.length > 0) {
      customerId = existingCustomers[0].id;
    } else {
      // Create new customer
      const customerData = {
        customer_number: `CUST-${Date.now().toString().slice(-6)}`,
        first_name: data.customerName.split(' ')[0] || data.customerName,
        last_name: data.customerName.split(' ').slice(1).join(' ') || '',
        phone: data.customerPhone,
        email: data.customerEmail || null,
        address_line1: '',
        city: '',
        state: '',
        zip_code: ''
      };

      const { data: newCustomers, error: customerError } = await supabaseRequest('POST', 'customers', customerData);

      if (customerError || !newCustomers || newCustomers.length === 0) {
        throw new Error(`Failed to create customer: ${customerError?.message || 'No data returned'}`);
      }

      customerId = newCustomers[0].id;
    }

    let vehicleId = null;
    const { data: existingVehicles } = await supabaseRequest('GET', 'vehicles', undefined, `vin=eq.${data.vin}`);

    if (existingVehicles && existingVehicles.length > 0) {
      vehicleId = existingVehicles[0].id;

      // Update vehicle mileage if new reading is higher
      const existingVehicle = existingVehicles[0];
      if (data.mileage > existingVehicle.mileage) {
        await supabaseRequest('PATCH', 'vehicles', {
          mileage: data.mileage,
          current_mileage: data.mileage
        }, `id=eq.${vehicleId}`);
      }
    } else {
      const { data: newVehicles } = await supabaseRequest('POST', 'vehicles', {
        customer_id: customerId,
        vin: data.vin,
        year: data.year,
        make: data.make,
        model: data.model,
        engine: data.engine,
        mileage: data.mileage,
        current_mileage: data.mileage,
        fuel_level: data.fuelLevel
      });
      vehicleId = newVehicles && newVehicles.length > 0 ? newVehicles[0].id : null;
    }

    const woNumber = data.priority === 'EMERGENCY' ? `${Date.now().toString().slice(-6)}` : `${Date.now().toString().slice(-6)}`;

    const { data: workOrders, error } = await supabaseRequest('POST', 'work_orders', {
      work_order_number: woNumber,
      org_id: 'org-1',
      location_id: 'loc-1',
      customer_id: customerId,
      vehicle_id: vehicleId,
      status: 'Created',
      workflow_stage: 'Reception',
      priority_level: data.priority,
      customer_complaint: data.complaint,
      customer_authorization_status: 'Pending',
      created_by: data.createdBy || 'Service Advisor'
    });

    if (error || !workOrders || workOrders.length === 0) {
      throw new Error(`Failed to create work order: ${error?.message || 'No data returned'}`);
    }

    return { workOrder: workOrders[0] };
  },

  async getTechnicians(): Promise<{ technicians: any[] }> {
    const { data: technicians, error } = await supabaseRequest('GET', 'technicians');

    if (error) throw new Error(`Failed to fetch technicians: ${error.message}`);

    return { technicians: technicians || [] };
  },

  async getVehicles(): Promise<{ vehicles: any[] }> {
    const { data: vehicles, error } = await supabaseRequest('GET', 'vehicles', undefined, 'order=created_at.desc');

    if (error) throw new Error(`Failed to fetch vehicles: ${error.message}`);

    return { vehicles: vehicles || [] };
  },

  async getCustomers(): Promise<{ customers: any[] }> {
    const { data: customers, error } = await supabaseRequest('GET', 'customers', undefined, 'order=created_at.desc');

    if (error) throw new Error(`Failed to fetch customers: ${error.message}`);

    return { customers: customers || [] };
  },

  async getWorkOrders(): Promise<{ workOrders: any[] }> {
    const { data: workOrders, error } = await supabaseRequest('GET', 'work_orders', undefined, 'order=created_at.desc');

    if (error) throw new Error(`Failed to fetch work orders: ${error.message}`);

    return { workOrders: workOrders || [] };
  },

  async assignTechnician(woId: string, techId: string): Promise<{ ok: true }> {
    const { error: woError } = await supabaseRequest('PATCH', 'work_orders', {
      assigned_technician_id: techId,
      workflow_stage: 'Diagnosis',
      started_at: new Date().toISOString()
    }, `id=eq.${woId}`);

    if (woError) throw new Error(`Failed to assign technician: ${woError.message}`);

    const { error: assignError } = await supabaseRequest('POST', 'work_order_assignments', {
      work_order_id: woId,
      technician_id: techId,
      assigned_by: 'Manager',
      expected_start: new Date().toISOString()
    });

    if (assignError) console.warn('Failed to record assignment:', assignError.message);

    return { ok: true };
  },

  async submitDiagnosis(woId: string, data: any): Promise<{ ok: true }> {
    const { error } = await supabaseRequest('PATCH', 'work_orders', {
      additional_findings: data.additionalFindings,
      recommended_services: data.recommendedServices,
      estimated_total: dollarsToCents(data.estimatedTotal),
      workflow_stage: 'Inspection',
      customer_authorization_status: 'Pending'
    }, `id=eq.${woId}`);

    if (error) throw new Error(`Failed to submit diagnosis: ${error.message}`);

    if (data.serviceLines && data.serviceLines.length > 0) {
      const serviceEstimates = data.serviceLines.map((line: any) => ({
        work_order_id: woId,
        type: 'LABOR',
        description: line.serviceName,
        qty: 1,
        unit_price: dollarsToCents(line.laborRate),
        est_hours: line.hours,
        rate: dollarsToCents(line.laborRate)
      }));

      const { error: serviceError } = await supabaseRequest('POST', 'estimate_lines', serviceEstimates);
      if (serviceError) console.warn('Failed to save service lines:', serviceError.message);
    }

    if (data.partLines && data.partLines.length > 0) {
      const partEstimates = data.partLines.map((line: any) => ({
        work_order_id: woId,
        type: 'PART',
        description: line.partName,
        qty: line.quantity,
        unit_price: dollarsToCents(line.unitPrice),
        est_hours: null,
        rate: null
      }));

      const { error: partError } = await supabaseRequest('POST', 'estimate_lines', partEstimates);
      if (partError) console.warn('Failed to save part lines:', partError.message);
    }

    return { ok: true };
  },

  async updateApprovalStatus(woId: string, data: any): Promise<{ ok: true }> {
    const { error } = await supabaseRequest('PATCH', 'work_orders', {
      customer_authorization_status: data.approvalStatus,
      authorization_notes: data.customerNotes,
      workflow_stage: data.approvalStatus === 'APPROVED' ? 'Work In Progress' : 'Inspection'
    }, `id=eq.${woId}`);

    if (error) throw new Error(`Failed to update approval: ${error.message}`);

    const { error: commError } = await supabaseRequest('POST', 'work_order_communications', {
      work_order_id: woId,
      communication_type: 'INTERNAL',
      direction: 'INBOUND',
      subject: `Estimate ${data.approvalStatus}`,
      message: `Customer ${data.approvalStatus === 'APPROVED' ? 'approved' : 'declined'} the estimate${data.customerNotes ? ': ' + data.customerNotes : ''}`,
      sent_by: 'Customer'
    });

    if (commError) console.warn('Failed to log communication:', commError.message);

    return { ok: true };
  },

  async sendBackToDiagnosis(woId: string, reason: string): Promise<{ ok: true }> {
    // First, get current work order data to archive
    const { data: workOrders, error: fetchError } = await supabaseRequest(
      'GET',
      'work_orders',
      undefined,
      `id=eq.${woId}&select=*`
    );

    if (fetchError) throw new Error(`Failed to fetch work order: ${fetchError.message}`);
    const workOrder = workOrders?.[0];

    if (workOrder) {
      // Get current estimate lines
      const { data: estimateLines } = await supabaseRequest(
        'GET',
        'estimate_lines',
        undefined,
        `work_order_id=eq.${woId}`
      );

      const serviceLines = estimateLines?.filter((l: any) => l.type === 'LABOR') || [];
      const partLines = estimateLines?.filter((l: any) => l.type === 'PART') || [];

      // Get the next version number
      const { data: historyRecords } = await supabaseRequest(
        'GET',
        'diagnosis_history',
        undefined,
        `work_order_id=eq.${woId}&select=version&order=version.desc&limit=1`
      );

      const nextVersion = historyRecords && historyRecords.length > 0
        ? historyRecords[0].version + 1
        : 1;

      // Save current diagnosis to history
      const { error: historyError } = await supabaseRequest('POST', 'diagnosis_history', {
        work_order_id: woId,
        version: nextVersion,
        additional_findings: workOrder.additional_findings || '',
        recommended_services: workOrder.recommended_services || '',
        estimated_total: workOrder.estimated_total || 0,
        service_lines: serviceLines,
        part_lines: partLines,
        created_by: 'Technician',
        revision_reason: reason || 'Revision requested'
      });

      if (historyError) console.warn('Failed to save diagnosis history:', historyError.message);
    }

    const { error } = await supabaseRequest('PATCH', 'work_orders', {
      workflow_stage: 'Diagnosis',
      customer_authorization_status: 'REVISION_REQUESTED'
    }, `id=eq.${woId}`);

    if (error) throw new Error(`Failed to send back to diagnosis: ${error.message}`);

    const { error: commError } = await supabaseRequest('POST', 'work_order_communications', {
      work_order_id: woId,
      communication_type: 'INTERNAL',
      direction: 'INBOUND',
      subject: 'Estimate Revision Requested',
      message: `Customer requested revisions to estimate${reason ? ': ' + reason : ''}`,
      sent_by: 'Service Advisor'
    });

    if (commError) console.warn('Failed to log communication:', commError.message);

    return { ok: true };
  },

  async getDiagnosisHistory(woId: string): Promise<{ history: any[] }> {
    const { data: history, error } = await supabaseRequest(
      'GET',
      'diagnosis_history',
      undefined,
      `work_order_id=eq.${woId}&order=version.desc`
    );

    if (error) throw new Error(`Failed to fetch diagnosis history: ${error.message}`);

    return { history: history || [] };
  },

  async getWorkOrderCommunications(woId: string): Promise<{ communications: any[] }> {
    const { data: communications, error } = await supabaseRequest(
      'GET',
      'work_order_communications',
      undefined,
      `work_order_id=eq.${woId}&order=created_at.desc`
    );

    if (error) throw new Error(`Failed to fetch communications: ${error.message}`);

    return { communications: communications || [] };
  },

  async updateWorkOrderStage(woId: string, data: any): Promise<{ ok: true }> {
    const { error } = await supabaseRequest('PATCH', 'work_orders', {
      workflow_stage: data.workflowStage,
      internal_notes: data.internalNotes
    }, `id=eq.${woId}`);

    if (error) throw new Error(`Failed to update stage: ${error.message}`);

    return { ok: true };
  },

  async getTimeLogs(woId: string): Promise<{ timeLogs: any[] }> {
    const { data: timeLogs, error } = await supabaseRequest('GET', 'time_logs', undefined, `work_order_id=eq.${woId}`);

    if (error) throw new Error(`Failed to fetch time logs: ${error.message}`);

    return { timeLogs: timeLogs || [] };
  },

  async submitQualityCheck(woId: string, data: any): Promise<{ ok: true }> {
    const { error: qcError } = await supabaseRequest('POST', 'quality_checks', {
      work_order_id: woId,
      inspector: data.inspector,
      checklist_items: data.checklistItems,
      test_drive_performed: data.testDrivePerformed,
      test_drive_notes: data.testDriveNotes,
      overall_status: data.overallStatus,
      failure_reasons: data.failureReasons,
      inspected_at: new Date().toISOString()
    });

    if (qcError) throw new Error(`Failed to submit QC: ${qcError.message}`);

    const newStage = data.overallStatus === 'PASSED' ? 'Ready for Pickup' : 'Work In Progress';

    const { error: woError } = await supabaseRequest('PATCH', 'work_orders', {
      workflow_stage: newStage
    }, `id=eq.${woId}`);

    if (woError) throw new Error(`Failed to update work order: ${woError.message}`);

    return { ok: true };
  },

  async completeWorkOrder(woId: string, data: any): Promise<{ ok: true }> {
    const { error } = await supabaseRequest('PATCH', 'work_orders', {
      workflow_stage: 'Completed',
      status: 'Completed',
      completed_at: new Date().toISOString()
    }, `id=eq.${woId}`);

    if (error) throw new Error(`Failed to complete work order: ${error.message}`);

    // Create service history record when work is completed
    await this.createServiceHistoryFromWorkOrder(woId);

    return { ok: true };
  },

  async createServiceHistoryFromWorkOrder(woId: string): Promise<void> {
    try {
      // Get work order details
      const { data: workOrders } = await supabaseRequest(
        'GET',
        'work_orders',
        undefined,
        `id=eq.${woId}&select=*`
      );
      const workOrder = workOrders?.[0];
      if (!workOrder) return;

      // Get vehicle details
      const { data: vehicles } = await supabaseRequest(
        'GET',
        'vehicles',
        undefined,
        `id=eq.${workOrder.vehicle_id}&select=*`
      );
      const vehicle = vehicles?.[0];

      // Get invoice lines
      const { data: invoices } = await supabaseRequest(
        'GET',
        'invoices',
        undefined,
        `work_order_id=eq.${woId}&select=*`
      );
      const invoice = invoices?.[0];

      let invoiceLines: any[] = [];
      if (invoice) {
        const { data: lines } = await supabaseRequest(
          'GET',
          'invoice_lines',
          undefined,
          `invoice_id=eq.${invoice.id}`
        );
        invoiceLines = lines || [];
      }

      const servicesPerformed = invoiceLines
        .filter(line => line.type === 'LABOR')
        .map(line => ({
          description: line.description,
          hours: line.hours || 0,
          cost: line.line_total
        }));

      const partsReplaced = invoiceLines
        .filter(line => line.type === 'PART')
        .map(line => ({
          description: line.description,
          quantity: line.qty,
          cost: line.line_total
        }));

      const laborTotal = servicesPerformed.reduce((sum, s) => sum + (s.cost || 0), 0);
      const partsTotal = partsReplaced.reduce((sum, p) => sum + (p.cost || 0), 0);

      // Get technician name
      let technicianName = 'Technician';
      if (workOrder.assigned_technician_id) {
        const { data: technicians } = await supabaseRequest(
          'GET',
          'technicians',
          undefined,
          `id=eq.${workOrder.assigned_technician_id}`
        );
        const tech = technicians?.[0];
        if (tech) {
          technicianName = `${tech.first_name} ${tech.last_name}`;
        }
      }

      // Create service history record
      await supabaseRequest('POST', 'service_history', {
        vehicle_id: workOrder.vehicle_id,
        work_order_id: woId,
        service_date: new Date().toISOString().split('T')[0],
        mileage_at_service: vehicle?.mileage || 0,
        services_performed: servicesPerformed,
        parts_replaced: partsReplaced,
        labor_total: laborTotal,
        parts_total: partsTotal,
        total_cost: invoice?.total || 0,
        technician_name: technicianName,
        service_advisor: workOrder.service_advisor || 'Service Advisor',
        customer_notes: workOrder.additional_findings || '',
        internal_notes: workOrder.internal_notes || ''
      });

      // Update vehicle last service date
      await supabaseRequest('PATCH', 'vehicles', {
        last_service_date: new Date().toISOString(),
        mileage: vehicle?.mileage || 0
      }, `id=eq.${workOrder.vehicle_id}`);

    } catch (error) {
      console.error('Failed to create service history:', error);
    }
  },

  async getVehicleServiceHistory(vehicleId: string): Promise<{ history: any[] }> {
    const { data: history, error } = await supabaseRequest(
      'GET',
      'service_history',
      undefined,
      `vehicle_id=eq.${vehicleId}&order=service_date.desc`
    );

    if (error) throw new Error(`Failed to fetch service history: ${error.message}`);

    return { history: history || [] };
  },

  async createFutureRecommendation(data: {
    vehicleId: string;
    workOrderId: string;
    recommendation: string;
    reason: string;
    priority: string;
    estimatedCost: number;
    recommendedMileage?: number;
    recommendedDate?: string;
    recommendedBy: string;
  }): Promise<{ ok: true }> {
    const { error } = await supabaseRequest('POST', 'future_recommendations', {
      vehicle_id: data.vehicleId,
      work_order_id: data.workOrderId,
      recommendation: data.recommendation,
      reason: data.reason,
      priority: data.priority,
      estimated_cost: dollarsToCents(data.estimatedCost),
      recommended_mileage: data.recommendedMileage,
      recommended_date: data.recommendedDate,
      recommended_by: data.recommendedBy,
      status: 'PENDING'
    });

    if (error) throw new Error(`Failed to create recommendation: ${error.message}`);

    return { ok: true };
  },

  async getVehicleRecommendations(vehicleId: string, status?: string): Promise<{ recommendations: any[] }> {
    const filter = status
      ? `vehicle_id=eq.${vehicleId}&status=eq.${status}&order=priority.desc,created_at.desc`
      : `vehicle_id=eq.${vehicleId}&order=priority.desc,created_at.desc`;

    const { data: recommendations, error } = await supabaseRequest(
      'GET',
      'future_recommendations',
      undefined,
      filter
    );

    if (error) throw new Error(`Failed to fetch recommendations: ${error.message}`);

    return { recommendations: recommendations || [] };
  },

  async updateRecommendationStatus(recommendationId: string, status: string, completedOnWorkOrderId?: string): Promise<{ ok: true }> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (completedOnWorkOrderId) {
      updateData.completed_on_work_order_id = completedOnWorkOrderId;
    }

    const { error } = await supabaseRequest('PATCH', 'future_recommendations', updateData, `id=eq.${recommendationId}`);

    if (error) throw new Error(`Failed to update recommendation: ${error.message}`);

    return { ok: true };
  },

  // Labor Rates & Service Catalog
  async getLaborRates(): Promise<{ laborRates: any[] }> {
    const { data: laborRates, error } = await supabaseRequest('GET', 'labor_rates', undefined, 'is_active=eq.true&order=is_default.desc,hourly_rate.asc');

    if (error) throw new Error(`Failed to fetch labor rates: ${error.message}`);

    return { laborRates: laborRates || [] };
  },

  async getDefaultLaborRate(): Promise<{ laborRate: any }> {
    const { data: laborRates, error } = await supabaseRequest('GET', 'labor_rates', undefined, 'is_default=eq.true&is_active=eq.true&limit=1');

    if (error) throw new Error(`Failed to fetch default labor rate: ${error.message}`);

    return { laborRate: laborRates && laborRates.length > 0 ? laborRates[0] : { hourly_rate: 95.00 } };
  },

  async updateLaborRate(id: string, data: any): Promise<{ ok: true }> {
    const { error } = await supabaseRequest('PATCH', 'labor_rates', {
      rate_name: data.rateName,
      hourly_rate: data.hourlyRate,
      is_default: data.isDefault,
      is_active: data.isActive,
      updated_at: new Date().toISOString()
    }, `id=eq.${id}`);

    if (error) throw new Error(`Failed to update labor rate: ${error.message}`);

    return { ok: true };
  },

  async createLaborRate(data: any): Promise<{ laborRate: any }> {
    const { data: laborRates, error } = await supabaseRequest('POST', 'labor_rates', {
      rate_name: data.rateName,
      hourly_rate: data.hourlyRate,
      is_default: data.isDefault || false,
      is_active: data.isActive !== undefined ? data.isActive : true
    });

    if (error || !laborRates || laborRates.length === 0) {
      throw new Error(`Failed to create labor rate: ${error?.message || 'No data returned'}`);
    }

    return { laborRate: laborRates[0] };
  },

  async getServiceCatalog(category?: string): Promise<{ services: any[] }> {
    let query = 'is_active=eq.true&order=category.asc,service_name.asc';
    if (category) {
      query = `is_active=eq.true&category=eq.${category}&order=service_name.asc`;
    }

    const { data: services, error } = await supabaseRequest('GET', 'service_catalog', undefined, query);

    if (error) throw new Error(`Failed to fetch service catalog: ${error.message}`);

    return { services: services || [] };
  },

  async getAIServiceRecommendations(complaint: string, findings: string, vehicleMake?: string, vehicleMileage?: number): Promise<{ recommendations: any[] }> {
    const allServices = await this.getServiceCatalog();
    const services = allServices.services;

    const symptoms = `${complaint} ${findings}`.toLowerCase();

    interface ScoredRecommendation {
      service: any;
      score: number;
      matchedPatterns: string[];
      urgency: 'high' | 'medium' | 'low';
    }

    const scoredRecommendations: ScoredRecommendation[] = [];

    const addRecommendation = (serviceCodes: string[], patterns: string[], baseScore: number, urgency: 'high' | 'medium' | 'low') => {
      serviceCodes.forEach(code => {
        const service = services.find(s => s.service_code === code);
        if (service) {
          const existing = scoredRecommendations.find(r => r.service.service_code === code);
          if (existing) {
            existing.score += baseScore;
            existing.matchedPatterns.push(...patterns);
            if (urgency === 'high' && existing.urgency !== 'high') existing.urgency = urgency;
          } else {
            scoredRecommendations.push({ service, score: baseScore, matchedPatterns: [...patterns], urgency });
          }
        }
      });
    };

    const brakePatterns = [
      { regex: /squeal|squeak|screech/i, services: ['BRAKE-PAD-F', 'BRAKE-PAD-R'], score: 90, urgency: 'high' as const },
      { regex: /grind(ing)?|metal.*metal|scraping/i, services: ['BRAKE-PAD-F', 'BRAKE-PAD-R'], score: 100, urgency: 'high' as const },
      { regex: /soft|spongy|mushy.*pedal/i, services: ['BRAKE-FLUID'], score: 85, urgency: 'high' as const },
      { regex: /pedal.*floor|no.*brake/i, services: ['BRAKE-FLUID'], score: 100, urgency: 'high' as const },
      { regex: /vibrat(e|ion).*brak/i, services: ['BRAKE-PAD-F', 'BRAKE-PAD-R'], score: 75, urgency: 'medium' as const },
      { regex: /puls(e|ing).*pedal/i, services: ['BRAKE-PAD-F', 'BRAKE-PAD-R'], score: 70, urgency: 'medium' as const },
      { regex: /brake.*warning.*light/i, services: ['BRAKE-FLUID', 'BRAKE-PAD-F'], score: 95, urgency: 'high' as const }
    ];

    const enginePatterns = [
      { regex: /check.*engine.*light|cel|mil/i, services: ['DIAG-CHECK'], score: 95, urgency: 'high' as const },
      { regex: /rough.*idle|stall|stuttering/i, services: ['SPARK-PLUGS', 'DIAG-CHECK'], score: 80, urgency: 'medium' as const },
      { regex: /misfire|miss(ing)?|hesitat/i, services: ['SPARK-PLUGS', 'DIAG-CHECK'], score: 85, urgency: 'medium' as const },
      { regex: /oil.*leak|leak.*oil|puddle/i, services: ['OIL-CHANGE'], score: 75, urgency: 'medium' as const },
      { regex: /burn(ing)?.*oil|blue.*smoke/i, services: ['OIL-CHANGE', 'DIAG-CHECK'], score: 90, urgency: 'high' as const },
      { regex: /overheat|hot|temperature.*high/i, services: ['COOLANT-FLUSH', 'DIAG-CHECK'], score: 95, urgency: 'high' as const },
      { regex: /coolant.*leak|antifreeze/i, services: ['COOLANT-FLUSH'], score: 80, urgency: 'medium' as const },
      { regex: /knock(ing)?|ping(ing)?|rattle/i, services: ['SPARK-PLUGS', 'DIAG-CHECK'], score: 85, urgency: 'medium' as const },
      { regex: /poor.*performance|loss.*power|sluggish/i, services: ['AIR-FILTER', 'SPARK-PLUGS'], score: 65, urgency: 'low' as const },
      { regex: /hard.*start|won't.*start|no.*start/i, services: ['BATTERY-TEST', 'SPARK-PLUGS'], score: 90, urgency: 'high' as const }
    ];

    const tirePatterns = [
      { regex: /pull(s|ing)?.*left|pull.*right/i, services: ['WHEEL-ALIGN', 'TIRE-ROTATE'], score: 85, urgency: 'medium' as const },
      { regex: /uneven.*wear|bald.*spot/i, services: ['WHEEL-ALIGN', 'TIRE-ROTATE'], score: 80, urgency: 'medium' as const },
      { regex: /vibrat(e|ion).*speed|shake.*highway/i, services: ['TIRE-ROTATE', 'WHEEL-ALIGN'], score: 75, urgency: 'medium' as const },
      { regex: /tire.*wear|tread.*low|worn.*tire/i, services: ['TIRE-ROTATE'], score: 70, urgency: 'low' as const },
      { regex: /thumping|bumping.*tire/i, services: ['TIRE-ROTATE'], score: 65, urgency: 'medium' as const }
    ];

    const suspensionPatterns = [
      { regex: /bounce|bouncy.*ride/i, services: ['STRUT-FRONT', 'SHOCK-REAR'], score: 75, urgency: 'medium' as const },
      { regex: /clunk|thud|bang.*bump/i, services: ['STRUT-FRONT', 'SHOCK-REAR'], score: 80, urgency: 'medium' as const },
      { regex: /nose.*dive|rear.*sag/i, services: ['STRUT-FRONT', 'SHOCK-REAR'], score: 85, urgency: 'medium' as const },
      { regex: /leak(ing)?.*strut|leak.*shock/i, services: ['STRUT-FRONT', 'SHOCK-REAR'], score: 90, urgency: 'high' as const },
      { regex: /rough.*ride|harsh.*bump/i, services: ['STRUT-FRONT', 'SHOCK-REAR'], score: 70, urgency: 'low' as const }
    ];

    const transmissionPatterns = [
      { regex: /slip(ping)?.*gear|gear.*slip/i, services: ['TRANS-FLUID'], score: 95, urgency: 'high' as const },
      { regex: /hard.*shift|jerk.*shift|rough.*shift/i, services: ['TRANS-FLUID'], score: 85, urgency: 'medium' as const },
      { regex: /delay.*shift|hesitat.*shift/i, services: ['TRANS-FLUID'], score: 80, urgency: 'medium' as const },
      { regex: /grind(ing)?.*gear|clunk.*shift/i, services: ['TRANS-FLUID'], score: 90, urgency: 'high' as const },
      { regex: /burn(t|ing)?.*smell.*trans/i, services: ['TRANS-FLUID'], score: 95, urgency: 'high' as const }
    ];

    const electricalPatterns = [
      { regex: /click.*start|click.*no.*start/i, services: ['BATTERY-TEST'], score: 95, urgency: 'high' as const },
      { regex: /dead.*battery|won't.*crank/i, services: ['BATTERY-TEST'], score: 100, urgency: 'high' as const },
      { regex: /dim.*light|flicker/i, services: ['BATTERY-TEST'], score: 75, urgency: 'medium' as const },
      { regex: /alternator|charging.*system/i, services: ['BATTERY-TEST'], score: 85, urgency: 'medium' as const },
      { regex: /battery.*light|charging.*light/i, services: ['BATTERY-TEST'], score: 90, urgency: 'high' as const }
    ];

    [brakePatterns, enginePatterns, tirePatterns, suspensionPatterns, transmissionPatterns, electricalPatterns].forEach(patternGroup => {
      patternGroup.forEach(pattern => {
        if (pattern.regex.test(symptoms)) {
          addRecommendation(pattern.services, [pattern.regex.source], pattern.score, pattern.urgency);
        }
      });
    });

    if (vehicleMileage) {
      if (vehicleMileage >= 90000 && vehicleMileage <= 105000) {
        addRecommendation(['SPARK-PLUGS', 'COOLANT-FLUSH', 'TRANS-FLUID'], ['90k maintenance interval'], 60, 'medium');
      }
      if (vehicleMileage >= 60000 && vehicleMileage <= 65000) {
        addRecommendation(['TRANS-FLUID', 'COOLANT-FLUSH'], ['60k maintenance interval'], 55, 'low');
      }
      if (vehicleMileage >= 30000 && vehicleMileage <= 35000) {
        addRecommendation(['SPARK-PLUGS', 'AIR-FILTER'], ['30k maintenance interval'], 50, 'low');
      }
      if (vehicleMileage > 100000) {
        addRecommendation(['COOLANT-FLUSH', 'TRANS-FLUID'], ['high mileage vehicle'], 45, 'low');
      }
    }

    if (vehicleMake) {
      const make = vehicleMake.toLowerCase();
      if (['honda', 'acura', 'toyota', 'lexus'].includes(make)) {
        if (symptoms.match(/trans|shift/)) {
          scoredRecommendations.forEach(r => {
            if (r.service.service_code === 'TRANS-FLUID') {
              r.score += 10;
              r.matchedPatterns.push('Honda/Toyota known trans service');
            }
          });
        }
      }
      if (['bmw', 'mercedes', 'audi', 'volkswagen'].includes(make)) {
        if (symptoms.match(/coolant|overheat/)) {
          scoredRecommendations.forEach(r => {
            if (r.service.service_code === 'COOLANT-FLUSH') {
              r.score += 10;
              r.matchedPatterns.push('German vehicle cooling system service');
            }
          });
        }
      }
    }

    if (scoredRecommendations.length === 0 || symptoms.match(/multiple|various|several|not sure|don't know/)) {
      const diagService = services.find(s => s.service_code === 'DIAG-CHECK');
      if (diagService && !scoredRecommendations.find(r => r.service.service_code === 'DIAG-CHECK')) {
        scoredRecommendations.unshift({
          service: diagService,
          score: 70,
          matchedPatterns: ['vague symptoms or comprehensive check needed'],
          urgency: 'medium'
        });
      }
    }

    scoredRecommendations.sort((a, b) => {
      if (a.urgency !== b.urgency) {
        const urgencyOrder = { high: 3, medium: 2, low: 1 };
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      }
      return b.score - a.score;
    });

    const uniqueRecommendations = scoredRecommendations
      .filter((rec, index, self) =>
        index === self.findIndex((r) => r.service.service_code === rec.service.service_code)
      )
      .slice(0, 7);

    return {
      recommendations: uniqueRecommendations.map(rec => ({
        ...rec.service,
        confidence: Math.min(rec.score, 100),
        urgency: rec.urgency,
        reason: this.generateRecommendationReason(rec.service, symptoms, rec.matchedPatterns, rec.urgency)
      }))
    };
  },

  async generateFutureMaintenanceRecommendations(vehicleId: string, currentMileage: number): Promise<{ recommendations: any[] }> {
    const recommendations: any[] = [];

    const { data: vehicle } = await supabaseRequest('GET', 'vehicles', undefined, `id=eq.${vehicleId}`);
    const vehicleData = vehicle?.[0];
    if (!vehicleData) return { recommendations: [] };

    const { data: serviceHistory } = await supabaseRequest(
      'GET',
      'service_history',
      undefined,
      `vehicle_id=eq.${vehicleId}&order=service_date.desc`
    );

    const { data: intervals } = await supabaseRequest(
      'GET',
      'maintenance_intervals',
      undefined,
      'is_active=eq.true&order=priority.desc'
    );

    const { data: partLifespans } = await supabaseRequest(
      'GET',
      'part_lifespans',
      undefined,
      'is_active=eq.true'
    );

    const now = new Date();
    const history = serviceHistory || [];

    if (intervals) {
      for (const interval of intervals) {
        const matchesVehicle =
          (!interval.make || interval.make.toLowerCase() === vehicleData.make?.toLowerCase()) &&
          (!interval.model || interval.model.toLowerCase() === vehicleData.model?.toLowerCase()) &&
          (!interval.year_start || vehicleData.year >= interval.year_start) &&
          (!interval.year_end || vehicleData.year <= interval.year_end);

        if (!matchesVehicle) continue;

        const lastService = history.find((h: any) => {
          const services = h.services_performed || [];
          return services.some((s: any) =>
            s.description?.toLowerCase().includes(interval.service_name.toLowerCase().split(' ')[0])
          );
        });

        let dueAtMileage = null;
        let dueByDate = null;
        let isOverdue = false;

        if (lastService) {
          if (interval.interval_miles) {
            dueAtMileage = lastService.mileage_at_service + interval.interval_miles;
            isOverdue = currentMileage >= dueAtMileage;
          }
          if (interval.interval_months) {
            const lastServiceDate = new Date(lastService.service_date);
            dueByDate = new Date(lastServiceDate);
            dueByDate.setMonth(dueByDate.getMonth() + interval.interval_months);
            if (!isOverdue) {
              isOverdue = now >= dueByDate;
            }
          }
        } else {
          if (interval.first_service_miles) {
            dueAtMileage = interval.first_service_miles;
            isOverdue = currentMileage >= dueAtMileage;
          }
        }

        if (dueAtMileage || dueByDate) {
          const milesUntilDue = dueAtMileage ? dueAtMileage - currentMileage : null;
          const daysUntilDue = dueByDate ? Math.floor((dueByDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

          const shouldShow = isOverdue ||
            (milesUntilDue !== null && milesUntilDue <= 10000) ||
            (daysUntilDue !== null && daysUntilDue <= 180);

          if (shouldShow) {
            const priority = isOverdue ? 'HIGH' : interval.priority;
            const costRange = interval.estimated_cost_min === interval.estimated_cost_max
              ? `$${interval.estimated_cost_min}`
              : `$${interval.estimated_cost_min}-$${interval.estimated_cost_max}`;

            let whenDue = '';
            if (isOverdue) {
              whenDue = 'Overdue Now';
            } else if (milesUntilDue !== null && daysUntilDue !== null) {
              whenDue = `${milesUntilDue.toLocaleString()} mi or ${Math.ceil(daysUntilDue / 30)} months`;
            } else if (milesUntilDue !== null) {
              whenDue = `${milesUntilDue.toLocaleString()} miles`;
            } else if (daysUntilDue !== null) {
              whenDue = `${Math.ceil(daysUntilDue / 30)} months`;
            }

            recommendations.push({
              type: 'INTERVAL',
              serviceName: interval.service_name,
              whenDue,
              estimatedCost: costRange,
              priority,
              reason: lastService
                ? `Last performed at ${lastService.mileage_at_service.toLocaleString()} miles on ${new Date(lastService.service_date).toLocaleDateString()}`
                : 'No service history on record',
              dueAtMileage,
              sortScore: isOverdue ? 10000 : (milesUntilDue || 99999)
            });
          }
        }
      }
    }

    if (partLifespans) {
      for (const lifespan of partLifespans) {
        const matchesVehicle =
          (!lifespan.make || lifespan.make.toLowerCase() === vehicleData.make?.toLowerCase()) &&
          (!lifespan.model || lifespan.model.toLowerCase() === vehicleData.model?.toLowerCase());

        if (!matchesVehicle) continue;

        const partInstallHistory = history.find((h: any) => {
          const parts = h.parts_replaced || [];
          return parts.some((p: any) =>
            p.description?.toLowerCase().includes(lifespan.part_name.toLowerCase().split(' ')[0])
          );
        });

        if (partInstallHistory) {
          const installMileage = partInstallHistory.mileage_at_service;
          const milesSinceInstall = currentMileage - installMileage;

          if (lifespan.average_lifespan_miles) {
            const warningMileage = lifespan.average_lifespan_miles * lifespan.warning_threshold_percent;
            const replacementMileage = lifespan.average_lifespan_miles;

            if (milesSinceInstall >= warningMileage) {
              const isOverdue = milesSinceInstall >= replacementMileage;
              const milesRemaining = replacementMileage - milesSinceInstall;
              const priority = isOverdue ? 'HIGH' : (milesRemaining < 5000 ? 'MEDIUM' : 'LOW');

              let whenDue = '';
              if (isOverdue) {
                whenDue = `Overdue by ${Math.abs(milesRemaining).toLocaleString()} miles`;
              } else {
                whenDue = `${milesRemaining.toLocaleString()} miles`;
              }

              recommendations.push({
                type: 'PART_WEAR',
                serviceName: `${lifespan.part_name} Inspection/Replacement`,
                whenDue,
                estimatedCost: 'Contact for quote',
                priority,
                reason: `Installed at ${installMileage.toLocaleString()} miles on ${new Date(partInstallHistory.service_date).toLocaleDateString()}. Typical lifespan: ${lifespan.average_lifespan_miles.toLocaleString()} miles`,
                dueAtMileage: installMileage + replacementMileage,
                sortScore: isOverdue ? 5000 : Math.abs(milesRemaining)
              });
            }
          }
        }
      }
    }

    recommendations.sort((a, b) => {
      if (a.priority === 'HIGH' && b.priority !== 'HIGH') return -1;
      if (a.priority !== 'HIGH' && b.priority === 'HIGH') return 1;
      return a.sortScore - b.sortScore;
    });

    return { recommendations: recommendations.slice(0, 8) };
  },

  generateRecommendationReason(service: any, symptoms: string, patterns: string[], urgency: string): string {
    const reasons: { [key: string]: { [key: string]: string } } = {
      'BRAKE-PAD-F': {
        high: 'URGENT: Grinding or severe brake noise indicates immediate pad replacement needed',
        medium: 'Brake squeaking suggests front pads are getting thin',
        low: 'Front brake pads due for inspection'
      },
      'BRAKE-PAD-R': {
        high: 'URGENT: Metal-on-metal grinding - rear pads critically worn',
        medium: 'Rear brake noise indicates worn pads',
        low: 'Rear brake pads due for inspection'
      },
      'BRAKE-FLUID': {
        high: 'CRITICAL: Soft pedal indicates serious brake fluid issue - safety concern',
        medium: 'Brake fluid contaminated or low - affects braking performance',
        low: 'Brake fluid service recommended'
      },
      'OIL-CHANGE': {
        high: 'URGENT: Oil leak or burning oil requires immediate attention',
        medium: 'Oil change needed - dirty oil affects engine performance',
        low: 'Regular oil change service due'
      },
      'SPARK-PLUGS': {
        high: 'Severe misfires indicate spark plugs need replacement',
        medium: 'Rough idle and hesitation caused by worn spark plugs',
        low: 'Spark plugs due for replacement based on mileage'
      },
      'DIAG-CHECK': {
        high: 'Check engine light requires immediate diagnostic scan',
        medium: 'Computer diagnostic needed to identify specific issues',
        low: 'Comprehensive diagnostic recommended'
      },
      'AIR-FILTER': {
        high: 'Severely restricted airflow affecting engine operation',
        medium: 'Clogged air filter reducing performance and fuel economy',
        low: 'Air filter replacement due based on mileage'
      },
      'COOLANT-FLUSH': {
        high: 'CRITICAL: Overheating detected - immediate coolant service required',
        medium: 'Cooling system needs service to prevent overheating',
        low: 'Coolant flush recommended based on maintenance schedule'
      },
      'TIRE-ROTATE': {
        medium: 'Uneven tire wear indicates rotation needed',
        low: 'Regular tire rotation extends tire life'
      },
      'WHEEL-ALIGN': {
        high: 'Severe pulling indicates critical alignment issue',
        medium: 'Vehicle pulling indicates alignment adjustment needed',
        low: 'Wheel alignment check recommended'
      },
      'STRUT-FRONT': {
        high: 'Leaking struts require immediate replacement - safety issue',
        medium: 'Worn front struts affecting ride and handling',
        low: 'Front struts due for inspection'
      },
      'SHOCK-REAR': {
        high: 'Failed rear shocks create unsafe driving conditions',
        medium: 'Worn rear shocks causing poor ride quality',
        low: 'Rear shocks due for inspection'
      },
      'TRANS-FLUID': {
        high: 'URGENT: Slipping or burnt smell indicates transmission service needed now',
        medium: 'Shift quality issues suggest transmission fluid service',
        low: 'Transmission fluid service due based on mileage'
      },
      'BATTERY-TEST': {
        high: 'CRITICAL: No-start condition requires immediate battery/charging system test',
        medium: 'Starting issues or electrical problems indicate battery testing needed',
        low: 'Battery test recommended - preventive check'
      }
    };

    const serviceReasons = reasons[service.service_code];
    if (serviceReasons) {
      return serviceReasons[urgency] || serviceReasons['medium'] || 'Recommended service';
    }

    return 'Recommended based on symptoms and diagnostic findings';
  }
};