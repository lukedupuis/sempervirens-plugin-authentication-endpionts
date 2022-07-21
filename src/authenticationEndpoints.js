import LoginRequestHandler from './login.request-handler.js';
import RegisterRequestHandler from './register.request-handler.js';
import ResetPasswordRequestHandler from './reset-password.request-handler.js';

const authenticationEndpoints = ({
  apiBasePath = '/api',
  modelName = 'User'
} = {
  apiBasePath: '/api',
  modelName: 'User'
}) => {
  if (apiBasePath.charAt(0) != '/') apiBasePath = `/${apiBasePath}`;
  return [
    {
      path: `POST ${apiBasePath}/login`,
      handler: LoginRequestHandler,
      data: { modelName }
    },
    {
      path: `POST ${apiBasePath}/register`,
      handler: RegisterRequestHandler,
      data: { modelName }
    },
    {
      path: `POST ${apiBasePath}/reset-password/:action`,
      handler: ResetPasswordRequestHandler,
      data: { modelName }
    }
  ];
};

export default authenticationEndpoints;