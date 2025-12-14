// app/login/reset-password/page.tsx
import ResetPasswordClient from "./components/ResetPasswordClient";

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams?.token ?? "";
  return <ResetPasswordClient token={token} />;
}
