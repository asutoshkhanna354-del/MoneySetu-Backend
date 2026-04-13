import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAdminGetUsers,
  useAdminGetTransactions,
  useAdminApproveTransaction,
  useAdminRejectTransaction,
  useGetInvestmentPlans,
  useAdminCreateInvestmentPlan,
  useAdminUpdateInvestmentPlan,
  useAdminDeleteInvestmentPlan,
  useAdminUpdateUserBalance,
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Check, X, ShieldAlert, Users, ArrowRightLeft, Zap, Plus, Pencil, Trash2, IndianRupee, Activity, Settings2, Gift, ToggleLeft, ToggleRight } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface PlanForm {
  name: string;
  description: string;
  minAmount: string;
  maxAmount: string;
  dailyReturnPercent: string;
  durationDays: string;
  imageUrl: string;
}

const emptyForm: PlanForm = {
  name: "",
  description: "",
  minAmount: "",
  maxAmount: "",
  dailyReturnPercent: "",
  durationDays: "",
  imageUrl: "",
};

function ContactSettingsPanel() {
  const { toast } = useToast();
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [telegram, setTelegram] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/settings/contact")
      .then(r => r.json())
      .then(d => { setWhatsapp(d.whatsapp || ""); setInstagram(d.instagram || ""); setTelegram(d.telegram || ""); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem("ev_token");
      const res = await fetch("/api/admin/settings/contact", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ whatsapp: whatsapp.trim(), instagram: instagram.trim(), telegram: telegram.trim() }),
      });
      if (res.ok) {
        toast({ title: "Contact settings saved!" });
      } else {
        toast({ title: "Failed to save", variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="font-bold text-lg px-1">Contact Settings</h3>

      <div className="p-5 rounded-2xl space-y-5" style={{ background: "var(--theme-card)", border: "1px solid var(--theme-border)" }}>
        <p className="text-sm" style={{ color: "var(--theme-t3)" }}>
          Set the WhatsApp, Instagram and Telegram links shown on the "Contact Us" button. Leave blank to disable a channel.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          {/* WhatsApp */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--theme-t3)" }}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ background: "#25D366", fontSize: 10 }}>W</span>
              WhatsApp Link
            </label>
            <Input
              placeholder="https://wa.me/919999999999"
              value={loaded ? whatsapp : "Loading..."}
              onChange={e => setWhatsapp(e.target.value)}
              disabled={!loaded}
              className="rounded-xl h-10 text-sm"
              style={{ background: "rgba(37,211,102,0.05)", borderColor: whatsapp ? "rgba(37,211,102,0.3)" : undefined }}
            />
            <p className="text-xs" style={{ color: "var(--theme-t4)" }}>
              Format: https://wa.me/91XXXXXXXXXX (include country code, no spaces or dashes)
            </p>
          </div>

          {/* Instagram */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--theme-t3)" }}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ background: "linear-gradient(135deg,#fd5949,#d6249f,#285AEB)", fontSize: 10 }}>IG</span>
              Instagram Link
            </label>
            <Input
              placeholder="https://instagram.com/yourusername"
              value={loaded ? instagram : "Loading..."}
              onChange={e => setInstagram(e.target.value)}
              disabled={!loaded}
              className="rounded-xl h-10 text-sm"
              style={{ background: "rgba(214,36,159,0.05)", borderColor: instagram ? "rgba(214,36,159,0.3)" : undefined }}
            />
            <p className="text-xs" style={{ color: "var(--theme-t4)" }}>
              Format: https://instagram.com/yourusername or https://instagram.com/p/postid
            </p>
          </div>

          {/* Telegram */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--theme-t3)" }}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ background: "#29B6F6", fontSize: 10 }}>TG</span>
              Telegram Link
            </label>
            <Input
              placeholder="https://t.me/yourusername"
              value={loaded ? telegram : "Loading..."}
              onChange={e => setTelegram(e.target.value)}
              disabled={!loaded}
              className="rounded-xl h-10 text-sm"
              style={{ background: "rgba(41,182,246,0.05)", borderColor: telegram ? "rgba(41,182,246,0.3)" : undefined }}
            />
            <p className="text-xs" style={{ color: "var(--theme-t4)" }}>
              Format: https://t.me/yourusername or https://t.me/yourchannel
            </p>
          </div>

          {/* Status preview */}
          <div className="flex flex-wrap gap-3 pt-1">
            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${whatsapp ? "bg-green-900/30 text-green-400" : "bg-white/5 text-white/30"}`}>
              WhatsApp: {whatsapp ? "Enabled" : "Disabled"}
            </span>
            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${instagram ? "bg-pink-900/30 text-pink-400" : "bg-white/5 text-white/30"}`}>
              Instagram: {instagram ? "Enabled" : "Disabled"}
            </span>
            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${telegram ? "bg-sky-900/30 text-sky-400" : "bg-white/5 text-white/30"}`}>
              Telegram: {telegram ? "Enabled" : "Disabled"}
            </span>
          </div>

          <Button type="submit" disabled={saving || !loaded} className="w-full rounded-xl bg-primary font-bold">
            {saving ? "Saving..." : "Save Contact Settings"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function ClearProcessingButton({ onCleared }: { onCleared: () => void }) {
  const { toast } = useToast();
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClear = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("ev_token");
      const res = await fetch("/api/admin/transactions/cancel-processing", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: `✅ ${data.message}` });
        onCleared();
      } else {
        toast({ title: data.error || "Failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setLoading(false);
      setConfirm(false);
    }
  };

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold" style={{ color: "var(--theme-t3)" }}>Sure?</span>
        <button onClick={handleClear} disabled={loading}
          className="px-3 py-1 rounded-lg text-xs font-black"
          style={{ background: "rgba(239,68,68,0.2)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>
          {loading ? "Clearing..." : "Yes, Clear"}
        </button>
        <button onClick={() => setConfirm(false)}
          className="px-3 py-1 rounded-lg text-xs font-semibold"
          style={{ background: "var(--theme-card2)", color: "var(--theme-t3)" }}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirm(true)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80"
      style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
      <X className="w-3.5 h-3.5" /> Clear Processing
    </button>
  );
}

function FakeActivityForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ userName: "", type: "deposit", amount: "", city: "" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem("ev_token");
      const res = await fetch("/api/admin/fake-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      });
      if (res.ok) { setForm({ userName: "", type: "deposit", amount: "", city: "" }); onSuccess(); }
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="User name" value={form.userName} onChange={(e) => setForm(p => ({ ...p, userName: e.target.value }))} required className="rounded-xl h-9 text-sm" />
        <Input placeholder="City" value={form.city} onChange={(e) => setForm(p => ({ ...p, city: e.target.value }))} className="rounded-xl h-9 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select value={form.type} onChange={(e) => setForm(p => ({ ...p, type: e.target.value }))} className="rounded-xl h-9 text-sm border border-input bg-background px-3">
          <option value="deposit">Deposit</option>
          <option value="withdrawal">Withdrawal</option>
          <option value="investment">Investment</option>
          <option value="earning">Earning</option>
        </select>
        <Input type="number" placeholder="Amount (₹)" value={form.amount} onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))} required className="rounded-xl h-9 text-sm" />
      </div>
      <Button type="submit" disabled={saving} className="w-full rounded-xl h-9 bg-primary text-sm">Add Activity</Button>
    </form>
  );
}

function FakeActivityList({ onDelete }: { onDelete: (id: number) => void }) {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("ev_token");
    fetch("/api/admin/fake-activity", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setItems).catch(() => {});
  }, []);

  if (items.length === 0) return <div className="p-4 text-center text-sm rounded-2xl" style={{ color: "var(--theme-t3)", background: "var(--theme-card)", border: "1px dashed var(--theme-border)" }}>No fake activities yet. Click "Seed 20 Activities" to get started.</div>;

  return (
    <div className="space-y-2">
      <p className="text-xs px-1" style={{ color: "var(--theme-t3)" }}>{items.length} activities</p>
      {items.map((item) => (
        <div key={item.id} className="p-3 rounded-xl flex items-center justify-between" style={{ background: "var(--theme-card)", border: "1px solid var(--theme-border)" }}>
          <div>
            <p className="text-sm font-semibold text-white">{item.userName} <span style={{ color: "var(--theme-t4)" }}>·</span> <span className="text-xs capitalize" style={{ color: "var(--theme-t3)" }}>{item.type}</span></p>
            <p className="text-xs" style={{ color: "var(--theme-t4)" }}>₹{parseFloat(item.amount).toLocaleString("en-IN")} {item.city && `· ${item.city}`}</p>
          </div>
          <button onClick={() => { onDelete(item.id); setItems(prev => prev.filter(i => i.id !== item.id)); }} className="text-red-400 p-1.5 rounded-xl transition-colors hover:text-red-300">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function GiftCodesPanel() {
  const { toast } = useToast();
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [maxUses, setMaxUses] = useState("100");
  const [requiresPlan, setRequiresPlan] = useState(true);

  const token = () => localStorage.getItem("ev_token");

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/gift-codes", { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) setCodes(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchCodes(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newAmount) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/gift-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ code: newCode.trim().toUpperCase(), amount: parseFloat(newAmount), maxUses: parseInt(maxUses) || 100, requiresPlan }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: "Error", description: data.error, variant: "destructive" }); return; }
      toast({ title: `Gift code "${data.code}" created!` });
      setNewCode(""); setNewAmount(""); setMaxUses("100");
      fetchCodes();
    } finally { setCreating(false); }
  };

  const handleToggle = async (id: number) => {
    await fetch(`/api/admin/gift-codes/${id}/toggle`, { method: "PATCH", headers: { Authorization: `Bearer ${token()}` } });
    fetchCodes();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this gift code? This cannot be undone.")) return;
    await fetch(`/api/admin/gift-codes/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
    fetchCodes();
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--theme-card)", border: "1px solid rgba(168,85,247,0.15)" }}>
        <p className="font-bold text-sm text-white">Create New Gift Code</p>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-widest block mb-1">Code Name</label>
              <Input value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())} placeholder="DAILY50" className="rounded-xl h-9 text-sm font-mono" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-widest block mb-1">Amount ₹7–₹200</label>
              <Input type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="50" min={7} max={200} className="rounded-xl h-9 text-sm" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-widest block mb-1">Max Uses</label>
              <Input type="number" value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="100" min={1} className="rounded-xl h-9 text-sm" />
            </div>
            <div className="flex flex-col justify-end">
              <button type="button" onClick={() => setRequiresPlan(v => !v)}
                className="h-9 flex items-center gap-2 px-3 rounded-xl text-xs font-bold transition-all"
                style={{ background: requiresPlan ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${requiresPlan ? "rgba(168,85,247,0.3)" : "rgba(255,255,255,0.08)"}`, color: requiresPlan ? "#a855f7" : "rgba(255,255,255,0.35)" }}>
                <ToggleRight className="w-4 h-4" />
                {requiresPlan ? "Plan Required" : "No Plan Needed"}
              </button>
            </div>
          </div>
          <Button type="submit" disabled={creating || !newCode.trim() || !newAmount} className="w-full h-9 rounded-xl text-sm font-bold"
            style={{ background: "linear-gradient(135deg,#6d28d9,#a855f7)" }}>
            <Plus className="w-3.5 h-3.5 mr-1" />{creating ? "Creating…" : "Create Gift Code"}
          </Button>
        </form>
      </div>

      <div className="space-y-2">
        <p className="font-bold text-sm text-white px-1">All Gift Codes ({codes.length})</p>
        {loading && <p className="text-sm text-center py-6" style={{ color: "var(--theme-t3)" }}>Loading…</p>}
        {!loading && codes.length === 0 && <p className="text-sm text-center py-6" style={{ color: "var(--theme-t3)" }}>No gift codes yet. Create one above.</p>}
        {codes.map(c => (
          <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--theme-card)", border: "1px solid var(--theme-border)" }}>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono font-black text-sm text-white">{c.code}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: c.isActive ? "rgba(74,222,128,0.15)" : "rgba(239,68,68,0.15)", color: c.isActive ? "#4ade80" : "#f87171" }}>
                  {c.isActive ? "Active" : "Inactive"}
                </span>
                {c.requiresPlan && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(168,85,247,0.1)", color: "#a855f7" }}>Plan req.</span>}
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--theme-t3)" }}>
                ₹{c.amount} · {c.uses}/{c.maxUses} redeemed
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={() => handleToggle(c.id)} title={c.isActive ? "Deactivate" : "Activate"}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-opacity hover:opacity-70"
                style={{ background: c.isActive ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.06)" }}>
                {c.isActive ? <ToggleRight className="w-4 h-4 text-purple-400" /> : <ToggleLeft className="w-4 h-4 text-white/40" />}
              </button>
              <button onClick={() => handleDelete(c.id)} title="Delete"
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-opacity hover:opacity-70"
                style={{ background: "rgba(239,68,68,0.1)" }}>
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const { isDark } = useTheme();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Plan form state
  const [planForm, setPlanForm] = useState<PlanForm>(emptyForm);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [showPlanForm, setShowPlanForm] = useState(false);

  // Balance edit state
  const [editBalanceUserId, setEditBalanceUserId] = useState<number | null>(null);
  const [newBalance, setNewBalance] = useState("");
  const [makingAdmin, setMakingAdmin] = useState<number | null>(null);

  // Tx approval with message
  const [txMessages, setTxMessages] = useState<Record<number, string>>({});
  const [txProcessing, setTxProcessing] = useState<number | null>(null);

  const handleTxAction = async (txId: number, action: "approve" | "reject") => {
    setTxProcessing(txId);
    try {
      const token = localStorage.getItem("ev_token");
      const res = await fetch(`/api/admin/transactions/${txId}/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ adminMessage: txMessages[txId] || "" }),
      });
      if (!res.ok) throw new Error();
      toast({ title: action === "approve" ? "✅ Approved" : "❌ Rejected" });
      setTxMessages(prev => { const n = { ...prev }; delete n[txId]; return n; });
      invalidateTx();
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
    } finally {
      setTxProcessing(null);
    }
  };

  const makeAdmin = async (userId: number) => {
    setMakingAdmin(userId);
    try {
      const token = localStorage.getItem("ev_token");
      const res = await fetch(`/api/admin/users/${userId}/make-admin`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      toast({ title: "User promoted to Admin!" });
      invalidateUsers();
    } catch {
      toast({ title: "Failed to promote user", variant: "destructive" });
    } finally {
      setMakingAdmin(null);
    }
  };

  const { data: users } = useAdminGetUsers({ query: { enabled: isAdmin } });
  const { data: transactions } = useAdminGetTransactions({ query: { enabled: isAdmin } });
  const { data: plans, refetch: refetchPlans } = useGetInvestmentPlans({ query: { enabled: isAdmin } });

  const invalidateTx = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
  const invalidatePlans = () => { queryClient.invalidateQueries(); refetchPlans(); };
  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });

  const approveTx = useAdminApproveTransaction({
    mutation: {
      onSuccess: () => { toast({ title: "✅ Approved" }); invalidateTx(); },
      onError: () => toast({ title: "Error", variant: "destructive" }),
    },
  });

  const rejectTx = useAdminRejectTransaction({
    mutation: {
      onSuccess: () => { toast({ title: "❌ Rejected" }); invalidateTx(); },
      onError: () => toast({ title: "Error", variant: "destructive" }),
    },
  });

  const createPlan = useAdminCreateInvestmentPlan({
    mutation: {
      onSuccess: () => {
        toast({ title: "Plan created!" });
        setPlanForm(emptyForm);
        setShowPlanForm(false);
        invalidatePlans();
      },
      onError: () => toast({ title: "Failed to create plan", variant: "destructive" }),
    },
  });

  const updatePlan = useAdminUpdateInvestmentPlan({
    mutation: {
      onSuccess: () => {
        toast({ title: "Plan updated!" });
        setPlanForm(emptyForm);
        setEditingPlanId(null);
        setShowPlanForm(false);
        invalidatePlans();
      },
      onError: () => toast({ title: "Failed to update plan", variant: "destructive" }),
    },
  });

  const deletePlan = useAdminDeleteInvestmentPlan({
    mutation: {
      onSuccess: () => { toast({ title: "Plan deleted" }); invalidatePlans(); },
      onError: () => toast({ title: "Failed to delete plan", variant: "destructive" }),
    },
  });

  const updateBalance = useAdminUpdateUserBalance({
    mutation: {
      onSuccess: () => {
        toast({ title: "Balance updated!" });
        setEditBalanceUserId(null);
        setNewBalance("");
        invalidateUsers();
      },
      onError: () => toast({ title: "Failed to update balance", variant: "destructive" }),
    },
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) setLocation("/dashboard");
  }, [isAdmin, authLoading, setLocation]);

  if (!isAdmin) return null;

  const pendingTxs = transactions?.filter((t) => t.status === "pending" || t.status === "processing") || [];

  const handlePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: planForm.name,
      description: planForm.description,
      minAmount: parseFloat(planForm.minAmount),
      maxAmount: parseFloat(planForm.maxAmount),
      dailyReturnPercent: parseFloat(planForm.dailyReturnPercent),
      durationDays: parseInt(planForm.durationDays),
      isActive: true,
      imageUrl: planForm.imageUrl || null,
    };
    if (editingPlanId !== null) {
      updatePlan.mutate({ planId: editingPlanId, data: payload });
    } else {
      createPlan.mutate({ data: payload });
    }
  };

  const startEdit = (plan: any) => {
    setEditingPlanId(plan.id);
    setPlanForm({
      name: plan.name,
      description: plan.description || "",
      minAmount: plan.minAmount.toString(),
      maxAmount: plan.maxAmount.toString(),
      dailyReturnPercent: plan.dailyReturnPercent.toString(),
      durationDays: plan.durationDays.toString(),
      imageUrl: plan.imageUrl || "",
    });
    setShowPlanForm(true);
  };

  const cancelForm = () => {
    setShowPlanForm(false);
    setEditingPlanId(null);
    setPlanForm(emptyForm);
  };

  return (
    <AppLayout hideNav>
      <div className="space-y-6 pb-10">
        <div className="flex items-center space-x-3 mb-6 p-5 rounded-3xl" style={{ background: isDark ? "linear-gradient(135deg, #1a0533, #0a0a0a)" : "linear-gradient(135deg, #ede8ff, #e8dfff, #f0eaff)", border: isDark ? "1px solid rgba(139,92,246,0.2)" : "1px solid rgba(109,40,217,0.18)", backgroundSize: "300% 300%", animation: "gradRotate 8s ease infinite" }}>
          <div className="p-3 rounded-2xl" style={{ background: "rgba(139,92,246,0.2)", boxShadow: "0 0 20px rgba(139,92,246,0.3)" }}>
            <ShieldAlert className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Admin Dashboard</h1>
            <p className="text-sm" style={{ color: "var(--theme-t3)" }}>Manage platform operations</p>
          </div>
        </div>

        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto rounded-2xl p-1 mb-4 gap-1" style={{ background: "var(--theme-card2)" }}>
            <TabsTrigger value="transactions" className="rounded-xl font-bold text-[10px] h-9">
              <ArrowRightLeft className="w-3.5 h-3.5 mr-1" /> Deposits
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-xl font-bold text-[10px] h-9">
              <Users className="w-3.5 h-3.5 mr-1" /> Users
            </TabsTrigger>
            <TabsTrigger value="plans" className="rounded-xl font-bold text-[10px] h-9">
              <Zap className="w-3.5 h-3.5 mr-1" /> Plans
            </TabsTrigger>
            <TabsTrigger value="giftcodes" className="rounded-xl font-bold text-[10px] h-9">
              <Gift className="w-3.5 h-3.5 mr-1" /> Gift Codes
            </TabsTrigger>
            <TabsTrigger value="activity" className="rounded-xl font-bold text-[10px] h-9">
              <Activity className="w-3.5 h-3.5 mr-1" /> Activity
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-xl font-bold text-[10px] h-9">
              <Settings2 className="w-3.5 h-3.5 mr-1" /> Settings
            </TabsTrigger>
          </TabsList>

          {/* ── Transactions ── */}
          <TabsContent value="transactions" className="space-y-4 mt-0">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-bold text-lg">Pending / Processing Deposits & Withdrawals</h3>
              <ClearProcessingButton onCleared={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] })} />
            </div>
            {pendingTxs.length === 0 ? (
              <div className="p-8 text-center rounded-2xl" style={{ background: "var(--theme-card)", border: "1px dashed var(--theme-border)", color: "var(--theme-t3)" }}>No pending transactions.</div>
            ) : (
              pendingTxs.map((tx) => {
                const isWithdrawal = tx.type === "withdrawal";
                const accentColor = isWithdrawal ? "rgba(249,115,22,0.2)" : "rgba(59,130,246,0.15)";
                const accentBorder = isWithdrawal ? "rgba(249,115,22,0.25)" : "rgba(59,130,246,0.2)";
                return (
                  <div key={tx.id} className="p-4 rounded-2xl space-y-3" style={{ background: "var(--theme-card)", border: `1px solid ${accentBorder}` }}>
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase" style={{ background: accentColor, color: isWithdrawal ? "#fb923c" : "#60a5fa" }}>
                            {tx.type}
                          </span>
                          {tx.paymentMethod && <span className="text-[10px] font-semibold" style={{ color: "var(--theme-t3)" }}>{tx.paymentMethod}</span>}
                        </div>
                        <p className="font-bold text-base text-white mt-1">{tx.userName}</p>
                        <p className="text-[10px]" style={{ color: "var(--theme-t3)" }}>{format(new Date(tx.createdAt), "MMM d, h:mm a")}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-2xl" style={{ color: isWithdrawal ? "#fb923c" : "#a855f7" }}>₹{parseFloat(tx.amount).toLocaleString("en-IN")}</p>
                        <p className="text-[10px]" style={{ color: "var(--theme-t4)" }}>#{tx.id}</p>
                      </div>
                    </div>

                    {/* Payment / UPI details */}
                    {tx.notes && (
                      <div className="p-2.5 rounded-xl" style={{ background: "var(--theme-card)", border: "1px solid var(--theme-border)" }}>
                        <p className="text-[10px] font-bold uppercase mb-1" style={{ color: "var(--theme-t4)" }}>Details</p>
                        <p className="text-xs font-mono" style={{ color: "var(--theme-t2)" }}>{tx.notes}</p>
                      </div>
                    )}

                    {/* Admin message */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: "var(--theme-t3)" }}>
                        Message to customer (optional)
                      </label>
                      <textarea
                        rows={2}
                        placeholder={isWithdrawal ? "e.g. Payment sent to your UPI. Thank you!" : "e.g. Deposit confirmed. Happy investing!"}
                        value={txMessages[tx.id] || ""}
                        onChange={e => setTxMessages(prev => ({ ...prev, [tx.id]: e.target.value }))}
                        style={{ background: "var(--theme-card2)", border: "1px solid var(--theme-border)", color: "var(--theme-t1)", borderRadius: "10px", padding: "10px 12px", width: "100%", fontSize: "13px", outline: "none", resize: "none" }}
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleTxAction(tx.id, "approve")}
                        disabled={txProcessing === tx.id}
                        className="flex-1 h-11 rounded-xl font-bold text-sm text-white transition-all hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-1.5"
                        style={{ background: "linear-gradient(135deg, #15803d, #22c55e)", boxShadow: "0 0 16px rgba(34,197,94,0.3)" }}
                      >
                        {txProcessing === tx.id ? <span className="animate-spin">⏳</span> : <Check className="w-4 h-4" />}
                        Approve
                      </button>
                      <button
                        onClick={() => handleTxAction(tx.id, "reject")}
                        disabled={txProcessing === tx.id}
                        className="flex-1 h-11 rounded-xl font-bold text-sm transition-all hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-1.5"
                        style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
                      >
                        <X className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            <h3 className="font-bold text-lg px-1 pt-4 text-white">All Transactions</h3>
            {transactions?.slice(0, 20).map((tx) => (
              <div key={tx.id} className="p-3 rounded-2xl" style={{ background: "var(--theme-card)", border: "1px solid var(--theme-border)" }}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-sm text-white">{tx.userName}</p>
                    <p className="text-xs uppercase" style={{ color: "var(--theme-t3)" }}>
                      {tx.type} ·{" "}
                      <span style={{
                        color: tx.status === "approved"  ? "#4ade80"
                             : tx.status === "rejected"  ? "#f87171"
                             : tx.status === "cancelled" ? "rgba(255,255,255,0.3)"
                             : tx.status === "processing" ? "#60a5fa"
                             : "#fbbf24"
                      }}>
                        {tx.status === "cancelled" ? "Cancelled" : tx.status}
                      </span>
                    </p>
                  </div>
                  <p className="font-bold" style={{
                    color: tx.status === "approved"  ? "#4ade80"
                         : tx.status === "rejected"  ? "#f87171"
                         : tx.status === "cancelled" ? "rgba(255,255,255,0.3)"
                         : "#fbbf24"
                  }}>
                    ₹{tx.amount}
                  </p>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* ── Users ── */}
          <TabsContent value="users" className="space-y-4 mt-0">
            <h3 className="font-bold text-lg px-1">Platform Users</h3>
            {users?.map((u) => (
              <div key={u.id} className="p-4 rounded-2xl" style={{ background: "var(--theme-card)", border: "1px solid var(--theme-border)" }}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-sm text-white">
                      {u.name}{" "}
                      {u.isAdmin && <span className="text-purple-400 text-[10px] uppercase ml-1">(Admin)</span>}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--theme-t3)" }}>{u.phone || u.username || "—"}</p>
                    <p className="text-xs mt-1" style={{ color: "var(--theme-t4)" }}>
                      Invested: ₹{u.totalInvested?.toFixed(2)} · Earnings: ₹{u.totalEarnings?.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-purple-400 text-lg">₹{u.balance?.toFixed(2)}</p>
                    <button
                      className="text-[10px] underline mt-1 block" style={{ color: "var(--theme-t3)" }}
                      onClick={() => { setEditBalanceUserId(u.id); setNewBalance(u.balance?.toFixed(2) || "0"); }}
                    >
                      Edit Balance
                    </button>
                    {!u.isAdmin && (
                      <button
                        className="text-[10px] text-purple-400 underline mt-1 block disabled:opacity-50"
                        disabled={makingAdmin === u.id}
                        onClick={() => makeAdmin(u.id)}
                      >
                        {makingAdmin === u.id ? "Promoting..." : "Make Admin"}
                      </button>
                    )}
                  </div>
                </div>
                {editBalanceUserId === u.id && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="number"
                      value={newBalance}
                      onChange={(e) => setNewBalance(e.target.value)}
                      placeholder="New balance (₹)"
                      className="flex-1 h-9 rounded-xl text-sm px-3 focus:outline-none"
                      style={{ background: "var(--theme-card2)", border: "1px solid var(--theme-borderhi)", color: "var(--theme-t1)" }}
                    />
                    <Button
                      size="sm"
                      className="rounded-xl bg-primary h-9"
                      onClick={() => updateBalance.mutate({ userId: u.id, data: { balance: parseFloat(newBalance) } })}
                      disabled={updateBalance.isPending}
                    >
                      <IndianRupee className="w-3 h-3 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="ghost" className="rounded-xl h-9 text-white/40" onClick={() => setEditBalanceUserId(null)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </TabsContent>

          {/* ── Plans ── */}
          <TabsContent value="plans" className="space-y-4 mt-0">
            <div className="flex justify-between items-center px-1">
              <h3 className="font-bold text-lg">Investment Plans</h3>
              {!showPlanForm && (
                <Button
                  size="sm"
                  className="rounded-xl bg-primary"
                  onClick={() => { setPlanForm(emptyForm); setEditingPlanId(null); setShowPlanForm(true); }}
                >
                  <Plus className="w-4 h-4 mr-1" /> New Plan
                </Button>
              )}
            </div>

            {showPlanForm && (
              <Card className="p-4 rounded-2xl border-primary/30 bg-primary/5">
                <h4 className="font-bold text-sm mb-3">{editingPlanId ? "Edit Plan" : "Create New Plan"}</h4>
                <form onSubmit={handlePlanSubmit} className="space-y-3">
                  <Input
                    placeholder="Plan name (e.g. EV Starter)"
                    value={planForm.name}
                    onChange={(e) => setPlanForm((p) => ({ ...p, name: e.target.value }))}
                    required
                    className="rounded-xl h-10 text-sm"
                  />
                  <Input
                    placeholder="Description"
                    value={planForm.description}
                    onChange={(e) => setPlanForm((p) => ({ ...p, description: e.target.value }))}
                    className="rounded-xl h-10 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Min amount (₹)"
                      value={planForm.minAmount}
                      onChange={(e) => setPlanForm((p) => ({ ...p, minAmount: e.target.value }))}
                      required
                      className="rounded-xl h-10 text-sm"
                    />
                    <Input
                      type="number"
                      placeholder="Max amount (₹)"
                      value={planForm.maxAmount}
                      onChange={(e) => setPlanForm((p) => ({ ...p, maxAmount: e.target.value }))}
                      required
                      className="rounded-xl h-10 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Daily return %"
                      value={planForm.dailyReturnPercent}
                      onChange={(e) => setPlanForm((p) => ({ ...p, dailyReturnPercent: e.target.value }))}
                      required
                      className="rounded-xl h-10 text-sm"
                    />
                    <Input
                      type="number"
                      placeholder="Duration (days)"
                      value={planForm.durationDays}
                      onChange={(e) => setPlanForm((p) => ({ ...p, durationDays: e.target.value }))}
                      required
                      className="rounded-xl h-10 text-sm"
                    />
                  </div>
                  <Input
                    placeholder="Image URL (optional) — paste a link to plan image"
                    value={planForm.imageUrl}
                    onChange={(e) => setPlanForm((p) => ({ ...p, imageUrl: e.target.value }))}
                    className="rounded-xl h-10 text-sm"
                  />
                  {planForm.imageUrl && (
                    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--theme-border)" }}>
                      <img src={planForm.imageUrl} alt="Plan preview" className="w-full h-32 object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      className="flex-1 rounded-xl bg-primary h-10 font-bold"
                      disabled={createPlan.isPending || updatePlan.isPending}
                    >
                      {editingPlanId ? "Update Plan" : "Create Plan"}
                    </Button>
                    <Button type="button" variant="outline" className="rounded-xl h-10" onClick={cancelForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {plans?.map((plan) => (
              <div key={plan.id} className="rounded-2xl overflow-hidden" style={{ background: "var(--theme-card)", border: "1px solid var(--theme-border)" }}>
                {(plan as any).imageUrl && (
                  <img src={(plan as any).imageUrl} alt={plan.name} className="w-full h-28 object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
                <div className="p-4 flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm text-white">{plan.name}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={plan.isActive ? { background: "rgba(74,222,128,0.15)", color: "#4ade80" } : { background: "var(--theme-card2)", color: "var(--theme-t3)" }}>
                        {plan.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {plan.description && <p className="text-xs mt-0.5" style={{ color: "var(--theme-t3)" }}>{plan.description}</p>}
                    <div className="flex gap-3 mt-2 text-xs" style={{ color: "var(--theme-t3)" }}>
                      <span>₹{plan.minAmount}–₹{plan.maxAmount}</span>
                      <span className="text-purple-400 font-bold">{plan.dailyReturnPercent}%/day</span>
                      <span>{plan.durationDays} days</span>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      className="p-2 rounded-xl transition-colors" style={{ color: "var(--theme-t3)" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#a855f7")}
                      onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
                      onClick={() => startEdit(plan)}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2 rounded-xl transition-colors" style={{ color: "var(--theme-t3)" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
                      onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
                      onClick={() => {
                        if (confirm(`Delete "${plan.name}"?`)) deletePlan.mutate({ planId: plan.id });
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* ── Fake Activity ── */}
          <TabsContent value="activity" className="space-y-4 mt-0">
            <div className="flex justify-between items-center px-1">
              <h3 className="font-bold text-lg">Fake Activity</h3>
              <Button
                size="sm"
                className="rounded-xl bg-primary text-xs"
                onClick={async () => {
                  const token = localStorage.getItem("ev_token");
                  await fetch("/api/admin/fake-activity/seed", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
                  toast({ title: "20 fake activities seeded!" });
                  queryClient.invalidateQueries();
                }}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Seed 20 Activities
              </Button>
            </div>

            <Card className="p-4 rounded-2xl border-primary/20 bg-primary/5">
              <h4 className="font-bold text-sm mb-3">Add Custom Activity</h4>
              <FakeActivityForm onSuccess={() => { toast({ title: "Activity added!" }); queryClient.invalidateQueries(); }} />
            </Card>

            <FakeActivityList onDelete={async (id: number) => {
              const token = localStorage.getItem("ev_token");
              await fetch(`/api/admin/fake-activity/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
              toast({ title: "Deleted" });
              queryClient.invalidateQueries();
            }} />
          </TabsContent>

          {/* ── Gift Codes ── */}
          <TabsContent value="giftcodes" className="space-y-4 mt-0">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-bold text-lg">Daily Gift Codes</h3>
            </div>
            <GiftCodesPanel />
          </TabsContent>

          {/* ── Settings ── */}
          <TabsContent value="settings" className="space-y-4 mt-0">
            <ContactSettingsPanel />
          </TabsContent>
        </Tabs>

        <Button variant="ghost" onClick={() => setLocation("/dashboard")} className="w-full text-zinc-500">
          ← Back to Dashboard
        </Button>
      </div>
    </AppLayout>
  );
}
