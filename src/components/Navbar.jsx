import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth, useClerk } from "@clerk/clerk-react";
import { useProfile } from "../hooks/useAuth";

export default function Navbar({ savedCount = 0, alertCount = 0 }) {
  const { isSignedIn } = useAuth();
  const { signOut }    = useClerk();
  const { profile }    = useProfile();
  const location       = useLocation();
  const navigate       = useNavigate();
  const [menu, setMenu] = useState(false);

  const isAdmin = profile?.role === "admin" || profile?.role === "superadmin";
  const isLandlord = ["landlord","caretaker","agent"].includes(profile?.role);

  async function handleSignOut() {
    await signOut();
    navigate("/auth");
  }

  const path = location.pathname;

  return (
    <>
      <style>{CSS}</style>
      <header className="nav-bar">
        {/* Logo */}
        <Link to="/" className="nav-brand">
          <div className="nav-logo">N</div>
          <div>
            <div className="nav-brand-name">NestList</div>
            <div className="nav-brand-sub">Kenya Rentals</div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="nav-links">
          <Link to="/" className={`nav-link ${path==="/"?"nav-link-on":""}`}>Browse</Link>
          {isLandlord && (
            <Link to="/dashboard" className={`nav-link ${path==="/dashboard"?"nav-link-on":""}`}>Dashboard</Link>
          )}
          {isAdmin && (
            <Link to="/admin" className={`nav-link ${path==="/admin"?"nav-link-on":""}`}>Admin</Link>
          )}
        </nav>

        {/* Right side */}
        <div className="nav-right">
          {isSignedIn ? (
            <>
              {savedCount > 0 && (
                <div className="nav-icon-wrap">
                  <span className="nav-icon-btn">❤️</span>
                  <span className="nav-badge">{savedCount}</span>
                </div>
              )}
              {alertCount > 0 && (
                <div className="nav-icon-wrap">
                  <span className="nav-icon-btn">🔔</span>
                  <span className="nav-badge">{alertCount}</span>
                </div>
              )}

              {/* Avatar dropdown */}
              <div className="nav-avatar-wrap">
                <button className="nav-avatar" onClick={() => setMenu(m => !m)}>
                  {(profile?.full_name || "U")[0].toUpperCase()}
                </button>
                {menu && (
                  <>
                    <div className="nav-dropdown-overlay" onClick={() => setMenu(false)} />
                    <div className="nav-dropdown">
                      <div className="nav-dropdown-hd">
                        <div className="nav-dropdown-name">{profile?.full_name || "User"}</div>
                        <div className="nav-dropdown-role">{profile?.role || "Member"}</div>
                      </div>
                      <div className="nav-dropdown-divider" />
                      {isLandlord && (
                        <Link to="/dashboard" className="nav-dropdown-item" onClick={() => setMenu(false)}>
                          🏠 My Dashboard
                        </Link>
                      )}
                      {isAdmin && (
                        <Link to="/admin" className="nav-dropdown-item" onClick={() => setMenu(false)}>
                          ⚙️ Admin Panel
                        </Link>
                      )}
                      <div className="nav-dropdown-divider" />
                      <button className="nav-dropdown-item nav-signout" onClick={handleSignOut}>
                        🚪 Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div style={{ display:"flex", gap:8 }}>
              <Link to="/auth" className="nav-signin-btn">Sign In</Link>
              <Link to="/auth" className="nav-signup-btn">Sign Up Free</Link>
            </div>
          )}
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        <Link to="/" className={`mobile-nav-item ${path==="/"?"mobile-nav-on":""}`}>
          <span>🏠</span><span>Browse</span>
        </Link>
        <Link to="/" className={`mobile-nav-item`} onClick={e => { e.preventDefault(); document.querySelector(".br-search-inp")?.focus(); }}>
          <span>🔍</span><span>Search</span>
        </Link>
        {isSignedIn && isLandlord ? (
          <Link to="/post-listing" className="mobile-nav-post">
            <span style={{ fontSize:22 }}>+</span>
          </Link>
        ) : (
          <Link to="/auth" className="mobile-nav-post">
            <span style={{ fontSize:22 }}>+</span>
          </Link>
        )}
        {isSignedIn && isLandlord ? (
          <Link to="/dashboard" className={`mobile-nav-item ${path==="/dashboard"?"mobile-nav-on":""}`}>
            <span>📋</span><span>Listings</span>
          </Link>
        ) : (
          <div className="mobile-nav-item" />
        )}
        {isSignedIn ? (
          <button className="mobile-nav-item" onClick={() => setMenu(m => !m)} style={{ background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>
            <span>👤</span><span>Profile</span>
          </button>
        ) : (
          <Link to="/auth" className={`mobile-nav-item ${path==="/auth"?"mobile-nav-on":""}`}>
            <span>👤</span><span>Sign In</span>
          </Link>
        )}
      </nav>

      {/* Mobile menu */}
      {menu && (
        <div className="mobile-menu-overlay" onClick={() => setMenu(false)}>
          <div className="mobile-menu" onClick={e => e.stopPropagation()}>
            <div className="nav-dropdown-hd">
              <div className="nav-dropdown-name">{profile?.full_name || "User"}</div>
              <div className="nav-dropdown-role" style={{ textTransform:"capitalize" }}>{profile?.role}</div>
            </div>
            <div className="nav-dropdown-divider" />
            {isLandlord && <Link to="/dashboard" className="nav-dropdown-item" onClick={() => setMenu(false)}>🏠 My Dashboard</Link>}
            {isAdmin && <Link to="/admin" className="nav-dropdown-item" onClick={() => setMenu(false)}>⚙️ Admin Panel</Link>}
            <div className="nav-dropdown-divider" />
            <button className="nav-dropdown-item nav-signout" onClick={handleSignOut}>🚪 Sign Out</button>
          </div>
        </div>
      )}
    </>
  );
}

const CSS = `
  .nav-bar{position:sticky;top:0;z-index:90;background:rgba(255,255,255,.92);backdrop-filter:blur(20px);border-bottom:1px solid #E5E7EB;padding:0 24px;height:64px;display:flex;align-items:center;justify-content:space-between;gap:16px;}
  .nav-brand{display:flex;align-items:center;gap:10px;text-decoration:none;flex-shrink:0;}
  .nav-logo{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#1E6B4A,#34D399);color:#fff;font-size:18px;font-weight:900;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 12px rgba(30,107,74,.3);}
  .nav-brand-name{font-family:'DM Serif Display',serif;font-size:18px;font-weight:700;color:#111827;line-height:1;}
  .nav-brand-sub{font-size:10px;color:#9CA3AF;line-height:1;}
  .nav-links{display:flex;align-items:center;gap:4px;}
  .nav-link{padding:7px 14px;border-radius:8px;font-size:13px;font-weight:600;color:#6B7280;text-decoration:none;transition:all .15s;}
  .nav-link:hover{background:#F0FDF4;color:#1E6B4A;}
  .nav-link-on{background:#F0FDF4!important;color:#1E6B4A!important;}
  .nav-right{display:flex;align-items:center;gap:10px;flex-shrink:0;}
  .nav-icon-wrap{position:relative;}
  .nav-icon-btn{font-size:20px;cursor:pointer;}
  .nav-badge{position:absolute;top:-6px;right:-6px;width:16px;height:16px;border-radius:50%;background:#DC2626;color:#fff;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid #fff;}
  .nav-avatar-wrap{position:relative;}
  .nav-avatar{width:36px;height:36px;border-radius:50%;background:#D1FAE5;color:#1E6B4A;font-size:15px;font-weight:700;border:2px solid #A7F3D0;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;}
  .nav-avatar:hover{transform:scale(1.05);}
  .nav-dropdown-overlay{position:fixed;inset:0;z-index:98;}
  .nav-dropdown{position:absolute;top:calc(100% + 8px);right:0;background:#fff;border:1px solid #E5E7EB;border-radius:14px;min-width:200px;box-shadow:0 8px 32px rgba(0,0,0,.1);z-index:99;overflow:hidden;}
  .nav-dropdown-hd{padding:14px 16px;}
  .nav-dropdown-name{font-size:14px;font-weight:700;color:#111827;}
  .nav-dropdown-role{font-size:11px;color:#9CA3AF;text-transform:capitalize;margin-top:2px;}
  .nav-dropdown-divider{height:1px;background:#F3F4F6;}
  .nav-dropdown-item{display:block;padding:11px 16px;font-size:13px;color:#374151;text-decoration:none;cursor:pointer;transition:background .1s;background:transparent;border:none;width:100%;text-align:left;font-family:inherit;font-weight:500;}
  .nav-dropdown-item:hover{background:#F9FAFB;}
  .nav-signout{color:#DC2626!important;}
  .nav-signin-btn{padding:8px 16px;border:1.5px solid #E5E7EB;border-radius:9px;font-size:13px;font-weight:600;color:#374151;text-decoration:none;transition:all .15s;}
  .nav-signin-btn:hover{border-color:#1E6B4A;color:#1E6B4A;}
  .nav-signup-btn{padding:8px 16px;background:#1E6B4A;border-radius:9px;font-size:13px;font-weight:700;color:#fff;text-decoration:none;transition:all .15s;box-shadow:0 2px 8px rgba(30,107,74,.3);}
  .nav-signup-btn:hover{background:#165438;}

  /* Mobile bottom nav */
  .mobile-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:rgba(255,255,255,.95);backdrop-filter:blur(20px);border-top:1px solid #E5E7EB;padding:8px 0 max(8px,env(safe-area-inset-bottom));z-index:90;grid-template-columns:repeat(5,1fr);}
  .mobile-nav-item{display:flex;flex-direction:column;align-items:center;gap:3px;font-size:10px;font-weight:600;color:#9CA3AF;text-decoration:none;padding:4px 0;transition:color .15s;}
  .mobile-nav-item span:first-child{font-size:22px;}
  .mobile-nav-on{color:#1E6B4A!important;}
  .mobile-nav-post{display:flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#1E6B4A,#34D399);color:#fff;text-decoration:none;margin:-14px auto 0;box-shadow:0 4px 16px rgba(30,107,74,.4);}
  .mobile-menu-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:200;display:flex;align-items:flex-end;}
  .mobile-menu{background:#fff;border-radius:20px 20px 0 0;width:100%;padding:24px;padding-bottom:max(24px,env(safe-area-inset-bottom));}

  @media(max-width:768px){
    .nav-links{display:none;}
    .nav-bar{padding:0 16px;}
    .mobile-nav{display:grid;}
    .nav-signin-btn{display:none;}
  }
  @media(min-width:769px){
    .mobile-nav{display:none!important;}
  }
`;
