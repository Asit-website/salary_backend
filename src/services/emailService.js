const nodemailer = require('nodemailer');

// Email configuration from environment variables
const emailConfig = {
  host: process.env.SMTP_HOST || 'mail.vetansutra.com',
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_SECURE === 'true', // true for 465 (SSL), false for other ports
  auth: {
    user: process.env.SMTP_USER || 'info@vetansutra.com',
    pass: process.env.SMTP_PASS || 'Fzc]I~V]m(.9'
  }
};

// Email sender details
const emailFrom = {
  name: process.env.EMAIL_FROM_NAME || 'ThinkTech Solutions',
  address: process.env.EMAIL_FROM_ADDRESS || 'info@vetansutra.com'
};

// Create transporter
const transporter = nodemailer.createTransport(emailConfig);

// Verify transporter configuration
const verifyEmailConfig = async () => {
  try {
    console.log('🔍 Verifying email configuration...');
    console.log('🔍 SMTP Config:', {
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.auth.user,
        pass: emailConfig.auth.pass ? '***configured***' : '***missing***'
      }
    });

    await transporter.verify();
    console.log('✅ Email server is ready to send messages');
    return true;
  } catch (error) {
    console.error('❌ Email server configuration error:', error);
    return false;
  }
};

// Send welcome email to new staff
const sendWelcomeEmail = async (staffEmail, staffName, organizationName, staffCredentials) => {
  try {
    console.log(`📧 Sending welcome email to: ${staffEmail}`);
    console.log(`📧 Staff name: ${staffName}`);
    console.log(`📧 Organization: ${organizationName}`);
    console.log(`📧 Credentials: Password=${staffCredentials.password}, StaffID=${staffCredentials.staffId}`);

    const mailOptions = {
      from: `"${emailFrom.name}" <${emailFrom.address}>`,
      to: staffEmail,
      subject: 'Welcome to ThinkTech Solutions - Your Account Details',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to ThinkTech Solutions</title>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f4f4f4;
            }
            .container {
              background-color: #ffffff;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              padding-bottom: 20px;
              border-bottom: 2px solid #125EC9;
            }
            .header h1 {
              color: #125EC9;
              margin: 0;
              font-size: 28px;
            }
            .content {
              padding: 20px 0;
            }
            .welcome-message {
              font-size: 16px;
              margin-bottom: 20px;
            }
            .credentials {
              background-color: #f8f9fa;
              padding: 20px;
              border-radius: 5px;
              border-left: 4px solid #125EC9;
              margin: 20px 0;
            }
            .credentials h3 {
              color: #125EC9;
              margin-top: 0;
            }
            .credential-item {
              margin: 10px 0;
              font-size: 14px;
            }
            .credential-label {
              font-weight: bold;
              color: #555;
            }
            .footer {
              text-align: center;
              padding-top: 20px;
              border-top: 1px solid #eee;
              color: #666;
              font-size: 12px;
            }
            .action-button {
              display: inline-block;
              background-color: #125EC9;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to ThinkTech Solutions</h1>
            </div>
            
            <div class="content">
              <div class="welcome-message">
                <p>Dear <strong>${staffName}</strong>,</p>
                <p>We are delighted to welcome you to the ThinkTech Solutions family! Your account has been successfully created in our attendance and payroll management system.</p>
                <p>Below are your login credentials for accessing the system:</p>
              </div>
              
              <div class="credentials">
                <h3>Your Account Details</h3>
                <div class="credential-item">
                  <span class="credential-label">Email/Username:</span> ${staffEmail}
                </div>
                <div class="credential-item">
                  <span class="credential-label">Password:</span> ${staffCredentials.password}
                </div>
                <div class="credential-item">
                  <span class="credential-label">Organization:</span> ${organizationName}
                </div>
                <div class="credential-item">
                  <span class="credential-label">Staff ID:</span> ${staffCredentials.staffId}
                </div>
              </div>
              
              <div style="text-align: center;">
                <a href="#" class="action-button">Access Your Account</a>
              </div>
              
              <div class="welcome-message">
                <p><strong>Important Security Notice:</strong></p>
                <ul>
                  <li>Please change your password after your first login</li>
                  <li>Never share your credentials with anyone</li>
                  <li>Keep your password secure and confidential</li>
                </ul>
                
                <p><strong>What's Next?</strong></p>
                <ul>
                  <li>Log in to your account using the credentials above</li>
                  <li>Update your profile information</li>
                  <li>Start marking your attendance</li>
                  <li>View your salary details and payslips</li>
                </ul>
                
                <p>If you have any questions or need assistance, please contact our HR department or IT support.</p>
                
                <p>We look forward to working with you!</p>
                
                <p>Best regards,<br>
                <strong>ThinkTech Solutions Team</strong><br>
                HR Department</p>
              </div>
            </div>
            
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; 2024 ThinkTech Solutions. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent successfully:', info.messageId);
    console.log('📧 Email details:', {
      messageId: info.messageId,
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      response: info.response
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
};

// Send notification email to organization admin
const sendAdminNotification = async (adminEmail, staffName, organizationName) => {
  try {
    console.log(`📧 Sending admin notification to: ${adminEmail}`);

    const mailOptions = {
      from: `"${emailFrom.name}" <${emailFrom.address}>`,
      to: adminEmail,
      subject: 'New Staff Member Added - ThinkTech Solutions',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Staff Member Notification</title>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f4f4f4;
            }
            .container {
              background-color: #ffffff;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              padding-bottom: 20px;
              border-bottom: 2px solid #125EC9;
            }
            .header h1 {
              color: #125EC9;
              margin: 0;
              font-size: 24px;
            }
            .content {
              padding: 20px 0;
            }
            .notification {
              background-color: #e8f4fd;
              padding: 20px;
              border-radius: 5px;
              border-left: 4px solid #125EC9;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              padding-top: 20px;
              border-top: 1px solid #eee;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Staff Member Added</h1>
            </div>
            
            <div class="content">
              <div class="notification">
                <p>A new staff member has been successfully added to your organization:</p>
                <p><strong>Staff Name:</strong> ${staffName}</p>
                <p><strong>Organization:</strong> ${organizationName}</p>
                <p><strong>Date Added:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
              </div>
              
              <p>The staff member has been sent their login credentials via email. They can now access the attendance and payroll management system.</p>
              
              <p>Please ensure that the new staff member is properly onboarded and trained on how to use the system.</p>
              
              <p>Best regards,<br>
              <strong>ThinkTech Solutions Team</strong></p>
            </div>
            
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; 2024 ThinkTech Solutions. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Admin notification email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending admin notification email:', error);
    return { success: false, error: error.message };
  }
};

// Send admin signup review email
const sendAdminSignupReviewEmail = async (adminEmail, adminName) => {
  try {
    console.log(`📧 Sending admin signup review email to: ${adminEmail}`);
    console.log(`📧 Admin name: ${adminName}`);

    const mailOptions = {
      from: emailFrom,
      to: adminEmail,
      subject: 'Welcome to Vetansutra - Account Under Review',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Vetansutra</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f4f4f4;
            }
            .container {
              background-color: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              padding-bottom: 20px;
              border-bottom: 2px solid #007bff;
            }
            .header h1 {
              color: #007bff;
              margin: 0;
              font-size: 28px;
            }
            .content {
              padding: 20px 0;
            }
            .highlight {
              background-color: #e8f4fd;
              padding: 15px;
              border-left: 4px solid #007bff;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              padding-top: 20px;
              border-top: 1px solid #eee;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Vetansutra!</h1>
            </div>
            
            <div class="content">
              <p>Hello <strong>${adminName}</strong>,</p>
              
              <p>Welcome to Vetansutra! We're excited to have you on board.</p>
              
              <div class="highlight">
                <p>Your account has been successfully created and is currently under review. Once approved, you'll receive an activation email with login details.</p>
              </div>
              
              <p>If you have any questions or need assistance, feel free to reply to this email—we're happy to help.</p>
              
              <p>Thanks for choosing Vetansutra.</p>
              
              <p>Warm regards,<br>
              <strong>Vetansutra Team</strong></p>
            </div>
            
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; 2024 Vetansutra. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Admin signup review email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending admin signup review email:', error);
    return { success: false, error: error.message };
  }
};

// Send account activation email for subscription assignment
const sendAccountActivationEmail = async (adminEmail, adminName, organizationName, subscriptionDetails) => {
  try {
    console.log(`📧 Sending account activation email to: ${adminEmail}`);
    console.log(`📧 Admin name: ${adminName}`);
    console.log(`📧 Organization: ${organizationName}`);

    const mailOptions = {
      from: emailFrom,
      to: adminEmail,
      subject: 'Your Vetansutra Account Is Now Active',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Activated - Vetansutra</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f4f4f4;
            }
            .container {
              background-color: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              padding-bottom: 20px;
              border-bottom: 2px solid #28a745;
            }
            .header h1 {
              color: #28a745;
              margin: 0;
              font-size: 28px;
            }
            .content {
              padding: 20px 0;
            }
            .celebration {
              font-size: 24px;
              text-align: center;
              margin: 20px 0;
            }
            .account-details {
              background-color: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #28a745;
            }
            .account-details h3 {
              color: #28a745;
              margin-top: 0;
            }
            .detail-item {
              margin: 10px 0;
              padding: 8px 0;
              border-bottom: 1px solid #e9ecef;
            }
            .detail-item:last-child {
              border-bottom: none;
            }
            .detail-label {
              font-weight: bold;
              color: #495057;
            }
            .cta-button {
              display: inline-block;
              background-color: #28a745;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
              text-align: center;
            }
            .footer {
              text-align: center;
              padding-top: 20px;
              border-top: 1px solid #eee;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Your Vetansutra Account Is Now Active</h1>
            </div>
            
            <div class="content">
              <p>Hello <strong>${adminName}</strong>,</p>
              
              <div class="celebration">
                <p>Great news! 🎉</p>
              </div>
              
              <p>Your Vetansutra account has been successfully activated.</p>
              
              <div class="account-details">
                <h3>Account Details:</h3>
                <div class="detail-item">
                  <span class="detail-label">• Login URL:</span> ${subscriptionDetails.loginURL || 'https://web.vetansutra.com/'}
                </div>
                <div class="detail-item">
                  <span class="detail-label">• Subscription Plan:</span> ${subscriptionDetails.planType || 'Basic'}
                </div>
                <div class="detail-item">
                  <span class="detail-label">• Valid Till:</span> ${subscriptionDetails.expiryDate || 'N/A'}
                </div>
                <div class="detail-item">
                  <span class="detail-label">• Allowed Users:</span> ${subscriptionDetails.userLimit || 'N/A'}
                </div>
              </div>
              
              <p>You can now start managing attendance and payroll effortlessly.</p>
              
              <p>If you need onboarding help or a demo, just let us know—we've got you covered.</p>
              
              <p>Best regards,<br>
              <strong>Vetansutra Team</strong></p>
            </div>
            
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; 2024 Vetansutra. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Account activation email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending account activation email:', error);
    return { success: false, error: error.message };
  }
};

// Send subscription expiry reminder email
const sendSubscriptionExpiryReminderEmail = async (adminEmail, adminName, organizationName, subscriptionDetails) => {
  try {
    console.log(`📧 Sending subscription expiry reminder email to: ${adminEmail}`);
    console.log(`📧 Admin name: ${adminName}`);
    console.log(`📧 Organization: ${organizationName}`);

    const mailOptions = {
      from: emailFrom,
      to: adminEmail,
      subject: 'Your Vetansutra Subscription Is Expiring Soon',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Subscription Expiry Reminder - Vetansutra</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f4f4f4;
            }
            .container {
              background-color: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              padding-bottom: 20px;
              border-bottom: 2px solid #ffc107;
            }
            .header h1 {
              color: #ffc107;
              margin: 0;
              font-size: 28px;
            }
            .content {
              padding: 20px 0;
            }
            .reminder-box {
              background-color: #fff3cd;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #ffc107;
            }
            .reminder-box h3 {
              color: #856404;
              margin-top: 0;
            }
            .subscription-details {
              background-color: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #ffc107;
            }
            .subscription-details h3 {
              color: #495057;
              margin-top: 0;
            }
            .detail-item {
              margin: 10px 0;
              padding: 8px 0;
              border-bottom: 1px solid #e9ecef;
            }
            .detail-item:last-child {
              border-bottom: none;
            }
            .detail-label {
              font-weight: bold;
              color: #495057;
            }
            .renew-button {
              display: inline-block;
              background-color: #ffc107;
              color: #212529;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
              text-align: center;
              font-weight: bold;
            }
            .footer {
              text-align: center;
              padding-top: 20px;
              border-top: 1px solid #eee;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Your Vetansutra Subscription Is Expiring Soon</h1>
            </div>
            
            <div class="content">
              <p>Hello <strong>${adminName}</strong>,</p>
              
              <div class="reminder-box">
                <h3>⚠️ Friendly Reminder</h3>
                <p>This is a friendly reminder that your Vetansutra subscription is set to expire soon.</p>
              </div>
              
              <div class="subscription-details">
                <h3>Subscription Details:</h3>
                <div class="detail-item">
                  <span class="detail-label">• Plan:</span> ${subscriptionDetails.planType || 'Basic'}
                </div>
                <div class="detail-item">
                  <span class="detail-label">• Expiry Date:</span> ${subscriptionDetails.expiryDate || 'N/A'}
                </div>
                <div class="detail-item">
                  <span class="detail-label">• Users Allowed:</span> ${subscriptionDetails.userLimit || 'N/A'}
                </div>
              </div>
              
              <p>To avoid service interruption, please renew your subscription before the expiry date.</p>
              
              <div style="text-align: center;">
                <a href="${subscriptionDetails.renewalLink || '#'}" class="renew-button">Renew Now</a>
              </div>
              
              <p>If you have any questions regarding renewal or plan upgrades, feel free to contact us.</p>
              
              <p>Thanks for trusting ${subscriptionDetails.productName || 'Vetansutra'}.</p>
              
              <p>Regards,<br>
              <strong>Vetansutra Team</strong></p>
            </div>
            
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; 2024 Vetansutra. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Subscription expiry reminder email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending subscription expiry reminder email:', error);
    return { success: false, error: error.message };
  }
};

// Send subscription expired email
const sendSubscriptionExpiredEmail = async (adminEmail, adminName, organizationName, subscriptionDetails) => {
  try {
    console.log(`📧 Sending subscription expired email to: ${adminEmail}`);
    console.log(`📧 Admin name: ${adminName}`);
    console.log(`📧 Organization: ${organizationName}`);

    const mailOptions = {
      from: emailFrom,
      to: adminEmail,
      subject: 'Your Vetansutra Subscription Has Expired',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Subscription Expired - Vetansutra</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f4f4f4;
            }
            .container {
              background-color: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              padding-bottom: 20px;
              border-bottom: 2px solid #dc3545;
            }
            .header h1 {
              color: #dc3545;
              margin: 0;
              font-size: 28px;
            }
            .content {
              padding: 20px 0;
            }
            .expired-box {
              background-color: #f8d7da;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #dc3545;
            }
            .expired-box h3 {
              color: #721c24;
              margin-top: 0;
            }
            .subscription-details {
              background-color: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #dc3545;
            }
            .subscription-details h3 {
              color: #495057;
              margin-top: 0;
            }
            .detail-item {
              margin: 10px 0;
              padding: 8px 0;
              border-bottom: 1px solid #e9ecef;
            }
            .detail-item:last-child {
              border-bottom: none;
            }
            .detail-label {
              font-weight: bold;
              color: #495057;
            }
            .reactivate-button {
              display: inline-block;
              background-color: #dc3545;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
              text-align: center;
              font-weight: bold;
            }
            .footer {
              text-align: center;
              padding-top: 20px;
              border-top: 1px solid #eee;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Your Vetansutra Subscription Has Expired</h1>
            </div>
            
            <div class="content">
              <p>Hello <strong>${adminName}</strong>,</p>
              
              <div class="expired-box">
                <h3>📅 Subscription Expired</h3>
                <p>We wanted to inform you that your ${subscriptionDetails.productName || 'Vetansutra'} subscription has expired, and your account has been temporarily deactivated.</p>
              </div>
              
              <div class="subscription-details">
                <h3>Subscription Details:</h3>
                <div class="detail-item">
                  <span class="detail-label">• Expired On:</span> ${subscriptionDetails.expiryDate || 'N/A'}
                </div>
              </div>
              
              <p>No data has been deleted—you can regain full access by renewing your subscription anytime.</p>
              
              <div style="text-align: center;">
                <a href="${subscriptionDetails.renewalLink || '#'}" class="reactivate-button">👉 Reactivate Account</a>
              </div>
              
              <p>If you need assistance or wish to discuss plans, just reply to this email.</p>
              
              <p>We look forward to serving you again.</p>
              
              <p>Sincerely,<br>
              <strong>Vetansutra Team</strong></p>
            </div>
            
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; 2024 Vetansutra. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Subscription expired email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending subscription expired email:', error);
    return { success: false, error: error.message };
  }
};

// Send staff letter email
const sendStaffLetterEmail = async (staffEmail, staffName, letterTitle, letterContent) => {
  try {
    console.log(`📧 Sending staff letter email to: ${staffEmail}`);
    console.log(`📧 Letter title: ${letterTitle}`);

    const mailOptions = {
      from: `"${emailFrom.name}" <${emailFrom.address}>`,
      to: staffEmail,
      subject: `${letterTitle} - Attached Document`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Document from ThinkTech Solutions</title>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f4f4f4;
            }
            .container {
              background-color: #ffffff;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              padding-bottom: 20px;
              border-bottom: 2px solid #125EC9;
            }
            .header h1 {
              color: #125EC9;
              margin: 0;
              font-size: 24px;
            }
            .content {
              padding: 30px 0;
            }
            .letter-box {
              background-color: #fff;
              padding: 30px;
              border: 1px solid #ddd;
              border-radius: 5px;
            }
            .footer {
              text-align: center;
              padding-top: 20px;
              border-top: 1px solid #eee;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Document Issued</h1>
            </div>
            
            <div class="content">
              <p>Dear <strong>${staffName}</strong>,</p>
              <p>A new document has been issued to you by your organization.</p>
              
              <div class="letter-box">
                ${letterContent}
              </div>
              
              <p>You can also view this document by logging into your staff portal.</p>
              
              <p>Best regards,<br>
              <strong>ThinkTech Solutions Team</strong></p>
            </div>
            
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Staff letter email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending staff letter email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  verifyEmailConfig,
  sendWelcomeEmail,
  sendAdminNotification,
  sendAdminSignupReviewEmail,
  sendAccountActivationEmail,
  sendSubscriptionExpiryReminderEmail,
  sendSubscriptionExpiredEmail,
  sendStaffLetterEmail,
  transporter,
  emailFrom
};
