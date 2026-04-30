"use client";

import { useState, useEffect } from "react";
import AdminShell from "@/app/admin/components/AdminShell";
import {
  adminGetVipSettings,
  adminUpdateVipSettings,
  adminGetFreeReadMode,
  adminSetFreeReadMode,
  adminGetTrialSettings,
  adminUpdateTrialSettings,
  type VipPlanSetting,
  type VipPaymentSetting,
  type TrialSettings,
} from "@/lib/api";

/* ─── small helpers ────────────────────────────────────────────────────── */
const inputCls = "w-full rounded-[9px] px-3 py-2 text-[13px] outline-none";
const inputStyle = {
  border: "1px solid var(--arc-border)",
  background: "var(--arc-elevated)",
  color: "var(--arc-text)",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontFamily: "var(--font-head,'Space Grotesk',sans-serif)",
        fontSize: 15,
        fontWeight: 700,
        color: "var(--arc-text)",
        marginBottom: 16,
      }}
    >
      {children}
    </h3>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label
      style={{
        display: "block",
        fontSize: 11,
        fontWeight: 500,
        color: "var(--arc-muted)",
        marginBottom: 6,
      }}
    >
      {children}
      {required && <span style={{ color: "var(--arc-rose)" }}> *</span>}
    </label>
  );
}

/* ─── page ─────────────────────────────────────────────────────────────── */
export default function AdminVipSettingsPage() {
  /* VIP plans */
  const [plans, setPlans] = useState<VipPlanSetting[]>([]);
  /* Payment */
  const [payment, setPayment] = useState<VipPaymentSetting>({
    bankName: "",
    accountName: "",
    accountNumber: "",
    note: "",
  });
  /* Free read */
  const [freeReadEnabled, setFreeReadEnabled] = useState(false);
  const [freeReadExpiresAt, setFreeReadExpiresAt] = useState("");
  /* Trial */
  const [trial, setTrial] = useState<TrialSettings>({ enabled: true, days: 3 });

  /* ui state */
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /* ── load ── */
  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [vip, freeRead, trialRes] = await Promise.all([
        adminGetVipSettings(),
        adminGetFreeReadMode(),
        adminGetTrialSettings(),
      ]);
      setPlans(vip.plans || []);
      setPayment(
        vip.payment || { bankName: "", accountName: "", accountNumber: "", note: "" }
      );
      setFreeReadEnabled(freeRead.enabled);
      setFreeReadExpiresAt(freeRead.expiresAt ? freeRead.expiresAt.slice(0, 16) : "");
      setTrial(trialRes);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Тохиргоо ачаалж чадсангүй.");
    } finally {
      setLoading(false);
    }
  }

  /* ── save all ── */
  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    /* Validate plans */
    if (plans.length !== 3) {
      setError("Яг 3 төлөвлөгөө байх ёстой.");
      setSaving(false);
      return;
    }
    for (let i = 0; i < plans.length; i++) {
      const p = plans[i];
      if (!p.key?.trim() || !p.title?.trim()) {
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
    if (!payment.accountNumber?.trim()) {
      setError("Дансны дугаар шаардлагатай.");
      setSaving(false);
      return;
    }

    try {
      await Promise.all([
        adminUpdateVipSettings({ plans, payment }),
        adminSetFreeReadMode({
          enabled: freeReadEnabled,
          expiresAt: freeReadExpiresAt ? new Date(freeReadExpiresAt).toISOString() : null,
        }),
        adminUpdateTrialSettings(trial),
      ]);
      setSuccess("Бүх тохиргоо амжилттай хадгалагдлаа.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Хадгалахад алдаа гарлаа.");
    } finally {
      setSaving(false);
    }
  }

  /* ── plan helpers ── */
  const updatePlan = (i: number, upd: Partial<VipPlanSetting>) =>
    setPlans((p) => {
      const next = [...p];
      next[i] = { ...next[i], ...upd };
      return next;
    });

  const updateFeature = (pi: number, fi: number, v: string) =>
    setPlans((p) => {
      const next = [...p];
      const feats = [...next[pi].features];
      feats[fi] = v;
      next[pi] = { ...next[pi], features: feats };
      return next;
    });

  const addFeature = (pi: number) =>
    setPlans((p) => {
      const next = [...p];
      next[pi] = { ...next[pi], features: [...next[pi].features, ""] };
      return next;
    });

  const removeFeature = (pi: number, fi: number) =>
    setPlans((p) => {
      const next = [...p];
      next[pi] = {
        ...next[pi],
        features: next[pi].features.filter((_, idx) => idx !== fi),
      };
      return next;
    });

  /* ── loading state ── */
  if (loading) {
    return (
      <AdminShell title="VIP Тохиргоо" subtitle="VIP, trial, төлбөрийн бүх тохиргоо">
        <div
          className="flex min-h-[60vh] items-center justify-center text-[13px]"
          style={{ color: "var(--arc-muted)" }}
        >
          Ачаалж байна...
        </div>
      </AdminShell>
    );
  }

  /* ── render ── */
  return (
    <AdminShell title="VIP Тохиргоо" subtitle="VIP, trial, төлбөрийн бүх тохиргоо">
      <div style={{ maxWidth: 1460 , display: "flex", flexDirection: "column", gap: 20, }}>
        {/* Feedback banners */}
        {success && (
          <div
            className="rounded-[9px] px-4 py-3 text-[13px]"
            style={{
              border: "1px solid oklch(0.75 0.17 145/.4)",
              background: "oklch(0.75 0.17 145/.08)",
              color: "oklch(0.8 0.14 145)",
            }}
          >
            ✓ {success}
          </div>
        )}
        {error && (
          <div
            className="rounded-[9px] px-4 py-3 text-[13px]"
            style={{
              border: "1px solid oklch(0.65 0.22 15/.3)",
              background: "oklch(0.65 0.22 15/.08)",
              color: "oklch(0.85 0.12 15)",
            }}
          >
            {error}
          </div>
        )}

        {/* ── 1. Free Read Mode ── */}
        <section
          className="rounded-[14px] p-6"
          style={{ border: "1px solid oklch(0.82 0.16 85/.3)", background: "var(--arc-card)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <SectionTitle>Үнэгүй унших горим</SectionTitle>
              <p style={{ fontSize: 12, color: "var(--arc-muted)", marginTop: -12 }}>
                Идэвхжүүлсэн үед бүх хэрэглэгч VIP байлгүйгээр унших боломжтой болно.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFreeReadEnabled((v) => !v)}
              className="relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200"
              style={{ background: freeReadEnabled ? "var(--arc-amber)" : "var(--arc-border)" }}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full shadow transition duration-200 ${freeReadEnabled ? "translate-x-5" : "translate-x-0"}`}
                style={{ background: "#f0f0f5" }}
              />
            </button>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
              style={
                freeReadEnabled
                  ? {
                      border: "1px solid oklch(0.82 0.16 85/.3)",
                      background: "oklch(0.82 0.16 85/.08)",
                      color: "var(--arc-amber)",
                    }
                  : {
                      border: "1px solid var(--arc-border)",
                      background: "var(--arc-elevated)",
                      color: "var(--arc-dim)",
                    }
              }
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  background: freeReadEnabled ? "var(--arc-amber)" : "var(--arc-muted)",
                }}
              />
              {freeReadEnabled ? "Идэвхтэй" : "Идэвхгүй"}
            </div>
          </div>
          {freeReadEnabled && (
            <div>
              <Label>Дуусах огноо (сонголттой — хоосон бол хугацаагүй)</Label>
              <input
                type="datetime-local"
                value={freeReadExpiresAt}
                onChange={(e) => setFreeReadExpiresAt(e.target.value)}
                className="rounded-[9px] px-3 py-2 text-[13px] outline-none"
                style={{
                  border: "1px solid oklch(0.82 0.16 85/.4)",
                  background: "var(--arc-elevated)",
                  color: "var(--arc-text)",
                }}
              />
            </div>
          )}
        </section>

        {/* ── 2. Trial тохиргоо ── */}
        <section
          className="rounded-[14px] p-6"
          style={{ border: "1px solid oklch(0.72 0.17 195/.25)", background: "var(--arc-card)" }}
        >
          <SectionTitle>Trial тохиргоо</SectionTitle>
          <p style={{ fontSize: 12, color: "var(--arc-muted)", marginTop: -12, marginBottom: 16 }}>
            Шинэ хэрэглэгчид автоматаар VIP trial олгох эсэх болон хугацааг тохируулна.
          </p>
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            {/* Enabled toggle */}
            <div
              className="rounded-[12px] p-4"
              style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: 12, color: "var(--arc-muted)" }}>Trial идэвхтэй</span>
                <button
                  type="button"
                  onClick={() => setTrial((t) => ({ ...t, enabled: !t.enabled }))}
                  className="relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200"
                  style={{ background: trial.enabled ? "var(--arc-cyan)" : "var(--arc-border)" }}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full shadow transition duration-200 ${trial.enabled ? "translate-x-4" : "translate-x-0"}`}
                    style={{ background: "#f0f0f5" }}
                  />
                </button>
              </div>
              <p style={{ fontSize: 11, color: "var(--arc-muted)" }}>
                Идэвхтэй бол шинэ бүртгэлд автоматаар VIP олгоно.
              </p>
            </div>

            {/* Days input */}
            <div
              className="rounded-[12px] p-4"
              style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}
            >
              <Label>Trial хугацаа (өдөр)</Label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={trial.days}
                  onChange={(e) =>
                    setTrial((t) => ({ ...t, days: Math.min(30, Math.max(0, Number(e.target.value))) }))
                  }
                  className="rounded-[7px] px-2 py-1.5 text-[13px] outline-none"
                  style={{
                    width: 80,
                    border: "1px solid var(--arc-border)",
                    background: "var(--arc-card)",
                    color: "var(--arc-text)",
                  }}
                />
                <span style={{ fontSize: 12, color: "var(--arc-muted)" }}>хоног (0–30)</span>
              </div>
              <p style={{ fontSize: 11, color: "var(--arc-muted)", marginTop: 6 }}>
                0 бол trial олгохгүй (enabled байсан ч).
              </p>
            </div>

            {/* Info */}
            <div
              className="rounded-[12px] p-4"
              style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}
            >
              <p style={{ fontSize: 12, color: "var(--arc-muted)", marginBottom: 4 }}>Тайлбар</p>
              <p style={{ fontSize: 11, color: "var(--arc-muted)", lineHeight: 1.6 }}>
                Trial нь{" "}
                <span style={{ color: "var(--arc-text)" }}>нэг төхөөрөмж дээр 1 удаа</span>{" "}
                олгогдоно.{" "}
                <span style={{ color: "var(--arc-dim)" }}>(deviceId-р хянагдана)</span>
              </p>
            </div>
          </div>
        </section>

        {/* ── 3. Төлбөрийн мэдээлэл ── */}
        <section
          className="rounded-[14px] p-6"
          style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
        >
          <SectionTitle>Төлбөрийн мэдээлэл</SectionTitle>
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            <div>
              <Label>Банкны нэр</Label>
              <input
                type="text"
                value={payment.bankName}
                onChange={(e) => setPayment({ ...payment, bankName: e.target.value })}
                className={inputCls}
                style={inputStyle}
                placeholder="Жишээ: ХААН Банк"
              />
            </div>
            <div>
              <Label>Дансны нэр</Label>
              <input
                type="text"
                value={payment.accountName}
                onChange={(e) => setPayment({ ...payment, accountName: e.target.value })}
                className={inputCls}
                style={inputStyle}
                placeholder="Жишээ: МАНХУА ПЛАТФОРМ"
              />
            </div>
            <div>
              <Label required>Дансны дугаар</Label>
              <input
                type="text"
                value={payment.accountNumber}
                onChange={(e) => setPayment({ ...payment, accountNumber: e.target.value })}
                className={`${inputCls} font-mono`}
                style={inputStyle}
                placeholder="XXXX-XXXX-XXXX"
              />
            </div>
            <div>
              <Label>QPay / лого зураг URL (сонголттой)</Label>
              <input
                type="text"
                value={payment.qpayUrl || ""}
                onChange={(e) => setPayment({ ...payment, qpayUrl: e.target.value })}
                className={inputCls}
                style={inputStyle}
                placeholder="https://qpay.mn/..."
              />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <Label>Тэмдэглэл / заавар (сонголттой)</Label>
            <textarea
              value={payment.note}
              onChange={(e) => setPayment({ ...payment, note: e.target.value })}
              rows={3}
              className={inputCls}
              style={{ ...inputStyle, resize: "vertical" }}
              placeholder="Жишээ: Хуулга/гүйлгээ хийсний дараа админ баталгаажуулна."
            />
          </div>
        </section>

        {/* ── 4. VIP Төлөвлөгөө ── */}
        <section
          className="rounded-[14px] p-6"
          style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
        >
          <SectionTitle>VIP Төлөвлөгөө (3 төлөвлөгөө)</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {plans.map((plan, pi) => (
              <div
                key={pi}
                className="rounded-[12px] p-4"
                style={{
                  border: plan.isHighlighted
                    ? "1px solid oklch(0.72 0.17 195/.35)"
                    : "1px solid var(--arc-border)",
                  background: "var(--arc-elevated)",
                }}
              >
                <div
                  className="flex items-center justify-between mb-4"
                >
                  <h4
                    style={{
                      fontFamily: "var(--font-head,'Space Grotesk',sans-serif)",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--arc-text)",
                    }}
                  >
                    Төлөвлөгөө {pi + 1}
                    {plan.isHighlighted && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: "oklch(0.72 0.17 195/.15)",
                          color: "var(--arc-cyan)",
                          border: "1px solid oklch(0.72 0.17 195/.3)",
                        }}
                      >
                        Most Popular
                      </span>
                    )}
                  </h4>
                  <label
                    style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--arc-muted)", cursor: "pointer" }}
                  >
                    <input
                      type="checkbox"
                      checked={plan.isHighlighted}
                      onChange={(e) => updatePlan(pi, { isHighlighted: e.target.checked })}
                      className="h-4 w-4 accent-cyan-500"
                    />
                    Highlight
                  </label>
                </div>

                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
                >
                  {(
                    [
                      { label: "Key", field: "key", placeholder: "1M / 3M / 6M", mono: true, req: true, type: "" },
                      { label: "Нэр", field: "title", placeholder: "ACCESS 1", req: true, mono: false, type: "" },
                      { label: "Үнэ (₮)", field: "priceMnt", type: "number", placeholder: "6000", req: true, mono: false },
                      { label: "Хугацаа (өдөр)", field: "durationDays", type: "number", placeholder: "30", req: true, mono: false },
                      { label: "Badge label", field: "badgeLabel", placeholder: "Supporter / Founder", mono: false, req: false, type: "" },
                    ] as Array<{ label: string; field: string; placeholder: string; mono: boolean; req: boolean; type: string }>
                  ).map(({ label, field, type, placeholder, mono, req }) => (
                    <div key={field}>
                      <Label required={req}>{label}</Label>
                      <input
                        type={type || "text"}
                        value={(plan[field as keyof VipPlanSetting] as any) ?? ""}
                        onChange={(e) =>
                          updatePlan(pi, {
                            [field]: type === "number"
                              ? parseInt(e.target.value) || 0
                              : e.target.value || (field === "badgeLabel" ? null : ""),
                          } as any)
                        }
                        className={`w-full rounded-[9px] px-3 py-2 text-[12px] outline-none${mono ? " font-mono" : ""}`}
                        style={{
                          border: "1px solid var(--arc-border)",
                          background: "var(--arc-card)",
                          color: "var(--arc-text)",
                        }}
                        placeholder={placeholder}
                      />
                    </div>
                  ))}
                </div>

                {/* Features */}
                <div style={{ marginTop: 14 }}>
                  <Label>Онцлогууд</Label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {plan.features.map((feat, fi) => (
                      <div key={fi} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={feat}
                          onChange={(e) => updateFeature(pi, fi, e.target.value)}
                          className="flex-1 rounded-[9px] px-3 py-1.5 text-[12px] outline-none"
                          style={{
                            border: "1px solid var(--arc-border)",
                            background: "var(--arc-card)",
                            color: "var(--arc-text)",
                          }}
                          placeholder="Онцлог"
                        />
                        <button
                          type="button"
                          onClick={() => removeFeature(pi, fi)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 7,
                            border: "1px solid oklch(0.65 0.22 15/.3)",
                            background: "oklch(0.65 0.22 15/.08)",
                            color: "oklch(0.85 0.12 15)",
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          Устгах
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addFeature(pi)}
                      style={{
                        alignSelf: "flex-start",
                        padding: "4px 12px",
                        borderRadius: 7,
                        border: "1px solid var(--arc-border)",
                        background: "transparent",
                        color: "var(--arc-dim)",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      + Онцлог нэмэх
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Save button ── */}
        <div className="flex items-center justify-end gap-3 pb-4">
          <span style={{ fontSize: 11, color: "var(--arc-muted)" }}>
            Бүх тохиргоог нэгэн зэрэг хадгална.
          </span>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "10px 28px",
              borderRadius: 10,
              background: saving ? "var(--arc-elevated)" : "var(--arc-cyan)",
              color: saving ? "var(--arc-dim)" : "#07070e",
              border: "none",
              fontSize: 13,
              fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "var(--font-head,'Space Grotesk',sans-serif)",
              transition: "background .15s",
            }}
          >
            {saving ? "Хадгалж байна..." : "Хадгалах"}
          </button>
        </div>
      </div>
    </AdminShell>
  );
}
