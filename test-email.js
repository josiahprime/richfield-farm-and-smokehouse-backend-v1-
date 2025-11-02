import SibApiV3Sdk from 'sib-api-v3-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Authenticate with your Brevo API key
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY; // set this in .env

// Create the transactional email sender
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

const sendTransactionalEmail = async () => {
  try {
    const sendSmtpEmail = {
      to: [{ email: "primecodes69@gmail.com", name: "Prime" }],
      sender: { email: "choujiakimichi02@gmail.com", name: "Richfield" },
      subject: "✅ Brevo API Test",
      htmlContent: "<p>Hello! This is a test email sent via <strong>Brevo API</strong> 🎉</p>",
    };

    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("✅ Email sent:", response);
  } catch (error) {
    console.error("❌ Failed to send email:", error.response?.body || error.message);
  }
};

sendTransactionalEmail();
