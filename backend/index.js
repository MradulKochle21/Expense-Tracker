require("dotenv").config();

const mongoose = require("mongoose");
let isMongoConnected = false;

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000
})
  .then(() => {
    isMongoConnected = true;
    console.log("MongoDB Connected");
  })
  .catch(err => {
    isMongoConnected = false;
    console.log("MongoDB unavailable. Running with in-memory fallback.");
    console.log(err.message);
  });

mongoose.connection.on("connected", () => {
  isMongoConnected = true;
});

mongoose.connection.on("disconnected", () => {
  isMongoConnected = false;
});

const expenseSchema = new mongoose.Schema({
  title: String,
  amount: Number,
  category: String,
  date: { type: Date, default: Date.now }
});

const Expense = mongoose.model("Expense", expenseSchema);

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

let expensesMemory = [];

app.get("/expenses", async (req, res) => {
  try {
    if (!isMongoConnected) {
      return res.json(expensesMemory);
    }

    const expenses = await Expense.find();
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.post("/expenses", async (req, res) => {
  try {
    const { title, amount, category } = req.body;

    if (!title || !amount) {
      return res.status(400).json({ error: "Title and Amount required" });
    }

    if (!isMongoConnected) {
      const newExpense = {
        _id: new mongoose.Types.ObjectId().toString(),
        title,
        amount,
        category,
        date: new Date()
      };

      expensesMemory.push(newExpense);
      return res.json(newExpense);
    }

    const newExpense = new Expense({
      title,
      amount,
      category
    });

    await newExpense.save();
    res.json(newExpense);

  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.delete("/expenses/:id", async (req, res) => {
  try {
    if (!isMongoConnected) {
      expensesMemory = expensesMemory.filter(exp => exp._id !== req.params.id);
      return res.json({ message: "Deleted" });
    }

    await Expense.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.put("/expenses/:id", async (req, res) => {
  try {
    const { title, amount, category } = req.body;

    if (!isMongoConnected) {
      expensesMemory = expensesMemory.map(exp =>
        exp._id === req.params.id
          ? { ...exp, title, amount, category }
          : exp
      );

      const updatedMemory = expensesMemory.find(exp => exp._id === req.params.id) || null;
      return res.json(updatedMemory);
    }

    const updated = await Expense.findByIdAndUpdate(
      req.params.id,
      { title, amount, category },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});
const PORT = 8000;

const server = app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📝 Timestamp: ${new Date().toISOString()}`);
});

