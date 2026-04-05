"use client";

import { useEffect, useState } from "react";

export default function PushOptIn() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator) {
      setSupported(true);
      setPermission(Notification.permission);
      // Check if already subscribed
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setSubscribed(!!sub);
        });
      }).catch(() => {});
    }
  }, []);

  async function handleEnable() {
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;

      const keyRes = await fetch("/api/push/vapid-key");
      const { publicKey } = await keyRes.json();

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });

      const json = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dhKey: json.keys?.p256dh ?? "",
          authKey: json.keys?.auth ?? "",
          userAgent: navigator.userAgent,
        }),
      });

      setSubscribed(true);
    } catch (err) {
      console.error("Push subscription error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
        setSubscribed(false);
      }
    } catch (err) {
      console.error("Push unsubscribe error:", err);
    } finally {
      setLoading(false);
    }
  }

  if (!supported) return null;
  if (permission === "denied") return null;

  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 mb-4">
      <div>
        <p className="text-sm font-medium text-gray-900">Push Notifications</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {subscribed ? "You'll receive notifications in this browser." : "Get notified even when you're not on the page."}
        </p>
      </div>
      {subscribed ? (
        <button
          onClick={handleDisable}
          disabled={loading}
          className="text-sm text-red-600 hover:text-red-800 font-medium disabled:opacity-50 transition"
        >
          {loading ? "…" : "Disable"}
        </button>
      ) : (
        <button
          onClick={handleEnable}
          disabled={loading}
          className="text-sm text-brand-600 hover:text-brand-800 font-medium disabled:opacity-50 transition"
        >
          {loading ? "…" : "Enable"}
        </button>
      )}
    </div>
  );
}
