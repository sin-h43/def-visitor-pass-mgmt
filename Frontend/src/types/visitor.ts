export interface VisitorRecord {
  id: string;
  visitorName: string;
  gender: string;
  phone: string;
  email: string;
  category: string;
  purpose: string;
  hostName: string;
  hostDept: string;
  hostId: string;
  requestedAt: string;
  visitDate: string;
  status: string;
  passType: string;
  pipeline: string;
  nationality: string;
  organization: string;
  documentUrl: string | null;
  escorts: any[];
  dob: string;
  id_type: string;
  id_number: string;
  address: string;
  department: string;
  designation: string;
  hr_remarks: string; // Added remark field
}

// Defines how the reusable table should render columns
export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
}