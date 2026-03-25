import { supabase } from "../../lib/supabase";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

type Supplier = {
  id: string;
  name: string;
};

export function BatchForm() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState<string>("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [netKg, setNetKg] = useState("5.000");
  const [bestBefore, setBestBefore] = useState(
    dayjs().add(18, "month").format("YYYY-MM-DD")
  );
  const [notes, setNotes] = useState("");

  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [creatingBatch, setCreatingBatch] = useState(false);

  const [supplierError, setSupplierError] = useState("");
  const [batchError, setBatchError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadSuppliers() {
    setLoadingSuppliers(true);
    setSupplierError("");

    const { data, error } = await supabase
      .from("suppliers")
      .select("id,name")
      .order("name", { ascending: true });

    if (error) {
      setSupplierError(error.message);
      setSuppliers([]);
      setLoadingSuppliers(false);
      return;
    }

    setSuppliers((data ?? []) as Supplier[]);
    setLoadingSuppliers(false);
  }

  useEffect(() => {
    loadSuppliers();
  }, []);

  async function addSupplier() {
    setSuccessMessage("");
    setBatchError("");
    setSupplierError("");

    const trimmedName = newSupplierName.trim();

    if (!trimmedName) {
      setSupplierError("Please enter a supplier name.");
      return;
    }

    setAddingSupplier(true);

    const { data, error } = await supabase
      .from("suppliers")
      .insert({ name: trimmedName })
      .select("id,name")
      .single();

    setAddingSupplier(false);

    if (error) {
      setSupplierError(error.message);
      return;
    }

    const createdSupplier = data as Supplier;

    setSuppliers((prev) =>
      [...prev, createdSupplier].sort((a, b) => a.name.localeCompare(b.name))
    );
    setSupplierId(createdSupplier.id);
    setNewSupplierName("");
    setSuccessMessage(`Supplier added: ${createdSupplier.name}`);
  }

  async function createBatch() {
    setSuccessMessage("");
    setBatchError("");

    if (!supplierId) {
      setBatchError("Please select a supplier.");
      return;
    }

    if (!netKg.trim()) {
      setBatchError("Please enter net kg.");
      return;
    }

    if (!bestBefore) {
      setBatchError("Please select a best before date.");
      return;
    }

    setCreatingBatch(true);

    const { data: codeRow, error: codeError } = await supabase.rpc("gen_batch_code");

    if (codeError) {
      setCreatingBatch(false);
      setBatchError(codeError.message);
      return;
    }

    const code = codeRow as unknown as string;

    const { data, error } = await supabase
      .from("batches")
      .insert({
        code,
        supplier_id: supplierId,
        received_date: dayjs().format("YYYY-MM-DD"),
        best_before: bestBefore,
        net_kg: netKg,
        notes: notes || null,
      })
      .select()
      .single();

    setCreatingBatch(false);

    if (error) {
      setBatchError(error.message);
      return;
    }

    setSuccessMessage(`Batch created: ${data.code}`);
    setNotes("");
  }

  return (
    <div
      style={{
        maxWidth: 620,
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 20,
        display: "grid",
        gap: 16,
      }}
    >
      <div>
        <h2 style={{ margin: 0, marginBottom: 6 }}>Receive Stock</h2>
        <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
          Create an incoming batch and link it to a supplier.
        </p>
      </div>

      {successMessage && (
        <div
          style={{
            background: "#ecfdf5",
            color: "#065f46",
            border: "1px solid #a7f3d0",
            borderRadius: 8,
            padding: 10,
            fontSize: 14,
          }}
        >
          {successMessage}
        </div>
      )}

      {(supplierError || batchError) && (
        <div
          style={{
            background: "#fef2f2",
            color: "#991b1b",
            border: "1px solid #fecaca",
            borderRadius: 8,
            padding: 10,
            fontSize: 14,
            whiteSpace: "pre-wrap",
          }}
        >
          {supplierError || batchError}
        </div>
      )}

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: 14,
          display: "grid",
          gap: 12,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16 }}>Supplier</h3>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>Select supplier</span>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            disabled={loadingSuppliers}
            style={{
              padding: 10,
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#fff",
            }}
          >
            <option value="">
              {loadingSuppliers ? "Loading suppliers..." : "Choose a supplier"}
            </option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </label>

        <div style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
          <label style={{ display: "grid", gap: 6, flex: 1, minWidth: 240 }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Add new supplier</span>
            <input
              type="text"
              placeholder="Enter supplier name"
              value={newSupplierName}
              onChange={(e) => setNewSupplierName(e.target.value)}
              style={{
                padding: 10,
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            />
          </label>

          <button
            type="button"
            onClick={addSupplier}
            disabled={addingSupplier}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#f9fafb",
              cursor: "pointer",
            }}
          >
            {addingSupplier ? "Adding..." : "Add Supplier"}
          </button>

          <button
            type="button"
            onClick={loadSuppliers}
            disabled={loadingSuppliers}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#f9fafb",
              cursor: "pointer",
            }}
          >
            {loadingSuppliers ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: 14,
          display: "grid",
          gap: 12,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16 }}>Batch details</h3>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>Net kg</span>
          <input
            value={netKg}
            onChange={(e) => setNetKg(e.target.value)}
            style={{
              padding: 10,
              borderRadius: 8,
              border: "1px solid #d1d5db",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>Best before</span>
          <input
            type="date"
            value={bestBefore}
            onChange={(e) => setBestBefore(e.target.value)}
            style={{
              padding: 10,
              borderRadius: 8,
              border: "1px solid #d1d5db",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Optional notes"
            style={{
              padding: 10,
              borderRadius: 8,
              border: "1px solid #d1d5db",
              resize: "vertical",
            }}
          />
        </label>

        <button
          type="button"
          onClick={createBatch}
          disabled={creatingBatch}
          style={{
            padding: "12px 16px",
            borderRadius: 8,
            border: "none",
            background: "#111827",
            color: "#ffffff",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {creatingBatch ? "Creating batch..." : "Create batch"}
        </button>
      </div>
    </div>
  );
}
