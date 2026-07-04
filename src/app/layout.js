import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Quantified Scholar",
  description: "Data-driven study tracker.",
  manifest: "/manifest.json",
};

import { AuthProvider } from "../context/AuthContext";
import { TimerProvider } from "../context/TimerContext";
import Navbar from "../components/Navbar";

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <TimerProvider>
            <div style={{ paddingBottom: "80px" }}>
              {children}
            </div>
            <Navbar />
          </TimerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
