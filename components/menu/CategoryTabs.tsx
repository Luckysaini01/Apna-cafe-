"use client";

import { Button } from "@/components/ui/button";
import { menuCategories, type MenuCategory } from "@/lib/menu";

type CategoryTabsProps = {
  activeCategory: string;
  onChange: (categoryId: string) => void;
  categories?: MenuCategory[];
};

export function CategoryTabs({
  activeCategory,
  onChange,
  categories = menuCategories,
}: CategoryTabsProps) {
  return (
    <div
      aria-label="Menu categories"
      className="flex gap-2 overflow-x-auto pb-2"
      role="group"
    >
      <Button
        type="button"
        size="sm"
        variant={activeCategory === "all" ? "default" : "outline"}
        aria-pressed={activeCategory === "all"}
        onClick={() => onChange("all")}
        className="shrink-0 rounded-full"
      >
        All items
      </Button>
      {categories.map((category) => (
        <Button
          key={category.id}
          type="button"
          size="sm"
          variant={activeCategory === category.id ? "default" : "outline"}
          aria-pressed={activeCategory === category.id}
          onClick={() => onChange(category.id)}
          className="shrink-0 rounded-full"
        >
          <span aria-hidden="true">{category.icon}</span>
          {category.name}
        </Button>
      ))}
    </div>
  );
}
