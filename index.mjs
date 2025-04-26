import sgMail from "@sendgrid/mail";
import AWS from "aws-sdk";

// Initialize Secrets Manager client
const secretsManager = new AWS.SecretsManager();

export const handler = async (event) => {
  try {
    console.log(
      "Lambda function triggered. Event received:",
      JSON.stringify(event, null, 2)
    );

    // Fetch secrets from Secrets Manager
    console.log("Fetching secrets from Secrets Manager...");
    const secret = await getSecretValue(process.env.EMAIL_SECRET_KEY);
    console.log("Secrets successfully retrieved:", secret);
    const secretData = JSON.parse(secret);
    console.log("Parsed secrets data:", secretData);

    if (secretData?.api_key) {
      sgMail.setApiKey(secretData.api_key);
      process.env.SENDGRID_API_KEY = secretData.api_key;
      console.log("SendGrid API Key successfully set.");
    } else {
      throw new Error("SendGrid API Key not found in secrets.");
    }

    console.log("Calling triggerEmail with the event...");
    await triggerEmail(event);
    console.log("triggerEmail executed successfully.");
  } catch (err) {
    console.error("Unhandled error in handler:", err);
    throw err;
  }
};

const triggerEmail = async (event) => {
  console.log("Received SNS message:", JSON.stringify(event, null, 2));

  if (!event.Records || event.Records.length === 0) {
    console.error("Event does not contain Records or it's empty");
    return {
      statusCode: 400,
      body: JSON.stringify("Invalid event structure"),
    };
  }

  try {
    const snsMessage = event.Records[0].Sns;
    const { receiverEmail, token } = JSON.parse(snsMessage.Message);

    console.log("Parsed SNS Message:", { receiverEmail, token });

    if (!receiverEmail || !token) {
      console.error("Missing receiverEmail or token in the message body");
      return {
        statusCode: 400,
        body: JSON.stringify(
          "Invalid message format: receiverEmail or token is missing"
        ),
      };
    }

    const baseUrl = process.env.VERIFY_URL_BASE;
    if (!baseUrl) {
      console.error(
        "Base URL for verification link is not set in environment variables"
      );
      return {
        statusCode: 500,
        body: JSON.stringify("Server configuration error"),
      };
    }

    const verifyUrl = `https://${baseUrl}/v1/user/verify?token=${token}`;

    const subject = "RE: [Application Status at Earth Y] Verify Email Address";
    const htmlContent = `
     <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your Email Address</title>
  <style>
    body {
      background-color: #f4f4f4;
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: none;
      -ms-text-size-adjust: none;
    }
    table {
      border-spacing: 0;
      width: 100%;
    }
    td {
      padding: 0;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      padding: 20px;
      border-radius: 8px;
    }
    .email-header {
      text-align: center;
      padding-bottom: 20px;
    }
    .email-header h1 {
      font-size: 24px;
      color: #333333;
    }
    .email-body {
      font-size: 16px;
      color: #555555;
      line-height: 1.5;
    }
    .email-body p {
      margin-bottom: 20px;
    }
    .email-footer {
      text-align: center;
      font-size: 12px;
      color: #888888;
      margin-top: 30px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #1a82e2;
      color: #ffffff;
      text-decoration: none;
      border-radius: 5px;
    }
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        padding-left: 10px !important;
        padding-right: 10px !important;
        border-radius: 0 !important; 
      }
    }
  </style>
</head>
<body style="background-color:#f4f4f4;">

<!-- Email Container -->
<table role="presentation" class="email-container" width="100%" cellspacing="0" cellpadding="0">
<tr>
<td>

<!-- Header -->
<div class="email-header">
<h1>Confirm Your Email Address</h1>
</div>

<!-- Body -->
<div class="email-body">
<p>Hello,</p>

<p>Thank you for signing up! Please confirm your email address to activate your account.</p>

<p>Click the button below to verify your email:</p>

<p style="text-align:center;">
<a href="${verifyUrl}" class="button">Confirm Email</a>
</p>

<p>If the button doesn't work, copy and paste this link into your browser:</p>

<p><a href="${verifyUrl}">${verifyUrl}</a></p>

<p>If you did not request this email, you can safely ignore it.</p>
</div>

<!-- Footer -->
<div class="email-footer">
<p>&copy; Webapp. All rights reserved.</p>

</td>
</tr>
</table>

</body>
</html>
    `;

    const msg = {
      to: receiverEmail,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: subject,
      html: htmlContent,
    };

    // Send email using SendGrid API
    const response = await sgMail.send(msg);
    console.log("Email sent successfully:", response);

    return {
      statusCode: 200,
      body: JSON.stringify("Email sent successfully"),
    };
  } catch (error) {
    console.error("Error processing message:", error.message, error.stack);

    return {
      statusCode: 500,
      body: JSON.stringify("Failed to send email"),
    };
  }
};

// Function to retrieve secrets from Secrets Manager
const getSecretValue = async (secretName) => {
  try {
    const data = await secretsManager
      .getSecretValue({ SecretId: secretName })
      .promise();
    if (data.SecretString) {
      return data.SecretString;
    }
    throw new Error("Secret is not in expected format");
  } catch (err) {
    console.error("Error retrieving secret:", err);
    throw err;
  }
};
