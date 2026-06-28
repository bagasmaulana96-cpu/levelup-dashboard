"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const navItems = [
  { href: "/dashboard/profil", label: "Profil", icon: "👤" },
  { href: "/dashboard/todo", label: "To-Do", icon: "✅" },
  { href: "/dashboard/keuangan", label: "Keuangan", icon: "💰" },
  { href: "/dashboard/skill", label: "Skill RPG", icon: "⚡" },
];

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);
      setLoading(false);
    };
    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") router.push("/login");
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0a0a0a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>⚡</div>
          <p style={{ color: "#555", fontSize: "14px" }}>Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex" }}>
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 40,
            display: "none",
          }}
          className="mobile-overlay"
        />
      )}

      {/* SIDEBAR */}
      <aside
        style={{
          width: "220px",
          minHeight: "100vh",
          background: "#0f0f0f",
          borderRight: "1px solid #1e1e1e",
          display: "flex",
          flexDirection: "column",
          padding: "1.25rem 0",
          position: "sticky",
          top: 0,
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: "0 1.25rem 1.25rem",
            borderBottom: "1px solid #1a1a1a",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                background: "#1a0d2e",
                border: "1px solid #2d1b4e",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                flexShrink: 0,
              }}
            >
              ⚡
            </div>
            <div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#f0f0f0",
                }}
              >
                LevelUp
              </div>
              <div style={{ fontSize: "11px", color: "#555" }}>Dashboard</div>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <nav
          style={{
            flex: 1,
            padding: "1rem 0.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontSize: "13px",
                  fontWeight: isActive ? "500" : "400",
                  color: isActive ? "#a855f7" : "#888",
                  background: isActive ? "#1a0d2e" : "transparent",
                  border: isActive
                    ? "1px solid #2d1b4e"
                    : "1px solid transparent",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "#141414";
                    e.currentTarget.style.color = "#ccc";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#888";
                  }
                }}
              >
                <span style={{ fontSize: "16px" }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User info + Logout */}
        <div
          style={{
            padding: "1rem 1.25rem 0",
            borderTop: "1px solid #1a1a1a",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              color: "#444",
              marginBottom: "8px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user?.email}
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              background: "transparent",
              border: "1px solid #1e1e1e",
              borderRadius: "8px",
              padding: "8px",
              fontSize: "12px",
              color: "#555",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#3a1a1a";
              e.currentTarget.style.color = "#f87171";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#1e1e1e";
              e.currentTarget.style.color = "#555";
            }}
          >
            Keluar
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main
        style={{
          flex: 1,
          minHeight: "100vh",
          overflow: "auto",
        }}
      >
        {children}
      </main>
    </div>
  );
}
