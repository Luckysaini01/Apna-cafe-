import menuData from "@/data/menu.json";

export type MenuCategory = {
  id: string;
  name: string;
  icon: string;
};

export type MenuItem = {
  id: string;
  category: string;
  categoryName?: string;
  name: string;
  desc: string;
  price: number;
  emoji: string;
  imageUrl?: string | null;
  best?: boolean;
  source?: "database" | "static";
};

export const menuCategories: MenuCategory[] = menuData.categories;
export const menuItems: MenuItem[] = menuData.items;

// Keep menu photos in /public so they remain available while scrolling and
// don't depend on a third-party image server at runtime.
const menuPhoto = (name: string) => `/menu/${name}.jpg`;
const menuPhotos: Record<string, string> = {
  c1: menuPhoto("chai"),
  c2: menuPhoto("chai"),
  c3: menuPhoto("chai"),
  c4: menuPhoto("coffee"),
  c5: menuPhoto("cold-coffee"),
  c6: menuPhoto("cold-coffee"),
  m1: menuPhoto("momos-assorted"),
  m2: menuPhoto("momos-steamed"),
  m3: menuPhoto("momos-assorted"),
  m4: menuPhoto("momos-steamed"),
  m5: menuPhoto("momos-assorted"),
  m6: menuPhoto("momos-steamed"),
  m7: menuPhoto("momos-assorted"),
  m8: menuPhoto("momos-steamed"),
  p1: menuPhoto("pizza-classic"),
  p2: menuPhoto("pizza-veggie"),
  p3: menuPhoto("pizza-paneer"),
  p4: menuPhoto("pizza-paneer"),
  p5: menuPhoto("pizza-veggie"),
  b1: menuPhoto("burger-veg"),
  b2: menuPhoto("burger-cheese"),
  b3: menuPhoto("burger-veg"),
  b4: menuPhoto("burger-cheese"),
  pt1: menuPhoto("patties"),
  pt2: menuPhoto("patties"),
  pt3: menuPhoto("cheese-corn-patties"),
  pt4: menuPhoto("patties"),
  cb1: menuPhoto("momos-assorted"),
  cb2: menuPhoto("momos-steamed"),
  cb3: menuPhoto("burger-veg"),
  cb4: menuPhoto("pizza-classic"),
};

const categoryPhotos: Record<string, string> = {
  chai: menuPhoto("chai"),
  momos: menuPhoto("momos-steamed"),
  pizza: menuPhoto("pizza-veggie"),
  burger: menuPhoto("burger-veg"),
  patties: menuPhoto("patties"),
  combos: menuPhoto("pizza-classic"),
};
const menuPhotosByName = new Map(
  menuItems.map((item) => [item.name.trim().toLowerCase(), menuPhotos[item.id]!] as [string, string]),
);

export function getMenuItems(categoryId?: string) {
  if (!categoryId || categoryId === "all") return menuItems;
  return menuItems.filter((item) => item.category === categoryId);
}

export function getMenuItem(itemId: string) {
  return menuItems.find((item) => item.id === itemId);
}

export function getMenuImageUrl(
  item: Pick<MenuItem, "id" | "name" | "category" | "categoryName" | "imageUrl">,
) {
  if (item.imageUrl) return item.imageUrl;
  if (menuPhotos[item.id]) return menuPhotos[item.id];
  const normalizedName = item.name.trim().toLowerCase();
  const photoByName = menuPhotosByName.get(normalizedName);
  if (photoByName) return photoByName;

  const normalizedCategory = (item.categoryName || item.category).toLowerCase();
  if (normalizedName.includes("chai") || normalizedName.includes("tea")) return categoryPhotos.chai;
  if (normalizedName.includes("coffee")) {
    return menuPhoto(normalizedName.includes("cold") ? "cold-coffee" : "coffee");
  }
  if (normalizedName.includes("momo")) return categoryPhotos.momos;
  if (normalizedName.includes("pizza")) return categoryPhotos.pizza;
  if (normalizedName.includes("burger")) return categoryPhotos.burger;
  if (normalizedName.includes("pattie")) return categoryPhotos.patties;
  if (normalizedCategory.includes("chai")) return categoryPhotos.chai;
  if (normalizedCategory.includes("momo")) return categoryPhotos.momos;
  if (normalizedCategory.includes("pizza")) return categoryPhotos.pizza;
  if (normalizedCategory.includes("burger")) return categoryPhotos.burger;
  if (normalizedCategory.includes("pattie")) return categoryPhotos.patties;
  return categoryPhotos.combos;
}

export function formatRupees(amount: number) {
  return `₹${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(amount)}`;
}
