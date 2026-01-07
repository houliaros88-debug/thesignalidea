import { CategoryProvider } from "./components/CategoryContext";
import HeaderShell from "./components/HeaderShell";
import { HomeTabProvider } from "./components/HomeTabContext";
import AuthGate from "./components/AuthGate";
import Header from "./components/Header";
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
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
