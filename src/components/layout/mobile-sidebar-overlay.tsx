"use client";

interface MobileSidebarOverlayProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function MobileSidebarOverlay({
  open,
  onClose,
  children,
}: MobileSidebarOverlayProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sidebar content */}
      <div className="relative z-50">{children}</div>
    </div>
  );
}
