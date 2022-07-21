# Sempervirens Plugin: Authentication Endpoints

A set of endpoints to facilitate user registration, login, and password reset with Express and MongoDB.

![Tests badge](https://github.com/lukedupuis/sempervirens-plugin-authentication-endpoints/actions/workflows/main.yml/badge.svg?event=push) ![Version badge](https://img.shields.io/static/v1?label=Node&labelColor=30363c&message=16.x&color=blue) ![Version badge](https://img.shields.io/static/v1?label=MongoDB&labelColor=30363c&message=4.4&color=blue)

## Contents

- [Installation](#installation)
- [Usage](#usage)
  - [Email Configuration](#email-configuration)
  - [Making Requests](#making-requests)
    - [Register](#register)
    - [Login](#login)
    - [Reset Password](#reset-password)
      - [Email](#email)
      - [Reset](#reset)
  - [Code Example](#code-example)

## Installation

`npm i @sempervirens/plugin-authentication-endpoints`

## Usage

An authentication system is somewhat complex with a number of moving parts (server with backend and frontend endpoints, database, email). In large productions, multiple servers, proxies and other network and security measures may be additional factors. To get started with this modest implementation of an authentication system, it may be easier to copy the example below and go from there. The explanations may provide helpful supplememntal material.

### Email Configuration

If the `emailConfig` is not passed into the site loader configuration, then no emails are sent. However, an email is required to be sent in order to use the `/reset-password` functionality.

The default `emailConfig` uses Nodemailer with Gmail. Nodemailer configurations may be passed in the `emailConfig` `options` property. See [@sempervirens/emailer](https://www.npmjs.com/package/@sempervirens/emailer) for more information.

See the below email examples for the properties that are passed into the `emailConfig` `emails` array, and the properties that are passed into the email `template` functions. The default `resetLinkExpiresIn` is 10 minutes.

### Making Requests

After generating JWT public and private keys (see [@sempervirens/authorizer](https://www.npmjs.com/package/@sempervirens/authorizer)), getting MongoDB set up (see [@sempervirens/dao](https://www.npmjs.com/package/@sempervirens/dao)), and defining files as in the examples below, when the Sempervirens server is started with `authenticationEndopints`, the endpoints are ready for requests.

#### Register

Local: `POST {protocol}://localhost[:{port}]/{domain}/api/register`<br>
Remote: `POST {protocol}://{domain}[:{port}]/api/register`

First a `/register` page should be present on the frontend that displays a registration form (see example below). When the form is submitted, it posts the input values to `/api/register`.

When calling the `/api/register` endopint, the `body` parameters are processed and a user is created in the database with those properties. The user schema (see below) must define the parameters in order for them to be added to the created user document. `email`, `password`, and `repeatPassword` are required. `_id` is returned.

_Note: `/register` is the frontend page. `/api/register` is the backend endpoint_

#### Login

Local: `POST {protocol}://localhost[:{port}]/{domain}/api/login`<br>
Remote: `POST {protocol}://{domain}[:{port}]/api/login`

First a `/login` page should be present on the frontend that displays a login form (see `/register` example below). When the form is submitted, it posts the input values to `/api/login`.

When calling the `/login` endopint, the `body` parameters are evaluated to determine if the user entered the correct email and password combination. `email` and `password` are required. `_id` is returned.

_Note: `/login` is the frontend page. `/api/login` is the backend endpoint_

#### Reset Password

First a `/rest-password` page should be present on the frontend that displays a reset password form in two steps (see `/register` and `/reset-password` examples below). When the form is submitted, it posts the input values to `/api/reset-password/email` or to `/api/reset-password/reset`.

`/reset-password` is a single endpoint that takes an `action` path parameter.

_Note: `/reset-password` and `/reset-password?token={token}` are the frontend pages. `/api/reset-passwrod/email` and `/api/reset-password/reset` are the backend endpoints._

##### Email

Local: `POST {protocol}://localhost[:{port}]/{domain}/api/password-reset/email`<br>
Remote: `POST {protocol}://{domain}[:{port}]/api/password-reset/email`

First a fontend page should be present on the website at `/reset-password` where a Reset Password form displays with an "Email" input, if a token query param is not present or the token is invalid.

When the form is submitted, the `/api/reset-password/email` endpoint is called. Then the `body` parameters are evaluated, a token is generated, and an email is sent containing the token. The default duration of the token is 10 minutes. The user then clicks the token link and should be directed back to a page on the website where a form displays.

##### Reset

Local: `POST {protocol}://localhost[:{port}]/{domain}/api/password-reset/reset`<br>
Remote: `POST {protocol}://{domain}[:{port}]/api/password-reset/reset`

First a frontend page should be present on the website where a Reset Password form displays with "Password" and "Repeat Password" fields, if a valid query param token is included in the request.

After clicking the token URL in the email, the site opens to the `/reset-password?token={token}` page. When the user submits the form, the `body` parameters and `token` are evaluated, and if valid the password is updated.

### Code Example

Please note, these are not exhaustive examples and are intended only to give an idea about how to use the authentication plugin in the context of the Sempervirens server system.

```
import { readFileSync } from 'fs';
import authorizer from '@sempervirens/authorizer';
import dao from '@sempervirens/dao';
import Server from '@sempervirens/server';
import cspMiddleware from '@sempervirens/plugin-csp-middleware';

import authenticationEndpoints from '@sempervirens/plugin-authentication-endpoint';
import authenticationEndpoints from '../index.js';

// User schema (separate file)

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
  jwtPublicKey: readFileSync('./path/to/public/key', 'utf8'),
  jwtPrivateKey: readFileSync('./path/to/private/key', 'utf8')
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
          from: 'your test email address', // Easiest is a Gmail test account with an app password
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
        // Backend API endpoints
        ...authenticationEndpoints(),

        // Frontend pages for SSR
        // (For SPA sites, these routes are defined instead in the app loaded in index.html, which Sempervirens loads by default. See @sempervirens/site-loader for directory structure setup.)
        {
          path: 'GET /register',
          // Example only, separate RequestHandler file recommended
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
          handler: ({ req, res }) => {
            // See 'GET /register' for an example of form submission
            res.send([
              '<html><head><title>Login</title></head>',
              '<body><form action="/api/login">email, password inputs</form></body></html>'
            ].join(''));
          }
        },
        {
          path: 'GET /reset-password/reset',
          handler: ({ req, res }) => {
            // See 'GET /register' for an example of form submission
            const token = req.query.token;
            if (!token || !authorizer.isValid(token)) {
              // Submits to 'GET /api/reset-password/email'
              res.send([
                '<html><head><title>Reset Password</title></head>',
                '<body><form action="/api/reset-password/email">email input</form></body></html>'
              ].join(''));
            } else {
              // Submits to 'GET /api/reset-password/reset'
              res.send([
                '<html><head><title>Reset Password</title></head>',
                '<body><form action="/api/reset-password/reset">password, repeat password inputs</form></body></html>'
              ].join(''));
            }
          }
        },
      ]
    }
  ]
}).start();
```

