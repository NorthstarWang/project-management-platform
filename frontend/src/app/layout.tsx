import type { Metadata } from "next";
import { Alike, Mulish } from "next/font/google";
import { Theme } from "@radix-ui/themes";
import { ToastProvider } from "@/components/ui/CustomToast";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { GlobalOverlayProvider } from "@/components/providers/GlobalOverlayProvider";
import "@radix-ui/themes/styles.css";
import "./globals.css";

const alike = Alike({
  weight: "400",
  variable: "--font-alike",
  subsets: ["latin"],
  display: "swap",
});

const mulish = Mulish({
  variable: "--font-mulish",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Project Management Platform",
  description: "A comprehensive project management and task tracking platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${alike.variable} ${mulish.variable} antialiased`}
      >
        <GlobalOverlayProvider>
          <ThemeProvider>
            <Theme
              radius="medium"
              scaling="100%"
              panelBackground="solid"
              hasBackground={false}
            >
              <ProtectedRoute>
                {children}
              </ProtectedRoute>
              <ToastProvider />
            </Theme>
          </ThemeProvider>
        </GlobalOverlayProvider>
      </body>
    </html>
  );
}
