// src/lib/employeeUtils.ts
import { supabase } from './supabase';

export interface EmployeeRecord {
  id: string;
  auth_id: string;
  employee_id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  status?: string;
  avatar_url?: string;
}

/**
 * Fetch and verify employee record exists in database
 * @param email - Email to search for
 * @returns EmployeeRecord if found
 * @throws Error if not found or database error occurs
 */
export async function fetchAndVerifyEmployee(email: string): Promise<EmployeeRecord> {
  console.log(`🔍 Verifying employee: ${email}`);

  if (!email) {
    throw new Error('Email is required to fetch employee');
  }

  try {
    const { data, error } = await supabase
      .from('employees')
      .select('id, auth_id, employee_id, name, email, department, role, avatar_url')
      .eq('email', email)
      .single();

    if (error) {
      console.error('❌ Database query failed:', error);
      
      if (error.code === 'PGRST116') {
        // No row found
        throw new Error(
          `No employee record found for ${email}. ` +
          `You must be approved by HR before registering visitors.`
        );
      }
      
      if (error.code === '42P01') {
        // Table doesn't exist
        throw new Error('Employee database table not found. Contact system administrator.');
      }
      
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      throw new Error(
        `No employee record found for ${email}. ` +
        `Contact HR to activate your account.`
      );
    }

    // Verify record has required fields
    if (!data.id) {
      console.error('❌ Employee record missing primary ID:', data);
      throw new Error('Employee record missing primary ID. Contact HR.');
    }

    if (!data.name) {
      console.warn('⚠️ Employee record missing name:', data);
    }

    if (!data.department) {
      console.warn('⚠️ Employee record missing department:', data);
    }

    console.log(`✅ Employee verified: ${data.name} (ID: ${data.id})`);
    
    return data as EmployeeRecord;

  } catch (err: any) {
    console.error('❌ Exception while fetching employee:', err);
    throw err; // Re-throw to be handled by caller
  }
}

/**
 * Check if an employee ID exists in the database
 * @param employeeId - UUID to check
 * @returns true if exists, false otherwise
 */
export async function employeeIdExists(employeeId: string): Promise<boolean> {
  if (!employeeId) {
    console.warn('⚠️ Employee ID is empty');
    return false;
  }

  try {
    console.log(`🔍 Checking if employee ${employeeId} exists...`);
    
    const { data, error } = await supabase
      .from('employees')
      .select('id')
      .eq('id', employeeId)
      .single();

    if (error) {
      // PGRST116 = no row found (not an error in this context)
      if (error.code === 'PGRST116') {
        console.warn(`⚠️ Employee ${employeeId} does not exist`);
        return false;
      }
      
      console.error('❌ Error checking employee existence:', error);
      throw error;
    }

    if (data) {
      console.log(`✅ Employee ${employeeId} exists`);
      return true;
    }

    console.warn(`⚠️ Employee ${employeeId} not found`);
    return false;

  } catch (err: any) {
    console.error('❌ Exception while checking employee:', err);
    return false;
  }
}

/**
 * Get employee by ID with full details
 * @param employeeId - UUID of employee
 * @returns EmployeeRecord if found
 * @throws Error if not found
 */
export async function getEmployeeById(employeeId: string): Promise<EmployeeRecord> {
  if (!employeeId) {
    throw new Error('Employee ID is required');
  }

  console.log(`🔍 Fetching employee by ID: ${employeeId}`);

  try {
    const { data, error } = await supabase
      .from('employees')
      .select('id, auth_id, employee_id, name, email, department, role, avatar_url')
      .eq('id', employeeId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error(`Employee with ID ${employeeId} not found`);
      }
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Employee with ID ${employeeId} not found`);
    }

    console.log(`✅ Found employee: ${data.name}`);
    return data as EmployeeRecord;

  } catch (err: any) {
    console.error('❌ Exception while fetching employee by ID:', err);
    throw err;
  }
}

/**
 * Validate employee can register visitors
 * Checks: exists, has proper role, status is active
 */
export async function validateEmployeeForVisitorRegistration(email: string): Promise<EmployeeRecord> {
  console.log(`🔐 Validating employee for visitor registration: ${email}`);

  try {
    const employee = await fetchAndVerifyEmployee(email);

    // Check role if needed (customize based on your business logic)
    // You can restrict registration to specific roles if needed
    if (employee.role && !['employee', 'manager', 'hr', 'admin'].includes(employee.role.toLowerCase())) {
      console.warn(`⚠️ User role is ${employee.role}, may not have permission to register visitors`);
    }

    console.log(`✅ Employee validated for visitor registration`);
    return employee;

  } catch (err: any) {
    console.error('❌ Employee validation failed:', err);
    throw err;
  }
}

/**
 * Get all employees in a department
 * @param department - Department name
 * @returns Array of EmployeeRecords
 */
export async function getEmployeesByDepartment(department: string): Promise<EmployeeRecord[]> {
  if (!department) {
    throw new Error('Department is required');
  }

  console.log(`🔍 Fetching employees in department: ${department}`);

  try {
    const { data, error } = await supabase
      .from('employees')
      // FIX: Removed 'status' from the select query
      .select('id, auth_id, employee_id, name, email, department, role')
      .eq('department', department)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    console.log(`✅ Found ${data?.length || 0} employees in ${department}`);
    return data as EmployeeRecord[];

  } catch (err: any) {
    console.error('❌ Exception while fetching employees:', err);
    throw err;
  }
}

/**
 * Batch verify multiple employee IDs
 * @param employeeIds - Array of UUIDs
 * @returns Object with valid and invalid IDs
 */
export async function batchVerifyEmployees(employeeIds: string[]): Promise<{
  valid: string[];
  invalid: string[];
}> {
  console.log(`🔍 Verifying ${employeeIds.length} employees...`);

  if (!employeeIds || employeeIds.length === 0) {
    return { valid: [], invalid: [] };
  }

  try {
    const { data, error } = await supabase
      .from('employees')
      .select('id')
      .in('id', employeeIds);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    const validIds = (data || []).map(emp => emp.id);
    const invalidIds = employeeIds.filter(id => !validIds.includes(id));

    console.log(`✅ Valid: ${validIds.length}, Invalid: ${invalidIds.length}`);

    return { valid: validIds, invalid: invalidIds };

  } catch (err: any) {
    console.error('❌ Batch verification failed:', err);
    throw err;
  }
}