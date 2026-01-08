"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";

const categories = [
  "Food & Drinks",
  "Fashion",
  "Technology",
  "Beauty & Cosmetics",
  "Health & Wellness",
  "Finance & Fintech",
  "Real Estate",
  "Education",
  "Travel & Hospitality",
  "Media & Entertainment",
  "Retail & Ecommerce",
  "Transportation & Mobility",
  "Sustainability & Green Tech",
  "Sports & Fitness",
  "Home & Living",
  "Gaming",
  "Marketing & Advertising",
  "HR & Recruitment",
];

const categoryImages: Record<string, string> = {
  "Food & Drinks":
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80",
  Fashion:
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80",
  Technology:
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
  "Beauty & Cosmetics":
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80",
  "Health & Wellness":
    "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80",
  "Finance & Fintech":
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
  "Real Estate":
    "https://images.unsplash.com/photo-1501183638710-841dd1904471?auto=format&fit=crop&w=800&q=80",
  Education:
    "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80",
  "Travel & Hospitality":
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80",
  "Media & Entertainment":
    "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?auto=format&fit=crop&w=800&q=80",
  "Retail & Ecommerce":
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80",
  "Transportation & Mobility":
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
  "Sustainability & Green Tech":
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=80",
  "Sports & Fitness":
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80",
  "Home & Living":
    "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80",
  Gaming:
    "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80",
  "Marketing & Advertising":
    "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80",
  "HR & Recruitment":
    "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=800&q=80",
};

const shareOptions = [50, 40, 35, 30];

const listingsByCategory = Object.fromEntries(
  categories.map((category) => [
    category,
    shareOptions.map((share, index) => ({
      id: `${category}-${share}-${index}`,
      category,
      image: categoryImages[category],
      text: `Looking for a partner for my ${category.toLowerCase()} project (${share}%).`,
    })),
  ])
);

export default function PartnersHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(categories[0]);

  if (pathname !== "/categories") return null;

  return (
    <div
      className="nyt-divider-categories"
      style={{ display: "flex", justifyContent: "center" }}
    >
      <div className="nyt-divider-category" style={{ borderBottom: "none", paddingBottom: 0 }}>
        <div style={{ paddingBottom: 10, borderBottom: "2px solid #222" }}>
          <div className="nyt-divider-category-name">{selected}</div>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            style={{
              marginTop: 6,
              border: "1px solid #111",
              background: "transparent",
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Choose another category
          </button>
          {open && (
            <div
              style={{
                marginTop: 8,
                border: "1px solid #111",
                background: "#0f0f0f",
                padding: 8,
                display: "grid",
                gap: 6,
                minWidth: 220,
              }}
            >
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    setSelected(category);
                    setOpen(false);
                  }}
                  style={{
                    border: "none",
                    background: "transparent",
                    textAlign: "left",
                    padding: "4px 6px",
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    cursor: "pointer",
                  }}
                >
                  {category}
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16 }}>
          {(listingsByCategory[selected] ?? []).map((item) => (
            <div key={item.id} style={{ textAlign: "center" }}>
              <Image
                src={item.image}
                alt={item.category}
                width={360}
                height={220}
                style={{ width: "100%", height: "auto", borderRadius: 24 }}
              />
              <div style={{ marginTop: 8, fontSize: 13, color: "#222" }}>
                {item.text}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
