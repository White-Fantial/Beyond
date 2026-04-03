"use client";

import { useState } from "react";
import type { AlertRule, CreateAlertRuleInput, UpdateAlertRuleInput } from "@/types/owner-notifications";
import AlertRuleCard from "@/components/owner/alert-rules/AlertRuleCard";
import AlertRuleForm from "@/components/owner/alert-rules/AlertRuleForm";

interface StoreOption {
  id: string;
  name: string;
}

interface Props {
  initialRules: AlertRule[];
  stores: StoreOption[];
}

export default function AlertRulesClient({ initialRules, stores }: Props) {
  const [rules, setRules] = useState<AlertRule[]>(initialRules);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(data: CreateAlertRuleInput | UpdateAlertRuleInput) {
    const res = await fetch("/api/owner/alert-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.error ?? "Failed to create rule");
    }
    const { data: rule } = await res.json();
    setRules((prev) => [rule, ...prev]);
    setShowCreate(false);
  }

  async function handleUpdate(data: CreateAlertRuleInput | UpdateAlertRuleInput) {
    if (!editingRule) return;
    const res = await fetch(`/api/owner/alert-rules/${editingRule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.error ?? "Failed to update rule");
    }
    const { data: updated } = await res.json();
    setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setEditingRule(null);
  }

  async function handleToggle(ruleId: string, enabled: boolean) {
    setError(null);
    const res = await fetch(`/api/owner/alert-rules/${ruleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    if (!res.ok) {
      setError("Failed to toggle rule.");
      return;
    }
    const { data: updated } = await res.json();
    setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }

  async function handleDelete(ruleId: string) {
    if (!confirm("Delete this alert rule?")) return;
    setError(null);
    const res = await fetch(`/api/owner/alert-rules/${ruleId}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) {
      setError("Failed to delete rule.");
      return;
    }
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
  }

  return (
    <div>
      {rules.length > 0 && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => { setShowCreate(true); setEditingRule(null); }}
            className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
          >
            + New Rule
          </button>
        </div>
      )}

      {(showCreate || editingRule) && (
        <div className="fixed inset-0 bg-black/30 z-30 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              {editingRule ? "Edit Alert Rule" : "Create Alert Rule"}
            </h2>
            <AlertRuleForm
              rule={editingRule ?? undefined}
              stores={stores}
              onSave={editingRule ? handleUpdate : handleCreate}
              onCancel={() => {
                setEditingRule(null);
                setShowCreate(false);
              }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {rules.length === 0 ? (
        <div className="bg-white rounded-lg border border-dashed border-gray-300 p-10 text-center">
          <p className="text-sm font-medium text-gray-700">No alert rules configured</p>
          <p className="text-xs text-gray-400 mt-1">
            Create a rule to get notified when key metrics cross a threshold.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
          >
            Create first rule
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <AlertRuleCard
              key={rule.id}
              rule={rule}
              onToggle={handleToggle}
              onEdit={(r) => {
                setEditingRule(r);
                setShowCreate(false);
              }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
