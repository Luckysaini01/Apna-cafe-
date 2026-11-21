"use client";

import { useState } from "react";
import Image from "next/image";
import { getMenuImageUrl, type MenuItem } from "@/lib/menu";

export function MenuItemPhoto({
  item,
  className,
  emojiClassName = "text-5xl",
}: {
  item: MenuItem;
  className: string;
  emojiClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-[#f5ead8] ${className}`}>
      {!failed ? (
        <Image
          src={getMenuImageUrl(item)}
          alt={item.name}
          fill
          loading="eager"
          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 280px"
          unoptimized
          onError={() => setFailed(true)}
          className="object-cover"
        />
      ) : (
        <span aria-hidden="true" className={emojiClassName}>{item.emoji}</span>
      )}
    </div>
  );
}
