import ResetPasswordClient from "./components/ResetPasswordClient";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const sp = await searchParams;

  const token = sp?.token ?? "";
  const email = sp?.email ?? "";

  return <ResetPasswordClient token={token} email={email} />;
}
