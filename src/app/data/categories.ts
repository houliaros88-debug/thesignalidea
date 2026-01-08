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
  { name: "Food & Drinks", ideas: 0, signals: 0 },
  { name: "Fashion", ideas: 0, signals: 0 },
  { name: "Technology", ideas: 0, signals: 0 },
  { name: "Lifestyle & Wellness", ideas: 0, signals: 0 },
];

export const ideasByCategory: Record<string, Idea[]> = {
  "Food & Drinks": [],
  Fashion: [],
  Technology: [],
  "Lifestyle & Wellness": [],
};
