// Email API Examples - JavaScript/Node.js
// Save this as email-api-examples.js and run with: node email-api-examples.js

const API_URL = 'https://humanityatheartintl.org/email-api.php';

// Helper function to send emails
async function sendEmail(emailData) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData)
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log('📧 To:', result.data.to);
      console.log('📄 Subject:', result.data.subject);
      console.log('🏷️ Type:', result.data.type);
      console.log('🕒 Timestamp:', result.data.timestamp);
    } else {
      console.log('❌ Failed to send email:', result.error);
    }

    return result;
  } catch (error) {
    console.error('🚨 Network error:', error.message);
    return { success: false, error: error.message };
  }
}

// Example 1: Send a test email
async function example1_testEmail() {
  console.log('\n📧 Example 1: Test Email');
  console.log('=' .repeat(40));

  const result = await sendEmail({
    to: 'your-email@example.com', // Replace with your email
    subject: 'API Test Email',
    type: 'test',
    message: 'This is a test email sent via the PiPilot Email API!'
  });
}

// Example 2: Send a welcome email
async function example2_welcomeEmail() {
  console.log('\n🎉 Example 2: Welcome Email');
  console.log('=' .repeat(40));

  const result = await sendEmail({
    to: 'newuser@example.com', // Replace with recipient email
    subject: 'Welcome to PiPilot!',
    type: 'welcome'
  });
}

// Example 3: Send a team invitation
async function example3_teamInvitation() {
  console.log('\n👥 Example 3: Team Invitation');
  console.log('=' .repeat(40));

  const result = await sendEmail({
    to: 'invitee@example.com', // Replace with invitee email
    subject: 'You\'re invited to join our team!',
    type: 'invitation',
    invitee_name: 'John Doe',
    organization_name: 'Acme Corporation',
    inviter_name: 'Jane Smith',
    accept_url: 'https://app.pixelpilot.dev/accept-invite/12345',
    role: 'developer'
  });
}

// Example 4: Send a marketing email
async function example4_marketingEmail() {
  console.log('\n📢 Example 4: Marketing Email');
  console.log('=' .repeat(40));

  const result = await sendEmail({
    to: 'subscriber@example.com', // Replace with subscriber email
    subject: 'Discover New Features in PiPilot',
    type: 'marketing',
    message: `
      <h1>Exciting New Features!</h1>
      <p>We're thrilled to announce our latest updates to PiPilot:</p>
      <ul>
        <li>🚀 AI-powered code generation</li>
        <li>🎨 Advanced design tools</li>
        <li>⚡ Performance improvements</li>
      </ul>
      <p><a href="https://pixelpilot.dev/features">Learn More</a></p>
    `
  });
}

// Example 5: Send a security alert
async function example5_securityAlert() {
  console.log('\n🔒 Example 5: Security Alert');
  console.log('=' .repeat(40));

  const result = await sendEmail({
    to: 'user@example.com', // Replace with user email
    subject: 'Security Alert: Unusual Login Activity',
    type: 'security'
  });
}

// Example 6: Send a billing notification
async function example6_billingNotification() {
  console.log('\n💳 Example 6: Billing Notification');
  console.log('=' .repeat(40));

  const result = await sendEmail({
    to: 'customer@example.com', // Replace with customer email
    subject: 'Payment Confirmation',
    type: 'billing'
  });
}

// Example 7: Send email with CC and BCC
async function example7_emailWithCC() {
  console.log('\n📨 Example 7: Email with CC/BCC');
  console.log('=' .repeat(40));

  const result = await sendEmail({
    to: 'primary@example.com', // Main recipient
    cc: 'cc@example.com',      // CC recipient
    bcc: 'bcc@example.com',    // BCC recipient (won't be visible to others)
    subject: 'Important Team Update',
    type: 'notification'
  });
}

// Example 8: Send a newsletter
async function example8_newsletter() {
  console.log('\n📰 Example 8: Newsletter');
  console.log('=' .repeat(40));

  const result = await sendEmail({
    to: 'subscriber@example.com', // Replace with subscriber email
    subject: 'Monthly Newsletter: AI Coding Trends',
    type: 'newsletter'
  });
}

// Example 9: Send a feature announcement
async function example9_featureAnnouncement() {
  console.log('\n✨ Example 9: Feature Announcement');
  console.log('=' .repeat(40));

  const result = await sendEmail({
    to: 'user@example.com', // Replace with user email
    subject: 'New Feature: AI Code Review Assistant',
    type: 'feature'
  });
}

// Example 10: Send a support response
async function example10_supportResponse() {
  console.log('\n🆘 Example 10: Support Response');
  console.log('=' .repeat(40));

  const result = await sendEmail({
    to: 'customer@example.com', // Replace with customer email
    subject: 'Support Ticket #12345 - Update',
    type: 'support'
  });
}

// Run all examples (uncomment the ones you want to test)
// Note: Replace email addresses with real ones before running

async function runAllExamples() {
  console.log('🚀 PiPilot Email API Examples');
  console.log('=' .repeat(50));
  console.log('⚠️  IMPORTANT: Replace email addresses with real ones before running!');
  console.log('=' .repeat(50));

  // Uncomment examples you want to test
  // await example1_testEmail();
  // await example2_welcomeEmail();
  // await example3_teamInvitation();
  // await example4_marketingEmail();
  // await example5_securityAlert();
  // await example6_billingNotification();
  // await example7_emailWithCC();
  // await example8_newsletter();
  // await example9_featureAnnouncement();
  // await example10_supportResponse();

  console.log('\n✨ All examples completed!');
}

// If running this file directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}

module.exports = {
  sendEmail,
  runAllExamples
};