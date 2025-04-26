# Email Verification Lambda Function

A secure, event-driven AWS Lambda function that handles email verification via SendGrid, triggered by SNS notifications. Designed for integration with cloud-native user registration flows, this function dynamically retrieves the SendGrid API key from AWS Secrets Manager and constructs a styled HTML email with a verification link.

## 📌 Features

- Triggered by AWS SNS
- Retrieves SendGrid API key securely from AWS Secrets Manager
- Constructs responsive, styled HTML verification email
- Sends email using SendGrid API
- Handles invalid events and missing data gracefully
- Environment-variable driven configuration

## 📦 Technology Stack

- Runtime: Node.js 18+
- Cloud Services:  
  - AWS Lambda  
  - AWS SNS  
  - AWS Secrets Manager  
- Email Service: SendGrid
- Environment Handling: `process.env`

---

## 📁 Project Structure

```
lambda/
├── index.js                # Main Lambda handler logic
├── package.json            # Dependencies
└── node_modules/           # Installed packages (after build)
```

---

## 🔧 Environment Variables

Set the following environment variables in your Lambda configuration or using Terraform/CDK:

| Variable Name         | Description                                                                  |
| --------------------- | ---------------------------------------------------------------------------- |
| `EMAIL_SECRET_KEY`    | Name of the secret in AWS Secrets Manager that contains the SendGrid API key |
| `SENDGRID_FROM_EMAIL` | Email address to send from (verified in SendGrid)                            |
| `VERIFY_URL_BASE`     | Base URL for verification link (e.g., `example.com`)                         |

The secret in Secrets Manager should contain a JSON string like:
```json
{
  "api_key": "your_sendgrid_api_key_here"
}
```

---

## 🚀 Deployment

You can deploy this Lambda via:

- AWS Console (upload zipped function)
- AWS CLI
- Terraform / AWS CDK / SAM

Example zip packaging:
```bash
npm install
zip -r function.zip .
```

Upload `function.zip` to your Lambda function.

---

## 🔄 Input Format (SNS Message)

The function expects the following message format (SNS `Message` string must be JSON):
```json
{
  "receiverEmail": "user@example.com",
  "token": "jwt_or_uuid_token"
}
```

This message is received from an SNS topic subscribed to the Lambda.

---

## 📬 Email Sample

- Subject: `RE: [Application Status at Earth Y] Verify Email Address`
- Includes:
  - Styled HTML layout
  - A verification button
  - Fallback plaintext link
  - Expiry note

---

## ✅ Output

- `200 OK`: Email sent successfully
- `400 Bad Request`: Invalid event structure or missing data
- `500 Internal Server Error`: Failure in secret retrieval or SendGrid error

---

## 🛡️ Error Handling

- Logs detailed error messages to CloudWatch
- Returns structured JSON error responses
- Fails gracefully on:
  - Missing secrets
  - Missing env vars
  - SendGrid failures
  - Malformed SNS payloads

---

## 📈 Monitoring

- View logs in CloudWatch Logs
- Monitor SNS trigger failures or dead-letter queues (DLQs) if configured
- Alerting can be added via CloudWatch Alarms + SNS