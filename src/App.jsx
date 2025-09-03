// src/App.jsx
import React, { useEffect, useRef, useState } from "react";
 import axios from "axios";
import "./App.css";
import { Plus, Package, Trash2, ShoppingBag } from "lucide-react";

/* ErrorBoundary (siz yozganiga o'xshash) */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "" };
  }
  componentDidCatch(error, info) {
    console.error("Render error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16 }}>
          <h2>Biror xato yuz berdi</h2>
          <p>{this.state.message}</p>
          <button
            className="btn btn-secondary"
            onClick={() => this.setState({ hasError: false, message: "" })}
          >
            Qayta urinish
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* --- Yordamchi funksiyalar --- */
const makeLocalId = () => `_local_${Date.now()}_${Math.random().toString(36).slice(2)}`;

/* normalize va dedupe — hamma productga doimiy `uid` qo'shadi */
const normalizeProducts = (list) => {
  if (!Array.isArray(list)) return [];
  const map = new Map();
  for (const raw of list) {
    if (!raw) continue;
    const p = { ...raw };
    if (p.id == null && !p._localId) {
      p._localId = makeLocalId();
    }
    p.uid = p.id != null ? String(p.id) : p._localId;
    // agar mapda bo'lsa override bilan so'nggi qiymatni olamiz
    map.set(p.uid, p);
  }
  return Array.from(map.values());
};

function App() {
  const [products, setProducts] = useState([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    axios
      .get("https://2a02dff8463bd267.mokky.dev/products")
      .then((res) => {
        // normalize va uid qo'shamiz
        setProducts(normalizeProducts(res.data));
        console.log("Loaded products:", res.data);
      })
      .catch((err) => {
        console.log("GET products error:", err);
      });
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      try {
        inputRef.current.focus();
      } catch {}
    }
  }, [open]);

  const handleCreate = async () => {
    if (loading) return;
    if (!name || !price) {
      alert("Iltimos, barcha maydonlarni to'ldiring!");
      return;
    }

    setLoading(true);
    try {
      const payload = { name, price: parseFloat(price) || 0 };
      const res = await axios.post("https://2a02dff8463bd267.mokky.dev/products", payload);
      const created = res?.data || {};

      // Agar server id bermasa — localId yaratamiz
      if (created.id == null && created._localId == null) {
        created._localId = makeLocalId();
      }
      created.uid = created.id != null ? String(created.id) : created._localId;

      // setProducts prev bilan update qilamiz va dedupe qilamiz
      setProducts((prev) => normalizeProducts([...(Array.isArray(prev) ? prev : []), created]));

      setOpen(false);
      setName("");
      setPrice("");
    } catch (err) {
      console.error("Create error:", err);
      alert("Mahsulot qo'shishda xato");
    } finally {
      setLoading(false);
    }
  };

  /* handleDelete — uid bilan ishlaydi. Agar serverda id bo'lsa, serverga DELETE so'rov yuboradi.
     Agar bu element faqat local bo'lsa (_localId), faqat frontenddan olib tashlaymiz. */
  const handleDelete = async (uid) => {
    const product = products.find((p) => p.uid === uid);
    if (!product) return;

    // confirm (iste'molchi uchun)
    if (!window.confirm("Haqiqatan o'chirmoqchimisiz?")) return;

    try {
      if (product.id != null) {
        // faqat serverda mavjud bo'lsa DELETE qiling
        await axios.delete(`https://2a02dff8463bd267.mokky.dev/products/${product.id}`);
      }
      // har doim frontenddan olib tashlaymiz (prev snapshot bilan)
      setProducts((prev) => prev.filter((p) => p.uid !== uid));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Mahsulotni o'chirishda xato");
    }
  };

  const totalValue = products.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);

  return (
    <ErrorBoundary>
      <div className="app-container">
        {/* Header */}
        <div className="header">
          <h1>
            <ShoppingBag size={40} /> Mahsulot Boshqaruvi
          </h1>
          <p>Mahsulotlarni qo'shing, ko'ring va boshqaring</p>

          <div className="stats-container">
            <div className="stat-card">
              <div className="stat-value">{products.length}</div>
              <div className="stat-label">Mahsulotlar</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{totalValue.toFixed(0)}</div>
              <div className="stat-label">Umumiy qiymat</div>
            </div>
          </div>

          <button onClick={() => setOpen(true)} className="btn btn-primary">
            <Plus size={20} />
            Mahsulot qo'shish
          </button>
        </div>

        {/* Products */}
        <div className="products-container">
          <h2 className="products-title">
            <Package size={24} /> Mahsulotlar ro'yxati
            <span className="product-counter">{products.length}</span>
          </h2>

          <ul className="products-list">
            {products.length === 0 ? (
              <li className="product-item empty">
                <div className="empty-state">
                  <div className="empty-state-icon">📦</div>
                  <h3>Hech qanday mahsulot topilmadi</h3>
                  <p>Birinchi mahsulotingizni qo'shish uchun yuqoridagi tugmani bosing</p>
                </div>
              </li>
            ) : (
              products.map((p) => (
                <li key={p.uid} className="product-item">
                  <div className="product-content">
                    <div className="product-info">
                      <div className="product-name">{p.name}</div>
                      <div className="product-price">{p.price} so'm</div>
                    </div>
                    <button
                      onClick={() => handleDelete(p.uid)} // NOTE: uid bilan chaqiramiz
                      className="btn btn-danger"
                      title="Mahsulotni o'chirish"
                    >
                      <Trash2 size={16} />
                      O'chirish
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Modal (persisted, visibility toggled) */}
        <div
          className="modal-overlay"
          style={{ display: open ? 'flex' : 'none' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                <Plus size={24} /> Yangi mahsulot qo'shish
              </h2>
            </div>

            <div className="form-group">
              <label className="form-label">Mahsulot nomi</label>
              <input
                type="text"
                placeholder="Masalan: iPhone 15"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input"
                ref={inputRef}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mahsulot narxi (so'm)</label>
              <input
                type="number"
                placeholder="Masalan: 15000000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="form-input"
                min="0"
                step="0.01"
              />
            </div>

            <div className="modal-actions">
              <button onClick={() => setOpen(false)} className="btn btn-secondary" disabled={loading}>
                Bekor qilish
              </button>
              <button onClick={handleCreate} className={`btn btn-success ${loading ? "loading" : ""}`} disabled={loading}>
                {loading ? "Saqlanmoqda..." : (<><Plus size={16} /> Saqlash</>)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
