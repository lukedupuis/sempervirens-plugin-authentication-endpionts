import authenticationEndpoints from './src/authenticationEndpoints.js';
import LoginRequestHandler from './src/login.request-handler.js';
import RegisterRequestHandler from './src/register.request-handler.js';
import ResetPasswordRequestHandler from './src/reset-password.request-handler.js';

export default authenticationEndpoints;
export {
  LoginRequestHandler,
  RegisterRequestHandler,
  ResetPasswordRequestHandler
};