import { readFileSync } from 'fs';
import authorizer from '@sempervirens/authorizer';
import dao from '@sempervirens/dao';
import Server from '@sempervirens/server';
import cspMiddleware from '@sempervirens/plugin-csp-middleware';

// import authenticationEndpoints from '@sempervirens/plugin-authentication-endpoint';
import authenticationEndpoints from '../index.js';

import crypto from 'crypto';
import mongoose from 'mongoose';

// Example only
// "salt" may be generated with crypto.randomBytes, etc.
// "hash" may be generated with crypto.pbkdf2Sync, crypto.createHmac, etc.

// "email" and "password" are required.
// "salt" is STRONGLY recommended.
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, index: { unique: true } },
  password: { type: String, required: true },
  salt: { type: String }
});

const generateHash = function(password, salt) {
  return password + salt; // Not a real hash function
};
const hashPassword = function(next) {
  this.salt = 'salt'; // Not a real salt
  this.password = generateHash(this.password, this.salt);
  next();
};
userSchema.pre('save', hashPassword);

// methods.passwordMatches is required.
userSchema.methods.passwordMatches = function(password) {
  return generateHash(password, this.salt) == this.password;
};

// Initialize authorizer

authorizer.init({
  jwtPublicKey: readFileSync('./security/jwt/jwtRS256.key.pub', 'utf8'),
  jwtPrivateKey: readFileSync('./security/jwt/jwtRS256.key', 'utf8')
});

// Initialize dao

dao.initDb({
  host: 'localhost',
  port: '27017',
  connectionOptions: {
    useNewUrlParser: true,
    useUnifiedTopology: true
  },
  name: 'testdb',
  models: [
    { name: 'User', schema: userSchema }
  ]
});

// Initialize emails (separate files)

const registerEmail = {
  subject: 'Site 1 Registration Confirmation',
  template: ({ requestBody: { first, last }, baseUrl }) => {
return '' +
`
<html>
<head></head>
<body>
Hi ${first} ${last},<br><br>

Thanks for registering! Please follow the link below to log in:<br><br>

<a href="${baseUrl}/login">Log in</a><br><br>

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis
nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu
fugiat nulla pariatur.<br><br>

Best regards,<br>
Administrator<br>
</body>
</html>`;
  }
};

const resetPasswordEmail = {
  subject: 'Site 1 Password Reset',
  resetLinkExpiresIn: '20m', // Default 10m
  template: ({ record: { first, last }, baseUrl, token }) => {
    return '' +
`
<html>
<head></head>
<body>
Hi ${first} ${last},<br><br>

Please follow the link below to reset your password:<br><br>

<a href="${baseUrl}/reset-password?token=${token}">Reset Password</a><br><br>

The link will be valid for twenty minutes.<br><br>

Consequat nisl vel pretium lectus quam id leo in. Neque laoreet suspendisse
interdum consectetur libero id faucibus nisl. Vitae congue mauris rhoncus aenean
vel elit scelerisque.<br><br>

Please disregard this email if you did not request to reset your password.<br><br>

Best regards,<br>
Administrator
</body>
</html>`;
  }
};

// Start the server

new Server({
  port: 8080,
  sites: [
    {
      domain: 'site-1',
      data: {
        dbName: 'testdb',
        baseUrl: 'http://localhost:8080/site-1',
        emailConfig: {
          from: 'test email address',
          password: '',
          name: 'Test Admin',
          // options: {} // Nodemailer options
          emails: {
            registerEmail,
            resetPasswordEmail
          }
        }
      },
      middleware: [cspMiddleware()],
      endpoints: [
        ...authenticationEndpoints(),
        {
          path: 'GET /register',
          handler: ({ req, res }) => {
            const nonce = res.getNonce();
            res.send([
              '<html><head><title>Register</title></head>',
              '<body><form>',
              '<input name="email" placeholder="Email"><br>',
              '<input type="password" name="password" placeholder="Password"><br>',
              '<input type="password" name="repeatPassword" placeholder="Repeat Password"><br>',
              '<input type="submit" id="submit" value="Submit"></form>',
              `<script nonce="${nonce}">`,
              ` document.getElementById('submit').addEventListener('click', submit);`,
              ` async function submit(e) {
                  e.preventDefault();
                  const values = Array
                    .from(document.forms[0].elements)
                    .reduce((values, elem) => {
                      if (elem.type != 'submit') {
                        values[elem.name] = elem.value;
                      }
                      return values;
                    }, {});
                  const res = await (await fetch('http://localhost:8080/site-1/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(values)
                  })).json();
                  console.log(res);
              }`,
              '</script>',
              '</body></html>'
            ].join(''));
          }
        },
        {
          path: 'GET /login',
          handler: (req, res) => {
            res.send([
              '<html><head><title>Login</title></head>',
              '<body><form>email, password inputs</form></body></html>'
            ].join(''));
          }
        },
        {
          path: 'GET /reset-password/:token?',
          handler: (req, res) => {
            if (!token) {
              res.send([
                '<html><head><title>Reset Password</title></head>',
                '<body><form>email input</form></body></html>'
              ].join(''));
            } else {
              res.send([
                '<html><head><title>Reset Password</title></head>',
                '<body><form>password, repeat password inputs</form></body></html>'
              ].join(''));
            }
          }
        },
      ]
    }
  ]
}).start();