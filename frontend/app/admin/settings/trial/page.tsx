"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import TrialSettingsCard from "../../users/components/TrialSettingsCard";
import { adminGetTrialSettings, adminUpdateTrialSettings, type TrialSettings } from "@/lib/api";

export default function AdminTrialSettingsPage() {
  const [trial, setTrial] = useState<TrialSettings | null>(null);
  const [trialLoading, setTrialLoading] = useState(true);
  const [trialSaving, setTrialSaving] = useState(false);
  const [trialError, setTrialError] = useState<string | null>(null);

  const refresh = async () => {
    setTrialLoading(true);
    setTrialError(null);
    try {
      const res = await adminGetTrialSettings();
      setTrial(res);
    } catch (e: any) {
      setTrialError(e?.response?.data?.message || "Trial тохиргоо ачаалж чадсангүй.");
      setTrial(null);
    } finally {
      setTrialLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const save = async () => {
    if (!trial) return;
    setTrialSaving(true);
    setTrialError(null);
    try {
      const res = await adminUpdateTrialSettings(trial);
      setTrial(res);
    } catch (e: any) {
      setTrialError(e?.response?.data?.message || "Хадгалж чадсангүй.");
    } finally {
      setTrialSaving(false);
    }
  };

  return (
    <AdminShell
      title="Trial тохиргоо"
      subtitle="Шинэ хэрэглэгчид trial (VIP) олгох эсэх, хугацааг удирдана."
    >
      <TrialSettingsCard
        trial={trial}
        trialLoading={trialLoading}
        trialSaving={trialSaving}
        trialError={trialError}
        onRefresh={refresh}
        onSave={save}
        onChange={setTrial}
      />
    </AdminShell>
  );
}

