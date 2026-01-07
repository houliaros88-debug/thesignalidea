"use client";

import React from "react";
import { usePathname } from "next/navigation";
import CategoryHeader from "./CategoryHeader";

export default function CategoryHeaderWrapper() {
  const pathname = usePathname();

  if (pathname !== "/submit") return null;

  return <CategoryHeader />;
}
