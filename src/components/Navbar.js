"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const navItems = [
    { 
      name: "Focus", 
      path: "/", 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> 
    },
    { 
      name: "Analytics", 
      path: "/dashboard", 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> 
    },
    { 
      name: "Profile", 
      path: "/profile", 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> 
    }
  ];

  return (
    <nav style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: "var(--bg-color)",
      borderTop: "1px solid var(--border-color)",
      display: "flex",
      justifyContent: "space-around",
      alignItems: "center",
      padding: "0.8rem 1rem",
      paddingBottom: "max(0.8rem, env(safe-area-inset-bottom))",
      zIndex: 1000,
      boxShadow: "0 -4px 6px -1px rgba(0, 0, 0, 0.1)"
    }}>
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        return (
          <Link 
            href={item.path} 
            key={item.name}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textDecoration: "none",
              color: isActive ? "var(--accent-color)" : "var(--text-color)",
              opacity: isActive ? 1 : 0.6,
              transition: "all 0.2s ease"
            }}
          >
            <span style={{ fontSize: "1.5rem", marginBottom: "0.2rem", filter: isActive ? "none" : "grayscale(100%)" }}>
              {item.icon}
            </span>
            <span style={{ fontSize: "0.75rem", fontWeight: isActive ? "600" : "400" }}>
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
