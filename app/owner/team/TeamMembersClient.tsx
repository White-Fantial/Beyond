"use client";

import { useState, useMemo } from "react";
import type { OwnerTeamMember } from "@/types/owner";

// ─── Badge configs ────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  OWNER: { label: "Owner", className: "bg-purple-100 text-purple-700" },
  ADMIN: { label: "Admin", className: "bg-blue-100 text-blue-700" },
  MANAGER: { label: "Manager", className: "bg-indigo-100 text-indigo-700" },
  SUPERVISOR: { label: "Supervisor", className: "bg-teal-100 text-teal-700" },
  STAFF: { label: "Staff", className: "bg-gray-100 text-gray-600" },
  ANALYST: { label: "Analyst", className: "bg-orange-100 text-orange-600" },
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-green-100 text-green-700" },
  INVITED: { label: "Invited", className: "bg-yellow-100 text-yellow-700" },
  INACTIVE: { label: "Inactive", className: "bg-gray-100 text-gray-500" },
  REMOVED: { label: "Removed", className: "bg-red-100 text-red-500" },
};

const ROLES = ["OWNER", "ADMIN", "MANAGER", "SUPERVISOR", "STAFF", "ANALYST"] as const;

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialMembers: OwnerTeamMember[];
  tenantId: string;
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────

interface InviteModalProps {
  onClose: () => void;
  onSuccess: (member: OwnerTeamMember) => void;
}

function InviteModal({ onClose, onSuccess }: InviteModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("STAFF");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/owner/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined, role }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to invite member");
        return;
      }
      onSuccess(json.data as OwnerTeamMember);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Invite Team Member</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="colleague@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_BADGE[r]?.label ?? r}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? "Inviting…" : "Send Invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  member: OwnerTeamMember;
  onClose: () => void;
  onSuccess: (member: OwnerTeamMember) => void;
}

function EditModal({ member, onClose, onSuccess }: EditModalProps) {
  const [role, setRole] = useState(member.role);
  const [active, setActive] = useState(member.status === "ACTIVE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const newStatus = active ? "ACTIVE" : "INACTIVE";
      const body: Record<string, string> = {};
      if (role !== member.role) body.role = role;
      if (newStatus !== member.status) body.status = newStatus;

      if (Object.keys(body).length === 0) {
        onClose();
        return;
      }

      const res = await fetch(`/api/owner/team/${member.membershipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to update member");
        return;
      }
      onSuccess(json.data as OwnerTeamMember);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Edit Member</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">
              {error}
            </div>
          )}
          <div className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{member.name}</span>
            <span className="ml-2 text-gray-400">{member.email}</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_BADGE[r]?.label ?? r}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Active</label>
            <button
              type="button"
              onClick={() => setActive((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                active ? "bg-green-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  active ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-xs text-gray-500">{active ? "Active" : "Inactive"}</span>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TeamMembersClient({ initialMembers }: Props) {
  const [members, setMembers] = useState<OwnerTeamMember[]>(initialMembers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [editingMember, setEditingMember] = useState<OwnerTeamMember | null>(null);

  const filtered = useMemo(() => {
    return members.filter((m) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q);
      const matchesRole = !roleFilter || m.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [members, search, roleFilter]);

  function handleInviteSuccess(newMember: OwnerTeamMember) {
    setMembers((prev) => {
      const exists = prev.find((m) => m.membershipId === newMember.membershipId);
      if (exists) return prev.map((m) => (m.membershipId === newMember.membershipId ? newMember : m));
      return [...prev, newMember];
    });
    setShowInvite(false);
  }

  function handleEditSuccess(updated: OwnerTeamMember) {
    setMembers((prev) =>
      prev.map((m) => (m.membershipId === updated.membershipId ? updated : m))
    );
    setEditingMember(null);
  }

  async function handleRemove(member: OwnerTeamMember) {
    if (!window.confirm(`Remove ${member.name} from the team? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/owner/team/${member.membershipId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error ?? "Failed to remove member");
        return;
      }
      setMembers((prev) => prev.filter((m) => m.membershipId !== member.membershipId));
    } catch {
      alert("Network error. Please try again.");
    }
  }

  function storesLabel(member: OwnerTeamMember): string {
    if (member.storeAssignments.length === 0) return "—";
    if (member.storeAssignments.length > 2) return `${member.storeAssignments.length} stores`;
    return member.storeAssignments.map((s) => s.storeName).join(", ");
  }

  return (
    <>
      {showInvite && (
        <InviteModal onClose={() => setShowInvite(false)} onSuccess={handleInviteSuccess} />
      )}
      {editingMember && (
        <EditModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email…"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_BADGE[r]?.label ?? r}</option>
          ))}
        </select>
        <button
          onClick={() => setShowInvite(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 whitespace-nowrap"
        >
          + Invite Member
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
          <p className="text-sm font-medium text-gray-700">No team members found</p>
          <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Email</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Role</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Stores</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((m) => {
                  const roleBadge = ROLE_BADGE[m.role] ?? { label: m.role, className: "bg-gray-100 text-gray-600" };
                  const statusBadge = STATUS_BADGE[m.status] ?? { label: m.status, className: "bg-gray-100 text-gray-500" };
                  return (
                    <tr key={m.membershipId} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 truncate max-w-[160px]">{m.name}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs truncate max-w-[180px]">
                        {m.email}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${roleBadge.className}`}>
                          {roleBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusBadge.className}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{storesLabel(m)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingMember(m)}
                            className="text-xs font-medium text-brand-600 hover:text-brand-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleRemove(m)}
                            className="text-xs font-medium text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
