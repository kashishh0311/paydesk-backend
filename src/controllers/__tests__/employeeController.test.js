const { describe, it, expect, beforeEach } = require('@jest/globals');

jest.mock('../../services/employeeService', () => ({
  listEmployees: jest.fn(),
  getEmployeeById: jest.fn(),
  createEmployee: jest.fn(),
  updateEmployee: jest.fn(),
  deleteEmployee: jest.fn()
}));

const { getEmployees, getEmployeeById, createEmployee, updateEmployee, deleteEmployee } = require('../employeeController');
const employeeService = require('../../services/employeeService');

describe('employeeController Unit Tests', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      query: {},
      params: {},
      body: {},
      user: { id: 1 }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('getEmployees', () => {
    it('returns 200 with paginated employee list', async () => {
      req.query = { page: '1', limit: '10' };
      const mockData = { count: 10000, rows: [{ id: 1, employee_code: 'EMP-001' }] };
      employeeService.listEmployees.mockResolvedValue(mockData);

      await getEmployees(req, res);

      expect(employeeService.listEmployees).toHaveBeenCalledWith({
        page: '1',
        limit: '10',
        search: undefined,
        department: undefined,
        country: undefined
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockData });
    });
  });

  describe('getEmployeeById', () => {
    it('returns 200 when employee is found', async () => {
      req.params = { id: '5' };
      const mockEmp = { id: 5, employee_code: 'EMP-005' };
      employeeService.getEmployeeById.mockResolvedValue(mockEmp);

      await getEmployeeById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockEmp });
    });

    it('returns 404 when employee does not exist', async () => {
      req.params = { id: '999' };
      employeeService.getEmployeeById.mockResolvedValue(null);

      await getEmployeeById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Employee record not found.'
      }));
    });
  });

  describe('createEmployee', () => {
    it('returns 201 with success message on creation', async () => {
      req.body = { first_name: 'Sara', last_name: 'Khan' };
      const created = { id: 12, employee_code: 'EMP-000012' };
      employeeService.createEmployee.mockResolvedValue(created);

      await createEmployee(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Employee EMP-000012 onboarded successfully.',
        data: created
      });
    });
  });

  describe('updateEmployee', () => {
    it('returns 200 with success message on update', async () => {
      req.params = { id: '12' };
      req.body = { first_name: 'Sara Updated', last_name: 'Khan' };
      const updated = { id: 12, employee_code: 'EMP-000012', first_name: 'Sara Updated' };
      employeeService.updateEmployee.mockResolvedValue(updated);

      await updateEmployee(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Employee EMP-000012 updated successfully.',
        data: updated
      });
    });
  });

  describe('deleteEmployee', () => {
    it('returns 200 with confirmation message on removal', async () => {
      req.params = { id: '12' };
      employeeService.deleteEmployee.mockResolvedValue({ id: 12, employee_code: 'EMP-000012' });

      await deleteEmployee(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Employee EMP-000012 removed successfully.'
      });
    });
  });
});
