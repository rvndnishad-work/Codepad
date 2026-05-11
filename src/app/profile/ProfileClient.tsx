"use client";

import React, { useState } from "react";
import {
  User,
  Mail,
  MapPin,
  Link as LinkIcon,
  Github,
  Twitter,
  Camera,
  Save,
  ArrowLeft,
  Settings,
  Shield,
  Bell,
  Globe,
  ExternalLink,
  Code,
  Briefcase,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function ProfileClient({ user }: { user: any }) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "settings" | "security">("profile");
  
  // Mock User Data combined with session data
  const [profile, setProfile] = useState({
    name: user?.name || "Arvin",
    username: user?.username || "arvin_banana",
    email: user?.email || "arvin@nanabanana.pro",
    bio: "Senior Architect & Code Crafter. Building the future of rapid prototyping at Nano Banana Pro. 🍌",
    location: "San Francisco, CA",
    website: "https://nanabanana.pro",
    github: "arvin_dev",
    twitter: "arvin_banana",
    avatar: user?.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'arvin'}`,
    banner: "linear-gradient(135deg, #FFE600 0%, #FFD700 100%)",
    stats: {
      snippets: 42,
      followers: 1204,
      following: 89
    }
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    toast.success("Profile updated successfully!");
  };

  return (
    <div className="bg-bg text-fg selection:bg-accent selection:text-black">
      <main className="max-w-6xl mx-auto px-4 pt-24 pb-20">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            href="/dashboard" 
            className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-muted hover:text-accent hover:border-accent/30 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Account Settings</h1>
            <p className="text-xs font-black uppercase tracking-widest text-muted/40">Manage your profile and preferences</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
          {/* Sidebar Tabs */}
          <aside className="space-y-2">
            {[
              { id: "profile", label: "Public Profile", icon: User },
              { id: "settings", label: "Preferences", icon: Settings },
              { id: "security", label: "Security", icon: Shield },
              { id: "notifications", label: "Notifications", icon: Bell },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border ${
                  activeTab === tab.id
                    ? "bg-accent/10 border-accent text-accent shadow-[0_0_20px_var(--accent-glow)]"
                    : "bg-surface/50 border-border text-muted hover:bg-surface hover:text-fg"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}

            <div className="pt-4 mt-4 border-t border-border space-y-2">
              <div className="px-4 text-[9px] font-black uppercase tracking-[0.2em] text-muted/40 mb-1">
                Portfolio
              </div>
              <Link
                href="/profile/portfolio"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border bg-surface/50 border-border text-muted hover:bg-surface hover:text-fg"
              >
                <Briefcase className="w-4 h-4" />
                Portfolio Settings
              </Link>
              {user?.id && (
                <Link
                  href={`/u/${user.id}`}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border bg-surface/50 border-border text-muted hover:bg-surface hover:text-fg"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Public Profile
                </Link>
              )}
            </div>
          </aside>

          {/* Main Content Area */}
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Profile Header Card */}
            <div className="bg-surface border border-border rounded-[2.5rem] overflow-hidden shadow-2xl relative">
              {/* Banner */}
              <div 
                className="h-32 w-full opacity-80"
                style={{ background: profile.banner }}
              />
              
              <div className="px-8 pb-8 flex flex-col md:flex-row gap-6 -mt-12 relative z-10">
                {/* Avatar with Upload */}
                <div className="relative group">
                  <div className="w-32 h-32 rounded-[2rem] border-[6px] border-surface bg-panel overflow-hidden shadow-xl">
                    <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                  </div>
                  <button className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem] text-white">
                    <Camera className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex-1 pt-14">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                        {profile.name}
                        <div className="px-2 py-0.5 rounded-md bg-accent text-black text-[10px] font-black uppercase tracking-tighter">PRO</div>
                      </h2>
                      <p className="text-muted text-sm font-medium">@{profile.username}</p>
                    </div>
                    
                    <div className="flex gap-3">
                      <div className="px-4 py-2 rounded-2xl bg-panel border border-border text-center">
                        <div className="text-lg font-black text-fg">{profile.stats.snippets}</div>
                        <div className="text-[8px] font-black uppercase tracking-widest text-muted/40">Snippets</div>
                      </div>
                      <div className="px-4 py-2 rounded-2xl bg-panel border border-border text-center">
                        <div className="text-lg font-black text-fg">{profile.stats.followers}</div>
                        <div className="text-[8px] font-black uppercase tracking-widest text-muted/40">Followers</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Edit Form */}
            <div className="bg-surface border border-border rounded-[2.5rem] p-8 shadow-2xl">
              <form onSubmit={handleSave} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Name Input */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/60 flex items-center gap-2">
                      <User className="w-3 h-3" /> Full Name
                    </label>
                    <input 
                      type="text" 
                      value={profile.name}
                      onChange={(e) => setProfile({...profile, name: e.target.value})}
                      className="w-full bg-panel border border-border rounded-2xl px-5 py-4 text-sm font-bold text-fg focus:border-accent focus:ring-1 focus:ring-accent transition-all outline-none"
                    />
                  </div>

                  {/* Username Input */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/60 flex items-center gap-2">
                      <Globe className="w-3 h-3" /> Username
                    </label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-muted font-bold text-sm">@</span>
                      <input 
                        type="text" 
                        value={profile.username}
                        onChange={(e) => setProfile({...profile, username: e.target.value})}
                        className="w-full bg-panel border border-border rounded-2xl pl-10 pr-5 py-4 text-sm font-bold text-fg focus:border-accent focus:ring-1 focus:ring-accent transition-all outline-none"
                      />
                    </div>
                  </div>

                  {/* Email Input */}
                  <div className="space-y-3 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/60 flex items-center gap-2">
                      <Mail className="w-3 h-3" /> Email Address
                    </label>
                    <input 
                      type="email" 
                      value={profile.email}
                      disabled
                      className="w-full bg-panel border border-border rounded-2xl px-5 py-4 text-sm font-bold text-muted/50 cursor-not-allowed"
                    />
                    <p className="text-[10px] text-muted/40 font-medium italic">Contact support to change your verified email address.</p>
                  </div>

                  {/* Bio Textarea */}
                  <div className="space-y-3 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/60 flex items-center gap-2">
                      <Code className="w-3 h-3" /> Bio
                    </label>
                    <textarea 
                      value={profile.bio}
                      onChange={(e) => setProfile({...profile, bio: e.target.value})}
                      rows={4}
                      className="w-full bg-panel border border-border rounded-2xl px-5 py-4 text-sm font-bold text-fg focus:border-accent focus:ring-1 focus:ring-accent transition-all outline-none resize-none"
                    />
                  </div>

                  {/* Location */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/60 flex items-center gap-2">
                      <MapPin className="w-3 h-3" /> Location
                    </label>
                    <input 
                      type="text" 
                      value={profile.location}
                      onChange={(e) => setProfile({...profile, location: e.target.value})}
                      className="w-full bg-panel border border-border rounded-2xl px-5 py-4 text-sm font-bold text-fg focus:border-accent focus:ring-1 focus:ring-accent transition-all outline-none"
                    />
                  </div>

                  {/* Website */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/60 flex items-center gap-2">
                      <LinkIcon className="w-3 h-3" /> Website
                    </label>
                    <input 
                      type="url" 
                      value={profile.website}
                      onChange={(e) => setProfile({...profile, website: e.target.value})}
                      className="w-full bg-panel border border-border rounded-2xl px-5 py-4 text-sm font-bold text-fg focus:border-accent focus:ring-1 focus:ring-accent transition-all outline-none"
                    />
                  </div>

                  {/* Social Links */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/60 flex items-center gap-2">
                      <Github className="w-3 h-3" /> GitHub
                    </label>
                    <input 
                      type="text" 
                      value={profile.github}
                      onChange={(e) => setProfile({...profile, github: e.target.value})}
                      className="w-full bg-panel border border-border rounded-2xl px-5 py-4 text-sm font-bold text-fg focus:border-accent focus:ring-1 focus:ring-accent transition-all outline-none"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/60 flex items-center gap-2">
                      <Twitter className="w-3 h-3" /> Twitter
                    </label>
                    <input 
                      type="text" 
                      value={profile.twitter}
                      onChange={(e) => setProfile({...profile, twitter: e.target.value})}
                      className="w-full bg-panel border border-border rounded-2xl px-5 py-4 text-sm font-bold text-fg focus:border-accent focus:ring-1 focus:ring-accent transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-border flex items-center justify-between">
                  <div className="text-[10px] text-muted/40 font-black uppercase tracking-widest flex items-center gap-2">
                    <Shield className="w-3 h-3" /> Data is stored securely
                  </div>
                  <button 
                    disabled={loading}
                    className="flex items-center gap-3 px-8 py-4 bg-accent text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-[0_10px_30px_var(--accent-glow)] disabled:opacity-50 disabled:cursor-wait"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-500/5 border border-red-500/10 rounded-[2.5rem] p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-lg font-black text-red-400 tracking-tight">Delete Account</h3>
                  <p className="text-[11px] text-red-400/60 font-medium">Permanently remove your profile, snippets, and data.</p>
                </div>
                <button className="px-6 py-3 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-red-500/10 transition-all">
                  Terminate Account
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
