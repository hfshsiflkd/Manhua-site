import ResetPasswordClient from "./components/ResetPasswordClient";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  const token = sp?.token ?? "";
  return <ResetPasswordClient token={token} />;
}
