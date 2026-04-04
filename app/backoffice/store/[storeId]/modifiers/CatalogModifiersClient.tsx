"use client";

import { useState, useTransition } from "react";
import type { CatalogModifierGroup, CatalogModifierOption } from "@prisma/client";

type GroupWithOptions = CatalogModifierGroup & { modifierOptions: CatalogModifierOption[] };

interface Props {
  storeId: string;
  initialGroups: GroupWithOptions[];
}

// ─── Group modal ──────────────────────────────────────────────────────────────

const emptyGroupForm = {
  name: "",
  description: "",
  selectionMin: 0,
  selectionMax: "",
  isRequired: false,
  displayOrder: 0,
  isVisibleOnOnlineOrder: true,
};

// ─── Option modal ─────────────────────────────────────────────────────────────

const emptyOptionForm = {
  name: "",
  description: "",
  priceDeltaAmount: "",
  displayOrder: 0,
  isDefault: false,
};

export default function CatalogModifiersClient({ storeId, initialGroups }: Props) {
  const [groups, setGroups] = useState<GroupWithOptions[]>(initialGroups);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  // Group modal state
  const [groupModal, setGroupModal] = useState<{
    open: boolean;
    editTarget: CatalogModifierGroup | null;
  }>({ open: false, editTarget: null });
  const [groupForm, setGroupForm] = useState(emptyGroupForm);
  const [groupError, setGroupError] = useState<string | null>(null);

  // Option modal state
  const [optionModal, setOptionModal] = useState<{
    open: boolean;
    groupId: string | null;
    editTarget: CatalogModifierOption | null;
  }>({ open: false, groupId: null, editTarget: null });
  const [optionForm, setOptionForm] = useState(emptyOptionForm);
  const [optionError, setOptionError] = useState<string | null>(null);

  const isGroupPOS = groupModal.editTarget?.sourceType === "POS";
  const isOptionPOS = optionModal.editTarget?.sourceType === "POS";

  // ─── Expand/collapse ────────────────────────────────────────────────────────

  function toggleExpand(groupId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  // ─── Group modal handlers ────────────────────────────────────────────────────

  function openCreateGroup() {
    setGroupForm(emptyGroupForm);
    setGroupError(null);
    setGroupModal({ open: true, editTarget: null });
  }

  function openEditGroup(group: CatalogModifierGroup) {
    setGroupForm({
      name: group.name,
      description: group.description ?? "",
      selectionMin: group.selectionMin,
      selectionMax: group.selectionMax !== null ? String(group.selectionMax) : "",
      isRequired: group.isRequired,
      displayOrder: group.displayOrder,
      isVisibleOnOnlineOrder: group.isVisibleOnOnlineOrder,
    });
    setGroupError(null);
    setGroupModal({ open: true, editTarget: group });
  }

  function closeGroupModal() {
    setGroupModal({ open: false, editTarget: null });
    setGroupError(null);
  }

  function handleGroupSave() {
    startTransition(async () => {
      setGroupError(null);
      const isEdit = !!groupModal.editTarget;
      const url = isEdit
        ? `/api/backoffice/${storeId}/modifiers/${groupModal.editTarget!.id}`
        : `/api/backoffice/${storeId}/modifiers`;

      const body = {
        name: groupForm.name,
        description: groupForm.description || undefined,
        selectionMin: groupForm.selectionMin,
        selectionMax: groupForm.selectionMax !== "" ? parseInt(groupForm.selectionMax) : undefined,
        isRequired: groupForm.isRequired,
        displayOrder: groupForm.displayOrder,
        isVisibleOnOnlineOrder: groupForm.isVisibleOnOnlineOrder,
      };

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const { data } = await res.json();
        if (isEdit) {
          setGroups((prev) =>
            prev.map((g) => (g.id === data.id ? { ...g, ...data } : g))
          );
        } else {
          setGroups((prev) => [...prev, { ...data, modifierOptions: [] }]);
        }
        closeGroupModal();
      } else {
        const json = await res.json().catch(() => ({}));
        setGroupError((json as { error?: string }).error ?? "Something went wrong");
      }
    });
  }

  function handleDeleteGroup(group: CatalogModifierGroup) {
    if (!window.confirm(`Delete modifier group "${group.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const res = await fetch(`/api/backoffice/${storeId}/modifiers/${group.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setGroups((prev) => prev.filter((g) => g.id !== group.id));
      } else {
        const json = await res.json().catch(() => ({}));
        alert((json as { error?: string }).error ?? "Failed to delete group");
      }
    });
  }

  // ─── Option modal handlers ───────────────────────────────────────────────────

  function openCreateOption(groupId: string) {
    setOptionForm(emptyOptionForm);
    setOptionError(null);
    setOptionModal({ open: true, groupId, editTarget: null });
  }

  function openEditOption(groupId: string, option: CatalogModifierOption) {
    setOptionForm({
      name: option.name,
      description: option.description ?? "",
      priceDeltaAmount: (option.priceDeltaAmount / 100).toFixed(2),
      displayOrder: option.displayOrder,
      isDefault: option.isDefault,
    });
    setOptionError(null);
    setOptionModal({ open: true, groupId, editTarget: option });
  }

  function closeOptionModal() {
    setOptionModal({ open: false, groupId: null, editTarget: null });
    setOptionError(null);
  }

  function handleOptionSave() {
    startTransition(async () => {
      setOptionError(null);
      const isEdit = !!optionModal.editTarget;
      const groupId = optionModal.groupId!;

      const url = isEdit
        ? `/api/backoffice/${storeId}/modifiers/${groupId}/options/${optionModal.editTarget!.id}`
        : `/api/backoffice/${storeId}/modifiers/${groupId}/options`;

      const priceInCents = Math.round(parseFloat(optionForm.priceDeltaAmount || "0") * 100);

      const body = {
        name: optionForm.name,
        description: optionForm.description || undefined,
        priceDeltaAmount: priceInCents,
        displayOrder: optionForm.displayOrder,
        isDefault: optionForm.isDefault,
      };

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const { data } = await res.json();
        if (isEdit) {
          setGroups((prev) =>
            prev.map((g) =>
              g.id !== groupId
                ? g
                : { ...g, modifierOptions: g.modifierOptions.map((o) => (o.id === data.id ? data : o)) }
            )
          );
        } else {
          setGroups((prev) =>
            prev.map((g) =>
              g.id !== groupId ? g : { ...g, modifierOptions: [...g.modifierOptions, data] }
            )
          );
        }
        closeOptionModal();
      } else {
        const json = await res.json().catch(() => ({}));
        setOptionError((json as { error?: string }).error ?? "Something went wrong");
      }
    });
  }

  function handleDeleteOption(groupId: string, option: CatalogModifierOption) {
    if (!window.confirm(`Delete option "${option.name}"?`)) return;
    startTransition(async () => {
      const res = await fetch(
        `/api/backoffice/${storeId}/modifiers/${groupId}/options/${option.id}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setGroups((prev) =>
          prev.map((g) =>
            g.id !== groupId
              ? g
              : { ...g, modifierOptions: g.modifierOptions.filter((o) => o.id !== option.id) }
          )
        );
      } else {
        const json = await res.json().catch(() => ({}));
        alert((json as { error?: string }).error ?? "Failed to delete option");
      }
    });
  }

  async function toggleSoldOut(groupId: string, option: CatalogModifierOption) {
    const res = await fetch(
      `/api/backoffice/${storeId}/modifiers/${groupId}/options/${option.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSoldOut: !option.isSoldOut }),
      }
    );
    if (res.ok) {
      const { data } = await res.json();
      setGroups((prev) =>
        prev.map((g) =>
          g.id !== groupId
            ? g
            : { ...g, modifierOptions: g.modifierOptions.map((o) => (o.id === data.id ? data : o)) }
        )
      );
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-gray-500">{groups.length} modifier groups</span>
        <button
          onClick={openCreateGroup}
          className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New Modifier Group
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="text-gray-500">No modifier groups found.</p>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <div key={group.id} className="rounded-lg border border-gray-200 bg-white">
              <div className="flex w-full items-center justify-between px-4 py-3">
                <button
                  onClick={() => toggleExpand(group.id)}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  <span className="font-medium text-gray-900">{group.name}</span>
                  {group.sourceType === "POS" && (
                    <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-700">
                      POS
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {group.modifierOptions.length} options
                  </span>
                  <span className="ml-auto text-gray-400">{expanded.has(group.id) ? "▲" : "▼"}</span>
                </button>
                <div className="ml-3 flex gap-2">
                  <button
                    onClick={() => openEditGroup(group)}
                    className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                  >
                    Edit
                  </button>
                  {group.sourceType !== "POS" && (
                    <button
                      onClick={() => handleDeleteGroup(group)}
                      disabled={isPending}
                      className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {expanded.has(group.id) && (
                <div className="border-t border-gray-100 px-4 pb-3 pt-2">
                  <div className="mb-2 flex justify-end">
                    <button
                      onClick={() => openCreateOption(group.id)}
                      className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                    >
                      + Add Option
                    </button>
                  </div>
                  {group.modifierOptions.length === 0 ? (
                    <p className="text-sm text-gray-400">No options yet.</p>
                  ) : (
                    <ul className="space-y-1">
                      {group.modifierOptions.map((opt) => (
                        <li key={opt.id} className="flex items-center justify-between text-sm">
                          <span
                            className={opt.isSoldOut ? "text-gray-400 line-through" : "text-gray-800"}
                          >
                            {opt.name}
                            {opt.priceDeltaAmount > 0 && (
                              <span className="ml-1 text-gray-400">
                                +{(opt.priceDeltaAmount / 100).toFixed(2)}
                              </span>
                            )}
                            {opt.sourceType === "POS" && (
                              <span className="ml-1 rounded bg-orange-100 px-1 py-0.5 text-xs text-orange-600">
                                POS
                              </span>
                            )}
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => toggleSoldOut(group.id, opt)}
                              className={`rounded px-2 py-0.5 text-xs font-medium ${
                                opt.isSoldOut
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {opt.isSoldOut ? "Sold Out" : "Available"}
                            </button>
                            <button
                              onClick={() => openEditOption(group.id, opt)}
                              className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                            >
                              Edit
                            </button>
                            {opt.sourceType !== "POS" && (
                              <button
                                onClick={() => handleDeleteOption(group.id, opt)}
                                disabled={isPending}
                                className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-100"
                              >
                                Del
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Group Modal */}
      {groupModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              {groupModal.editTarget ? "Edit Modifier Group" : "New Modifier Group"}
            </h2>

            {isGroupPOS && (
              <p className="mb-4 rounded border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
                This item is managed by your POS system. Only display settings can be edited.
              </p>
            )}

            {groupError && (
              <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{groupError}</p>
            )}

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={groupForm.name}
                  disabled={isGroupPOS}
                  onChange={(e) => setGroupForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Description</label>
                <textarea
                  value={groupForm.description}
                  disabled={isGroupPOS}
                  onChange={(e) => setGroupForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm disabled:bg-gray-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Min Select</label>
                  <input
                    type="number"
                    min="0"
                    value={groupForm.selectionMin}
                    disabled={isGroupPOS}
                    onChange={(e) =>
                      setGroupForm((f) => ({ ...f, selectionMin: parseInt(e.target.value) || 0 }))
                    }
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Max Select (blank = unlimited)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={groupForm.selectionMax}
                    disabled={isGroupPOS}
                    onChange={(e) => setGroupForm((f) => ({ ...f, selectionMax: e.target.value }))}
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm disabled:bg-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Display Order
                </label>
                <input
                  type="number"
                  value={groupForm.displayOrder}
                  onChange={(e) =>
                    setGroupForm((f) => ({ ...f, displayOrder: parseInt(e.target.value) || 0 }))
                  }
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                />
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={groupForm.isRequired}
                    disabled={isGroupPOS}
                    onChange={(e) => setGroupForm((f) => ({ ...f, isRequired: e.target.checked }))}
                  />
                  Required
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={groupForm.isVisibleOnOnlineOrder}
                    onChange={(e) =>
                      setGroupForm((f) => ({ ...f, isVisibleOnOnlineOrder: e.target.checked }))
                    }
                  />
                  Online Visible
                </label>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={closeGroupModal}
                className="rounded border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGroupSave}
                disabled={isPending || !groupForm.name.trim()}
                className="rounded bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Option Modal */}
      {optionModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              {optionModal.editTarget ? "Edit Option" : "New Option"}
            </h2>

            {isOptionPOS && (
              <p className="mb-4 rounded border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
                This item is managed by your POS system. Only sold-out status can be edited.
              </p>
            )}

            {optionError && (
              <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{optionError}</p>
            )}

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={optionForm.name}
                  disabled={isOptionPOS}
                  onChange={(e) => setOptionForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  value={optionForm.description}
                  disabled={isOptionPOS}
                  onChange={(e) => setOptionForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm disabled:bg-gray-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Price Delta ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={optionForm.priceDeltaAmount}
                    disabled={isOptionPOS}
                    onChange={(e) =>
                      setOptionForm((f) => ({ ...f, priceDeltaAmount: e.target.value }))
                    }
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={optionForm.displayOrder}
                    disabled={isOptionPOS}
                    onChange={(e) =>
                      setOptionForm((f) => ({ ...f, displayOrder: parseInt(e.target.value) || 0 }))
                    }
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm disabled:bg-gray-100"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={optionForm.isDefault}
                  disabled={isOptionPOS}
                  onChange={(e) => setOptionForm((f) => ({ ...f, isDefault: e.target.checked }))}
                />
                Default option
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={closeOptionModal}
                className="rounded border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleOptionSave}
                disabled={isPending || !optionForm.name.trim()}
                className="rounded bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
