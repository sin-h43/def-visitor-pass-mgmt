export interface VisitorRecord {
  id: string;
  visitorName: string;
  phone: string;
  email?: string;
  category: 'General' | 'HR' | 'Govt' | 'Foreign' | 'Service' | 'Repeated';
  purpose: string;
  hostName: string;
  hostDept?: string;
  requestDate: string;
  status: 'Pending' | 'Approved' | 'Denied' | 'Cleared' | 'Active';
  passType?: string;
}

// Defines how the reusable table should render columns
export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
}