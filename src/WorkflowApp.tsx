import { useState, useEffect } from 'react';
import { api } from './api';
import { VehicleIntake } from './components/VehicleIntake';
import { WorkOrderQueue } from './components/WorkOrderQueue';
import { DiagnosisView } from './components/DiagnosisView';
import { ApprovalView } from './components/ApprovalView';
import { WorkProgressView } from './components/WorkProgressView';
import { QualityCheckView } from './components/QualityCheckView';
import { CompletionView } from './components/CompletionView';
import { LaborRatesManager } from './components/LaborRatesManager';
import { InvoiceCreationView } from './components/InvoiceCreationView';
import { CustomerContactView } from './components/CustomerContactView';
import { DeliveryManagementView } from './components/DeliveryManagementView';

export type WorkflowStage =
  | 'INTAKE'
  | 'QUEUE'
  | 'DIAGNOSIS'
  | 'APPROVAL'
  | 'IN_PROGRESS'
  | 'QC'
  | 'INVOICE_CREATION'
  | 'CUSTOMER_CONTACT'
  | 'PICKUP_DELIVERY'
  | 'COMPLETION';

export interface WorkOrder {
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
  created_by?: string;
}

export interface Technician {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  skill_level: string;
  specializations: string;
  hourly_rate: number;
  is_active: boolean;
}

export type UserRole = 'MANAGER' | 'TECHNICIAN';

export default function WorkflowApp() {
  console.log('WorkflowApp rendering');

  const [currentStage, setCurrentStage] = useState<WorkflowStage>('INTAKE');
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [showLaborRatesManager, setShowLaborRatesManager] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('MANAGER');
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | null>(null);

  useEffect(() => {
    console.log('WorkflowApp useEffect running, currentStage:', currentStage);
    loadTechnicians();
    if (currentStage === 'QUEUE') {
      loadWorkOrders();
    }
  }, [currentStage]);

  const loadTechnicians = async () => {
    try {
      const response = await api.getTechnicians();
      setTechnicians(response.technicians);
    } catch (error) {
      console.error('Failed to load technicians:', error);
    }
  };

  const loadWorkOrders = async () => {
    try {
      const response = await api.getWorkOrders();
      setWorkOrders(response.workOrders);
    } catch (error) {
      console.error('Failed to load work orders:', error);
    }
  };

  const handleWorkOrderCreated = (workOrder: WorkOrder) => {
    setCurrentStage('QUEUE');
    loadWorkOrders();
  };

  const handleWorkOrderSelected = (workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);

    if (workOrder.workflow_stage === 'Reception' && !workOrder.assigned_technician_id) {
      setCurrentStage('QUEUE');
    } else if (workOrder.workflow_stage === 'Diagnosis' || workOrder.workflow_stage === 'Inspection') {
      setCurrentStage('DIAGNOSIS');
    } else if (workOrder.customer_authorization_status === 'Pending') {
      setCurrentStage('APPROVAL');
    } else if (workOrder.workflow_stage === 'Work In Progress') {
      setCurrentStage('IN_PROGRESS');
    } else if (workOrder.workflow_stage === 'Quality Control') {
      setCurrentStage('QC');
    } else if (workOrder.workflow_stage === 'Ready for Pickup') {
      setCurrentStage('INVOICE_CREATION');
    } else if (workOrder.workflow_stage === 'Ready for Contact') {
      setCurrentStage('CUSTOMER_CONTACT');
    } else if (workOrder.workflow_stage === 'Awaiting Pickup' || workOrder.workflow_stage === 'Awaiting Delivery' || workOrder.workflow_stage === 'Out for Delivery' || workOrder.workflow_stage === 'At Cashier') {
      setCurrentStage('PICKUP_DELIVERY');
    } else if (workOrder.workflow_stage === 'Completed') {
      setCurrentStage('COMPLETION');
    }
  };

  const handleStageChange = (stage: WorkflowStage, workOrder?: WorkOrder) => {
    if (workOrder) {
      setSelectedWorkOrder(workOrder);
    }
    setCurrentStage(stage);
    if (stage === 'QUEUE') {
      loadWorkOrders();
    }
  };

  const handleStartNewWorkOrder = () => {
    setSelectedWorkOrder(null);
    setCurrentStage('INTAKE');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <nav style={{
        backgroundColor: '#2c3e50',
        color: 'white',
        padding: '16px 24px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px' }}>AutoShop Workflow Manager</h1>
          <div style={{ fontSize: '14px', marginTop: '4px', opacity: 0.8 }}>
            {selectedWorkOrder ? `Work Order #${selectedWorkOrder.work_order_number || selectedWorkOrder.id.slice(-6).toUpperCase()}` : 'Ready to start new work order'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '14px' }}>View as:</label>
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value as UserRole)}
              style={{
                padding: '8px 12px',
                backgroundColor: '#34495e',
                color: 'white',
                border: '1px solid #2c3e50',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              <option value="MANAGER">Shop Manager</option>
              <option value="TECHNICIAN">Technician</option>
            </select>
            {userRole === 'TECHNICIAN' && (
              <select
                value={selectedTechnicianId || ''}
                onChange={(e) => setSelectedTechnicianId(e.target.value)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#34495e',
                  color: 'white',
                  border: '1px solid #2c3e50',
                  borderRadius: '4px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                <option value="">Select Technician...</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.first_name} {tech.last_name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <button
            onClick={handleStartNewWorkOrder}
            style={{
              padding: '10px 20px',
              backgroundColor: '#2ecc71',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            + New Work Order
          </button>
          <button
            onClick={() => setCurrentStage('QUEUE')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#9b59b6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            📋 All Work Orders
          </button>
          <button
            onClick={() => setShowLaborRatesManager(true)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#e67e22',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            ⚙ Labor Rates
          </button>
        </div>
      </nav>

      {selectedWorkOrder && (
        <div style={{
          display: 'flex',
          backgroundColor: '#34495e',
          borderBottom: '2px solid #2c3e50',
          overflowX: 'auto'
        }}>
          {(['DIAGNOSIS', 'APPROVAL', 'IN_PROGRESS', 'QC', 'INVOICE_CREATION', 'CUSTOMER_CONTACT', 'PICKUP_DELIVERY', 'COMPLETION'] as WorkflowStage[]).map((stage) => {
            const isCompleted = (
              (stage === 'DIAGNOSIS' && ['Inspection', 'Work In Progress', 'Quality Control', 'Ready for Pickup', 'Ready for Contact', 'Awaiting Pickup', 'Awaiting Delivery', 'Out for Delivery', 'At Cashier', 'Completed'].includes(selectedWorkOrder.workflow_stage)) ||
              (stage === 'APPROVAL' && ['Work In Progress', 'Quality Control', 'Ready for Pickup', 'Ready for Contact', 'Awaiting Pickup', 'Awaiting Delivery', 'Out for Delivery', 'At Cashier', 'Completed'].includes(selectedWorkOrder.workflow_stage)) ||
              (stage === 'IN_PROGRESS' && ['Quality Control', 'Ready for Pickup', 'Ready for Contact', 'Awaiting Pickup', 'Awaiting Delivery', 'Out for Delivery', 'At Cashier', 'Completed'].includes(selectedWorkOrder.workflow_stage)) ||
              (stage === 'QC' && ['Ready for Pickup', 'Ready for Contact', 'Awaiting Pickup', 'Awaiting Delivery', 'Out for Delivery', 'At Cashier', 'Completed'].includes(selectedWorkOrder.workflow_stage)) ||
              (stage === 'INVOICE_CREATION' && ['Ready for Contact', 'Awaiting Pickup', 'Awaiting Delivery', 'Out for Delivery', 'At Cashier', 'Completed'].includes(selectedWorkOrder.workflow_stage)) ||
              (stage === 'CUSTOMER_CONTACT' && ['Awaiting Pickup', 'Awaiting Delivery', 'Out for Delivery', 'At Cashier', 'Completed'].includes(selectedWorkOrder.workflow_stage)) ||
              (stage === 'PICKUP_DELIVERY' && selectedWorkOrder.workflow_stage === 'Completed') ||
              (stage === 'COMPLETION' && selectedWorkOrder.workflow_stage === 'Completed')
            );

            return (
              <button
                key={stage}
                onClick={() => setCurrentStage(stage)}
                disabled={!isCompleted && currentStage !== stage}
                style={{
                  flex: 1,
                  minWidth: '140px',
                  padding: '12px 16px',
                  backgroundColor: currentStage === stage ? '#3498db' : isCompleted ? '#27ae60' : 'transparent',
                  color: 'white',
                  border: 'none',
                  borderBottom: currentStage === stage ? '3px solid #2ecc71' : '3px solid transparent',
                  cursor: (isCompleted || currentStage === stage) ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: currentStage === stage ? 'bold' : 'normal',
                  opacity: (isCompleted || currentStage === stage) ? 1 : 0.5,
                  transition: 'all 0.2s'
                }}
              >
                {isCompleted && '✓ '}
                {stage === 'DIAGNOSIS' && '1. Diagnosis'}
                {stage === 'APPROVAL' && '2. Approval'}
                {stage === 'IN_PROGRESS' && '3. Work Progress'}
                {stage === 'QC' && '4. Quality Check'}
                {stage === 'INVOICE_CREATION' && '5. Invoice'}
                {stage === 'CUSTOMER_CONTACT' && '6. Contact'}
                {stage === 'PICKUP_DELIVERY' && '7. Pickup/Delivery'}
                {stage === 'COMPLETION' && '8. Complete'}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ padding: '24px' }}>
        {currentStage === 'INTAKE' && (
          <VehicleIntake
            onWorkOrderCreated={handleWorkOrderCreated}
          />
        )}

        {currentStage === 'QUEUE' && (
          <WorkOrderQueue
            workOrders={workOrders}
            technicians={technicians}
            onWorkOrderSelected={handleWorkOrderSelected}
            onRefresh={loadWorkOrders}
            userRole={userRole}
            selectedTechnicianId={selectedTechnicianId}
          />
        )}

        {currentStage === 'DIAGNOSIS' && selectedWorkOrder && (
          <DiagnosisView
            workOrder={selectedWorkOrder}
            onStageChange={handleStageChange}
          />
        )}

        {currentStage === 'APPROVAL' && selectedWorkOrder && (
          <ApprovalView
            workOrder={selectedWorkOrder}
            onStageChange={handleStageChange}
          />
        )}

        {currentStage === 'IN_PROGRESS' && selectedWorkOrder && (
          <WorkProgressView
            workOrder={selectedWorkOrder}
            technicians={technicians}
            onStageChange={handleStageChange}
          />
        )}

        {currentStage === 'QC' && selectedWorkOrder && (
          <QualityCheckView
            workOrder={selectedWorkOrder}
            onStageChange={handleStageChange}
          />
        )}

        {currentStage === 'INVOICE_CREATION' && selectedWorkOrder && (
          <InvoiceCreationView
            workOrder={selectedWorkOrder}
            onComplete={() => {
              loadWorkOrders();
              setCurrentStage('QUEUE');
            }}
            onBack={() => setCurrentStage('QUEUE')}
          />
        )}

        {currentStage === 'CUSTOMER_CONTACT' && selectedWorkOrder && (
          <CustomerContactView
            workOrder={selectedWorkOrder}
            onComplete={() => {
              loadWorkOrders();
              setCurrentStage('QUEUE');
            }}
            onBack={() => setCurrentStage('QUEUE')}
          />
        )}

        {currentStage === 'PICKUP_DELIVERY' && (
          <DeliveryManagementView
            workOrders={workOrders}
            onComplete={(workOrderId) => {
              loadWorkOrders();
              const completedWO = workOrders.find(wo => wo.id === workOrderId);
              if (completedWO) {
                setSelectedWorkOrder(completedWO);
                setCurrentStage('COMPLETION');
              }
            }}
            onRefresh={loadWorkOrders}
          />
        )}

        {currentStage === 'COMPLETION' && selectedWorkOrder && (
          <CompletionView
            workOrder={selectedWorkOrder}
            onStageChange={handleStageChange}
          />
        )}
      </div>

      {showLaborRatesManager && (
        <LaborRatesManager onClose={() => setShowLaborRatesManager(false)} />
      )}
    </div>
  );
}