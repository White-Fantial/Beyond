"use client";

import { useState } from "react";
import Link from "next/link";
import type { SubscriptionPlanPublic, SubscriptionFrequency } from "@/types/storefront";

function formatPrice(amount: number, currency = "NZD"): string {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

const FREQUENCY_LABELS: Record<SubscriptionFrequency, string> = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Every 2 weeks",
  MONTHLY: "Monthly",
};

interface Props {
  storeSlug: string;
  storeId: string;
  plans: SubscriptionPlanPublic[];
}

interface SuccessResult {
  subscriptionId: string;
  status: string;
  startDate: string;
  nextBillingDate: string;
  totalAmount: number;
  currencyCode: string;
}

type Step = "select-plan" | "contact-form" | "success";

export default function SubscriptionEnrollmentFlow({ storeSlug, plans }: Props) {
  const [step, setStep] = useState<Step>("select-plan");
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanPublic | null>(null);

  // Contact form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [frequency, setFrequency] = useState<SubscriptionFrequency>("WEEKLY");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SuccessResult | null>(null);

  function handleSelectPlan(plan: SubscriptionPlanPublic) {
    setSelectedPlan(plan);
    setStep("contact-form");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlan) return;
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/store/${storeSlug}/subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan.id,
          customerName: name,
          customerPhone: phone,
          customerEmail: email,
          frequency,
          startDate,
          notes: notes || undefined,
          currencyCode: "NZD",
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Something went wrong. Please try again.");
        return;
      }

      setResult(body as SuccessResult);
      setStep("success");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "select-plan") {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <p className="text-sm text-gray-500 text-center">Choose a plan to get started</p>
        {plans.map((plan) => (
          <button
            key={plan.id}
            type="button"
            onClick={() => handleSelectPlan(plan)}
            className="w-full text-left bg-white rounded-2xl border border-gray-200 p-5 hover:border-brand-400 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-base font-bold text-gray-900">{plan.name}</h3>
              <span className="text-lg font-bold text-brand-600">
                {formatPrice(plan.price)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Billed {FREQUENCY_LABELS[plan.interval as SubscriptionFrequency] ?? plan.interval}
            </p>
            {plan.benefits.length > 0 && (
              <ul className="space-y-1">
                {plan.benefits.map((benefit, i) => (
                  <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                    <span className="text-green-500 mt-0.5">✓</span>
                    {benefit}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 text-xs font-semibold text-brand-600">
              Select this plan →
            </div>
          </button>
        ))}
      </div>
    );
  }

  if (step === "contact-form" && selectedPlan) {
    return (
      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 py-6 pb-28 space-y-6">
        {/* Selected plan summary */}
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex justify-between items-center">
          <div>
            <p className="text-xs text-purple-500 font-medium uppercase tracking-wide mb-0.5">
              Selected Plan
            </p>
            <p className="text-sm font-bold text-gray-900">{selectedPlan.name}</p>
          </div>
          <div className="text-right">
            <p className="text-base font-bold text-brand-600">{formatPrice(selectedPlan.price)}</p>
            <button
              type="button"
              onClick={() => setStep("select-plan")}
              className="text-xs text-purple-500 hover:text-purple-700 underline"
            >
              Change
            </button>
          </div>
        </div>

        {/* Contact info */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Your Details</h2>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="sub-name">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="sub-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="sub-phone">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              id="sub-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+64 21 000 0000"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="sub-email">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="sub-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Frequency & start date */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Subscription Schedule</h2>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="sub-freq">
              Billing Frequency <span className="text-red-500">*</span>
            </label>
            <select
              id="sub-freq"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as SubscriptionFrequency)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            >
              {(Object.entries(FREQUENCY_LABELS) as [SubscriptionFrequency, string][]).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="sub-start">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              id="sub-start"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Notes (optional)</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Dietary requirements, delivery instructions…"
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Fixed CTA */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 max-w-lg mx-auto">
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-semibold rounded-full transition-colors"
          >
            {submitting ? "Subscribing…" : `Subscribe · ${formatPrice(selectedPlan.price)}`}
          </button>
        </div>
      </form>
    );
  }

  if (step === "success" && result) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm">
          <div className="text-6xl mb-3">🎉</div>
          <h2 className="text-xl font-bold text-green-600 mb-2">You&apos;re Subscribed!</h2>
          <p className="text-sm text-gray-500">
            Your subscription has been activated successfully.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Plan</span>
            <span className="font-medium text-gray-900">{selectedPlan?.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Amount</span>
            <span className="font-medium text-gray-900">{formatPrice(result.totalAmount, result.currencyCode)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Start Date</span>
            <span className="font-medium text-gray-900">
              {new Date(result.startDate).toLocaleDateString("en-NZ")}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Next Billing</span>
            <span className="font-medium text-gray-900">
              {new Date(result.nextBillingDate).toLocaleDateString("en-NZ")}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Reference</span>
            <span className="font-mono text-xs font-bold text-gray-900">
              {result.subscriptionId.slice(0, 8).toUpperCase()}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Link
            href={`/store/${storeSlug}/subscriptions/confirmation/${result.subscriptionId}`}
            className="block w-full py-3 bg-brand-600 hover:bg-brand-700 text-white text-center font-semibold rounded-full transition-colors"
          >
            View Subscription Status
          </Link>
          <Link
            href={`/store/${storeSlug}`}
            className="block w-full py-2 text-sm text-center text-gray-500 hover:text-gray-700"
          >
            Back to Menu
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
