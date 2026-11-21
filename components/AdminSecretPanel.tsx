"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { io } from "socket.io-client";
import { MenuManager } from "@/components/admin/MenuManager";

type DashboardOrder = {
  id: string;
  orderNumber: number;
  status: string;
  paymentStatus: string;
  total: number | string;
  placedAt: string;
  table: { number: string } | null;
  items: { nameSnapshot: string; quantity: number }[];
};

type DashboardData = {
  tenant: { name: string };
  summary: {
    ordersToday: number;
    pendingOrders: number;
    completedToday: number;
    salesToday: number;
    cashCollectedToday: number;
    upiCollectedToday: number;
    occupiedTables: number;
    activeTables: number;
    pendingWaiterCalls: number;
    unpaidOrders: number;
  };
  occupiedTableNumbers: string[];
  unpaidOrders: DashboardOrder[];
  recentOrders: DashboardOrder[];
  pendingOrderList: DashboardOrder[];
  generatedAt: string;
};

const API_URL = (process.env.NEXT_PUBLIC_DINE_OS_API_URL || "http://localhost:4000").replace(/\/+$/, "");
const TOKEN_STORAGE_KEY = "apna-admin-token";

function formatRupees(value: number | string) {
  return `₹${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(Number(value))}`;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusStyle(status: string) {
  switch (status) {
    case "PENDING":
      return "bg-amber-100 text-amber-900";
    case "ACCEPTED":
    case "PREPARING":
      return "bg-blue-100 text-blue-900";
    case "READY":
      return "bg-emerald-100 text-emerald-900";
    case "COMPLETED":
      return "bg-green-100 text-green-900";
    case "CANCELLED":
      return "bg-red-100 text-red-900";
    default:
      return "bg-[#f8f1e7] text-[#60452f]";
  }
}

function OrderTable({
  orders,
  emptyText,
  onMarkPaid,
  pendingPaymentOrderId,
  onMarkComplete,
  completingOrderId,
}: {
  orders: DashboardOrder[];
  emptyText: string;
  onMarkPaid?: (orderId: string, method: "CASH" | "UPI") => void;
  pendingPaymentOrderId?: string | null;
  onMarkComplete?: (orderId: string) => void;
  completingOrderId?: string | null;
}) {
  if (orders.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-[#8b7967]">{emptyText}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[#fffaf2] text-[#60452f]">
          <tr>
            <th className="px-5 py-3 font-semibold">Order</th>
            <th className="px-5 py-3 font-semibold">Table</th>
            <th className="px-5 py-3 font-semibold">Items</th>
            <th className="px-5 py-3 font-semibold">Total</th>
            <th className="px-5 py-3 font-semibold">Status</th>
            <th className="px-5 py-3 font-semibold">Time</th>
            {onMarkPaid ? <th className="px-5 py-3 font-semibold">Payment</th> : null}
            {onMarkComplete ? <th className="px-5 py-3 font-semibold">Action</th> : null}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-t border-[#f2e6d3]">
              <td className="whitespace-nowrap px-5 py-4 font-semibold text-[#402516]">
                #{order.orderNumber}
              </td>
              <td className="whitespace-nowrap px-5 py-4">
                {order.table ? `Table ${order.table.number}` : "Takeaway"}
              </td>
              <td className="min-w-52 px-5 py-4 text-[#60452f]">
                {order.items.map((item) => `${item.quantity}× ${item.nameSnapshot}`).join(", ")}
              </td>
              <td className="whitespace-nowrap px-5 py-4 font-semibold text-[#402516]">
                {formatRupees(order.total)}
              </td>
              <td className="whitespace-nowrap px-5 py-4">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle(order.status)}`}>
                  {order.status.replaceAll("_", " ")}
                </span>
                <span className="ml-1 text-xs text-[#806b56]">{order.paymentStatus}</span>
              </td>
              <td className="whitespace-nowrap px-5 py-4 text-[#806b56]">
                {formatTime(order.placedAt)}
              </td>
              {onMarkPaid ? (
                <td className="whitespace-nowrap px-5 py-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={pendingPaymentOrderId === order.id}
                      onClick={() => onMarkPaid(order.id, "CASH")}
                      className="rounded-lg bg-[#e9f6eb] px-3 py-2 text-xs font-bold text-[#1f6b38] disabled:opacity-50"
                    >
                      {pendingPaymentOrderId === order.id ? "Saving…" : "Mark cash paid"}
                    </button>
                    <button
                      type="button"
                      disabled={pendingPaymentOrderId === order.id}
                      onClick={() => onMarkPaid(order.id, "UPI")}
                      className="rounded-lg bg-[#dfeafc] px-3 py-2 text-xs font-bold text-[#204f99] disabled:opacity-50"
                    >
                      Mark UPI paid
                    </button>
                  </div>
                </td>
              ) : null}
              {onMarkComplete ? (
                <td className="whitespace-nowrap px-5 py-4">
                  <button
                    type="button"
                    disabled={completingOrderId === order.id}
                    onClick={() => onMarkComplete(order.id)}
                    className="rounded-lg bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-200 disabled:opacity-50"
                  >
                    {completingOrderId === order.id ? "Completing…" : "Mark complete"}
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminSecretPanel() {
  const [secretKey, setSecretKey] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [pendingPaymentOrderId, setPendingPaymentOrderId] = useState<string | null>(null);
  const [completingOrderId, setCompletingOrderId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const dashboardLoadInFlight = useRef(false);
  const dashboardRefreshQueued = useRef(false);

  useEffect(() => {
    const savedToken = window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
    const timeoutId = window.setTimeout(() => setToken(savedToken), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const loadDashboard = useCallback(async (authToken: string, signal?: AbortSignal) => {
    if (dashboardLoadInFlight.current) {
      dashboardRefreshQueued.current = true;
      return;
    }
    dashboardLoadInFlight.current = true;
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/v1/dashboard`, {
        headers: { Authorization: `Bearer ${authToken}` },
        signal,
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
          setDashboard(null);
          setToken(null);
        }
        throw new Error(payload?.message || "Unable to load dashboard.");
      }

      setDashboard(payload as DashboardData);
    } catch (requestError) {
      if (requestError instanceof Error && requestError.name === "AbortError") return;
      setError(requestError instanceof Error ? requestError.message : "Unable to load dashboard.");
    } finally {
      dashboardLoadInFlight.current = false;
      if (!signal?.aborted) {
        setIsLoading(false);
        if (dashboardRefreshQueued.current) {
          dashboardRefreshQueued.current = false;
          window.setTimeout(() => void loadDashboard(authToken), 0);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();
    const initialRefreshTimeout = window.setTimeout(() => {
      void loadDashboard(token, controller.signal);
    }, 0);
    const socket = io(API_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    let refreshTimeout: number | undefined;

    socket.on("connect", () => {
      setIsLive(true);
      void loadDashboard(token);
    });
    socket.on("disconnect", () => setIsLive(false));
    socket.on("connect_error", () => setIsLive(false));
    socket.on("dashboard.updated", (event?: { type?: string }) => {
      if (event?.type?.startsWith("menu.")) {
        window.dispatchEvent(new Event("apna:menu-updated"));
      }
      window.clearTimeout(refreshTimeout);
      refreshTimeout = window.setTimeout(() => {
        void loadDashboard(token);
      }, 200);
    });

    const intervalId = window.setInterval(() => {
      void loadDashboard(token);
    }, 30_000);

    return () => {
      window.clearTimeout(initialRefreshTimeout);
      controller.abort();
      socket.disconnect();
      window.clearTimeout(refreshTimeout);
      window.clearInterval(intervalId);
    };
  }, [loadDashboard, token]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/v1/auth/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secretKey }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.token) {
        throw new Error(payload?.message || "Secret key rejected.");
      }

      const nextToken = String(payload.token);
      window.sessionStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
      setToken(nextToken);
      setSecretKey("");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to log in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function markOrderPaid(orderId: string, method: "CASH" | "UPI") {
    if (!token) return;
    if (!window.confirm(`Confirm this order was paid by ${method}? It will also be marked complete.`)) return;
    setPendingPaymentOrderId(orderId);
    setError("");

    try {
      const response = await fetch(`${API_URL}/v1/orders/${encodeURIComponent(orderId)}/mark-paid`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ method }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to update payment.");
      }

      await loadDashboard(token);
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : "Unable to update payment.");
    } finally {
      setPendingPaymentOrderId(null);
    }
  }

  async function markOrderComplete(orderId: string) {
    if (!token) return;
    if (!window.confirm("Confirm this order has been served and is complete?")) return;
    setCompletingOrderId(orderId);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/v1/dashboard/orders/${encodeURIComponent(orderId)}/complete`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to complete this order.");
      }

      await loadDashboard(token);
    } catch (completionError) {
      setError(
        completionError instanceof Error
          ? completionError.message
          : "Unable to complete this order.",
      );
    } finally {
      setCompletingOrderId(null);
    }
  }

  function handleLogout() {
    window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setDashboard(null);
    setSecretKey("");
    setError("");
  }

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fffaf2] px-5 py-10">
        <div className="w-full max-w-md rounded-[2rem] border border-[#eadbc4] bg-white p-7 shadow-[0_12px_40px_rgba(74,45,25,0.09)]">
          <div className="mb-6 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#a06a3f]">Admin access</p>
            <h1 className="mt-3 font-serif text-3xl font-bold text-[#402516]">Apna Cafe</h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <label className="block text-sm font-semibold text-[#60452f]">
              Secret key
              <input
                type="password"
                autoComplete="current-password"
                value={secretKey}
                onChange={(event) => setSecretKey(event.target.value)}
                placeholder="Enter admin secret key"
                className="mt-2 w-full rounded-xl border border-[#e3d0b5] bg-[#fffaf2] px-4 py-3 text-base text-[#402516] outline-none transition focus:border-[#6b4226] focus:ring-2 focus:ring-[#d4b27a]"
              />
            </label>

            {error ? (
              <p role="alert" className="rounded-xl border border-[#efc3bc] bg-[#fff0ee] px-3 py-2 text-sm text-[#a33f2b]">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || secretKey.trim().length < 8}
              className="w-full rounded-xl bg-[#6b4226] px-4 py-3 text-base font-bold text-white transition hover:bg-[#4a2d19] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Verifying..." : "Login to dashboard"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (!dashboard && isLoading && !error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fffaf2] text-[#60452f]">
        Loading restaurant dashboard…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fffaf2] p-5 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-[#eadbc4] bg-white p-5 shadow-[0_12px_40px_rgba(74,45,25,0.05)] md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#a06a3f]">Owner control</p>
            <h1 className="mt-2 font-serif text-3xl font-bold text-[#402516]">
              {dashboard?.tenant.name ?? "Admin dashboard"}
            </h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-[#806b56]">
              <span className={`size-2 rounded-full ${isLive ? "bg-emerald-500" : "bg-amber-500"}`} aria-hidden="true" />
              {isLive ? "Live updates connected" : "Reconnecting · automatic refresh every 30 seconds"}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => token && void loadDashboard(token)}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d9c7ad] px-4 text-sm font-semibold text-[#60452f] hover:bg-[#f8f1e7] disabled:opacity-50"
            >
              {isLoading ? "Refreshing…" : "Refresh"}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#6b4226] px-4 text-sm font-semibold text-white hover:bg-[#4a2d19]"
            >
              Logout
            </button>
          </div>
        </header>

        {error ? (
          <div role="alert" className="mb-6 flex flex-col gap-3 rounded-2xl border border-[#efc3bc] bg-[#fff0ee] p-4 text-sm text-[#8f3323] sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            {token ? (
              <button type="button" onClick={() => void loadDashboard(token)} className="font-bold underline">
                Try again
              </button>
            ) : null}
          </div>
        ) : null}

        {dashboard ? (
          <>
            <section aria-label="Today's dashboard summary" className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Orders today", value: dashboard.summary.ordersToday, tone: "bg-[#fff1d9] text-[#7a4d1e]" },
                { label: "Pending orders", value: dashboard.summary.pendingOrders, tone: "bg-[#f8eaf7] text-[#6b3b8b]" },
                { label: "Completed today", value: dashboard.summary.completedToday, tone: "bg-[#e9f6eb] text-[#1f6b38]" },
                { label: "Paid sales today", value: formatRupees(dashboard.summary.salesToday), tone: "bg-[#dfeafc] text-[#204f99]" },
                { label: "Unpaid bills", value: dashboard.summary.unpaidOrders, tone: "bg-[#fff1d9] text-[#7a4d1e]" },
              ].map((item) => (
                <article key={item.label} className={`rounded-[1.5rem] p-5 ${item.tone}`}>
                  <p className="text-sm font-medium opacity-80">{item.label}</p>
                  <p className="mt-3 text-3xl font-black">{item.value}</p>
                </article>
              ))}
            </section>

            <MenuManager token={token} />

            <section className="mb-8 overflow-hidden rounded-[2rem] border border-[#eadbc4] bg-white shadow-[0_12px_40px_rgba(74,45,25,0.05)]">
              <div className="border-b border-[#f0e2cd] bg-[#fffaf2] px-5 py-4">
                <h2 className="text-lg font-bold text-[#402516]">Pending orders</h2>
                <p className="mt-1 text-sm text-[#806b56]">
                  Mark an order complete after it is served, or record payment to complete it automatically. Counts update live.
                </p>
              </div>
              <OrderTable
                orders={dashboard.pendingOrderList}
                emptyText="There are no pending orders."
                onMarkComplete={markOrderComplete}
                completingOrderId={completingOrderId}
              />
            </section>

            <section aria-label="Today's payment collection" className="mb-8 grid gap-4 sm:grid-cols-2">
              <article className="rounded-[1.5rem] bg-[#e9f6eb] p-5 text-[#1f6b38]">
                <p className="text-sm font-medium opacity-80">Cash collected today</p>
                <p className="mt-3 text-3xl font-black">{formatRupees(dashboard.summary.cashCollectedToday)}</p>
              </article>
              <article className="rounded-[1.5rem] bg-[#dfeafc] p-5 text-[#204f99]">
                <p className="text-sm font-medium opacity-80">UPI collected today</p>
                <p className="mt-3 text-3xl font-black">{formatRupees(dashboard.summary.upiCollectedToday)}</p>
              </article>
            </section>

            <section className="mb-8 grid gap-4 lg:grid-cols-2">
              <article className="rounded-[1.5rem] border border-[#eadbc4] bg-white p-5">
                <h2 className="font-bold text-[#402516]">Tables occupied</h2>
                <p className="mt-1 text-sm text-[#806b56]">
                  {dashboard.summary.occupiedTables} of {dashboard.summary.activeTables} active tables
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {dashboard.occupiedTableNumbers.length > 0 ? dashboard.occupiedTableNumbers.map((number) => (
                    <span key={number} className="rounded-full bg-[#fff1d9] px-3 py-1.5 text-sm font-bold text-[#7a4d1e]">
                      Table {number}
                    </span>
                  )) : <span className="text-sm text-[#8b7967]">No occupied tables</span>}
                </div>
              </article>
              <article className="rounded-[1.5rem] border border-[#eadbc4] bg-white p-5">
                <h2 className="font-bold text-[#402516]">Waiter calls</h2>
                <p className="mt-1 text-sm text-[#806b56]">Pending assistance requests</p>
                <p className="mt-3 text-3xl font-black text-[#6b4226]">{dashboard.summary.pendingWaiterCalls}</p>
              </article>
            </section>

            <section className="mb-8 overflow-hidden rounded-[2rem] border border-[#eadbc4] bg-white shadow-[0_12px_40px_rgba(74,45,25,0.05)]">
              <div className="border-b border-[#f0e2cd] bg-[#fffaf2] px-5 py-4">
                <h2 className="text-lg font-bold text-[#402516]">Unpaid bills</h2>
              </div>
              <OrderTable
                orders={dashboard.unpaidOrders}
                emptyText="There are no unpaid bills."
                onMarkPaid={markOrderPaid}
                pendingPaymentOrderId={pendingPaymentOrderId}
              />
            </section>

            <section className="overflow-hidden rounded-[2rem] border border-[#eadbc4] bg-white shadow-[0_12px_40px_rgba(74,45,25,0.05)]">
              <div className="border-b border-[#f0e2cd] bg-[#fffaf2] px-5 py-4">
                <h2 className="text-lg font-bold text-[#402516]">Live website orders today</h2>
                <p className="mt-1 text-sm text-[#806b56]">
                  Orders are recorded before WhatsApp opens and appear here in real time.
                </p>
              </div>
              <OrderTable orders={dashboard.recentOrders} emptyText="No orders have been placed today." />
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
