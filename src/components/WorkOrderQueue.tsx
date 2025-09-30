import { useState } from 'react';
import { api } from '../api';

interface WorkOrder {
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

interface Technician {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  skill_level: string;
  specializations: string;
  is_active: boolean;
}

type UserRole = 'MANAGER' | 'TECHNICIAN';

interface WorkOrderQueueProps {
  workOrders: WorkOrder[];
  technicians: Technician[];
  onWorkOrderSelected: (workOrder: WorkOrder) => void;
  onRefresh: () => void;
  userRole: UserRole;
  selectedTechnicianId: string | null;
}

export function WorkOrderQueue({ workOrders, technicians, onWorkOrderSelected, onRefresh, userRole, selectedTechnicianId }: WorkOrderQueueProps) {
  const [selectedTechId, setSelectedTechId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);

  const availableTechs = technicians.filter(t => t.is_active);

  const filteredWorkOrders = userRole === 'MANAGER'
    ? workOrders
    : workOrders.filter(wo => wo.assigned_technician_id === selectedTechnicianId);

  const unassignedOrders = filteredWorkOrders.filter(wo => !wo.assigned_technician_id);
  const assignedOrders = filteredWorkOrders.filter(wo => wo.assigned_technician_id);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'EMERGENCY': return '#e74c3c';
      case 'WAITING': return '#f39c12';
      case 'APPOINTMENT': return '#3498db';
      case 'DROPOFF': return '#95a5a6';
      case 'WARRANTY': return '#9b59b6';
      default: return '#7f8c8d';
    }
  };

  const handleAssignTech = async (workOrderId: string) => {
    if (!selectedTechId) {
      setMessage('Please select a technician');
      return;
    }

    setBusy(true);
    setMessage('');

    try {
      await api.assignTechnician(workOrderId, selectedTechId);
      setMessage('Technician assigned successfully!');
      onRefresh();
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <h2 style={{ marginTop: 0, color: '#2c3e50' }}>
          {userRole === 'MANAGER' ? 'All Work Orders' : 'My Work Orders'}
        </h2>
        <p style={{ color: '#7f8c8d', marginBottom: '16px' }}>
          {userRole === 'MANAGER'
            ? 'Assign technicians to pending work orders'
            : 'Work orders assigned to you'}
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

        {userRole === 'MANAGER' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '12px',
            marginBottom: '24px'
          }}>
            {availableTechs.map(tech => (
              <div
                key={tech.id}
                style={{
                  padding: '12px',
                  border: '2px solid',
                  borderColor: selectedTechId === tech.id ? '#3498db' : '#ddd',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: selectedTechId === tech.id ? '#ebf5fb' : 'white',
                  transition: 'all 0.2s'
                }}
                onClick={() => setSelectedTechId(tech.id)}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  {tech.first_name} {tech.last_name}
                </div>
                <div style={{ fontSize: '13px', color: '#7f8c8d' }}>
                  {tech.skill_level}
                </div>
                <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>
                  {tech.specializations}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {userRole === 'TECHNICIAN' && !selectedTechnicianId && (
        <div style={{
          backgroundColor: 'white',
          padding: '48px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          textAlign: 'center',
          color: '#e74c3c'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠</div>
          <div style={{ fontSize: '18px' }}>Please select a technician from the dropdown above</div>
        </div>
      )}

      {userRole === 'TECHNICIAN' && selectedTechnicianId && assignedOrders.length === 0 && (
        <div style={{
          backgroundColor: 'white',
          padding: '48px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          textAlign: 'center',
          color: '#7f8c8d'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <div style={{ fontSize: '18px' }}>No work orders assigned to you yet</div>
        </div>
      )}

      {userRole === 'MANAGER' && unassignedOrders.length === 0 && assignedOrders.length === 0 && (
        <div style={{
          backgroundColor: 'white',
          padding: '48px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          textAlign: 'center',
          color: '#7f8c8d'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
          <div style={{ fontSize: '18px' }}>All work orders have been assigned</div>
        </div>
      )}

      {userRole === 'TECHNICIAN' && selectedTechnicianId && assignedOrders.length > 0 && (
        <div>
          <h3 style={{ color: '#2c3e50', marginBottom: '12px' }}>My Work Orders</h3>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>WO #</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Priority</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Customer Complaint</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Created By</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Created</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignedOrders.map((wo, index) => {
                  return (
                    <tr
                      key={wo.id}
                      style={{
                        backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white',
                        cursor: 'pointer',
                        borderLeft: `4px solid ${getPriorityColor(wo.priority_level)}`
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ecf0f1'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#f8f9fa' : 'white'}
                    >
                      <td style={{ padding: '12px', fontWeight: '500', color: '#2c3e50' }} onClick={() => onWorkOrderSelected(wo)}>
                        #{wo.work_order_number || wo.id.slice(-6).toUpperCase()}
                      </td>
                      <td style={{ padding: '12px' }} onClick={() => onWorkOrderSelected(wo)}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          backgroundColor: getPriorityColor(wo.priority_level),
                          color: 'white'
                        }}>
                          {wo.priority_level}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#7f8c8d' }} onClick={() => onWorkOrderSelected(wo)}>
                        {wo.workflow_stage}
                      </td>
                      <td style={{
                        padding: '12px',
                        fontSize: '13px',
                        color: '#555',
                        maxWidth: '300px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }} onClick={() => onWorkOrderSelected(wo)}>
                        {wo.customer_complaint || 'No complaint specified'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#555', fontWeight: '500' }} onClick={() => onWorkOrderSelected(wo)}>
                        {wo.created_by || 'N/A'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '12px', color: '#7f8c8d' }} onClick={() => onWorkOrderSelected(wo)}>
                        {new Date(wo.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onWorkOrderSelected(wo);
                          }}
                          style={{
                            padding: '6px 16px',
                            backgroundColor: '#2ecc71',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '500'
                          }}
                        >
                          Work on This
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {userRole === 'MANAGER' && unassignedOrders.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ color: '#2c3e50', marginBottom: '12px' }}>Unassigned Work Orders</h3>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>WO #</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Priority</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Customer Complaint</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Created By</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Created</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {unassignedOrders.map((wo, index) => (
                  <tr
                    key={wo.id}
                    style={{
                      backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white',
                      cursor: 'pointer',
                      borderLeft: `4px solid ${getPriorityColor(wo.priority_level)}`
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ecf0f1'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#f8f9fa' : 'white'}
                  >
                    <td
                      style={{ padding: '12px', fontWeight: '500', color: '#2c3e50' }}
                      onClick={() => onWorkOrderSelected(wo)}
                    >
                      #{wo.work_order_number || wo.id.slice(-6).toUpperCase()}
                    </td>
                    <td style={{ padding: '12px' }} onClick={() => onWorkOrderSelected(wo)}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        backgroundColor: getPriorityColor(wo.priority_level),
                        color: 'white'
                      }}>
                        {wo.priority_level}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#7f8c8d' }} onClick={() => onWorkOrderSelected(wo)}>
                      {wo.workflow_stage}
                    </td>
                    <td
                      style={{
                        padding: '12px',
                        fontSize: '13px',
                        color: '#555',
                        maxWidth: '300px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      onClick={() => onWorkOrderSelected(wo)}
                    >
                      {wo.customer_complaint || 'No complaint specified'}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#555', fontWeight: '500' }} onClick={() => onWorkOrderSelected(wo)}>
                      {wo.created_by || 'N/A'}
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#7f8c8d' }} onClick={() => onWorkOrderSelected(wo)}>
                      {new Date(wo.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAssignTech(wo.id);
                        }}
                        disabled={busy || !selectedTechId}
                        style={{
                          padding: '6px 16px',
                          backgroundColor: '#3498db',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '500',
                          opacity: (busy || !selectedTechId) ? 0.5 : 1
                        }}
                      >
                        Assign
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {userRole === 'MANAGER' && assignedOrders.length > 0 && (
        <div>
          <h3 style={{ color: '#2c3e50', marginBottom: '12px' }}>Assigned Work Orders</h3>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>WO #</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Priority</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Assigned To</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Customer Complaint</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Created By</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {assignedOrders.map((wo, index) => {
                  const assignedTech = technicians.find(t => t.id === wo.assigned_technician_id);
                  return (
                    <tr
                      key={wo.id}
                      onClick={() => onWorkOrderSelected(wo)}
                      style={{
                        backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white',
                        cursor: 'pointer',
                        borderLeft: `4px solid ${getPriorityColor(wo.priority_level)}`
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ecf0f1'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#f8f9fa' : 'white'}
                    >
                      <td style={{ padding: '12px', fontWeight: '500', color: '#2c3e50' }}>
                        #{wo.work_order_number || wo.id.slice(-6).toUpperCase()}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          backgroundColor: getPriorityColor(wo.priority_level),
                          color: 'white'
                        }}>
                          {wo.priority_level}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#7f8c8d' }}>
                        {wo.workflow_stage}
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#2c3e50', fontWeight: '500' }}>
                        {assignedTech ? `${assignedTech.first_name} ${assignedTech.last_name}` : 'Unassigned'}
                      </td>
                      <td style={{
                        padding: '12px',
                        fontSize: '13px',
                        color: '#555',
                        maxWidth: '300px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {wo.customer_complaint || 'No complaint specified'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#555', fontWeight: '500' }}>
                        {wo.created_by || 'N/A'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '12px', color: '#7f8c8d' }}>
                        {new Date(wo.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}