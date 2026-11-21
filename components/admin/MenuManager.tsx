"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Image from "next/image";

type FoodType = "VEG" | "NONVEG" | "EGG" | "VEGAN";

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  foodType: FoodType;
  isAvailable: boolean;
  category: { id: string; name: string };
};

type MenuItemForm = {
  name: string;
  categoryName: string;
  description: string;
  price: string;
  imageUrl: string;
  foodType: FoodType;
};

const API_URL = (process.env.NEXT_PUBLIC_DINE_OS_API_URL || "http://localhost:4000").replace(/\/+$/, "");
const emptyForm: MenuItemForm = {
  name: "",
  categoryName: "",
  description: "",
  price: "",
  imageUrl: "",
  foodType: "VEG",
};

function formatPrice(price: number) {
  return `₹${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(price)}`;
}

export function MenuManager({ token }: { token: string }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [form, setForm] = useState<MenuItemForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fetchItems = useCallback(async () => {
    const response = await fetch(`${API_URL}/v1/dashboard/menu`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.message || "Unable to load menu items.");
    }
    if (!Array.isArray(payload.items)) {
      throw new Error("The menu response is invalid.");
    }

    return payload.items as MenuItem[];
  }, [token]);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      setItems(await fetchItems());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load menu items.");
    } finally {
      setIsLoading(false);
    }
  }, [fetchItems]);

  useEffect(() => {
    let active = true;

    void fetchItems()
      .then((loadedItems) => {
        if (active) setItems(loadedItems);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load menu items.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fetchItems]);

  useEffect(() => {
    const refreshMenu = () => void loadItems();
    window.addEventListener("apna:menu-updated", refreshMenu);
    return () => window.removeEventListener("apna:menu-updated", refreshMenu);
  }, [loadItems]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function editItem(item: MenuItem) {
    setForm({
      name: item.name,
      categoryName: item.category.name,
      description: item.description ?? "",
      price: String(item.price),
      imageUrl: item.imageUrl ?? "",
      foodType: item.foodType,
    });
    setEditingId(item.id);
    setNotice("");
    setError("");
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `${API_URL}/v1/dashboard/menu${editingId ? `/${encodeURIComponent(editingId)}` : ""}`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name.trim(),
            categoryName: form.categoryName.trim(),
            description: form.description.trim(),
            price: Number(form.price),
            foodType: form.foodType,
            imageUrl: form.imageUrl.trim() || null,
          }),
        },
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to save this menu item.");
      }

      setNotice(editingId ? "Menu item updated." : "Menu item added.");
      resetForm();
      await loadItems();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save this menu item.");
    } finally {
      setIsSaving(false);
    }
  }

  async function setAvailability(item: MenuItem, isAvailable: boolean) {
    if (
      !isAvailable &&
      !window.confirm(`Remove ${item.name} from the customer menu? Past order history will be kept.`)
    ) {
      return;
    }

    setPendingItemId(item.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API_URL}/v1/dashboard/menu/${encodeURIComponent(item.id)}`, {
        method: isAvailable ? "PATCH" : "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(isAvailable ? { "Content-Type": "application/json" } : {}),
        },
        ...(isAvailable ? { body: JSON.stringify({ isAvailable: true }) } : {}),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to update this menu item.");
      }

      setNotice(isAvailable ? "Menu item restored." : "Menu item removed from the customer menu.");
      await loadItems();
    } catch (availabilityError) {
      setError(
        availabilityError instanceof Error
          ? availabilityError.message
          : "Unable to update this menu item.",
      );
    } finally {
      setPendingItemId(null);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-[#e3d0b5] bg-white px-3 py-2.5 text-sm text-[#402516] outline-none focus:border-[#6b4226] focus:ring-2 focus:ring-[#d4b27a]";

  return (
    <section
      aria-labelledby="menu-management-title"
      className="mb-8 rounded-[2rem] border border-[#eadbc4] bg-white p-5 shadow-[0_12px_40px_rgba(74,45,25,0.05)] md:p-6"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="menu-management-title" className="text-xl font-bold text-[#402516]">
            Cafe menu
          </h2>
          <p className="mt-1 text-sm text-[#806b56]">
            Add items, update details, or remove items from the customer menu.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadItems()}
          disabled={isLoading}
          className="min-h-10 rounded-xl border border-[#d9c7ad] px-4 text-sm font-semibold text-[#60452f] hover:bg-[#f8f1e7] disabled:opacity-50"
        >
          {isLoading ? "Refreshing…" : "Refresh menu"}
        </button>
      </div>

      <form onSubmit={saveItem} className="mb-6 rounded-2xl bg-[#fffaf2] p-4 md:p-5">
        <h3 className="mb-4 font-bold text-[#402516]">
          {editingId ? "Edit menu item" : "Add a menu item"}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-semibold text-[#60452f]">
            Item name
            <input
              required
              maxLength={100}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-semibold text-[#60452f]">
            Category
            <input
              required
              maxLength={60}
              value={form.categoryName}
              onChange={(event) => setForm({ ...form, categoryName: event.target.value })}
              placeholder="e.g. Chai"
              className={inputClass}
            />
          </label>
          <label className="text-sm font-semibold text-[#60452f]">
            Price (₹)
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-semibold text-[#60452f]">
            Food type
            <select
              value={form.foodType}
              onChange={(event) => setForm({ ...form, foodType: event.target.value as FoodType })}
              className={inputClass}
            >
              <option value="VEG">Vegetarian</option>
              <option value="NONVEG">Non-vegetarian</option>
              <option value="EGG">Egg</option>
              <option value="VEGAN">Vegan</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-[#60452f] sm:col-span-2">
            Description
            <input
              maxLength={500}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-semibold text-[#60452f] sm:col-span-2 lg:col-span-3">
            Photo URL
            <input
              type="url"
              maxLength={2048}
              value={form.imageUrl}
              onChange={(event) => setForm({ ...form, imageUrl: event.target.value })}
              placeholder="https://example.com/menu-item.jpg"
              className={inputClass}
            />
            <span className="mt-1 block font-normal text-[#806b56]">
              Paste a direct image link. Leave blank to use the default menu photo.
            </span>
          </label>
          {form.imageUrl ? (
            <div className="relative h-24 w-24 overflow-hidden rounded-xl bg-[#f5ead8]">
              <Image
                src={form.imageUrl}
                alt={`${form.name || "Menu item"} photo preview`}
                fill
                unoptimized
                onError={() => setError("This photo link could not be loaded. Check the URL.")}
                className="object-cover"
              />
            </div>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={isSaving}
            className="min-h-11 rounded-xl bg-[#6b4226] px-5 text-sm font-bold text-white hover:bg-[#4a2d19] disabled:opacity-50"
          >
            {isSaving ? "Saving…" : editingId ? "Save changes" : "Add item"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="min-h-11 rounded-xl border border-[#d9c7ad] px-5 text-sm font-semibold text-[#60452f] hover:bg-white"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      {error ? (
        <p role="alert" className="mb-4 rounded-xl border border-[#efc3bc] bg-[#fff0ee] px-4 py-3 text-sm text-[#8f3323]">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </p>
      ) : null}

      {isLoading && items.length === 0 ? (
        <p className="py-5 text-center text-sm text-[#806b56]">Loading menu items…</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#d9c7ad] px-4 py-8 text-center text-sm text-[#806b56]">
          No menu items yet. Add your first item above.
        </p>
      ) : (
        <ul className="divide-y divide-[#f0e2cd]">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-[#402516]">{item.name}</h3>
                  <span className="rounded-full bg-[#f8f1e7] px-2.5 py-1 text-xs font-medium text-[#60452f]">
                    {item.category.name}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      item.isAvailable
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item.isAvailable ? "Available" : "Removed"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[#806b56]">
                  {formatPrice(item.price)} · {item.foodType}
                  {item.description ? ` · ${item.description}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => editItem(item)}
                  className="min-h-10 rounded-xl border border-[#d9c7ad] px-4 text-sm font-semibold text-[#60452f] hover:bg-[#f8f1e7]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={pendingItemId === item.id}
                  onClick={() => void setAvailability(item, !item.isAvailable)}
                  className={`min-h-10 rounded-xl px-4 text-sm font-semibold disabled:opacity-50 ${
                    item.isAvailable
                      ? "bg-red-50 text-red-800 hover:bg-red-100"
                      : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  }`}
                >
                  {pendingItemId === item.id
                    ? "Saving…"
                    : item.isAvailable
                      ? "Remove"
                      : "Restore"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
