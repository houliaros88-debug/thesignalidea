// ...existing code...
import { Geist, Geist_Mono } from "next/font/google";
import { CategoryProvider } from "./components/CategoryContext";
import HeaderShell from "./components/HeaderShell";
import { HomeTabProvider } from "./components/HomeTabContext";
import AuthGate from "./components/AuthGate";
import Header from "./components/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ...existing code...

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <CategoryProvider>
          <HomeTabProvider>
            <HeaderShell />
            <AuthGate>
              <main>{children}</main>
            </AuthGate>
          </HomeTabProvider>
        </CategoryProvider>
      </body>
    </html>
  );
}
