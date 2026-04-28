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
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">
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
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            VIP тохиргоо амжилттай хадгалагдлаа.
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Free Read Mode */}
        <section className="rounded-2xl border border-amber-500/30 bg-slate-950/85 p-6 shadow-md shadow-black/40">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-50">
                Үнэгүй унших горим
              </h3>
              <p className="mt-0.5 text-xs text-slate-400">
                Идэвхжүүлсэн үед бүх хэрэглэгч VIP байлгүйгээр унших боломжтой болно.
              </p>
            </div>
            <button
              onClick={() => setFreeReadEnabled((v) => !v)}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                freeReadEnabled ? "bg-amber-500" : "bg-slate-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                  freeReadEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {freeReadEnabled && (
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-slate-300">
                Дуусах огноо (сонголттой — хоосон бол хугацаагүй)
              </label>
              <input
                type="datetime-local"
                value={freeReadExpiresAt}
                onChange={(e) => setFreeReadExpiresAt(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
          )}

          {freeReadSuccess && (
            <p className="mt-3 text-xs text-emerald-400">Амжилттай хадгалагдлаа.</p>
          )}

          <div className="mt-4 flex items-center gap-3">
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              freeReadEnabled
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${freeReadEnabled ? "bg-amber-400" : "bg-slate-500"}`} />
              {freeReadEnabled ? "Идэвхтэй" : "Идэвхгүй"}
            </div>
            <button
              onClick={handleFreeReadSave}
              disabled={freeReadSaving}
              className="rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {freeReadSaving ? "Хадгалж байна..." : "Хадгалах"}
            </button>
          </div>
        </section>

        {/* Payment Settings */}
        <section className="rounded-2xl border border-slate-800/80 bg-slate-950/85 p-6 shadow-md shadow-black/40">
          <h3 className="mb-4 text-base font-semibold text-slate-50">
            Төлбөрийн мэдээлэл
          </h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">
                Банкны нэр
              </label>
              <input
                type="text"
                value={payment.bankName}
                onChange={(e) =>
                  setPayment({ ...payment, bankName: e.target.value })
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                placeholder="Жишээ: ХААН Банк"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">
                Дансны нэр
              </label>
              <input
                type="text"
                value={payment.accountName}
                onChange={(e) =>
                  setPayment({ ...payment, accountName: e.target.value })
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                placeholder="Жишээ: МАНХУА ПЛАТФОРМ"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">
                Дансны дугаар <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={payment.accountNumber}
                onChange={(e) =>
                  setPayment({ ...payment, accountNumber: e.target.value })
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none font-mono"
                placeholder="XXXX-XXXX-XXXX"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">
                Тэмдэглэл (сонголттой)
              </label>
              <textarea
                value={payment.note}
                onChange={(e) => setPayment({ ...payment, note: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                placeholder="Жишээ: Хуулга/гүйлгээ хийсний дараа админ баталгаажуулна."
              />
            </div>
          </div>
        </section>

        {/* Plans Settings */}
        <section className="rounded-2xl border border-slate-800/80 bg-slate-950/85 p-6 shadow-md shadow-black/40">
          <h3 className="mb-4 text-base font-semibold text-slate-50">
            VIP Төлөвлөгөө (3 төлөвлөгөө)
          </h3>
          <div className="space-y-6">
            {plans.map((plan, planIndex) => (
              <div
                key={planIndex}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-200">
                    Төлөвлөгөө {planIndex + 1}
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-300">
                      Key (Plan Code) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={plan.key}
                      onChange={(e) =>
                        updatePlan(planIndex, { key: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none font-mono"
                      placeholder="Жишээ: 1M, 3M, 6M"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-300">
                      Нэр <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={plan.title}
                      onChange={(e) =>
                        updatePlan(planIndex, { title: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                      placeholder="Жишээ: ACCESS 1"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-300">
                      Үнэ (MNT) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={plan.priceMnt}
                      onChange={(e) =>
                        updatePlan(planIndex, {
                          priceMnt: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-300">
                      Хугацаа (өдөр) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={plan.durationDays}
                      onChange={(e) =>
                        updatePlan(planIndex, {
                          durationDays: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-300">
                      Badge Label (сонголттой)
                    </label>
                    <input
                      type="text"
                      value={plan.badgeLabel || ""}
                      onChange={(e) =>
                        updatePlan(planIndex, {
                          badgeLabel: e.target.value || null,
                        })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                      placeholder="Жишээ: Supporter, Founder"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-slate-300">
                      <input
                        type="checkbox"
                        checked={plan.isHighlighted}
                        onChange={(e) =>
                          updatePlan(planIndex, { isHighlighted: e.target.checked })
                        }
                        className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/50"
                      />
                      Most Popular (Highlight)
                    </label>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="mb-2 block text-xs font-medium text-slate-300">
                    Онцлогууд
                  </label>
                  <div className="space-y-2">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={feature}
                          onChange={(e) =>
                            updateFeature(planIndex, featureIndex, e.target.value)
                          }
                          className="flex-1 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                          placeholder="Онцлог"
                        />
                        <button
                          onClick={() => removeFeature(planIndex, featureIndex)}
                          className="rounded-lg border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-xs text-red-300 hover:bg-red-500/20 transition-colors"
                        >
                          Устгах
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addFeature(planIndex)}
                      className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition-colors"
                    >
                      + Онцлог нэмэх
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-400 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? "Хадгалж байна..." : "Хадгалах"}
          </button>
        </div>
      </div>
    </AdminShell>
  );
}

