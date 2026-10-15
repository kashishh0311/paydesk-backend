const { describe, it, expect } = require('@jest/globals');
const { formatUserErrorMessage } = require('../errorResponse');

describe('errorResponse Utility Unit Tests', () => {
  it('returns default fallback when error is null or undefined', () => {
    expect(formatUserErrorMessage(null)).toBe('Unable to complete the operation. Please try again.');
  });

  it('masks SequelizeUniqueConstraintError with user-friendly message', () => {
    const error = { name: 'SequelizeUniqueConstraintError' };
    expect(formatUserErrorMessage(error)).toBe(
      'A record with this email, code, or identifier already exists in the system.'
    );
  });

  it('masks SequelizeDatabaseError preventing SQL leak', () => {
    const error = {
      name: 'SequelizeDatabaseError',
      message: 'ER_NO_SUCH_TABLE: Table paydesk_db.unknown_table does not exist'
    };
    const message = formatUserErrorMessage(error);
    expect(message).not.toContain('ER_NO_SUCH_TABLE');
    expect(message).toContain('database processing error occurred');
  });

  it('preserves clean application status error messages (e.g. 400, 404)', () => {
    const error = {
      statusCode: 404,
      message: 'Employee record not found.'
    };
    expect(formatUserErrorMessage(error)).toBe('Employee record not found.');
  });
});
