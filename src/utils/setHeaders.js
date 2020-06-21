export const setHeaders = async (token, res) => {
  console.log('headers', token);
  res.set('Access-Control-Expose-Headers', 'x-token');
  res.set('x-token', token);
};
