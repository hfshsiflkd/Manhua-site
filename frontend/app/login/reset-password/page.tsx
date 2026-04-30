export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--arc-bg)" }}>
      <div
        className="max-w-md w-full space-y-4 rounded-[16px] p-6 shadow-xl"
        style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
      >
        <h1 className="text-[17px] font-semibold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>
          Reset Password
        </h1>
        <p className="text-[13px]" style={{ color: "var(--arc-dim)" }}>
          This page is under construction. Please use the password reset flow from the main login page or contact support.
        </p>
      </div>
    </div>
  );
}
