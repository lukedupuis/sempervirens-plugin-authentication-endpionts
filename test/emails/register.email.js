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

export default registerEmail;