// ── ToastContainer.jsx ────────────────────────────────────────────────────────
import { useEffect } from "react";

export default function ToastContainer({ toasts = [], onRemove }) {
  return (
    <>
      <style>{TOAST_CSS}</style>
      <div className="toast-stack">
        {toasts.map(t => (
          <Toast key={t.id} toast={t} onRemove={onRemove} />
        ))}
      </div>
    </>
  );
}

function Toast({ toast, onRemove }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove?.(toast.id), 3200);
    return () => clearTimeout(timer);
  }, []);

  const icons = { success:"✅", error:"⚠️", info:"ℹ️", warning:"⚠️" };
  const colors = {
    success: { bg:"#F0FDF4", border:"#A7F3D0", color:"#065F46" },
    error:   { bg:"#FEF2F2", border:"#FECACA", color:"#DC2626" },
    info:    { bg:"#EFF6FF", border:"#BFDBFE", color:"#1D4ED8" },
    warning: { bg:"#FFFBEB", border:"#FDE68A", color:"#92400E" },
  };
  const c = colors[toast.type] || colors.success;

  return (
    <div className="toast-item" style={{ background:c.bg, border:`1px solid ${c.border}`, color:c.color }}>
      <span>{icons[toast.type] || "✅"}</span>
      <span style={{ flex:1 }}>{toast.msg}</span>
      <button className="toast-x" onClick={() => onRemove?.(toast.id)} style={{ color:c.color }}>✕</button>
    </div>
  );
}

const TOAST_CSS = `
  .toast-stack{position:fixed;top:80px;right:16px;display:flex;flex-direction:column;gap:8px;z-index:9999;max-width:320px;}
  .toast-item{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:12px;font-size:13px;font-weight:500;box-shadow:0 4px 16px rgba(0,0,0,.1);animation:toastIn .35s cubic-bezier(.34,1.56,.64,1);font-family:'Plus Jakarta Sans',system-ui,sans-serif;}
  @keyframes toastIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
  .toast-x{background:none;border:none;cursor:pointer;font-size:12px;padding:2px 4px;border-radius:4px;opacity:.7;flex-shrink:0;}
  .toast-x:hover{opacity:1;}
  @media(max-width:480px){.toast-stack{right:12px;left:12px;max-width:none;}}
`;
