// Одоохондоо зүгээр л консол дээр харуулна.
// Дараа нь SendGrid/Mailgun гэх мэт холбоно.
async function sendEmail({ to, subject, text }) {
  console.log("=== SEND EMAIL MOCK ===");
  console.log("To:", to);
  console.log("Subject:", subject);
  console.log("Text:", text);
  console.log("=======================");
}

module.exports = sendEmail;
