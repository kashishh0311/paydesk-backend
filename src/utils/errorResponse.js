/**
 * User-Friendly Error Formatting Utility
 * Prevents raw database / SQL / runtime stack traces from leaking to end users.
 */

function formatUserErrorMessage(error, fallbackMessage = 'Unable to complete the operation. Please try again.') {
  if (!error) {
    return fallbackMessage;
  }

  // Handle unique constraint collisions (duplicate email, employee_code, etc.)
  if (error.name === 'SequelizeUniqueConstraintError') {
    return 'A record with this email, code, or identifier already exists in the system.';
  }

  // Handle foreign key constraint violations
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return 'The requested operation cannot be performed because associated records exist or the referenced record was not found.';
  }

  // Handle model field validations
  if (error.name === 'SequelizeValidationError') {
    if (Array.isArray(error.errors) && error.errors.length > 0) {
      return error.errors.map((e) => e.message).join('. ');
    }
    return 'Please ensure all required fields are provided in the correct format.';
  }

  // Mask internal database SQL exceptions
  if (error.name === 'SequelizeDatabaseError') {
    return 'A database processing error occurred. Please verify your input and try again.';
  }

  // Intentional business logic errors (400, 401, 403, 404, 409) with human-readable messages
  if (error.statusCode && error.statusCode < 500 && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

module.exports = {
  formatUserErrorMessage
};
