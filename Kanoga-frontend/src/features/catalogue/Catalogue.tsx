import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost, apiPut } from "../../lib/apiClient";
import { useAuth } from "../auth/AuthContext";
import { useAppConfig } from "../../lib/useAppConfig";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  unitSize: number | null;
  unitOfMeasure: string | null;
  shelfLifeMonths: number | null;
  active: boolean;
  lowStockThreshold: number | null;
  reorderQuantity: number | null;
  perishable: boolean | null;
  expiryWarningDays: number | null;
};

type Supplier = {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  country: string | null;
  active: boolean;
};

type Tab = "products" | "suppliers";

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  fontSize: 13,
  boxSizing: "border-box" as const,
};

const labelStyle = {
  fontSize: 12,
  fontWeight: 600 as const,
  color: "#374151",
  display: "block" as const,
  marginBottom: 4,
};

const th: React.CSSProperties = {
  padding: "8px 10px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 700,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "9px 10px",
  borderBottom: "1px solid #f1f5f9",
  color: "#374151",
};

const emptyProduct = {
  name: "",
  sku: "",
  barcode: "",
  unitSize: "",
  unitOfMeasure: "",
  shelfLifeMonths: "",
  lowStockThreshold: "",
  reorderQuantity: "",
  perishable: false,
  expiryWarningDays: "",
};

const emptySupplier = { name: "", contactEmail: "", contactPhone: "", country: "" };

// Blank means "not set", which is different from zero.
function numberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export default function Catalogue() {
  const auth = useAuth();
  const config = useAppConfig();

  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [productForm, setProductForm] = useState({ ...emptyProduct });
  const [supplierForm, setSupplierForm] = useState({ ...emptySupplier });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!auth) return;
    setError(null);
    try {
      const [p, s] = await Promise.all([
        apiGet<Product[]>("/api/catalogue/products?includeInactive=true", auth),
        apiGet<Supplier[]>("/api/catalogue/suppliers?includeInactive=true", auth),
      ]);
      setProducts(p);
      setSuppliers(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the catalogue.");
    }
  }, [auth]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(p: Product) {
    setEditingProductId(p.id);
    setProductForm({
      name: p.name ?? "",
      sku: p.sku ?? "",
      barcode: p.barcode ?? "",
      unitSize: p.unitSize == null ? "" : String(p.unitSize),
      unitOfMeasure: p.unitOfMeasure ?? "",
      shelfLifeMonths: p.shelfLifeMonths == null ? "" : String(p.shelfLifeMonths),
      lowStockThreshold: p.lowStockThreshold == null ? "" : String(p.lowStockThreshold),
      reorderQuantity: p.reorderQuantity == null ? "" : String(p.reorderQuantity),
      perishable: !!p.perishable,
      expiryWarningDays: p.expiryWarningDays == null ? "" : String(p.expiryWarningDays),
    });
    setSuccess(null);
    setError(null);
  }

  function cancelEdit() {
    setEditingProductId(null);
    setProductForm({ ...emptyProduct });
  }

  async function saveProduct() {
    setError(null);
    setSuccess(null);
    if (!auth) return;
    if (!productForm.name.trim()) return setError("Product name is required.");

    const body = {
      name: productForm.name.trim(),
      sku: productForm.sku.trim() || null,
      barcode: productForm.barcode.trim() || null,
      unitSize: productForm.unitSize ? Number(productForm.unitSize) : null,
      unitOfMeasure: productForm.unitOfMeasure.trim() || config.productUnit,
      shelfLifeMonths: productForm.shelfLifeMonths
        ? Number(productForm.shelfLifeMonths)
        : null,
      active: true,
      lowStockThreshold: numberOrNull(productForm.lowStockThreshold),
      reorderQuantity: numberOrNull(productForm.reorderQuantity),
      perishable: productForm.perishable,
      expiryWarningDays: numberOrNull(productForm.expiryWarningDays),
    };

    try {
      setSaving(true);
      if (editingProductId) {
        await apiPut(`/api/catalogue/products/${editingProductId}`, body, auth);
        setSuccess(`Updated ${body.name}.`);
      } else {
        await apiPost("/api/catalogue/products", body, auth);
        setSuccess(`Added ${body.name}.`);
      }
      cancelEdit();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the product.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleProduct(p: Product) {
    if (!auth) return;
    try {
      await apiPut(
        `/api/catalogue/products/${p.id}`,
        {
          name: p.name,
          sku: p.sku,
          barcode: p.barcode,
          unitSize: p.unitSize,
          unitOfMeasure: p.unitOfMeasure,
          shelfLifeMonths: p.shelfLifeMonths,
          active: !p.active,
          lowStockThreshold: p.lowStockThreshold,
          reorderQuantity: p.reorderQuantity,
          perishable: p.perishable,
          expiryWarningDays: p.expiryWarningDays,
        },
        auth
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the product.");
    }
  }

  async function saveSupplier() {
    setError(null);
    setSuccess(null);
    if (!auth) return;
    if (!supplierForm.name.trim()) return setError("Supplier name is required.");
    try {
      setSaving(true);
      await apiPost(
        "/api/catalogue/suppliers",
        {
          name: supplierForm.name.trim(),
          contactEmail: supplierForm.contactEmail.trim() || null,
          contactPhone: supplierForm.contactPhone.trim() || null,
          country: supplierForm.country.trim() || null,
          active: true,
        },
        auth
      );
      setSuccess(`Added ${supplierForm.name.trim()}.`);
      setSupplierForm({ ...emptySupplier });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the supplier.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>Catalogue</h2>
        <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>
          Products and suppliers. A product's barcode and SKU are what incoming orders and
          scanned packets are matched against, so anything you sell needs an entry here.
        </p>
      </div>

      <div style={{ display: "inline-flex", borderRadius: 8, background: "#f1f5f9", padding: 3, gap: 2, marginBottom: 14 }}>
        {(["products", "suppliers"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "7px 16px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: tab === t ? 600 : 400,
              background: tab === t ? "#ffffff" : "transparent",
              color: tab === t ? "#111827" : "#6b7280",
              boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              textTransform: "capitalize",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <Banner tone="error">{error}</Banner>}
      {success && <Banner tone="success">{success}</Banner>}

      {tab === "products" ? (
        <>
          <Card title={editingProductId ? "Edit product" : "Add a product"}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12 }}>
              <Field label="Name *">
                <input
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Product name"
                  style={inputStyle}
                />
              </Field>
              <Field label="SKU">
                <input
                  value={productForm.sku}
                  onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                  placeholder="SKU-001"
                  style={inputStyle}
                />
              </Field>
              <Field label="Barcode (EAN-13 / UPC)">
                <input
                  value={productForm.barcode}
                  onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                  placeholder="5391234567890"
                  style={inputStyle}
                />
              </Field>
              <Field label="Unit size">
                <input
                  type="number"
                  value={productForm.unitSize}
                  onChange={(e) => setProductForm({ ...productForm, unitSize: e.target.value })}
                  placeholder="100"
                  style={inputStyle}
                />
              </Field>
              <Field label={`Unit of measure (default ${config.productUnit})`}>
                <input
                  value={productForm.unitOfMeasure}
                  onChange={(e) => setProductForm({ ...productForm, unitOfMeasure: e.target.value })}
                  placeholder={config.productUnit}
                  style={inputStyle}
                />
              </Field>
              <Field label={`Shelf life in months (default ${config.defaultShelfLifeMonths})`}>
                <input
                  type="number"
                  value={productForm.shelfLifeMonths}
                  onChange={(e) =>
                    setProductForm({ ...productForm, shelfLifeMonths: e.target.value })
                  }
                  placeholder={String(config.defaultShelfLifeMonths)}
                  style={inputStyle}
                />
              </Field>
              <Field label="Reorder point (units)">
                <input
                  type="number"
                  value={productForm.lowStockThreshold}
                  onChange={(e) =>
                    setProductForm({ ...productForm, lowStockThreshold: e.target.value })
                  }
                  placeholder="Leave blank for no alert"
                  style={inputStyle}
                />
              </Field>
              <Field label="Suggested reorder quantity">
                <input
                  type="number"
                  value={productForm.reorderQuantity}
                  onChange={(e) =>
                    setProductForm({ ...productForm, reorderQuantity: e.target.value })
                  }
                  placeholder="200"
                  style={inputStyle}
                />
              </Field>
              <Field label={`Expiry warning days (default ${config.expiryAlertDays})`}>
                <input
                  type="number"
                  value={productForm.expiryWarningDays}
                  onChange={(e) =>
                    setProductForm({ ...productForm, expiryWarningDays: e.target.value })
                  }
                  placeholder={String(config.expiryAlertDays)}
                  style={inputStyle}
                />
              </Field>
              <Field label="Perishable">
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", paddingTop: 6 }}>
                  <input
                    type="checkbox"
                    checked={productForm.perishable}
                    onChange={(e) =>
                      setProductForm({ ...productForm, perishable: e.target.checked })
                    }
                  />
                  Goes off — track expiry closely
                </label>
              </Field>
            </div>

            <p style={{ margin: "10px 0 0", fontSize: 12, color: "#6b7280" }}>
              A reorder point is what turns low-stock alerts on for a product. Leave it blank
              and nothing is raised no matter how far the stock falls.
            </p>

            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button onClick={saveProduct} disabled={saving} style={primaryBtn(saving)}>
                {saving ? "Saving…" : editingProductId ? "Save changes" : "Add product"}
              </button>
              {editingProductId && (
                <button onClick={cancelEdit} style={secondaryBtn}>
                  Cancel
                </button>
              )}
            </div>
          </Card>

          <Card title={`Products (${products.length})`}>
            {products.length === 0 ? (
              <Empty>No products yet. Add one above — orders cannot be matched without them.</Empty>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {["Name", "SKU", "Barcode", "Size", "Shelf life", "Reorder point", "Status", ""].map((h) => (
                        <th key={h || "actions"} style={th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id} style={{ opacity: p.active ? 1 : 0.5 }}>
                        <td style={{ ...td, fontWeight: 600, color: "#111827" }}>{p.name}</td>
                        <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>{p.sku ?? "—"}</td>
                        <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>{p.barcode ?? "—"}</td>
                        <td style={td}>
                          {p.unitSize == null ? "—" : `${p.unitSize}${p.unitOfMeasure ?? ""}`}
                        </td>
                        <td style={td}>
                          {p.shelfLifeMonths == null
                            ? `${config.defaultShelfLifeMonths} mo (default)`
                            : `${p.shelfLifeMonths} mo`}
                        </td>
                        <td style={td}>
                          {p.lowStockThreshold == null ? (
                            <span style={{ color: "#9ca3af" }}>Not set</span>
                          ) : (
                            <>
                              {p.lowStockThreshold}
                              {p.reorderQuantity != null && (
                                <span style={{ color: "#9ca3af", fontSize: 12 }}>
                                  {" "}· order {p.reorderQuantity}
                                </span>
                              )}
                            </>
                          )}
                        </td>
                        <td style={td}>
                          <span style={pill(p.active)}>{p.active ? "Active" : "Inactive"}</span>
                          {p.perishable && (
                            <span style={{ marginLeft: 6, background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                              Perishable
                            </span>
                          )}
                        </td>
                        <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                          <button onClick={() => startEdit(p)} style={miniBtn}>Edit</button>
                          <button onClick={() => toggleProduct(p)} style={{ ...miniBtn, marginLeft: 6 }}>
                            {p.active ? "Deactivate" : "Reactivate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      ) : (
        <>
          <Card title="Add a supplier">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 }}>
              <Field label="Name *">
                <input
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  style={inputStyle}
                />
              </Field>
              <Field label="Contact email">
                <input
                  value={supplierForm.contactEmail}
                  onChange={(e) => setSupplierForm({ ...supplierForm, contactEmail: e.target.value })}
                  style={inputStyle}
                />
              </Field>
              <Field label="Contact phone">
                <input
                  value={supplierForm.contactPhone}
                  onChange={(e) => setSupplierForm({ ...supplierForm, contactPhone: e.target.value })}
                  style={inputStyle}
                />
              </Field>
              <Field label="Country">
                <input
                  value={supplierForm.country}
                  onChange={(e) => setSupplierForm({ ...supplierForm, country: e.target.value })}
                  style={inputStyle}
                />
              </Field>
            </div>
            <div style={{ marginTop: 12 }}>
              <button onClick={saveSupplier} disabled={saving} style={primaryBtn(saving)}>
                {saving ? "Saving…" : "Add supplier"}
              </button>
            </div>
          </Card>

          <Card title={`Suppliers (${suppliers.length})`}>
            {suppliers.length === 0 ? (
              <Empty>No suppliers yet.</Empty>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Name", "Email", "Phone", "Country", "Status"].map((h) => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.id} style={{ opacity: s.active ? 1 : 0.5 }}>
                      <td style={{ ...td, fontWeight: 600, color: "#111827" }}>{s.name}</td>
                      <td style={td}>{s.contactEmail ?? "—"}</td>
                      <td style={td}>{s.contactPhone ?? "—"}</td>
                      <td style={td}>{s.country ?? "—"}</td>
                      <td style={td}><span style={pill(s.active)}>{s.active ? "Active" : "Inactive"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 16 }}>
      <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600, color: "#111827" }}>{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function Banner({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  const c =
    tone === "error"
      ? { bg: "#fef2f2", fg: "#b91c1c", br: "#fecaca" }
      : { bg: "#ecfdf5", fg: "#065f46", br: "#a7f3d0" };
  return (
    <div style={{ padding: "10px 14px", borderRadius: 10, background: c.bg, color: c.fg, border: `1px solid ${c.br}`, marginBottom: 14, fontSize: 13 }}>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "18px 0" }}>{children}</div>;
}

function pill(active: boolean): React.CSSProperties {
  return {
    background: active ? "#f0fdf4" : "#f3f4f6",
    color: active ? "#15803d" : "#6b7280",
    borderRadius: 999,
    padding: "2px 9px",
    fontSize: 11,
    fontWeight: 700,
  };
}

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "9px 18px",
    borderRadius: 8,
    border: "none",
    background: "#111827",
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.7 : 1,
  };
}

const secondaryBtn: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  background: "#f9fafb",
  color: "#374151",
  fontSize: 13,
  cursor: "pointer",
};

const miniBtn: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 6,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#374151",
  fontSize: 12,
  cursor: "pointer",
};
