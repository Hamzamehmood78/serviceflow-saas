// Abhi email service nahi judi (Phase 7 mein Brevo). Development mein link terminal mein print hota hai.
export const sendPasswordResetEmail = async (to, link) => {
  if (process.env.NODE_ENV === 'production') {
    console.warn('Email provider is not configured: password reset email was not sent.');
    return;
  }
  console.log('\n===== PASSWORD RESET (development only) =====');
  console.log(`To:   ${to}`);
  console.log(`Link: ${link}`);
  console.log('=============================================\n');
};
export const sendInvitationEmail = async ({ to, name, businessName, role, link }) => {
  if (process.env.NODE_ENV === 'production') {
    console.warn('Email provider is not configured: invitation email was not sent.');
    return;
  }
  console.log('\n===== TEAM INVITATION (development only) =====');
  console.log(`To:   ${to} (${name}, ${role} at ${businessName})`);
  console.log(`Link: ${link}`);
  console.log('==============================================\n');
};