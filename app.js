// app.js

// Initialize Supabase
const supabaseUrl = "https://afvfxcecqhgtvftdlhhb.supabase.co"; // GANTI DENGAN URL ANDA
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmdmZ4Y2VjcWhndHZmdGRsaGhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0Mjg1MjIsImV4cCI6MjA3OTAwNDUyMn0.ySGRy4hVxokr-Pl_gMSf9nvzBImtRfVB4ZYpZbCMJDQ"; // GANTI DENGAN KUNCI ANDA
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- STATE VARIABLES ---
let isShowingAllExpenses = false;
let isShowingAllSubscriptions = false;
let isShowingAllInstallments = false;
let isShowingAllCreditCard = false;
let isShowingAllDebitCard = false;

// --- MODAL INITIALIZATION (Will be done in DOMContentLoaded) ---
let salaryModal,
  expenseModal,
  subscriptionModal,
  installmentModal,
  creditCardModal,
  debitCardModal;

// --- HELPER FUNCTIONS ---
function showToast(message, type = "success") {
  const toastEl = document.getElementById("toast");
  const toast = new bootstrap.Toast(toastEl);
  const toastMessage = document.getElementById("toastMessage");
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
      document.getElementById("currentBalance").textContent = formatCurrency(0);
      document.getElementById("balancePeriod").textContent =
        "Tempoh: Tiada data gaji ditemui.";
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

    document.getElementById("currentBalance").textContent =
      formatCurrency(balance);
    document.getElementById(
      "balancePeriod"
    ).textContent = `Tempoh: ${formatDate(start_date)} - ${formatDate(
      end_date
    )}`;
  } catch (error) {
    console.error("Error calculating monthly balance:", error);
    showToast("Gagal mengira baki bulanan", "error");
    document.getElementById("currentBalance").textContent = "Ralat";
    document.getElementById("balancePeriod").textContent =
      "Tidak dapat mengira";
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
    const salaryTableBody = document.getElementById("salaryTableBody");
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
    document.getElementById("salaryForm").reset();
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
    const { data: salaries, error: salaryError } = await supabase
      .from("salaries")
      .select("start_date, end_date")
      .order("month", { ascending: false })
      .limit(1);
    if (salaryError || !salaries || salaries.length === 0) {
      document.getElementById("currentExpenses").textContent =
        formatCurrency(0);
      document.getElementById("expensesPeriod").textContent =
        "Tempoh: Tiada data gaji.";
      document.getElementById("expensesTableBody").innerHTML = "";
      document.getElementById("toggleExpensesBtn").style.display = "none";
      return;
    }
    const { start_date, end_date } = salaries[0];

    const { data: allExpenses, error: expenseError } = await supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false });
    if (expenseError) throw expenseError;

    const currentPeriodExpenses = allExpenses.filter(
      (expense) =>
        new Date(expense.date) >= new Date(start_date) &&
        new Date(expense.date) <= new Date(end_date)
    );
    const totalExpenses = currentPeriodExpenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );

    document.getElementById("currentExpenses").textContent =
      formatCurrency(totalExpenses);
    document.getElementById(
      "expensesPeriod"
    ).textContent = `Tempoh: ${formatDate(start_date)} - ${formatDate(
      end_date
    )}`;

    const expensesTableBody = document.getElementById("expensesTableBody");
    expensesTableBody.innerHTML = "";
    const itemsToShow = isShowingAllExpenses
      ? allExpenses
      : allExpenses.slice(0, 5);
    itemsToShow.forEach((expense) => {
      const row = document.createElement("tr");
      row.innerHTML = `
                <td>${formatDate(expense.date)}</td>
                <td>${expense.description}</td>
                <td>${formatCurrency(expense.amount)}</td>
                <td><span class="badge bg-${getCategoryBadgeColor(
                  expense.category
                )}">${expense.category}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary edit-expense-btn" data-id="${
                      expense.id
                    }">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-expense-btn" data-id="${
                      expense.id
                    }">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
      expensesTableBody.appendChild(row);
    });

    const toggleBtn = document.getElementById("toggleExpensesBtn");
    if (allExpenses.length > 5) {
      toggleBtn.style.display = "inline-block";
      toggleBtn.textContent = isShowingAllExpenses ? "Show Less" : "Show All";
    } else {
      toggleBtn.style.display = "none";
    }
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
    document.getElementById("expenseForm").reset();
    loadExpenses();
    loadSubscriptions();
    loadInstallments();
    loadCreditCardBalances();
    loadDebitCardBalances();
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
    document
      .getElementById("expenseCategory")
      .dispatchEvent(new Event("change"));
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
      loadCreditCardBalances();
      loadDebitCardBalances();
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
    const subscriptionsTableBody = document.getElementById(
      "subscriptionsTableBody"
    );
    subscriptionsTableBody.innerHTML = "";
    const itemsToShow = isShowingAllSubscriptions ? data : data.slice(0, 5);
    itemsToShow.forEach((subscription) => {
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
    const toggleBtn = document.getElementById("toggleSubscriptionsBtn");
    if (data.length > 5) {
      toggleBtn.style.display = "inline-block";
      toggleBtn.textContent = isShowingAllSubscriptions
        ? "Show Less"
        : "Show All";
    } else {
      toggleBtn.style.display = "none";
    }
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
    document.getElementById("subscriptionForm").reset();
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
    const installmentsTableBody = document.getElementById(
      "installmentsTableBody"
    );
    installmentsTableBody.innerHTML = "";
    const itemsToShow = isShowingAllInstallments ? data : data.slice(0, 5);
    itemsToShow.forEach((installment) => {
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
    const toggleBtn = document.getElementById("toggleInstallmentsBtn");
    if (data.length > 5) {
      toggleBtn.style.display = "inline-block";
      toggleBtn.textContent = isShowingAllInstallments
        ? "Show Less"
        : "Show All";
    } else {
      toggleBtn.style.display = "none";
    }
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
    document.getElementById("installmentForm").reset();
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

// --- CREDIT CARD BALANCE FUNCTIONS ---
async function loadCreditCardBalances() {
  try {
    const { data: salaries, error: salaryError } = await supabase
      .from("salaries")
      .select("start_date, end_date")
      .order("month", { ascending: false })
      .limit(1);
    if (salaryError || !salaries || salaries.length === 0) {
      document.getElementById("currentCreditCard").innerHTML =
        "Jumlah Semasa: RM 0.00<br>Jumlah Keseluruhan: RM 0.00";
      document.getElementById("creditCardPeriod").textContent =
        "Tempoh: Tiada data gaji.";
      document.getElementById("creditCardTableBody").innerHTML = "";
      document.getElementById("toggleCreditCardBtn").style.display = "none";
      return;
    }
    const { start_date, end_date } = salaries[0];
    const { data: allCreditCards, error } = await supabase
      .from("credit_card_balance")
      .select("*")
      .order("date", { ascending: false });
    if (error) throw error;
    const currentPeriodBalances = allCreditCards.filter(
      (item) =>
        new Date(item.date) >= new Date(start_date) &&
        new Date(item.date) <= new Date(end_date)
    );
    const totalBalance = currentPeriodBalances.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    const grandTotalBalance = allCreditCards.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    document.getElementById("currentCreditCard").innerHTML = `${formatCurrency(
      grandTotalBalance
    )}`;
    document.getElementById(
      "creditCardPeriod"
    ).textContent = `Tempoh: ${formatDate(start_date)} - ${formatDate(
      end_date
    )}`;
    const creditCardTableBody = document.getElementById("creditCardTableBody");
    creditCardTableBody.innerHTML = "";
    const itemsToShow = isShowingAllCreditCard
      ? allCreditCards
      : allCreditCards.slice(0, 5);
    itemsToShow.forEach((item) => {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${formatDate(item.date)}</td><td>${
        item.description
      }</td><td>${formatCurrency(
        item.amount
      )}</td><td><button class="btn btn-sm btn-outline-primary edit-credit-card-btn" data-id="${
        item.id
      }"><i class="bi bi-pencil"></i></button><button class="btn btn-sm btn-outline-danger delete-credit-card-btn" data-id="${
        item.id
      }"><i class="bi bi-trash"></i></button></td>`;
      creditCardTableBody.appendChild(row);
    });
    const toggleBtn = document.getElementById("toggleCreditCardBtn");
    if (allCreditCards.length > 5) {
      toggleBtn.style.display = "inline-block";
      toggleBtn.textContent = isShowingAllCreditCard ? "Show Less" : "Show All";
    } else {
      toggleBtn.style.display = "none";
    }
  } catch (error) {
    console.error("Error loading credit card balances:", error);
    showToast("Gagal memuatkan data kad kredit", "error");
  }
}

async function saveCreditCardBalance() {
  const id = document.getElementById("creditCardId").value;
  const date = document.getElementById("creditCardDate").value;
  const description = document.getElementById("creditCardDescription").value;
  const amount = parseFloat(document.getElementById("creditCardAmount").value);
  const updateData = { date, description, amount };
  try {
    let error;
    if (id) {
      ({ error } = await supabase
        .from("credit_card_balance")
        .update(updateData)
        .eq("id", id));
    } else {
      ({ error } = await supabase
        .from("credit_card_balance")
        .insert(updateData));
    }
    if (error) throw error;
    showToast(`Rekod kad kredit berjaya ${id ? "dikemaskini" : "ditambah"}`);
  } catch (error) {
    console.error("Error saving credit card:", error);
    showToast(`Gagal menyimpan rekod: ${error.message}`, "error");
  } finally {
    creditCardModal.hide();
    document.getElementById("creditCardForm").reset();
    loadCreditCardBalances();
  }
}

async function editCreditCardBalance(id) {
  try {
    const { data, error } = await supabase
      .from("credit_card_balance")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    document.getElementById("creditCardId").value = data.id;
    document.getElementById("creditCardDate").value = data.date;
    document.getElementById("creditCardDescription").value = data.description;
    document.getElementById("creditCardAmount").value = data.amount;
    creditCardModal.show();
  } catch (error) {
    console.error("Error loading credit card:", error);
    showToast("Gagal memuatkan rekod kad kredit", "error");
  }
}

async function deleteCreditCardBalance(id) {
  if (confirm("Adakah anda pasti ingin memadamkan rekod ini?")) {
    try {
      const { error } = await supabase
        .from("credit_card_balance")
        .delete()
        .eq("id", id);
      if (error) throw error;
      showToast("Rekod kad kredit berjaya dipadam");
      loadCreditCardBalances();
    } catch (error) {
      console.error("Error deleting credit card:", error);
      showToast("Gagal memadam rekod kad kredit", "error");
    }
  }
}

// --- DEBIT CARD BALANCE FUNCTIONS ---
async function loadDebitCardBalances() {
  try {
    const { data: salaries, error: salaryError } = await supabase
      .from("salaries")
      .select("start_date, end_date")
      .order("month", { ascending: false })
      .limit(1);
    if (salaryError || !salaries || salaries.length === 0) {
      document.getElementById("currentDebitCard").innerHTML =
        "Jumlah Semasa: RM 0.00<br>Jumlah Keseluruhan: RM 0.00";
      document.getElementById("debitCardPeriod").textContent =
        "Tempoh: Tiada data gaji.";
      document.getElementById("debitCardTableBody").innerHTML = "";
      document.getElementById("toggleDebitCardBtn").style.display = "none";
      return;
    }
    const { start_date, end_date } = salaries[0];
    const { data: allDebitCards, error } = await supabase
      .from("debit_card_balance")
      .select("*")
      .order("date", { ascending: false });
    if (error) throw error;
    const currentPeriodBalances = allDebitCards.filter(
      (item) =>
        new Date(item.date) >= new Date(start_date) &&
        new Date(item.date) <= new Date(end_date)
    );
    const totalBalance = currentPeriodBalances.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    const grandTotalBalance = allDebitCards.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    document.getElementById("currentDebitCard").innerHTML = `${formatCurrency(
      grandTotalBalance
    )}`;
    document.getElementById(
      "debitCardPeriod"
    ).textContent = `Tempoh: ${formatDate(start_date)} - ${formatDate(
      end_date
    )}`;
    const debitCardTableBody = document.getElementById("debitCardTableBody");
    debitCardTableBody.innerHTML = "";
    const itemsToShow = isShowingAllDebitCard
      ? allDebitCards
      : allDebitCards.slice(0, 5);
    itemsToShow.forEach((item) => {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${formatDate(item.date)}</td><td>${
        item.description
      }</td><td>${formatCurrency(
        item.amount
      )}</td><td><button class="btn btn-sm btn-outline-primary edit-debit-card-btn" data-id="${
        item.id
      }"><i class="bi bi-pencil"></i></button><button class="btn btn-sm btn-outline-danger delete-debit-card-btn" data-id="${
        item.id
      }"><i class="bi bi-trash"></i></button></td>`;
      debitCardTableBody.appendChild(row);
    });
    const toggleBtn = document.getElementById("toggleDebitCardBtn");
    if (allDebitCards.length > 5) {
      toggleBtn.style.display = "inline-block";
      toggleBtn.textContent = isShowingAllDebitCard ? "Show Less" : "Show All";
    } else {
      toggleBtn.style.display = "none";
    }
  } catch (error) {
    console.error("Error loading debit card balances:", error);
    showToast("Gagal memuatkan data kad debit", "error");
  }
}

async function saveDebitCardBalance() {
  const id = document.getElementById("debitCardId").value;
  const date = document.getElementById("debitCardDate").value;
  const description = document.getElementById("debitCardDescription").value;
  const amount = parseFloat(document.getElementById("debitCardAmount").value);
  const updateData = { date, description, amount };
  try {
    let error;
    if (id) {
      ({ error } = await supabase
        .from("debit_card_balance")
        .update(updateData)
        .eq("id", id));
    } else {
      ({ error } = await supabase
        .from("debit_card_balance")
        .insert(updateData));
    }
    if (error) throw error;
    showToast(`Rekod kad debit berjaya ${id ? "dikemaskini" : "ditambah"}`);
  } catch (error) {
    console.error("Error saving debit card:", error);
    showToast(`Gagal menyimpan rekod: ${error.message}`, "error");
  } finally {
    debitCardModal.hide();
    document.getElementById("debitCardForm").reset();
    loadDebitCardBalances();
  }
}

async function editDebitCardBalance(id) {
  try {
    const { data, error } = await supabase
      .from("debit_card_balance")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    document.getElementById("debitCardId").value = data.id;
    document.getElementById("debitCardDate").value = data.date;
    document.getElementById("debitCardDescription").value = data.description;
    document.getElementById("debitCardAmount").value = data.amount;
    debitCardModal.show();
  } catch (error) {
    console.error("Error loading debit card:", error);
    showToast("Gagal memuatkan rekod kad debit", "error");
  }
}

async function deleteDebitCardBalance(id) {
  if (confirm("Adakah anda pasti ingin memadamkan rekod ini?")) {
    try {
      const { error } = await supabase
        .from("debit_card_balance")
        .delete()
        .eq("id", id);
      if (error) throw error;
      showToast("Rekod kad debit berjaya dipadam");
      loadDebitCardBalances();
    } catch (error) {
      console.error("Error deleting debit card:", error);
      showToast("Gagal memadam rekod kad debit", "error");
    }
  }
}

// --- EVENT LISTENERS (DELEGATION) ---
document.getElementById("salaryTableBody").addEventListener("click", (e) => {
  const editBtn = e.target.closest(".edit-salary-btn");
  const deleteBtn = e.target.closest(".delete-salary-btn");
  if (editBtn) editSalary(editBtn.dataset.id);
  if (deleteBtn) deleteSalary(deleteBtn.dataset.id);
});

document.getElementById("expensesTableBody").addEventListener("click", (e) => {
  const editBtn = e.target.closest(".edit-expense-btn");
  const deleteBtn = e.target.closest(".delete-expense-btn");
  if (editBtn) editExpense(editBtn.dataset.id);
  if (deleteBtn) deleteExpense(deleteBtn.dataset.id);
});

document
  .getElementById("subscriptionsTableBody")
  .addEventListener("click", (e) => {
    const editBtn = e.target.closest(".edit-subscription-btn");
    const deleteBtn = e.target.closest(".delete-subscription-btn");
    if (editBtn) editSubscription(editBtn.dataset.id);
    if (deleteBtn) deleteSubscription(deleteBtn.dataset.id);
  });

document
  .getElementById("installmentsTableBody")
  .addEventListener("click", (e) => {
    const editBtn = e.target.closest(".edit-installment-btn");
    const deleteBtn = e.target.closest(".delete-installment-btn");
    if (editBtn) editInstallment(editBtn.dataset.id);
    if (deleteBtn) deleteInstallment(deleteBtn.dataset.id);
  });

document
  .getElementById("creditCardTableBody")
  .addEventListener("click", (e) => {
    const editBtn = e.target.closest(".edit-credit-card-btn");
    const deleteBtn = e.target.closest(".delete-credit-card-btn");
    if (editBtn) editCreditCardBalance(editBtn.dataset.id);
    if (deleteBtn) deleteCreditCardBalance(deleteBtn.dataset.id);
  });

document.getElementById("debitCardTableBody").addEventListener("click", (e) => {
  const editBtn = e.target.closest(".edit-debit-card-btn");
  const deleteBtn = e.target.closest(".delete-debit-card-btn");
  if (editBtn) editDebitCardBalance(editBtn.dataset.id);
  if (deleteBtn) deleteDebitCardBalance(deleteBtn.dataset.id);
});

// --- OTHER EVENT LISTENERS ---
document
  .getElementById("editSalaryBtn")
  .addEventListener("click", () =>
    toggleDisplay(
      document.getElementById("salaryDisplay"),
      document.getElementById("salaryEdit")
    )
  );
document.getElementById("addSalaryBtn").addEventListener("click", () => {
  document.getElementById("salaryId").value = "";
  document.getElementById("salaryForm").reset();
  salaryModal.show();
});
document.getElementById("saveSalaryBtn").addEventListener("click", saveSalary);

document
  .getElementById("editExpensesBtn")
  .addEventListener("click", () =>
    toggleDisplay(
      document.getElementById("expensesDisplay"),
      document.getElementById("expensesEdit")
    )
  );
document.getElementById("addExpenseBtn").addEventListener("click", () => {
  document.getElementById("expenseId").value = "";
  document.getElementById("expenseForm").reset();
  expenseModal.show();
});
document
  .getElementById("saveExpenseBtn")
  .addEventListener("click", saveExpense);
document.getElementById("toggleExpensesBtn").addEventListener("click", () => {
  isShowingAllExpenses = !isShowingAllExpenses;
  loadExpenses();
});

document
  .getElementById("editSubscriptionsBtn")
  .addEventListener("click", () =>
    toggleDisplay(
      document.getElementById("subscriptionsDisplay"),
      document.getElementById("subscriptionsEdit")
    )
  );
document.getElementById("addSubscriptionBtn").addEventListener("click", () => {
  document.getElementById("subscriptionId").value = "";
  document.getElementById("subscriptionForm").reset();
  subscriptionModal.show();
});
document
  .getElementById("saveSubscriptionBtn")
  .addEventListener("click", saveSubscription);
document
  .getElementById("toggleSubscriptionsBtn")
  .addEventListener("click", () => {
    isShowingAllSubscriptions = !isShowingAllSubscriptions;
    loadSubscriptions();
  });

document
  .getElementById("editInstallmentsBtn")
  .addEventListener("click", () =>
    toggleDisplay(
      document.getElementById("installmentsDisplay"),
      document.getElementById("installmentsEdit")
    )
  );
document.getElementById("addInstallmentBtn").addEventListener("click", () => {
  document.getElementById("installmentId").value = "";
  document.getElementById("installmentForm").reset();
  installmentModal.show();
});
document
  .getElementById("saveInstallmentBtn")
  .addEventListener("click", saveInstallment);
document
  .getElementById("toggleInstallmentsBtn")
  .addEventListener("click", () => {
    isShowingAllInstallments = !isShowingAllInstallments;
    loadInstallments();
  });

document
  .getElementById("editCreditCardBtn")
  .addEventListener("click", () =>
    toggleDisplay(
      document.getElementById("creditCardDisplay"),
      document.getElementById("creditCardEdit")
    )
  );
document.getElementById("addCreditCardBtn").addEventListener("click", () => {
  document.getElementById("creditCardId").value = "";
  document.getElementById("creditCardForm").reset();
  creditCardModal.show();
});
document
  .getElementById("saveCreditCardBtn")
  .addEventListener("click", saveCreditCardBalance);
document.getElementById("toggleCreditCardBtn").addEventListener("click", () => {
  isShowingAllCreditCard = !isShowingAllCreditCard;
  loadCreditCardBalances();
});

document
  .getElementById("editDebitCardBtn")
  .addEventListener("click", () =>
    toggleDisplay(
      document.getElementById("debitCardDisplay"),
      document.getElementById("debitCardEdit")
    )
  );
document.getElementById("addDebitCardBtn").addEventListener("click", () => {
  document.getElementById("debitCardId").value = "";
  document.getElementById("debitCardForm").reset();
  debitCardModal.show();
});
document
  .getElementById("saveDebitCardBtn")
  .addEventListener("click", saveDebitCardBalance);
document.getElementById("toggleDebitCardBtn").addEventListener("click", () => {
  isShowingAllDebitCard = !isShowingAllDebitCard;
  loadDebitCardBalances();
});

// --- INITIALIZE APP ---
document.addEventListener("DOMContentLoaded", () => {
  // Initialize Modals
  salaryModal = new bootstrap.Modal(document.getElementById("salaryModal"));
  expenseModal = new bootstrap.Modal(document.getElementById("expenseModal"));
  subscriptionModal = new bootstrap.Modal(
    document.getElementById("subscriptionModal")
  );
  installmentModal = new bootstrap.Modal(
    document.getElementById("installmentModal")
  );
  creditCardModal = new bootstrap.Modal(
    document.getElementById("creditCardModal")
  );
  debitCardModal = new bootstrap.Modal(
    document.getElementById("debitCardModal")
  );

  // Initialize conditional fields for expense form
  const expenseCategory = document.getElementById("expenseCategory");
  const subscriptionFields = document.getElementById("subscriptionFields");
  const installmentFields = document.getElementById("installmentFields");

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

  // Load all data on startup
  loadSalaries();
  loadExpenses();
  loadSubscriptions();
  loadInstallments();
  loadCreditCardBalances();
  loadDebitCardBalances();
  loadMonthlyBalance();
});
