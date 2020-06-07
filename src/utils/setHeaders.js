
export const setHeaders = async (token, res) => {
  res.set('Access-Control-Expose-Headers', 'x-token', 'x-refresh-token');
  res.set('x-token', token);
};
