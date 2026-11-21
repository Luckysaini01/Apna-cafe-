"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TableOrderingExperience } from "@/components/menu/TableOrderingExperience";

const API_URL = (process.env.NEXT_PUBLIC_DINE_OS_API_URL || "http://localhost:4000").replace(/\/+$/, "");

type AvailableTable = {
  id: string;
  number: string;
};

type SelectedTable = AvailableTable & {
  tableSession: string | null;
  offlineMode: boolean;
};

const FALLBACK_TABLES: AvailableTable[] = Array.from({ length: 4 }, (_, index) => ({
  id: `table${index + 1}`,
  number: String(index + 1),
}));

export function TableSelector({
  tenantSlug,
  initialTableNumber,
}: {
  tenantSlug: string;
  initialTableNumber?: string;
}) {
  const [tables, setTables] = useState<AvailableTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<SelectedTable | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectingTableNumber, setSelectingTableNumber] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [offlineMode, setOfflineMode] = useState(false);
  const offlineModeRef = useRef(offlineMode);

  const openTable = useCallback(async (tableNumber: string, knownTable?: AvailableTable) => {
    if (offlineModeRef.current) {
      const table = knownTable
        ?? FALLBACK_TABLES.find((entry) => entry.number === tableNumber);
      if (table) {
        setSelectedTable({ ...table, tableSession: null, offlineMode: true });
      }
      return;
    }

    setSelectingTableNumber(tableNumber);
    setError("");

    try {
      const response = await fetch(`${API_URL}/v1/public/${encodeURIComponent(tenantSlug)}/table-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNumber }),
      });
      const payload = (await response.json()) as {
        message?: string;
        table?: AvailableTable;
        tableSession?: string;
      };

      if (response.status === 503) {
        const table = knownTable
          ?? FALLBACK_TABLES.find((entry) => entry.number === tableNumber);
        setOfflineMode(true);
        setError(payload.message || "Database is unavailable. Orders will only be sent through WhatsApp.");
        if (table) {
          setSelectedTable({ ...table, tableSession: null, offlineMode: true });
        }
        return;
      }

      if (!response.ok || !payload.table || !payload.tableSession) {
        throw new Error(payload.message || "Unable to open this table.");
      }

      setSelectedTable({
        ...payload.table,
        tableSession: payload.tableSession,
        offlineMode: false,
      });
    } catch (requestError) {
      const table = knownTable ?? FALLBACK_TABLES.find((entry) => entry.number === tableNumber);
      const message = requestError instanceof Error
        ? requestError.message
        : "Unable to open this table.";
      setOfflineMode(true);
      setError(`${message} Opening in WhatsApp-only mode; orders will not appear in admin.`);
      if (table) {
        setSelectedTable({ ...table, tableSession: null, offlineMode: true });
      }
    } finally {
      setSelectingTableNumber(null);
    }
  }, [tenantSlug]);

  useEffect(() => {
    offlineModeRef.current = offlineMode;
  }, [offlineMode]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadTables() {
      setIsLoading(true);
      setError("");
      setOfflineMode(false);

      try {
        const response = await fetch(`${API_URL}/v1/public/${encodeURIComponent(tenantSlug)}/tables`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          message?: string;
          tables?: AvailableTable[];
        };

        if (!response.ok || !payload.tables) {
          throw new Error(payload.message || "Unable to load available tables.");
        }

        if (!active) return;
        const selectableTables = payload.tables.filter((table) =>
          FALLBACK_TABLES.some((fallbackTable) => fallbackTable.number === table.number),
        );
        setTables(selectableTables);

        if (initialTableNumber) {
          const initialTable = selectableTables.find((table) => table.number === initialTableNumber);
          if (!initialTable) {
            setError(`Table ${initialTableNumber} is unavailable. Choose an active table below.`);
          } else {
            void openTable(initialTable.number, initialTable);
          }
        }
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name === "AbortError") return;
        if (active) {
          const message = requestError instanceof Error
            ? requestError.message
            : "Unable to load available tables.";
          setTables(FALLBACK_TABLES);
          setOfflineMode(true);
          setError(`${message} Showing Tables 1–4 in WhatsApp-only mode; orders will not appear in admin.`);
          if (initialTableNumber) {
            const table = FALLBACK_TABLES.find((entry) => entry.number === initialTableNumber);
            if (table) {
              setSelectedTable({ ...table, tableSession: null, offlineMode: true });
            }
          }
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadTables();
    return () => {
      active = false;
      controller.abort();
    };
  }, [initialTableNumber, loadAttempt, openTable, tenantSlug]);

  if (selectedTable) {
    return (
      <TableOrderingExperience
        tableId={selectedTable.id}
        tableNumber={selectedTable.number}
        tableSession={selectedTable.tableSession ?? undefined}
        offlineMode={selectedTable.offlineMode}
        tenantSlug={tenantSlug}
      />
    );
  }

  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-[#fff8e7] px-5 py-10">
      <section className="w-full max-w-lg rounded-[2rem] border border-[#eadbc4] bg-white p-6 shadow-[0_12px_40px_rgba(74,45,25,0.08)] sm:p-8">
        <p className="text-center text-xs font-bold uppercase tracking-[0.28em] text-[#a06a3f]">
          Apna Cafe · Dine in
        </p>
        <h1 className="mt-3 text-center font-serif text-3xl font-bold text-[#402516]">
          Choose your table
        </h1>
        <p className="mt-2 text-center text-sm text-[#806b56]">
          Please choose the number shown on your table.
        </p>

        {error ? (
          <div className="mt-5 space-y-3">
            <p role="alert" className="rounded-xl border border-[#efc3bc] bg-[#fff0ee] px-4 py-3 text-sm text-[#a33f2b]">
              {error}
            </p>
            <button
              type="button"
              onClick={() => {
                setError("");
                setIsLoading(true);
                setLoadAttempt((attempt) => attempt + 1);
              }}
              className="min-h-11 w-full rounded-xl border border-[#d9c7ad] px-4 text-sm font-semibold text-[#60452f] hover:bg-[#fffaf2]"
            >
              Try again
            </button>
          </div>
        ) : null}

        {isLoading || selectingTableNumber ? (
          <p role="status" className="mt-6 text-center text-sm text-[#806b56]">
            {selectingTableNumber ? `Opening Table ${selectingTableNumber}…` : "Loading available tables…"}
          </p>
        ) : tables.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {tables.map((table) => (
              <button
                key={table.id}
                type="button"
                disabled={selectingTableNumber !== null}
                onClick={() => void openTable(table.number, table)}
                className="min-h-14 rounded-xl border border-[#e3d0b5] bg-[#fffaf2] px-4 py-3 font-semibold text-[#60452f] transition hover:border-[#6b4226] hover:bg-[#f8f1e7] disabled:opacity-50"
              >
                Table {table.number}
              </button>
            ))}
          </div>
        ) : !error ? (
          <p className="mt-6 text-center text-sm text-[#806b56]">No active tables are available.</p>
        ) : null}
      </section>
    </main>
  );
}
