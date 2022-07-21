const resetPasswordEmail = {
  subject: 'Site 1 Password Reset',
  resetLinkExpiresIn: '10m',
  template: ({ record: { first, last }, baseUrl, token }) => {
    return '' +
`
<html>
<head></head>
<body>
Hi ${first} ${last},<br><br>

Please follow the link below to reset your password:<br><br>

<a href="${baseUrl}/reset-password?token=${token}">Reset Password</a><br><br>

The link will be valid for ten minutes.<br><br>

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

export default resetPasswordEmail;