import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PieChart, Pie, Tooltip, Cell } from "recharts";

const CATEGORIES = [
  { id: "general", label: "General", className: "badge-general" },
  { id: "food", label: "Food", className: "badge-food" },
  { id: "travel", label: "Travel", className: "badge-travel" },
  { id: "bills", label: "Bills", className: "badge-bills" },
  { id: "shopping", label: "Shopping", className: "badge-shopping" },
  { id: "health", label: "Health", className: "badge-health" }
];

const PIE_COLORS = ["#DAF1DE", "#B8DCC2", "#8EB69B", "#6FA68D", "#3F7967", "#235347"];

const CATEGORY_MAP = CATEGORIES.reduce((acc, category) => {
  acc[category.id] = category;
  return acc;
}, {});

const normalizeCategory = (value) => {
  const key = String(value || "").trim().toLowerCase();
  return CATEGORY_MAP[key] ? key : "general";
};

const MagneticButton = ({ className = "", children, onClick, type = "button" }) => {
  const buttonRef = useRef(null);

  const handleMove = (event) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    buttonRef.current.style.transform = `translate3d(${x * 0.12}px, ${y * 0.12}px, 0)`;
  };

  const handleLeave = () => {
    if (!buttonRef.current) return;
    buttonRef.current.style.transform = "translate3d(0, 0, 0)";
  };

  return (
    <motion.button
      ref={buttonRef}
      type={type}
      className={`magnetic ${className}`}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 220, damping: 16 }}
    >
      {children}
    </motion.button>
  );
};

function App() {
  const [filter, setFilter] = useState("All");
  const [expenses, setExpenses] = useState([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("general");
  const [displayTotal, setDisplayTotal] = useState(0);

  const glowRef = useRef(null);
  const cursorDotRef = useRef(null);
  const cursorRingRef = useRef(null);
  const cursorPos = useRef({ x: 0, y: 0 });
  const ringPos = useRef({ x: 0, y: 0 });
  const totalRef = useRef(0);

  const fetchExpenses = () => {
    fetch("http://localhost:8000/expenses")
      .then(res => res.json())
      .then(data => setExpenses(data))
      .catch(() => {
        toast.error("Could not load expenses");
      });
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    let rafId;

    const handleMouseMove = (event) => {
      const { clientX, clientY } = event;
      cursorPos.current = { x: clientX, y: clientY };

      if (cursorDotRef.current) {
        cursorDotRef.current.style.left = `${clientX}px`;
        cursorDotRef.current.style.top = `${clientY}px`;
      }

      if (glowRef.current) {
        glowRef.current.style.left = `${clientX}px`;
        glowRef.current.style.top = `${clientY}px`;
      }
    };

    const animateRing = () => {
      ringPos.current.x += (cursorPos.current.x - ringPos.current.x) * 0.16;
      ringPos.current.y += (cursorPos.current.y - ringPos.current.y) * 0.16;

      if (cursorRingRef.current) {
        cursorRingRef.current.style.left = `${ringPos.current.x}px`;
        cursorRingRef.current.style.top = `${ringPos.current.y}px`;
      }

      rafId = requestAnimationFrame(animateRing);
    };

    window.addEventListener("mousemove", handleMouseMove);
    animateRing();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const total = useMemo(
    () => expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0),
    [expenses]
  );

  const filteredExpenses =
    filter === "All"
      ? expenses
      : expenses.filter(
          (expense) => String(expense.category || "").toLowerCase() === filter.toLowerCase()
        );

  const categoryTotals = expenses.reduce((acc, expense) => {
    const cat = String(expense.category || "general");
    acc[cat] = (acc[cat] || 0) + Number(expense.amount || 0);
    return acc;
  }, {});

  const chartData = Object.keys(categoryTotals).map(cat => ({
    name: cat,
    value: categoryTotals[cat]
  }));

  useEffect(() => {
    const startValue = totalRef.current;
    const endValue = total;
    const duration = 420;
    const startTime = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const nextValue = startValue + (endValue - startValue) * progress;
      setDisplayTotal(Math.round(nextValue));

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
    totalRef.current = endValue;
  }, [total]);

  const addExpense = (event) => {
    event.preventDefault();
    if (!title.trim() || !amount) return;

    const payload = {
      title: title.trim(),
      amount: Number(amount),
      category: normalizeCategory(category)
    };

    fetch("http://localhost:8000/expenses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || "Failed to add expense");
        }

        return res.json();
      })
      .then(newExpense => {
        setExpenses(prev => [...prev, newExpense]);
        setTitle("");
        setAmount("");
        setCategory("general");
        toast.success("Expense Added ✅");
      })
      .catch((error) => {
        toast.error(error.message || "Could not add expense");
      });
  };

  const deleteExpense = (id) => {
    fetch(`http://localhost:8000/expenses/${id}`, {
      method: "DELETE"
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || "Failed to delete expense");
        }
      })
      .then(() => {
        fetchExpenses();
        toast.success("Expense Deleted 🗑️");
      })
      .catch((error) => {
        toast.error(error.message || "Could not delete expense");
      });
  };

  const editExpense = (id) => {
    const expense = expenses.find(exp => exp._id === id);
    if (!expense) return;

    const newTitle = prompt("Enter new title:", expense.title) || expense.title;
    const newAmount = prompt("Enter new amount:", expense.amount) || expense.amount;
    const newCategory = prompt(
      "Enter category (general, food, travel, bills, shopping, health):",
      expense.category || "general"
    );

    const resolvedCategory = normalizeCategory(
      newCategory === null ? expense.category : newCategory
    );

    const payload = {
      title: newTitle,
      amount: Number(newAmount),
      category: resolvedCategory
    };

    fetch(`http://localhost:8000/expenses/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || "Failed to update expense");
        }

        return res.json().catch(() => null);
      })
      .then(() => {
        fetchExpenses();
        toast.success("Expense Updated ✏️");
      })
      .catch((error) => {
        toast.error(error.message || "Could not update expense");
      });
  };

  return (
    <div className="app">
      <div className="bg-orb orb-one" aria-hidden="true"></div>
      <div className="bg-orb orb-two" aria-hidden="true"></div>
      <div className="bg-orb orb-three" aria-hidden="true"></div>
      <div className="particles" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, index) => (
          <span key={index} className="particle"></span>
        ))}
      </div>

      <div ref={glowRef} className="cursor-glow" aria-hidden="true"></div>
      <div ref={cursorDotRef} className="cursor-dot" aria-hidden="true"></div>
      <div ref={cursorRingRef} className="cursor-ring" aria-hidden="true"></div>

      <motion.main
        className="container premium"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <header className="hero">
          <h1>Expense Tracker</h1>
          <p className="subhead">
            Track daily spend, stay on budget, and keep a clean overview of your cash flow.
          </p>
        </header>

        <motion.div
          className="total-card"
          layout
          transition={{ type: "spring", stiffness: 160, damping: 18 }}
        >
          <span>Total Spend</span>
          <strong>₹{displayTotal.toLocaleString("en-IN")}</strong>
        </motion.div>

        <form className="expense-form" onSubmit={addExpense}>
          <div className="form-grid">
            <div className="field">
              <label>Expense title</label>
              <input
                placeholder="Netflix, groceries, rent..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Amount</label>
              <input
                placeholder="0.00"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <MagneticButton className="primary-btn" type="submit">
            Add Expense
          </MagneticButton>
        </form>

        <section className="expense-section">
          <div className="section-title">Recent Expenses</div>

          <div className="chart-wrap">
            <PieChart width={300} height={300}>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                outerRadius={100}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                    stroke="#163832"
                    strokeWidth={1}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="All">All</option>
            <option value="Food">Food</option>
            <option value="Rent">Rent</option>
            <option value="Travel">Travel</option>
            <option value="General">General</option>
          </select>

          {filteredExpenses.length === 0 ? (
            <motion.div
              className="empty-state"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {expenses.length === 0
                ? "No expenses yet. Add your first entry to see it here."
                : "No expenses found for this filter."}
            </motion.div>
          ) : (
            <div className="expense-list">
              <AnimatePresence initial={false}>
                {filteredExpenses.map(expense => {
                  const safeCategory = normalizeCategory(expense.category);
                  const categoryInfo = CATEGORY_MAP[safeCategory];

                  return (
                    <motion.div
                      key={expense._id}
                      className="expense-card"
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                    >
                      <div className="card-main">
                        <div className={`badge ${categoryInfo.className}`}>
                          {categoryInfo.label}
                        </div>
                        <div className="expense-title">{expense.title}</div>
                        <div className="expense-amount">
                          ₹{Number(expense.amount).toLocaleString("en-IN")}
                        </div>
                      </div>

                      <div className="card-actions">
                        <MagneticButton
                          className="btn btn-edit"
                          onClick={() => editExpense(expense._id)}
                        >
                          Edit
                        </MagneticButton>
                        <MagneticButton
                          className="btn btn-delete"
                          onClick={() => deleteExpense(expense._id)}
                        >
                          Delete
                        </MagneticButton>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </section>
      </motion.main>
      <ToastContainer position="top-right" />
    </div>
  );
}

export default App;