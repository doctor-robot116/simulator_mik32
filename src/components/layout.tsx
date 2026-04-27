import React, { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Menu, Moon, Sun, Cpu, CheckCircle2, Edit3, Play, Lock, LogOut, Share2, Layers, Settings2, FileCode2, GitCompareArrows } from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { loadChapters } from "@/lib/data-store";
import type { Chapter } from "@/lib/data";
import { isAdminAuthenticated, logoutAdmin } from "@/lib/admin-auth";
import { AdminLoginModal } from "./admin-login-modal";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location, navigate] = useLocation();
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [completedChapters, setCompletedChapters] = useState<string[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>(() => loadChapters());
  const [adminAuthed, setAdminAuthed] = useState(() => isAdminAuthenticated());
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [pendingNav, setPendingNav] = useState<string | null>(null);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");

    const saved = localStorage.getItem("mik32_progress");
    if (saved) {
      try {
        setCompletedChapters(JSON.parse(saved));
      } catch (e) {}
    }

    const handleStorage = () => {
      const s = localStorage.getItem("mik32_progress");
      if (s) {
        try { setCompletedChapters(JSON.parse(s)); } catch (e) {}
      }
    };

    const handleDataChanged = () => {
      setChapters(loadChapters());
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("mik32_data_changed", handleDataChanged);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("mik32_data_changed", handleDataChanged);
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (isAdminAuthenticated()) {
      navigate("/editor");
    } else {
      setPendingNav("/editor");
      setShowAdminModal(true);
    }
  }, [navigate]);

  const handleAdminSuccess = useCallback(() => {
    setAdminAuthed(true);
    setShowAdminModal(false);
    if (pendingNav) {
      navigate(pendingNav);
      setPendingNav(null);
    }
  }, [pendingNav, navigate]);

  const handleAdminClose = useCallback(() => {
    setShowAdminModal(false);
    setPendingNav(null);
  }, []);

  const handleLogout = useCallback(() => {
    logoutAdmin();
    setAdminAuthed(false);
    if (location === "/editor") navigate("/");
  }, [location, navigate]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-y-auto py-4">
      <div className="px-4 mb-6">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Главы курса
        </h2>
        <nav className="space-y-1">
          {chapters.map((chapter, index) => {
            const isCompleted = completedChapters.includes(chapter.id);
            const isActive = location === `/chapter/${chapter.id}`;
            return (
              <Link key={chapter.id} href={`/chapter/${chapter.id}`} onClick={() => setMobileMenuOpen(false)}>
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <div className="flex-shrink-0 w-5 flex items-center justify-center">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    ) : (
                      <span className="text-xs text-muted-foreground">{index + 1}.</span>
                    )}
                  </div>
                  <span className="truncate">{chapter.title}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="px-4 mt-auto pt-4 border-t border-border space-y-1">
        <Link href="/simulator" onClick={() => setMobileMenuOpen(false)}>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
            location === "/simulator" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}>
            <Play className="w-4 h-4 shrink-0" />
            <span>Симулятор кода</span>
          </div>
        </Link>
        <Link href="/diagram" onClick={() => setMobileMenuOpen(false)}>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
            location === "/diagram" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}>
            <Share2 className="w-4 h-4 shrink-0" />
            <span>Редактор схем</span>
          </div>
        </Link>
        <Link href="/elements" onClick={() => setMobileMenuOpen(false)}>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
            location === "/elements" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}>
            <Layers className="w-4 h-4 shrink-0" />
            <span>Компоненты</span>
          </div>
        </Link>
        <Link href="/config-tools" onClick={() => setMobileMenuOpen(false)}>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
            location === "/config-tools" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}>
            <Settings2 className="w-4 h-4 shrink-0" />
            <span>Конфигуратор МК</span>
          </div>
        </Link>
        <Link href="/sdk" onClick={() => setMobileMenuOpen(false)}>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
            location === "/sdk" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}>
            <FileCode2 className="w-4 h-4 shrink-0" />
            <span>SDK MIK32V2</span>
          </div>
        </Link>
        <Link href="/baremetal" onClick={() => setMobileMenuOpen(false)}>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
            location === "/baremetal" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}>
            <Cpu className="w-4 h-4 shrink-0" />
            <span>Bare-metal SDK</span>
          </div>
        </Link>
        <Link href="/compare" onClick={() => setMobileMenuOpen(false)}>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
            location === "/compare" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}>
            <GitCompareArrows className="w-4 h-4 shrink-0" />
            <span>HAL vs Baremetal</span>
          </div>
        </Link>
        <div
          onClick={handleEditorClick}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
            location === "/editor" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Edit3 className="w-4 h-4 shrink-0" />
          <span>Редактор курса</span>
          {!adminAuthed && <Lock className="w-3 h-3 shrink-0 ml-auto opacity-50" />}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 md:px-6">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden mr-2">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <div className="flex items-center p-4 border-b border-border">
                <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                  <div className="flex items-center gap-2 font-bold cursor-pointer">
                    <Cpu className="h-5 w-5 text-primary" />
                    <span>MIK32V2</span>
                  </div>
                </Link>
              </div>
              <SidebarContent />
            </SheetContent>
          </Sheet>

          <Link href="/">
            <div className="flex items-center gap-2 font-bold text-lg cursor-pointer">
              <Cpu className="h-6 w-6 text-primary" />
              <span className="hidden md:inline-block">MIK32 SDK Курс</span>
              <span className="md:hidden">MIK32</span>
            </div>
          </Link>

          <div className="flex-1" />

          <Link href="/simulator">
            <Button variant="ghost" size="sm" className="hidden md:flex items-center gap-1.5 text-muted-foreground hover:text-foreground mr-1">
              <Play className="h-4 w-4" />
              <span className="text-sm">Симулятор</span>
            </Button>
          </Link>
          <Link href="/diagram">
            <Button variant="ghost" size="sm" className="hidden md:flex items-center gap-1.5 text-muted-foreground hover:text-foreground mr-1">
              <Share2 className="h-4 w-4" />
              <span className="text-sm">Схемы</span>
            </Button>
          </Link>
          <Link href="/elements">
            <Button variant="ghost" size="sm" className="hidden md:flex items-center gap-1.5 text-muted-foreground hover:text-foreground mr-1">
              <Layers className="h-4 w-4" />
              <span className="text-sm">Компоненты</span>
            </Button>
          </Link>
          <Link href="/config-tools">
            <Button variant="ghost" size="sm" className="hidden md:flex items-center gap-1.5 text-muted-foreground hover:text-foreground mr-1">
              <Settings2 className="h-4 w-4" />
              <span className="text-sm">Конфигуратор</span>
            </Button>
          </Link>
          <button onClick={handleEditorClick}>
            <Button variant="ghost" size="sm" className="hidden md:flex items-center gap-1.5 text-muted-foreground hover:text-foreground mr-1" asChild>
              <span>
                <Edit3 className="h-4 w-4" />
                <span className="text-sm">Редактор</span>
                {!adminAuthed && <Lock className="h-3 w-3 opacity-50" />}
              </span>
            </Button>
          </button>

          {adminAuthed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="hidden md:flex items-center gap-1.5 text-muted-foreground hover:text-red-400 mr-1"
              title="Выйти из режима администратора"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}

          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 flex-shrink-0 border-r border-border">
          <div className="sticky top-14 h-[calc(100vh-3.5rem)]">
            <SidebarContent />
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 w-full min-w-0">
          {children}
        </main>
      </div>

      {/* Admin Login Modal */}
      <AdminLoginModal
        open={showAdminModal}
        onSuccess={handleAdminSuccess}
        onClose={handleAdminClose}
      />
    </div>
  );
}
