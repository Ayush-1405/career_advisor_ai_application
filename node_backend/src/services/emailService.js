const nodemailer = require('nodemailer');

// Create transporter with explicit timeouts so it never hangs indefinitely
const createTransporter = () => nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.MAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
  connectionTimeout: 10000,  // 10s to establish TCP connection
  greetingTimeout: 10000,    // 10s for SMTP greeting
  socketTimeout: 15000,      // 15s for each socket operation
  pool: false,               // don't pool — create fresh connection each time
});

const sendPlainText = async (to, subject, body) => {
  const transporter = createTransporter();
  try {
    await transporter.sendMail({
      from: `"Career Advisor" <${process.env.MAIL_USERNAME}>`,
      to,
      subject,
      text: body,
    });
  } finally {
    transporter.close();
  }
};

const sendHtml = async (to, subject, html) => {
  const transporter = createTransporter();
  try {
    await transporter.sendMail({
      from: `"Career Advisor" <${process.env.MAIL_USERNAME}>`,
      to,
      subject,
      html,
    });
  } finally {
    transporter.close();
  }
};

module.exports = { sendPlainText, sendHtml };
