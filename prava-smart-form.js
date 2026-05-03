document.addEventListener("DOMContentLoaded", function () {

console.log("PRAVA ENGINE START");

const flow = document.querySelector(".sf-page-prava");
if (!flow) {
console.log("NO PRAVA WRAPPER");
return;
}

const questions = Array.from(flow.querySelectorAll(".question-wrap-prava"));
console.log("QUESTIONS:", questions.length);

let state = {};
let currentIndex = 0;

function showQuestion(index) {
questions.forEach((q, i) => {
q.classList.toggle("active-question", i === index);
});
currentIndex = index;
}

function getField(q) {
return q.getAttribute("data-field");
}

function clearActive(q) {
q.querySelectorAll(".option-pill").forEach(p => {
p.classList.remove("active");
});
}

function setActive(pill) {
const q = pill.closest(".question-wrap-prava");
clearActive(q);
pill.classList.add("active");
}

// OPTION CLICK
flow.addEventListener("click", function (e) {
const pill = e.target.closest(".option-pill");
if (!pill) return;

```
const q = pill.closest(".question-wrap-prava");
if (!q) return;

const field = getField(q);
const value = pill.getAttribute("data-value");

setActive(pill);
state[field] = value;

console.log("STATE:", state);
```

});

// NEXT
flow.addEventListener("click", function (e) {
const btn = e.target.closest(".nav-next");
if (!btn) return;

```
const q = btn.closest(".question-wrap-prava");
const field = getField(q);

if (!state[field]) {
  alert("Избери опция");
  return;
}

const nextIndex = currentIndex + 1;
if (questions[nextIndex]) {
  showQuestion(nextIndex);
}
```

});

// BACK
flow.addEventListener("click", function (e) {
const btn = e.target.closest(".nav-back");
if (!btn) return;

```
const prevIndex = currentIndex - 1;
if (questions[prevIndex]) {
  showQuestion(prevIndex);
}
```

});

// RESET
flow.addEventListener("click", function (e) {
const btn = e.target.closest('[data-action="reset-prava"]');
if (!btn) return;

```
state = {};

flow.querySelectorAll(".option-pill").forEach(p => {
  p.classList.remove("active");
});

showQuestion(0);

console.log("RESET");
```

});

// INIT
showQuestion(0);

});
