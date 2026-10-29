
const expressionEl = document.getElementById("expression");
const resultEl = document.getElementById("result");
const messageEl = document.getElementById("message");

let expression = "";
let lastAnswer = 0;
let angleMode = "DEG";
let history = JSON.parse(localStorage.getItem("calculator-history") || "[]");

const $ = id => document.getElementById(id);

function formatNumber(n) {
  if (!Number.isFinite(n)) throw Error("Invalid result");
  if (Math.abs(n) < 1e-12) n = 0;
  return Number(n.toPrecision(12)).toString();
}

function factorial(n) {
  if (!Number.isInteger(n) || n < 0 || n > 170) {
    throw Error("Factorial requires an integer from 0 to 170");
  }
  let answer = 1;
  for (let i = 2; i <= n; i++) answer *= i;
  return answer;
}

function evaluate(source) {
  const input = source
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/π/g, "pi")
    .replace(/√/g, "sqrt")
    .replace(/\s/g, "");

  if (!input) throw Error("Enter a calculation");

  const tokens = input.match(
    /(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[a-zA-Z]+|[()+\-*/^%!]/gi
  );

  if (!tokens || tokens.join("") !== input) {
    throw Error("Invalid expression");
  }

  let i = 0;
  const peek = () => tokens[i];
  const take = () => tokens[i++];

  function parseExpression() {
    let n = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = take();
      const r = parseTerm();
      n = op === "+" ? n + r : n - r;
    }
    return n;
  }

  function startsValue(t) {
    return t !== undefined &&
      (t === "(" || /^[a-zA-Z]+$/.test(t) || /^(?:\d|\.)/.test(t));
  }

  function parseTerm() {
    let n = parseUnary();

    while (true) {
      if (peek() === "*" || peek() === "/") {
        const op = take();
        const r = parseUnary();
        if (op === "/" && r === 0) throw Error("Cannot divide by zero");
        n = op === "*" ? n * r : n / r;
      } else if (startsValue(peek())) {
        n *= parseUnary();
      } else {
        break;
      }
    }
    return n;
  }

  function parseUnary() {
    if (peek() === "+") {
      take();
      return parseUnary();
    }
    if (peek() === "-") {
      take();
      return -parseUnary();
    }
    return parsePower();
  }

  function parsePower() {
    let n = parsePostfix();
    if (peek() === "^") {
      take();
      n = Math.pow(n, parseUnary());
    }
    return n;
  }

  function parsePostfix() {
    let n = parsePrimary();
    while (peek() === "!" || peek() === "%") {
      const op = take();
      n = op === "!" ? factorial(n) : n / 100;
    }
    return n;
  }

  function parsePrimary() {
    const token = take();
    if (token === undefined) throw Error("Incomplete expression");

    if (token === "(") {
      const n = parseExpression();
      if (take() !== ")") throw Error("Missing closing bracket");
      return n;
    }

    if (/^(?:\d|\.)/.test(token)) {
      const n = Number(token);
      if (!Number.isFinite(n)) throw Error("Invalid number");
      return n;
    }

    if (/^[a-zA-Z]+$/.test(token)) {
      const name = token.toLowerCase();

      if (name === "pi") return Math.PI;
      if (name === "e") return Math.E;
      if (name === "ans") return lastAnswer;

      if (take() !== "(") throw Error("Unknown function: " + name);
      const x = parseExpression();
      if (take() !== ")") throw Error("Missing closing bracket");

      const angle = angleMode === "DEG" ? x * Math.PI / 180 : x;
      let answer;

      switch (name) {
        case "sin": answer = Math.sin(angle); break;
        case "cos": answer = Math.cos(angle); break;
        case "tan":
          if (Math.abs(Math.cos(angle)) < 1e-12) {
            throw Error("Tangent is undefined here");
          }
          answer = Math.tan(angle);
          break;
        case "sqrt":
          if (x < 0) throw Error("Square root needs a non-negative number");
          answer = Math.sqrt(x);
          break;
        case "ln":
          if (x <= 0) throw Error("ln needs a positive number");
          answer = Math.log(x);
          break;
        case "log":
          if (x <= 0) throw Error("log needs a positive number");
          answer = Math.log10(x);
          break;
        default: throw Error("Unknown function: " + name);
      }

      if (!Number.isFinite(answer)) throw Error("Invalid result");
      return answer;
    }

    throw Error("Invalid expression");
  }

  const answer = parseExpression();
  if (i < tokens.length) throw Error("Check the expression");
  if (!Number.isFinite(answer)) throw Error("Invalid result");
  return answer;
}

function updateDisplay() {
  expressionEl.textContent = expression || "0";

  try {
    const result = evaluate(expression);
    resultEl.textContent = formatNumber(result);
    messageEl.textContent = expression ? "Live result" : "Ready";
  } catch (error) {
    resultEl.textContent = "—";
    messageEl.textContent = error.message;
  }
}

function insert(value) {
  if (value === "^2") {
    expression += "^2";
  } else if (value === "ANS") {
    expression += formatNumber(lastAnswer);
  } else {
    expression += value;
  }
  updateDisplay();
}

function calculate() {
  try {
    const answer = evaluate(expression);
    const formatted = formatNumber(answer);

    lastAnswer = answer;

    if (expression.trim()) {
      history.unshift({ expression, result: formatted });
      history = history.slice(0, 30);
      localStorage.setItem("calculator-history", JSON.stringify(history));
      renderHistory();
    }

    expression = formatted;
    updateDisplay();
    messageEl.textContent = "Calculated";
  } catch (error) {
    resultEl.textContent = error.message;
    messageEl.textContent = "Check your expression";
  }
}

function renderHistory() {
  const list = $("history-list");
  list.replaceChildren();

  if (!history.length) {
    const empty = document.createElement("p");
    empty.className = "empty-history";
    empty.textContent = "No calculations yet.";
    list.appendChild(empty);
    return;
  }

  history.forEach(item => {
    const row = document.createElement("article");
    row.className = "history-item";

    const expr = document.createElement("div");
    expr.className = "history-expression";
    expr.textContent = item.expression;

    const resultRow = document.createElement("div");
    resultRow.className = "history-result-row";

    const result = document.createElement("span");
    result.className = "history-result";
    result.textContent = item.result;

    const use = document.createElement("button");
    use.className = "history-use";
    use.textContent = "USE";
    use.addEventListener("click", () => {
      expression = item.result;
      lastAnswer = Number(item.result);
      updateDisplay();
    });

    resultRow.append(result, use);
    row.append(expr, resultRow);
    list.appendChild(row);
  });
}

document.querySelectorAll("[data-value]").forEach(button => {
  button.addEventListener("click", () => insert(button.dataset.value));
});

$("equals").addEventListener("click", calculate);

$("clear").addEventListener("click", () => {
  expression = "";
  updateDisplay();
});

$("backspace").addEventListener("click", () => {
  expression = expression.slice(0, -1);
  updateDisplay();
});

$("sign").addEventListener("click", () => {
  if (expression.startsWith("-(") && expression.endsWith(")")) {
    expression = expression.slice(2, -1);
  } else if (expression) {
    expression = `-(${expression})`;
  } else {
    expression = "-";
  }
  updateDisplay();
});

$("ans").addEventListener("click", () => insert("ANS"));

$("deg").addEventListener("click", () => {
  angleMode = "DEG";
  $("deg").classList.add("active");
  $("rad").classList.remove("active");
  updateDisplay();
});

$("rad").addEventListener("click", () => {
  angleMode = "RAD";
  $("rad").classList.add("active");
  $("deg").classList.remove("active");
  updateDisplay();
});

$("copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(resultEl.textContent);
    messageEl.textContent = "Copied to clipboard";
  } catch {
    messageEl.textContent = "Clipboard unavailable";
  }
});

$("clear-history").addEventListener("click", () => {
  history = [];
  localStorage.removeItem("calculator-history");
  renderHistory();
});

document.addEventListener("keydown", event => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;

  if (/^[0-9.]$/.test(event.key)) {
    insert(event.key);
  } else if (["+", "-", "*", "/", "^", "(", ")", "%", "!"].includes(event.key)) {
    event.preventDefault();
    insert(event.key);
  } else if (event.key === "Enter" || event.key === "=") {
    event.preventDefault();
    calculate();
  } else if (event.key === "Backspace") {
    expression = expression.slice(0, -1);
    updateDisplay();
  } else if (event.key === "Escape" || event.key === "Delete") {
    expression = "";
    updateDisplay();
  }
});

renderHistory();
updateDisplay();
