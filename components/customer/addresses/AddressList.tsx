"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CustomerAddress } from "@/types/customer";
import { AddressCard } from "./AddressCard";
import { AddressForm } from "./AddressForm";

interface Props {
  initialAddresses: CustomerAddress[];
}

export default function AddressList({ initialAddresses }: Props) {
  const router = useRouter();
  const [addresses, setAddresses] = useState(initialAddresses);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CustomerAddress | null>(null);

  function handleDeleted(id: string) {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  }

  function handleEdit(address: CustomerAddress) {
    setEditing(address);
    setShowForm(false);
  }

  function handleSaved() {
    setShowForm(false);
    setEditing(null);
    router.refresh();
  }

  function handleCancel() {
    setShowForm(false);
    setEditing(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Saved Addresses</h1>
        {!showForm && !editing && (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm px-4 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition"
          >
            + Add Address
          </button>
        )}
      </div>

      {(showForm || editing) && (
        <div className="mb-4">
          <AddressForm
            editing={editing}
            onCancel={handleCancel}
            onSaved={handleSaved}
          />
        </div>
      )}

      {addresses.length === 0 && !showForm ? (
        <div className="py-12 text-center">
          <div className="text-4xl mb-3">📍</div>
          <p className="text-gray-500 mb-4">No saved addresses yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-sm px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition"
          >
            Add your first address
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <AddressCard
              key={addr.id}
              address={addr}
              onDeleted={() => handleDeleted(addr.id)}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
