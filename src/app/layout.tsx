import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { ToastProvider } from "@/components/toast-provider";
import { hydrateDemoSessionFromCookie } from "@/lib/demo-session";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const sans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StoryTurn",
  description:
    "Know whose night it is, keep your family library, and never lose the bedtime reading rotation.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  await hydrateDemoSessionFromCookie();

  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
