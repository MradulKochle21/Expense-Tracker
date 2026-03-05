import { useState } from "react";

function ExpenseForm({ onAddExpense }) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");

  const handleSubmit = (e) => {
  e.preventDefault();

  const expense = {
  id: Date.now(),
  title,
  amount
};

  onAddExpense(expense);

  setTitle("");
  setAmount("");
};

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="💳 Expense Title (e.g., Groceries)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      <input
        type="number"
        placeholder="💵 Amount (₹)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
        min="0"
        step="0.01"
      />

      <button type="submit">➕ Add Expense</button>
    </form>
  );
}

export default ExpenseForm;