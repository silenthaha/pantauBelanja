// app.js
// Initialize Supabase
const supabaseUrl = "https://afvfxcecqhgtvftdlhhb.supabase.co"; // GANTI DENGAN URL ANDA
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmdmZ4Y2VjcWhndHZmdGRsaGhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0Mjg1MjIsImV4cCI6MjA3OTAwNDUyMn0.ySGRy4hVxokr-Pl_gMSf9nvzBImtRfVB4ZYpZbCMJDQ"; // GANTI DENGAN KUNCI ANDA
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- Monthly Balance Elements (Display Only) ---
const currentBalanceEl = document.getElementById("currentBalance");
const balancePeriodEl = document.getElementById("balancePeriod");

// --- Salary Elements ---
const salaryDisplay = document.getElementById("salaryDisplay");
const salaryEdit = document.getElementById("salaryEdit");
const editSalaryBtn = document.getElementById("editSalaryBtn");
const salaryTableBody = document.getElementById("salaryTableBody");
const addSalaryBtn = document.getElementById("addSalaryBtn");
const salaryModal = new bootstrap.Modal(document.getElementById("salaryModal"));
const salaryForm = document.getElementById("salaryForm");
const saveSalaryBtn = document.getElementById("saveSalaryBtn");

// --- Expense Elements ---
const expensesDisplay = document.getElementById("expensesDisplay");
const expensesEdit = document.getElementById("expensesEdit");
const editExpensesBtn = document.getElementById("editExpensesBtn");
const expensesTableBody = document.getElementById("expensesTableBody");
const addExpenseBtn = document.getElementById("addExpenseBtn");
const expenseModal = new bootstrap.Modal(
  document.getElementById("expenseModal")
);
const expenseForm = document.getElementById("expenseForm");
const saveExpenseBtn = document.getElementById("saveExpenseBtn");
const toggleExpensesBtn = document.getElementById("toggleExpensesBtn");

// --- Subscription Elements ---
const subscriptionsDisplay = document.getElementById("subscriptionsDisplay");
const subscriptionsEdit = document.getElementById("subscriptionsEdit");
const editSubscriptionsBtn = document.getElementById("editSubscriptionsBtn");
const subscriptionsTableBody = document.getElementById(
  "subscriptionsTableBody"
);
const addSubscriptionBtn = document.getElementById("addSubscriptionBtn");
const subscriptionModal = new bootstrap.Modal(
  document.getElementById("subscriptionModal")
);
const subscriptionForm = document.getElementById("subscriptionForm");
const saveSubscriptionBtn = document.getElementById("saveSubscriptionBtn");

// --- Installment Elements ---
const installmentsDisplay = document.getElementById("installmentsDisplay");
const installmentsEdit = document.getElementById("installmentsEdit");
const editInstallmentsBtn = document.getElementById("editInstallmentsBtn");
const installmentsTableBody = document.getElementById("installmentsTableBody");
const addInstallmentBtn = document.getElementById("addInstallmentBtn");
const installmentModal = new bootstrap.Modal(
  document.getElementById("installmentModal")
);
const installmentForm = document.getElementById("installmentForm");
const saveInstallmentBtn = document.getElementById("saveInstallmentBtn");

// --- Other Elements ---
const toastEl = document.getElementById("toast");
const toast = new bootstrap.Toast(toastEl);
const toastMessage = document.getElementById("toastMessage");
const expenseCategory = document.getElementById("expenseCategory");
const subscriptionFields = document.getElementById("subscriptionFields");
const installmentFields = document.getElementById("installmentFields");

// --- STATE VARIABLES ---
let isShowingAllExpenses = false;

// --- HELPER FUNCTIONS ---
expenseCategory.addEventListener("change", () => {
  const category = expenseCategory.value;
  subscriptionFields.classList.add("d-none");
  installmentFields.classList.add("d-none");
  if (category === "Subscription") {
    subscriptionFields.classList.remove("d-none");
  } else if (category === "Paylater/Installment") {
    installmentFields.classList.remove("d-none");
  }
});

function showToast(message, type = "success") {
  toastMessage.textContent = message;
  toastEl.className = `toast align-items-center text-white bg-${
    type === "success" ? "success" : "danger"
  } border-0`;
  toast.show();
}

function toggleDisplay(displayElement, editElement) {
  displayElement.classList.toggle("d-none");
  editElement.classList.toggle("d-none");
}

function formatDate(dateString) {
  if (!dateString) return "-";
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Date(dateString).toLocaleDateString("ms-MY", options);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("ms-MY", {
    style: "currency",
    currency: "MYR",
  }).format(amount);
}

// --- MONTHLY BALANCE (CALCULATED) ---
async function loadMonthlyBalance() {
  try {
    const { data: salaries, error: salaryError } = await supabase
      .from("salaries")
      .select("*")
      .order("month", { ascending: false })
      .limit(1);

    if (salaryError) throw salaryError;

    if (!salaries || salaries.length === 0) {
      currentBalanceEl.textContent = formatCurrency(0);
      balancePeriodEl.textContent = "Tempoh: Tiada data gaji ditemui.";
      return;
    }

    const currentSalary = salaries[0];
    const { start_date, end_date, amount: salaryAmount } = currentSalary;

    const { data: expenses, error: expenseError } = await supabase
      .from("expenses")
      .select("amount")
      .gte("date", start_date)
      .lte("date", end_date);

    if (expenseError) throw expenseError;

    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );
    const balance = salaryAmount - totalExpenses;

    currentBalanceEl.textContent = formatCurrency(balance);
    balancePeriodEl.textContent = `Tempoh: ${formatDate(
      start_date
    )} - ${formatDate(end_date)}`;
  } catch (error) {
    console.error("Error calculating monthly balance:", error);
    showToast("Gagal mengira baki bulanan", "error");
    currentBalanceEl.textContent = "Ralat";
    balancePeriodEl.textContent = "Tidak dapat mengira";
  }
}

// --- SALARY FUNCTIONS ---
async function loadSalaries() {
  try {
    const { data, error } = await supabase
      .from("salaries")
      .select("*")
      .order("month", { ascending: false });
    if (error) throw error;
    if (data.length > 0) {
      const currentSalary = data[0];
      document.getElementById("currentSalary").textContent = formatCurrency(
        currentSalary.amount
      );
      document.getElementById(
        "salaryPeriod"
      ).textContent = `Tempoh: ${formatDate(
        currentSalary.start_date
      )} - ${formatDate(currentSalary.end_date)}`;
    }
    salaryTableBody.innerHTML = "";
    data.forEach((salary) => {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${salary.month}</td><td>${formatCurrency(
        salary.amount
      )}</td><td>${formatDate(salary.start_date)} - ${formatDate(
        salary.end_date
      )}</td><td><button class="btn btn-sm btn-outline-primary edit-salary-btn" data-id="${
        salary.id
      }"><i class="bi bi-pencil"></i></button><button class="btn btn-sm btn-outline-danger delete-salary-btn" data-id="${
        salary.id
      }"><i class="bi bi-trash"></i></button></td>`;
      salaryTableBody.appendChild(row);
    });
  } catch (error) {
    console.error("Error loading salaries:", error);
    showToast("Gagal memuatkan data gaji", "error");
  }
}

async function saveSalary() {
  const id = document.getElementById("salaryId").value;
  const month = document.getElementById("salaryMonth").value;
  const amount = parseFloat(document.getElementById("salaryAmount").value);
  const startDate = document.getElementById("salaryStartDate").value;
  const endDate = document.getElementById("salaryEndDate").value;
  try {
    let error;
    if (id) {
      ({ error } = await supabase
        .from("salaries")
        .update({ month, amount, start_date: startDate, end_date: endDate })
        .eq("id", id));
    } else {
      ({ error } = await supabase
        .from("salaries")
        .insert({ month, amount, start_date: startDate, end_date: endDate }));
    }
    if (error) throw error;
    showToast(`Rekod gaji berjaya ${id ? "dikemaskini" : "ditambah"}`);
  } catch (error) {
    console.error("Error saving salary:", error);
    showToast(`Gagal menyimpan rekod: ${error.message}`, "error");
  } finally {
    salaryModal.hide();
    salaryForm.reset();
    loadSalaries();
    loadMonthlyBalance();
  }
}

async function editSalary(id) {
  try {
    const { data, error } = await supabase
      .from("salaries")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    document.getElementById("salaryId").value = data.id;
    document.getElementById("salaryMonth").value = data.month;
    document.getElementById("salaryAmount").value = data.amount;
    document.getElementById("salaryStartDate").value = data.start_date;
    document.getElementById("salaryEndDate").value = data.end_date;
    salaryModal.show();
  } catch (error) {
    console.error("Error loading salary:", error);
    showToast("Gagal memuatkan rekod gaji", "error");
  }
}

async function deleteSalary(id) {
  if (confirm("Adakah anda pasti ingin memadamkan rekod ini?")) {
    try {
      const { error } = await supabase.from("salaries").delete().eq("id", id);
      if (error) throw error;
      showToast("Rekod gaji berjaya dipadam");
      loadSalaries();
      loadMonthlyBalance();
    } catch (error) {
      console.error("Error deleting salary:", error);
      showToast("Gagal memadam rekod gaji", "error");
    }
  }
}

// --- EXPENSE FUNCTIONS ---
async function loadExpenses() {
  try {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false });
    if (error) throw error;
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const currentMonthExpenses = data.filter((expense) => {
      const expenseDate = new Date(expense.date);
      return (
        expenseDate.getMonth() + 1 === currentMonth &&
        expenseDate.getFullYear() === currentYear
      );
    });
    const totalExpenses = currentMonthExpenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );
    document.getElementById("currentExpenses").textContent =
      formatCurrency(totalExpenses);
    document.getElementById(
      "expensesPeriod"
    ).textContent = `Tempoh: 1 ${currentDate.toLocaleDateString("ms-MY", {
      month: "long",
    })} - ${new Date(
      currentYear,
      currentMonth,
      0
    ).getDate()} ${currentDate.toLocaleDateString("ms-MY", {
      month: "long",
    })} ${currentYear}`;

    expensesTableBody.innerHTML = "";
    const itemsToShow = isShowingAllExpenses ? data : data.slice(0, 5);
    itemsToShow.forEach((expense) => {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${formatDate(expense.date)}</td><td>${
        expense.description
      }</td><td>${formatCurrency(
        expense.amount
      )}</td><td><span class="badge bg-${getCategoryBadgeColor(
        expense.category
      )}">${
        expense.category
      }</span></td><td><button class="btn btn-sm btn-outline-primary edit-expense-btn" data-id="${
        expense.id
      }"><i class="bi bi-pencil"></i></button><button class="btn btn-sm btn-outline-danger delete-expense-btn" data-id="${
        expense.id
      }"><i class="bi bi-trash"></i></button></td>`;
      expensesTableBody.appendChild(row);
    });

    // ... kod sebelum ini ...
    const toggleBtn = document.getElementById("toggleExpensesBtn");

    // --- UNTUK UJIAN: Buat butang sentiasa kelihatan ---
    toggleBtn.style.display = "inline-block";
    if (data.length > 5) {
      toggleBtn.textContent = isShowingAllExpenses ? "Show Less" : "Show All";
    } else {
      toggleBtn.textContent = "Show All"; // Tukar teks juga
    }
    // ... kod selepas ini ...
  } catch (error) {
    console.error("Error loading expenses:", error);
    showToast("Gagal memuatkan data perbelanjaan", "error");
  }
}

function getCategoryBadgeColor(category) {
  switch (category) {
    case "Keperluan":
      return "primary";
    case "Bukan Keperluan":
      return "danger";
    case "Subscription":
      return "info";
    case "Paylater/Installment":
      return "warning";
    case "Lain-lain":
      return "secondary";
    default:
      return "secondary";
  }
}

async function saveExpense() {
  const id = document.getElementById("expenseId").value;
  const date = document.getElementById("expenseDate").value;
  const description = document.getElementById("expenseDescription").value;
  const amount = parseFloat(document.getElementById("expenseAmount").value);
  const category = document.getElementById("expenseCategory").value;
  let updateData = { date, description, amount, category };
  if (category === "Subscription") {
    updateData.start_date = document.getElementById("expenseStartDate").value;
    updateData.end_date = document.getElementById("expenseEndDate").value;
  } else if (category === "Paylater/Installment") {
    updateData.installment_months = parseInt(
      document.getElementById("installmentMonths").value
    );
    updateData.payment_date = document.getElementById(
      "installmentPaymentDate"
    ).value;
    updateData.end_date = document.getElementById("installmentEndDate").value;
  }
  try {
    let error;
    if (id) {
      ({ error } = await supabase
        .from("expenses")
        .update(updateData)
        .eq("id", id));
    } else {
      ({ error } = await supabase.from("expenses").insert(updateData));
    }
    if (error) throw error;
    showToast(`Rekod perbelanjaan berjaya ${id ? "dikemaskini" : "ditambah"}`);
  } catch (error) {
    console.error("Error saving expense:", error);
    showToast(`Gagal menyimpan rekod: ${error.message}`, "error");
  } finally {
    expenseModal.hide();
    expenseForm.reset();
    loadExpenses();
    loadSubscriptions();
    loadInstallments();
    loadMonthlyBalance();
  }
}

async function editExpense(id) {
  try {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    document.getElementById("expenseId").value = data.id;
    document.getElementById("expenseDate").value = data.date;
    document.getElementById("expenseDescription").value = data.description;
    document.getElementById("expenseAmount").value = data.amount;
    document.getElementById("expenseCategory").value = data.category;
    expenseCategory.dispatchEvent(new Event("change"));
    if (data.category === "Subscription") {
      document.getElementById("expenseStartDate").value = data.start_date || "";
      document.getElementById("expenseEndDate").value = data.end_date || "";
    } else if (data.category === "Paylater/Installment") {
      document.getElementById("installmentMonths").value =
        data.installment_months || "";
      document.getElementById("installmentPaymentDate").value =
        data.payment_date || "";
      document.getElementById("installmentEndDate").value = data.end_date || "";
    }
    expenseModal.show();
  } catch (error) {
    console.error("Error loading expense:", error);
    showToast("Gagal memuatkan rekod perbelanjaan", "error");
  }
}

async function deleteExpense(id) {
  if (confirm("Adakah anda pasti ingin memadamkan rekod ini?")) {
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
      showToast("Rekod perbelanjaan berjaya dipadam");
      loadExpenses();
      loadSubscriptions();
      loadInstallments();
      loadMonthlyBalance();
    } catch (error) {
      console.error("Error deleting expense:", error);
      showToast("Gagal memadam rekod perbelanjaan", "error");
    }
  }
}

// --- SUBSCRIPTION FUNCTIONS ---
async function loadSubscriptions() {
  try {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("category", "Subscription")
      .order("date", { ascending: false });
    if (error) throw error;
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const currentMonthSubscriptions = data.filter((expense) => {
      const expenseDate = new Date(expense.date);
      return (
        expenseDate.getMonth() + 1 === currentMonth &&
        expenseDate.getFullYear() === currentYear
      );
    });
    const totalSubscriptions = currentMonthSubscriptions.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );
    document.getElementById("currentSubscriptions").textContent =
      formatCurrency(totalSubscriptions);
    subscriptionsTableBody.innerHTML = "";
    data.slice(0, 5).forEach((subscription) => {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${subscription.description}</td><td>${formatCurrency(
        subscription.amount
      )}</td><td>${formatDate(subscription.start_date)}</td><td>${formatDate(
        subscription.end_date
      )}</td><td><button class="btn btn-sm btn-outline-primary edit-subscription-btn" data-id="${
        subscription.id
      }"><i class="bi bi-pencil"></i></button><button class="btn btn-sm btn-outline-danger delete-subscription-btn" data-id="${
        subscription.id
      }"><i class="bi bi-trash"></i></button></td>`;
      subscriptionsTableBody.appendChild(row);
    });
  } catch (error) {
    console.error("Error loading subscriptions:", error);
    showToast("Gagal memuatkan data langganan", "error");
  }
}

async function saveSubscription() {
  const id = document.getElementById("subscriptionId").value;
  const description = document.getElementById("subscriptionDescription").value;
  const amount = parseFloat(
    document.getElementById("subscriptionAmount").value
  );
  const startDate = document.getElementById("subscriptionStartDate").value;
  const endDate = document.getElementById("subscriptionEndDate").value;
  const subscriptionData = {
    description,
    amount,
    category: "Subscription",
    start_date: startDate,
    end_date: endDate,
    date: startDate,
  };
  try {
    let error;
    if (id) {
      ({ error } = await supabase
        .from("expenses")
        .update(subscriptionData)
        .eq("id", id));
    } else {
      ({ error } = await supabase.from("expenses").insert(subscriptionData));
    }
    if (error) throw error;
    showToast(`Rekod langganan berjaya ${id ? "dikemaskini" : "ditambah"}`);
  } catch (error) {
    console.error("Error saving subscription:", error);
    showToast(`Gagal menyimpan rekod: ${error.message}`, "error");
  } finally {
    subscriptionModal.hide();
    subscriptionForm.reset();
    loadSubscriptions();
    loadExpenses();
    loadMonthlyBalance();
  }
}

async function editSubscription(id) {
  try {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    document.getElementById("subscriptionId").value = data.id;
    document.getElementById("subscriptionDescription").value = data.description;
    document.getElementById("subscriptionAmount").value = data.amount;
    document.getElementById("subscriptionStartDate").value = data.start_date;
    document.getElementById("subscriptionEndDate").value = data.end_date;
    subscriptionModal.show();
  } catch (error) {
    console.error("Error loading subscription:", error);
    showToast("Gagal memuatkan rekod langganan", "error");
  }
}

async function deleteSubscription(id) {
  if (confirm("Adakah anda pasti ingin memadamkan rekod ini?")) {
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
      showToast("Rekod langganan berjaya dipadam");
      loadSubscriptions();
      loadExpenses();
      loadMonthlyBalance();
    } catch (error) {
      console.error("Error deleting subscription:", error);
      showToast("Gagal memadam rekod langganan", "error");
    }
  }
}

// --- INSTALLMENT FUNCTIONS ---
async function loadInstallments() {
  try {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("category", "Paylater/Installment")
      .order("payment_date", { ascending: false });
    if (error) throw error;
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const currentMonthInstallments = data.filter((expense) => {
      const expenseDate = new Date(expense.payment_date || expense.date);
      return (
        expenseDate.getMonth() + 1 === currentMonth &&
        expenseDate.getFullYear() === currentYear
      );
    });
    const totalInstallments = currentMonthInstallments.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );
    document.getElementById("currentInstallments").textContent =
      formatCurrency(totalInstallments);
    installmentsTableBody.innerHTML = "";
    data.slice(0, 5).forEach((installment) => {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${installment.description}</td><td>${formatCurrency(
        installment.amount
      )}</td><td>${installment.installment_months || "-"}</td><td>${formatDate(
        installment.payment_date
      )}</td><td>${formatDate(
        installment.end_date
      )}</td><td><button class="btn btn-sm btn-outline-primary edit-installment-btn" data-id="${
        installment.id
      }"><i class="bi bi-pencil"></i></button><button class="btn btn-sm btn-outline-danger delete-installment-btn" data-id="${
        installment.id
      }"><i class="bi bi-trash"></i></button></td>`;
      installmentsTableBody.appendChild(row);
    });
  } catch (error) {
    console.error("Error loading installments:", error);
    showToast("Gagal memuatkan data ansuran", "error");
  }
}

async function saveInstallment() {
  const id = document.getElementById("installmentId").value;
  const description = document.getElementById("installmentDescription").value;
  const amount = parseFloat(document.getElementById("installmentAmount").value);
  const months = parseInt(document.getElementById("installmentMonths").value);
  const paymentDate = document.getElementById("installmentPaymentDate").value;
  const endDate = document.getElementById("installmentEndDate").value;
  const installmentData = {
    description,
    amount,
    category: "Paylater/Installment",
    installment_months: months,
    payment_date: paymentDate,
    end_date: endDate,
    date: paymentDate,
  };
  try {
    let error;
    if (id) {
      ({ error } = await supabase
        .from("expenses")
        .update(installmentData)
        .eq("id", id));
    } else {
      ({ error } = await supabase.from("expenses").insert(installmentData));
    }
    if (error) throw error;
    showToast(`Rekod ansuran berjaya ${id ? "dikemaskini" : "ditambah"}`);
  } catch (error) {
    console.error("Error saving installment:", error);
    showToast(`Gagal menyimpan rekod: ${error.message}`, "error");
  } finally {
    installmentModal.hide();
    installmentForm.reset();
    loadInstallments();
    loadExpenses();
    loadMonthlyBalance();
  }
}

async function editInstallment(id) {
  try {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    document.getElementById("installmentId").value = data.id;
    document.getElementById("installmentDescription").value = data.description;
    document.getElementById("installmentAmount").value = data.amount;
    document.getElementById("installmentMonths").value =
      data.installment_months;
    document.getElementById("installmentPaymentDate").value = data.payment_date;
    document.getElementById("installmentEndDate").value = data.end_date;
    installmentModal.show();
  } catch (error) {
    console.error("Error loading installment:", error);
    showToast("Gagal memuatkan rekod ansuran", "error");
  }
}

async function deleteInstallment(id) {
  if (confirm("Adakah anda pasti ingin memadamkan rekod ini?")) {
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
      showToast("Rekod ansuran berjaya dipadam");
      loadInstallments();
      loadExpenses();
      loadMonthlyBalance();
    } catch (error) {
      console.error("Error deleting installment:", error);
      showToast("Gagal memadam rekod ansuran", "error");
    }
  }
}

// --- EVENT LISTENERS (DELEGATION) ---
salaryTableBody.addEventListener("click", (e) => {
  const editBtn = e.target.closest(".edit-salary-btn");
  const deleteBtn = e.target.closest(".delete-salary-btn");
  if (editBtn) editSalary(editBtn.dataset.id);
  if (deleteBtn) deleteSalary(deleteBtn.dataset.id);
});

expensesTableBody.addEventListener("click", (e) => {
  const editBtn = e.target.closest(".edit-expense-btn");
  const deleteBtn = e.target.closest(".delete-expense-btn");
  if (editBtn) editExpense(editBtn.dataset.id);
  if (deleteBtn) deleteExpense(deleteBtn.dataset.id);
});

subscriptionsTableBody.addEventListener("click", (e) => {
  const editBtn = e.target.closest(".edit-subscription-btn");
  const deleteBtn = e.target.closest(".delete-subscription-btn");
  if (editBtn) editSubscription(editBtn.dataset.id);
  if (deleteBtn) deleteSubscription(deleteBtn.dataset.id);
});

installmentsTableBody.addEventListener("click", (e) => {
  const editBtn = e.target.closest(".edit-installment-btn");
  const deleteBtn = e.target.closest(".delete-installment-btn");
  if (editBtn) editInstallment(editBtn.dataset.id);
  if (deleteBtn) deleteInstallment(deleteBtn.dataset.id);
});

// --- OTHER EVENT LISTENERS ---
editSalaryBtn.addEventListener("click", () =>
  toggleDisplay(salaryDisplay, salaryEdit)
);
addSalaryBtn.addEventListener("click", () => {
  document.getElementById("salaryId").value = "";
  salaryForm.reset();
  salaryModal.show();
});
saveSalaryBtn.addEventListener("click", saveSalary);

editExpensesBtn.addEventListener("click", () =>
  toggleDisplay(expensesDisplay, expensesEdit)
);
addExpenseBtn.addEventListener("click", () => {
  document.getElementById("expenseId").value = "";
  expenseForm.reset();
  expenseModal.show();
});
saveExpenseBtn.addEventListener("click", saveExpense);
toggleExpensesBtn.addEventListener("click", () => {
  isShowingAllExpenses = !isShowingAllExpenses;
  loadExpenses();
});

editSubscriptionsBtn.addEventListener("click", () =>
  toggleDisplay(subscriptionsDisplay, subscriptionsEdit)
);
addSubscriptionBtn.addEventListener("click", () => {
  document.getElementById("subscriptionId").value = "";
  subscriptionForm.reset();
  subscriptionModal.show();
});
saveSubscriptionBtn.addEventListener("click", saveSubscription);

editInstallmentsBtn.addEventListener("click", () =>
  toggleDisplay(installmentsDisplay, installmentsEdit)
);
addInstallmentBtn.addEventListener("click", () => {
  document.getElementById("installmentId").value = "";
  installmentForm.reset();
  installmentModal.show();
});
saveInstallmentBtn.addEventListener("click", saveInstallment);

// --- INITIALIZE APP ---
document.addEventListener("DOMContentLoaded", () => {
  loadSalaries();
  loadExpenses();
  loadSubscriptions();
  loadInstallments();
  loadMonthlyBalance();
});
