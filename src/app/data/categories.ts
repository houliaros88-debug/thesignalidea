export type Category = {
  name: string;
  ideas: number;
  signals: number;
};

export type Idea = {
  id: string;
  title: string;
  description: string;
  user: string;
  signals: number;
  votes: number;
};

export const categories: Category[] = [
  { name: "Food & Drinks", ideas: 12840, signals: 90512 },
  { name: "Fashion", ideas: 9420, signals: 70118 },
  { name: "Technology", ideas: 15630, signals: 118906 },
  { name: "Lifestyle & Wellness", ideas: 8840, signals: 65210 },
];

export const ideasByCategory: Record<string, Idea[]> = {
  "Food & Drinks": Array.from({ length: 10 }).map((_, i) => ({
    id: `food-${i + 1}`,
    title: `Food & Drinks Idea ${i + 1}`,
    description:
      "A fresh concept for flavors, formats, or experiences in food and drink.",
    user: `User ${i + 1}`,
    signals: 120 + i * 9,
    votes: 48 + i * 4,
  })),
  Fashion: Array.from({ length: 10 }).map((_, i) => ({
    id: `fashion-${i + 1}`,
    title: `Fashion Idea ${i + 1}`,
    description:
      "A new take on style, materials, or the way people wear and buy fashion.",
    user: `User ${i + 1}`,
    signals: 98 + i * 7,
    votes: 36 + i * 3,
  })),
  Technology: Array.from({ length: 10 }).map((_, i) => ({
    id: `tech-${i + 1}`,
    title: `Technology Idea ${i + 1}`,
    description:
      "A product or system that solves a real problem with smart technology.",
    user: `User ${i + 1}`,
    signals: 160 + i * 11,
    votes: 62 + i * 5,
  })),
  "Lifestyle & Wellness": Array.from({ length: 10 }).map((_, i) => ({
    id: `life-${i + 1}`,
    title: `Lifestyle & Wellness Idea ${i + 1}`,
    description:
      "A simple improvement to daily routines, habits, or personal wellbeing.",
    user: `User ${i + 1}`,
    signals: 110 + i * 8,
    votes: 41 + i * 3,
  })),
};
