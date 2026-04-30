"use client";

import { useState, useEffect } from "react";
import AdminShell from "@/app/admin/components/AdminShell";
import {
  adminGetVipSettings,
  adminUpdateVipSettings,
  adminGetFreeReadMode,
  adminSetFreeReadMode,
  type VipPlanSetting,
  type VipPaymentSetting,
} from "@/lib/api";

export default function AdminVipSettingsPage() {
  const [plans, setPlans] = useState<VipPlanSetting[]>([]);
  const [payment, setPayment] = useState<VipPaymentSetting>({
    bankName: "",
    accountName: "",
    accountNumber: "",
    note: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Free read mode state
  const [freeReadEnabled, setFreeReadEnabled] = useState(false);
  const [freeReadExpiresAt, setFreeReadExpiresAt] = useState<string>("");
  const [freeReadSaving, setFreeReadSaving] = useState(false);
  const [freeReadSuccess, setFreeReadSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, freeRead] = await Promise.all([
        adminGetVipSettings(),
        adminGetFreeReadMode(),
      ]);
      setPlans(data.plans || []);
      setPayment(data.payment || {
        bankName: "",
        accountName: "",
        accountNumber: "",
        note: "",
      });
      setFreeReadEnabled(freeRead.enabled);
      setFreeReadExpiresAt(
        freeRead.expiresAt ? freeRead.expiresAt.slice(0, 16) : ""
      );
    } catch (err: any) {
      console.error("Failed to load VIP settings:", err);
      setError(err?.response?.data?.message || "VIP тохиргоо ачаалж чадсангүй.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    // Validate plans
    if (plans.length !== 3) {
      setError("Яг 3 төлөвлөгөө байх ёстой.");
      setSaving(false);
      return;
    }

    for (let i = 0; i < plans.length; i++) {
      const p = plans[i];
      if (!p.key.trim() || !p.title.trim()) {
        setError(`Төлөвлөгөө ${i + 1}: Key болон нэр шаардлагатай.`);
        setSaving(false);
        return;
      }
      if (!p.priceMnt || p.priceMnt <= 0) {
        setError(`Төлөвлөгөө ${i + 1}: Үнэ 0-ээс их байх ёстой.`);
        setSaving(false);
        return;
      }
      if (!p.durationDays || p.durationDays <= 0) {
        setError(`Төлөвлөгөө ${i + 1}: Хугацаа 0-ээс их байх ёстой.`);
        setSaving(false);
        return;
      }
    }

    // Validate payment
    if (!payment.accountNumber.trim()) {
      setError("Дансны дугаар шаардлагатай.");
      setSaving(false);
      return;
    }

    try {

      await adminUpdateVipSettings({ plans, payment });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error("Failed to save VIP settings:", err);
      setError(
        err?.response?.data?.message || "VIP тохиргоо хадгалахад алдаа гарлаа."
      );
    } finally {
      setSaving(false);
    }
  };

  const updatePlan = (index: number, updates: Partial<VipPlanSetting>) => {
    setPlans((prev) => {
      const newPlans = [...prev];
      newPlans[index] = { ...newPlans[index], ...updates };
      return newPlans;
    });
  };

  const updateFeature = (planIndex: number, featureIndex: number, value: string) => {
    setPlans((prev) => {
      const newPlans = [...prev];
      const newFeatures = [...newPlans[planIndex].features];
      newFeatures[featureIndex] = value;
      newPlans[planIndex] = { ...newPlans[planIndex], features: newFeatures };
      return newPlans;
    });
  };

  const addFeature = (planIndex: number) => {
    setPlans((prev) => {
      const newPlans = [...prev];
      newPlans[planIndex] = {
        ...newPlans[planIndex],
        features: [...newPlans[planIndex].features, ""],
      };
      return newPlans;
    });
  };

  const removeFeature = (planIndex: number, featureIndex: number) => {
    setPlans((prev) => {
      const newPlans = [...prev];
      const newFeatures = newPlans[planIndex].features.filter(
        (_, i) => i !== featureIndex
      );
      newPlans[planIndex] = { ...newPlans[planIndex], features: newFeatures };
      return newPlans;
    });
  };

  const handleFreeReadSave = async () => {
    try {
      setFreeReadSaving(true);
      setError(null);
      await adminSetFreeReadMode({
        enabled: freeReadEnabled,
        expiresAt: freeReadExpiresAt ? new Date(freeReadExpiresAt).toISOString() : null,
      });
      setFreeReadSuccess(true);
      setTimeout(() => setFreeReadSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Үнэгүй унших горим хадгалахад алдаа гарлаа.");
    } finally {
      setFreeReadSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminShell
        title="VIP Тохиргоо"
        subtitle="VIP төлөвлөгөө болон төлбөрийн мэдээллийг удирдах"
      >
        <div className="flex min-h-[60vh] items-center justify-center text-[13px]" style={{ color: "var(--arc-muted)" }}>
          Ачаалж байна...
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="VIP Тохиргоо"
      subtitle="VIP төлөвлөгөө болон төлбөрийн мэдээллийг удирдах"
    >
      <div className="space-y-6">
        {/* Success/Error Messages */}
        {success && (
          <div className="rounded-[9px] px-4 py-3 text-[13px]" style={{ border: "1px solid oklch(0.75 0.17 145/.4)", background: "oklch(0.75 0.17 145/.08)", color: "oklch(0.8 0.14 145)" }}>
            VIP тохиргоо амжилттай хадгалагдлаа.
          </div>
        )}
        {error && (
          <div className="rounded-[9px] px-4 py-3 text-[13px]" style={{ border: "1px solid oklch(0.65 0.22 15/.3)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)" }}>
            {error}
          </div>
        )}

        {/* Free Read Mode */}
        <section className="rounded-[14px] p-6" style={{ border: "1px solid oklch(0.82 0.16 85/.3)", background: "var(--arc-card)" }}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-bold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>
                Үнэгүй унших горим
              </h3>
              <p className="mt-0.5 text-[12px]" style={{ color: "var(--arc-muted)" }}>
                Идэвхжүүлсэн үед бүх хэрэглэгч VIP байлгүйгээр унших боломжтой болно.
              </p>
            </div>
            <button
              onClick={() => setFreeReadEnabled((v) => !v)}
              className="relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
              style={{ background: freeReadEnabled ? "var(--arc-amber)" : "var(--arc-border)" }}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full shadow ring-0 transition duration-200 ${freeReadEnabled ? "translate-x-5" : "translate-x-0"}`}
                style={{ background: "#f0f0f5" }}
              />
            </button>
          </div>

          {freeReadEnabled && (
            <div className="mt-4">
              <label className="mb-1.5 block text-[11px] font-medium" style={{ color: "var(--arc-muted)" }}>
                Дуусах огноо (сонголттой — хоосон бол хугацаагүй)
              </label>
              <input type="datetime-local" value={freeReadExpiresAt} onChange={(e) => setFreeReadExpiresAt(e.target.value)}
                className="rounded-[9px] px-3 py-2 text-[13px] outline-none"
                style={{ border: "1px solid oklch(0.82 0.16 85/.4)", background: "var(--arc-elevated)", color: "var(--arc-text)" }} />
            </div>
          )}

          {freeReadSuccess && (
            <p className="mt-3 text-[11px]" style={{ color: "oklch(0.8 0.14 145)" }}>Амжилттай хадгалагдлаа.</p>
          )}

          <div className="mt-4 flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
              style={freeReadEnabled
                ? { border: "1px solid oklch(0.82 0.16 85/.3)", background: "oklch(0.82 0.16 85/.08)", color: "var(--arc-amber)" }
                : { border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)" }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: freeReadEnabled ? "var(--arc-amber)" : "var(--arc-muted)" }} />
              {freeReadEnabled ? "Идэвхтэй" : "Идэвхгүй"}
            </div>
            <button onClick={handleFreeReadSave} disabled={freeReadSaving}
              className="rounded-[9px] px-4 py-1.5 text-[12px] font-semibold transition-all hover:brightness-110 disabled:opacity-50"
              style={{ background: "var(--arc-amber)", color: "#07070e", border: "none", cursor: "pointer" }}>
              {freeReadSaving ? "Хадгалж байна..." : "Хадгалах"}
            </button>
          </div>
        </section>

        {/* Payment Settings */}
        <section className="rounded-[14px] p-6" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
          <h3 className="mb-4 text-[15px] font-bold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>
            Төлбөрийн мэдээлэл
          </h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium" style={{ color: "var(--arc-muted)" }}>
                Банкны нэр
              </label>
              <input
                type="text"
                value={payment.bankName}
                onChange={(e) =>
                  setPayment({ ...payment, bankName: e.target.value })
                }
                className="w-full rounded-[9px] px-3 py-2 text-[13px] outline-none" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-text)" }}
                placeholder="Жишээ: ХААН Банк"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium" style={{ color: "var(--arc-muted)" }}>
                Дансны нэр
              </label>
              <input
                type="text"
                value={payment.accountName}
                onChange={(e) =>
                  setPayment({ ...payment, accountName: e.target.value })
                }
                className="w-full rounded-[9px] px-3 py-2 text-[13px] outline-none" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-text)" }}
                placeholder="Жишээ: МАНХУА ПЛАТФОРМ"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium" style={{ color: "var(--arc-muted)" }}>
                Дансны дугаар <span style={{ color: "var(--arc-rose)" }}>*</span>
              </label>
              <input
                type="text"
                value={payment.accountNumber}
                onChange={(e) =>
                  setPayment({ ...payment, accountNumber: e.target.value })
                }
                className="w-full rounded-[9px] px-3 py-2 text-[13px] outline-none font-mono" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-text)" }}
                placeholder="XXXX-XXXX-XXXX"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium" style={{ color: "var(--arc-muted)" }}>
                Тэмдэглэл (сонголттой)
              </label>
              <textarea
                value={payment.note}
                onChange={(e) => setPayment({ ...payment, note: e.target.value })}
                rows={2}
                className="w-full rounded-[9px] px-3 py-2 text-[13px] outline-none" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-text)" }}
                placeholder="Жишээ: Хуулга/гүйлгээ хийсний дараа админ баталгаажуулна."
              />
            </div>
          </div>
        </section>

        {/* Plans Settings */}
        <section className="rounded-[14px] p-6" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
          <h3 className="mb-4 text-[15px] font-bold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>
            VIP Төлөвлөгөө (3 төлөвлөгөө)
          </h3>
          <div className="space-y-6">
            {plans.map((plan, planIndex) => (
              <div key={planIndex} className="rounded-[12px] p-4" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}>
                <h4 className="text-[13px] font-semibold mb-4" style={{ color: "var(--arc-text)" }}>Төлөвлөгөө {planIndex + 1}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: "Key (Plan Code)", key: "key" as const, type: "text", placeholder: "Жишээ: 1M, 3M, 6M", mono: true, required: true },
                    { label: "Нэр", key: "title" as const, type: "text", placeholder: "Жишээ: ACCESS 1", required: true },
                    { label: "Үнэ (MNT)", key: "priceMnt" as const, type: "number", required: true },
                    { label: "Хугацаа (өдөр)", key: "durationDays" as const, type: "number", required: true },
                    { label: "Badge Label (сонголттой)", key: "badgeLabel" as const, type: "text", placeholder: "Жишээ: Supporter, Founder" },
                  ].map(({ label, key, type, placeholder, mono, required }) => (
                    <div key={key}>
                      <label className="mb-1.5 block text-[11px] font-medium" style={{ color: "var(--arc-muted)" }}>
                        {label}{required && <span style={{ color: "var(--arc-rose)" }}>*</span>}
                      </label>
                      <input
                        type={type}
                        value={(plan[key] as string | number) ?? ""}
                        onChange={(e) => updatePlan(planIndex, { [key]: type === "number" ? (parseInt(e.target.value) || 0) : (e.target.value || (key === "badgeLabel" ? null : e.target.value)) } as any)}
                        className={`w-full rounded-[9px] px-3 py-2 text-[12px] outline-none${mono ? " font-mono" : ""}`}
                        style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)", color: "var(--arc-text)" }}
                        placeholder={placeholder}
                        required={required}
                      />
                    </div>
                  ))}
                  <div>
                    <label className="mb-1.5 flex items-center gap-2 text-[11px] font-medium" style={{ color: "var(--arc-muted)" }}>
                      <input type="checkbox" checked={plan.isHighlighted} onChange={(e) => updatePlan(planIndex, { isHighlighted: e.target.checked })} className="h-4 w-4 accent-cyan-500" />
                      Most Popular (Highlight)
                    </label>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="mb-2 block text-[11px] font-medium" style={{ color: "var(--arc-muted)" }}>Онцлогууд</label>
                  <div className="space-y-2">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center gap-2">
                        <input type="text" value={feature} onChange={(e) => updateFeature(planIndex, featureIndex, e.target.value)}
                          className="flex-1 rounded-[9px] px-3 py-1.5 text-[12px] outline-none"
                          style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)", color: "var(--arc-text)" }}
                          placeholder="Онцлог" />
                        <button onClick={() => removeFeature(planIndex, featureIndex)}
                          className="rounded-[7px] px-2 py-1.5 text-[11px] transition-colors"
                          style={{ border: "1px solid oklch(0.65 0.22 15/.3)", background: "oklch(0.65 0.22 15/.08)", color: "oklch(0.85 0.12 15)", cursor: "pointer" }}>
                          Устгах
                        </button>
                      </div>
                    ))}
                    <button onClick={() => addFeature(planIndex)}
                      className="rounded-[7px] px-3 py-1.5 text-[11px] transition-colors"
                      style={{ border: "1px solid var(--arc-border)", background: "transparent", color: "var(--arc-dim)", cursor: "pointer" }}>
                      + Онцлог нэмэх
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving}
            className="rounded-[9px] px-6 py-2.5 text-[13px] font-semibold transition-all hover:brightness-110 disabled:opacity-50"
            style={{ background: "var(--arc-cyan)", color: "#07070e", border: "none", cursor: "pointer" }}>
            {saving ? "Хадгалж байна..." : "Хадгалах"}
          </button>
        </div>
      </div>
    </AdminShell>
  );
}

