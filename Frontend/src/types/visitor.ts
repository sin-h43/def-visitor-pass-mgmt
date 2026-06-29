// src/types/visitor.ts
import React from 'react';

// ==========================================
// 1. CORE VISITOR & PERSONNEL IDENTITY TYPES
// ==========================================

export interface EscortRecord {
  name: string;
  phone: string;
  id_number: string;
  id_type: string;
  email: string;
  gender: string;
}

export interface VisitorRecord {
  id: string;
  id_type: string;
  id_number: string;
  visitorName: string;
  phone: string;
  email: string;
  dob: string;
  address: string;
  gender?: string;
  pipeline: string;
  department: string;
  purpose: string;
  hostName: string;
  hostDept: string;
  escorts: EscortRecord[];
  requestDate: string;
  status: string;
  organization: string;
  documentUrl: string | null;
  hr_remarks?: string;
  created_at?: string;
  nationality?: string;
  designation?: string;
  category?: string;
  hostId?: string;
}

// Support for the Security Verification Module
export interface Visitor {
  id: string;
  visitor_name: string;
  visitor_email: string;
  visitor_phone: string;
  visitor_gender: string;
  identity_type: string;
  identity_number: string;
  purpose: string;
  employee_name: string;
  visitor_type: string;
  status: string;
  visit_date: string;
  visit_time: string;
  visitor_photo_url?: string;
  checked_in_time?: string;
  security_officer_id?: string;
}

// ==========================================
// 2. UI & TABLE RENDER TYPES
// ==========================================

export interface TableColumn<T> {
  key: string | keyof T;
  label: string;
  render?: (row: T) => React.ReactNode;
}

// Support for the Security Dashboard Queue
export interface QueueItem {
  visitor_id: string;
  visitor_name: string;
  arrival_time: string;
  expected_arrival: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'processing' | 'completed';
}

// ==========================================
// 3. SECURITY & FORENSIC AUDIT TYPES
// ==========================================

export type SecurityRole = 'hr' | 'employee' | 'security' | 'HR Admin' | 'Security Officer' | 'Employee' | 'System Automated';
export type AuditAction = 'created' | 'updated' | 'approved' | 'rejected' | 'checked_in' | 'checked_out' | 'revoked';
export type AlertSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface AuditLog {
  id?: string;
  timestamp: string;
  action: AuditAction | string;
  performed_by: string;
  performed_by_role: SecurityRole | string;
  visitor_id?: string;
  remarks?: string;
  targetPassId?: string;
  ipAddress?: string;
  deviceId?: string;
  severity?: AlertSeverity;
}