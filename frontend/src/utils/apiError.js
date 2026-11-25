// Server ke error se insani message nikalta hai
export const getErrorMessage = (err) => {
  if (err.response?.data?.message) return err.response.data.message;
  if (err.code === 'ECONNABORTED') return 'The server took too long to respond.';
  return 'Cannot reach the server. Please check your connection.';
};

// Server ke field-wise errors, jaise { email: 'This email is already registered' }
export const getFieldErrors = (err) => {
  const errors = err.response?.data?.errors;
  return errors && typeof errors === 'object' ? errors : {};
};